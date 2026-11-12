import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';
import {
  BankSide,
  ConflictType,
  GameState,
  ITEMS_META,
  ITEM_ORDER,
  ItemType,
  LightingMode,
  canToggleItem,
} from '../game/rules';
import {
  buildCabbage,
  buildCozyHouse,
  buildGoat,
  buildPakTani,
  buildSailboat,
  buildStylizedTree,
  buildWhiteboardProp,
  buildWolf,
  createBannerTexture,
  createContactShadowTexture,
  createWaterBumpTexture,
  createWaterTexture,
  createWhiteboardSketchTexture,
  createWoodTexture,
} from '../scene/ProceduralModels';

interface RiverCrossingCanvasProps {
  gameState: GameState;
  shellState: 'title' | 'playing' | 'paused' | 'gameover';
  lightingMode: LightingMode;
  isCrossing: boolean;
  cameraResetTrigger: number;
  interactionTrigger?: { item: ItemType; seq: number } | null;
  onSelectItem: (item: ItemType) => void;
  onRowBoat: () => void;
  onCrossingComplete: () => void;
  onOrbitChange?: (isOrbiting: boolean) => void;
}

// Slot coordinates on Left Bank, Right Bank, and inside the Boat
const LEFT_BANK_SLOTS: Record<ItemType, THREE.Vector3> = {
  cabbage: new THREE.Vector3(-6.4, 0.55, 2.35),
  wolf: new THREE.Vector3(-6.7, 0.55, 0.05),
  goat: new THREE.Vector3(-6.4, 0.55, -2.25),
};

const RIGHT_BANK_SLOTS: Record<ItemType, THREE.Vector3> = {
  cabbage: new THREE.Vector3(6.2, 0.55, 2.35),
  wolf: new THREE.Vector3(6.5, 0.55, 0.05),
  goat: new THREE.Vector3(6.2, 0.55, -2.25),
};

const BOAT_X_LEFT = -2.45;
const BOAT_X_RIGHT = 2.45;
const BOAT_PASSENGER_LOCAL = new THREE.Vector3(0.72, 0.54, 0);

const ITEM_REACTION_TEXT: Record<ItemType, string> = {
  cabbage: 'Kresk-kresk!',
  wolf: 'Grrr! Auuu!',
  goat: 'Mbek! Mbek!',
};

// Pre-allocated scratch vectors for 0-GC render loop
const _projVec = new THREE.Vector3();
const _worldPos = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();

// Responsive 3D camera distance scale & vertical FOV so portrait mobile viewports frame both islands cleanly
const getAspectCameraScale = (aspect: number): number => {
  if (aspect >= 1.15) return 1.0;
  return Math.min(1.85, Math.max(1.0, 1.08 / Math.max(aspect, 0.45)));
};

const getResponsiveFov = (aspect: number): number => {
  if (aspect >= 1.15) return 42;
  return Math.min(64, Math.round(42 / Math.pow(Math.max(aspect, 0.42), 0.52)));
};

export const RiverCrossingCanvas: React.FC<RiverCrossingCanvasProps> = ({
  gameState,
  shellState,
  lightingMode,
  isCrossing,
  cameraResetTrigger,
  interactionTrigger,
  onSelectItem,
  onRowBoat,
  onCrossingComplete,
  onOrbitChange,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Refs for projected 2D floating badges, reaction bubbles & cutscene comic bubble
  const badgeRefs = useRef<Record<ItemType, HTMLButtonElement | null>>({
    cabbage: null,
    wolf: null,
    goat: null,
  });
  const reactionRefs = useRef<Record<ItemType, HTMLSpanElement | null>>({
    cabbage: null,
    wolf: null,
    goat: null,
  });
  const reactionTimersRef = useRef<Record<ItemType, number | null>>({
    cabbage: null,
    wolf: null,
    goat: null,
  });
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  // Latest callbacks & state refs for WebGL loop access
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  const shellRef = useRef(shellState);
  shellRef.current = shellState;

  const crossingRef = useRef(isCrossing);
  crossingRef.current = isCrossing;

  const callbacksRef = useRef({
    onSelectItem,
    onRowBoat,
    onCrossingComplete,
    onOrbitChange,
  });
  callbacksRef.current = {
    onSelectItem,
    onRowBoat,
    onCrossingComplete,
    onOrbitChange,
  };

  // Internal 3D scene references for GSAP animations & lighting updates
  const sceneActorsRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    boatGroup: THREE.Group;
    passengerSlot: THREE.Group;
    pakTani: ReturnType<typeof buildPakTani>;
    items: Record<ItemType, THREE.Group>;
    cabbageParts: ReturnType<typeof buildCabbage>;
    wolfParts: ReturnType<typeof buildWolf>;
    goatParts: ReturnType<typeof buildGoat>;
    interactionExpiry: Record<ItemType, number>;
    triggerInteractionAnim: (item: ItemType) => void;
    activeItemTweens: Record<ItemType, gsap.core.Timeline | null>;
    isBoarding: Record<ItemType, boolean>;
    crossingPassenger: ItemType | null;
    boatCrossingTl: gsap.core.Timeline | null;
    prevMoves: number;
    prevBoatSide: BankSide;
    sunLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    pierLightLeft: THREE.PointLight;
    pierLightRight: THREE.PointLight;
    windowMaterial: THREE.MeshStandardMaterial;
    lanternMat: THREE.MeshStandardMaterial;
    bowLanternMat: THREE.MeshStandardMaterial;
    firefliesPoints: THREE.Points;
    cutsceneAnchor: THREE.Vector3;
    cutsceneActive: ConflictType;
    spawnBurst: (origin: THREE.Vector3, colorHex: number, count?: number) => void;
    spawnWaterRipple: (
      x: number,
      z: number,
      startScale?: number,
      maxScale?: number,
      maxLife?: number,
    ) => void;
    cameraGoalPos: THREE.Vector3;
    cameraGoalLook: THREE.Vector3;
    useScriptedCamera: boolean;
  } | null>(null);

  // 1. Initialize WebGL Scene Once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbae6fd);
    scene.fog = new THREE.FogExp2(0xbae6fd, 0.016);

    const initialAspect = width / height;
    const initialCamScale = getAspectCameraScale(initialAspect);
    const camera = new THREE.PerspectiveCamera(
      getResponsiveFov(initialAspect),
      initialAspect,
      0.1,
      160,
    );
    camera.position.set(
      0,
      10.8 * (1 + (initialCamScale - 1) * 0.78),
      17.5 * initialCamScale,
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Studio PBR Environment Map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // OrbitControls with restricted polar angles so kids never get lost under the island
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = Math.PI / 2 - 0.12;
    controls.minAzimuthAngle = -Math.PI / 2.2;
    controls.maxAzimuthAngle = Math.PI / 2.2;
    controls.minDistance = 9;
    controls.maxDistance = 42;
    controls.target.set(0, 1.0, 0);

    // 3-Point Warm/Cool Studio Outdoor Lighting
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x3f6212, 0.85);
    hemiLight.position.set(0, 30, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.85);
    sunLight.position.set(12, 22, 14);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    const d = 15;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 55;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.55);
    rimLight.position.set(-14, 12, -12);
    scene.add(rimLight);

    // Procedural Textures
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const shadowTex = createContactShadowTexture();
    const woodTex = createWoodTexture(maxAniso);
    const waterTex = createWaterTexture(maxAniso);
    const waterBumpTex = createWaterBumpTexture(maxAniso);
    const sketchTex = createWhiteboardSketchTexture(maxAniso);
    const bannerTex = createBannerTexture(maxAniso);

    // =========================================================================
    // ENVIRONMENT: RIVER, WAVES, RIPPLES, SHORELINE FOAM, ISLANDS, PIERS & TREES
    // =========================================================================
    // 1. Detailed Animated River Water Surface (GPU sin-wave vertex-displacement shader + caustics & bump map)
    const waterGeo = new THREE.PlaneGeometry(60, 48, 96, 76);
    waterGeo.rotateX(-Math.PI / 2);

    const waterUniforms = {
      uTime: { value: 0 },
      uBoatPos: { value: new THREE.Vector2(BOAT_X_LEFT, 0) },
      uWakeStrength: { value: 0 },
    };

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: waterTex,
      bumpMap: waterBumpTex,
      bumpScale: 0.08,
      roughness: 0.14,
      metalness: 0.18,
    });
    waterMat.customProgramCacheKey = () => 'river-water-sin-displacement-v1';
    waterMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = waterUniforms.uTime;
      shader.uniforms.uBoatPos = waterUniforms.uBoatPos;
      shader.uniforms.uWakeStrength = waterUniforms.uWakeStrength;

      shader.vertexShader =
        `
        uniform float uTime;
        uniform vec2 uBoatPos;
        uniform float uWakeStrength;
        varying float vWaveHeight;
        varying vec2 vRiverXZ;

        float computeRiverWave(vec2 xz, float t, vec2 boatPos, float wakeStr) {
          float w = sin(xz.x * 0.72 + t * 2.4) * 0.085
                  + sin(xz.x * 0.48 + xz.y * 0.72 - t * 2.9) * 0.055
                  + sin(xz.y * 1.15 - t * 3.3) * 0.038
                  + sin((xz.x - xz.y) * 1.6 + t * 4.1) * 0.018;
          vec2 d = xz - boatPos;
          float dist = length(d);
          float falloff = clamp(1.0 - dist / 3.5, 0.0, 1.0);
          float amp = mix(0.032, 0.085, wakeStr);
          w += sin(dist * 4.6 - t * 8.8) * amp * falloff * falloff;
          return w;
        }
        ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <beginnormal_vertex>',
        `
        #include <beginnormal_vertex>
        float eps = 0.12;
        float hC = computeRiverWave(position.xz, uTime, uBoatPos, uWakeStrength);
        float hX = computeRiverWave(position.xz + vec2(eps, 0.0), uTime, uBoatPos, uWakeStrength);
        float hZ = computeRiverWave(position.xz + vec2(0.0, eps), uTime, uBoatPos, uWakeStrength);
        objectNormal = normalize(vec3(hC - hX, eps, hC - hZ));
        `,
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float riverWave = computeRiverWave(position.xz, uTime, uBoatPos, uWakeStrength);
        transformed.y += riverWave;
        vWaveHeight = riverWave;
        vRiverXZ = position.xz;
        `,
      );

      shader.fragmentShader =
        `
        uniform float uTime;
        uniform vec2 uBoatPos;
        uniform float uWakeStrength;
        varying float vWaveHeight;
        varying vec2 vRiverXZ;
        ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        float crestHighlight = smoothstep(0.05, 0.15, vWaveHeight);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.97, 1.0), crestHighlight * 0.38);
        `,
      );
    };

    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = -0.05;
    waterMesh.receiveShadow = true;
    scene.add(waterMesh);

    // 1b. Secondary 'Foam' Layer strictly along the Boat's Crossing Corridor
    const boatWakeFoamUniforms = {
      uTime: { value: 0 },
      uBoatX: { value: BOAT_X_LEFT },
      uStartX: { value: BOAT_X_LEFT },
      uBoatDir: { value: 1.0 },
      uWakeIntensity: { value: 0.0 },
    };

    const boatPathFoamGeo = new THREE.PlaneGeometry(6.6, 2.8, 64, 24);
    boatPathFoamGeo.rotateX(-Math.PI / 2);

    const boatPathFoamMat = new THREE.ShaderMaterial({
      uniforms: boatWakeFoamUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        uniform float uTime;
        uniform float uBoatX;
        uniform float uWakeIntensity;
        varying vec2 vPathXZ;

        void main() {
          vec3 pos = position;
          float wave = sin(pos.x * 0.72 + uTime * 2.4) * 0.085
                     + sin(pos.x * 0.48 + pos.z * 0.72 - uTime * 2.9) * 0.055
                     + sin(pos.z * 1.15 - uTime * 3.3) * 0.038;
          float dist = length(pos.xz - vec2(uBoatX, 0.0));
          float falloff = clamp(1.0 - dist / 3.5, 0.0, 1.0);
          wave += sin(dist * 4.6 - uTime * 8.8) * mix(0.032, 0.085, uWakeIntensity) * falloff * falloff;
          pos.y += wave + 0.024;
          vPathXZ = pos.xz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uBoatX;
        uniform float uStartX;
        uniform float uBoatDir;
        uniform float uWakeIntensity;
        varying vec2 vPathXZ;

        void main() {
          if (uWakeIntensity <= 0.005) discard;

          // Distance behind the moving boat along the crossing path
          float behindBoat = (uBoatX - vPathXZ.x) * uBoatDir;
          float travelledLen = max(0.35, abs(uBoatX - uStartX));

          // Restrict strictly to the corridor between the boat's start pier and current hull position
          float longitudinalMask = smoothstep(-0.55, 0.15, behindBoat)
                                 * (1.0 - smoothstep(travelledLen - 0.1, travelledLen + 0.85, behindBoat));

          // V-shaped Kelvin wake arms flaring outward behind the hull
          float absZ = abs(vPathXZ.y);
          float wakeArmRadius = 0.22 + max(0.0, behindBoat) * 0.24;
          float vArmBand = exp(-pow((absZ - wakeArmRadius) * 4.8, 2.0));
          float vArmRipples = 0.55 + 0.45 * sin((behindBoat * 5.5 - absZ * 7.0) - uTime * 9.5);
          float kelvinWake = vArmBand * vArmRipples * smoothstep(-0.2, 0.35, behindBoat);

          // Aerated foam trail along the boat's centerline wash
          float centerCorridor = exp(-pow(absZ / (0.36 + max(0.0, behindBoat) * 0.09), 2.0));
          float cellA = sin(vPathXZ.x * 5.8 - uTime * 4.5 * uBoatDir) * cos(vPathXZ.y * 8.2 + uTime * 3.2);
          float cellB = sin((vPathXZ.x + vPathXZ.y) * 9.5 - uTime * 6.0) * 0.5 + 0.5;
          float lacyFoam = smoothstep(0.12, 0.68, cellA * 0.55 + cellB * 0.45) * centerCorridor;

          // Bow crescent splash ring right at the front of the boat
          float bowDist = length(vec2((vPathXZ.x - uBoatX) * uBoatDir - 0.55, vPathXZ.y * 1.15));
          float bowSplash = exp(-pow((bowDist - 0.55) * 4.5, 2.0)) * smoothstep(-0.2, 0.8, (vPathXZ.x - uBoatX) * uBoatDir + 0.9);

          float combinedFoam = clamp((kelvinWake * 0.75 + lacyFoam * 0.85) * longitudinalMask + bowSplash * 0.65, 0.0, 1.0);
          float alpha = combinedFoam * uWakeIntensity * 0.78;
          if (alpha <= 0.01) discard;

          vec3 foamColor = mix(vec3(0.55, 0.90, 0.99), vec3(0.96, 0.99, 1.0), combinedFoam);
          gl_FragColor = vec4(foamColor, alpha);
        }
      `,
    });

    const boatPathFoamMesh = new THREE.Mesh(boatPathFoamGeo, boatPathFoamMat);
    boatPathFoamMesh.position.set(0, -0.05, 0);
    scene.add(boatPathFoamMesh);

    // Riverbed sandy-pebble bottom beneath water
    const bedMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 60),
      new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.9 }),
    );
    bedMesh.rotation.x = -Math.PI / 2;
    bedMesh.position.y = -0.8;
    scene.add(bedMesh);

    // Shoreline Lapping Whitewater Foam Rings around both Island Banks
    const shoreFoamMeshes: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; phase: number }[] = [];
    [-10.8, 10.8].forEach((bankX, bankIdx) => {
      [0, 1].forEach((layerIdx) => {
        const foamMat = new THREE.MeshBasicMaterial({
          color: 0xe0f2fe,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        });
        const innerR = 7.12 + layerIdx * 0.28;
        const outerR = innerR + 0.22;
        const foamGeo = new THREE.RingGeometry(innerR, outerR, 36);
        foamGeo.rotateX(-Math.PI / 2);
        foamGeo.scale(1.0, 1.0, 1.35);
        const foamRing = new THREE.Mesh(foamGeo, foamMat);
        foamRing.position.set(bankX, 0.015 + layerIdx * 0.005, 0);
        scene.add(foamRing);
        shoreFoamMeshes.push({
          mesh: foamRing,
          mat: foamMat,
          phase: bankIdx * 1.4 + layerIdx * 1.8,
        });
      });
    });

    // Flowing Whitewater Current Ribbons drifting along the river channel
    const streamLines: { mesh: THREE.Mesh; baseX: number; baseZ: number; speed: number; phase: number }[] = [];
    const streamMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    for (let i = 0; i < 12; i++) {
      const sx = -2.6 + (i % 4) * 1.7 + (Math.random() - 0.5) * 0.35;
      const sz = -10 + i * 1.8;
      const len = 1.2 + (i % 3) * 0.65;
      const sMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.09, len),
        streamMat,
      );
      sMesh.rotation.x = -Math.PI / 2;
      sMesh.position.set(sx, 0.025, sz);
      scene.add(sMesh);
      streamLines.push({
        mesh: sMesh,
        baseX: sx,
        baseZ: sz,
        speed: 1.1 + (i % 3) * 0.35,
        phase: i * 0.85,
      });
    }

    // Pool of Expanding Concentric Water Ripple Rings (Riak Air)
    const RIPPLE_COUNT = 12;
    interface WaterRipple {
      active: boolean;
      mesh: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
      life: number;
      maxLife: number;
      startScale: number;
      maxScale: number;
    }
    const rippleRings: WaterRipple[] = [];
    const sharedRippleGeo = new THREE.RingGeometry(0.32, 0.44, 28);
    sharedRippleGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < RIPPLE_COUNT; i++) {
      const rMat = new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const rMesh = new THREE.Mesh(sharedRippleGeo, rMat);
      rMesh.position.set(0, -50, 0);
      scene.add(rMesh);
      rippleRings.push({
        active: false,
        mesh: rMesh,
        mat: rMat,
        life: 0,
        maxLife: 1.2,
        startScale: 0.4,
        maxScale: 2.2,
      });
    }
    let rippleCursor = 0;
    const spawnWaterRipple = (
      x: number,
      z: number,
      startScale = 0.45,
      maxScale = 2.35,
      maxLife = 1.25,
    ) => {
      const r = rippleRings[rippleCursor];
      r.active = true;
      r.life = 0;
      r.maxLife = maxLife;
      r.startScale = startScale;
      r.maxScale = maxScale;
      r.mesh.position.set(x, 0.035, z);
      r.mesh.scale.setScalar(startScale);
      r.mat.opacity = 0.72;
      rippleCursor = (rippleCursor + 1) % RIPPLE_COUNT;
    };

    // 2. Left Bank Island (Tepi Awal - Keberangkatan) & Right Bank Island (Seberang Rumah)
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      roughness: 0.78,
      metalness: 0.02,
    });
    const cliffMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.88,
      metalness: 0.04,
    });

    const createBankIsland = (centerX: number) => {
      const bankGroup = new THREE.Group();
      // Earth cliff base
      const baseGeo = new THREE.CylinderGeometry(7.2, 6.4, 1.2, 24);
      baseGeo.scale(1.0, 1.0, 1.35);
      const baseMesh = new THREE.Mesh(baseGeo, cliffMat);
      baseMesh.position.set(centerX, -0.15, 0);
      baseMesh.receiveShadow = true;
      bankGroup.add(baseMesh);

      // Lush grassy top cap
      const topGeo = new THREE.CylinderGeometry(7.35, 7.2, 0.32, 24);
      topGeo.scale(1.0, 1.0, 1.35);
      const topMesh = new THREE.Mesh(topGeo, grassMat);
      topMesh.position.set(centerX, 0.39, 0);
      topMesh.receiveShadow = true;
      bankGroup.add(topMesh);

      return bankGroup;
    };

    scene.add(createBankIsland(-10.8));
    scene.add(createBankIsland(10.8));

    // Stepping Stones / Slot Pads on Left & Right Banks so kids see the 3 landing spots
    const padMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.75,
    });
    const padRingMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.6,
    });
    ITEM_ORDER.forEach((itemKey) => {
      [LEFT_BANK_SLOTS[itemKey], RIGHT_BANK_SLOTS[itemKey]].forEach((pos) => {
        const pad = new THREE.Mesh(
          new THREE.CylinderGeometry(0.78, 0.84, 0.06, 16),
          padMat,
        );
        pad.position.set(pos.x, 0.55, pos.z);
        pad.receiveShadow = true;
        scene.add(pad);

        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.8, 0.04, 8, 24),
          padRingMat,
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(pos.x, 0.58, pos.z);
        scene.add(ring);
      });
    });

    // 3. Wooden Piers (Dermaga Kayu) on Left & Right Banks + Warm Lantern Posts
    const pierMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: woodTex,
      roughness: 0.7,
    });
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.8,
    });
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.4,
      roughness: 0.2,
    });

    const buildPier = (xPos: number, dir: 1 | -1) => {
      const pier = new THREE.Group();
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.14, 1.8),
        pierMat,
      );
      deck.position.set(xPos, 0.56, 0);
      deck.castShadow = true;
      deck.receiveShadow = true;
      pier.add(deck);

      // Support pilings
      [-0.9, 0.9].forEach((ox) => {
        [-0.75, 0.75].forEach((oz) => {
          const piling = new THREE.Mesh(
            new THREE.CylinderGeometry(0.11, 0.11, 1.35, 8),
            postMat,
          );
          piling.position.set(xPos + ox, 0.25, oz);
          piling.castShadow = true;
          pier.add(piling);
        });
      });

      // Lantern post on the pier corner
      const lanternPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.07, 1.9, 8),
        postMat,
      );
      lanternPole.position.set(xPos + dir * 0.8, 1.5, -0.82);
      pier.add(lanternPole);

      const lanternBulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 12),
        lanternMat,
      );
      lanternBulb.position.set(xPos + dir * 0.8, 2.45, -0.82);
      pier.add(lanternBulb);

      return pier;
    };

    scene.add(buildPier(-4.6, 1));
    scene.add(buildPier(4.6, -1));

    const pierLightLeft = new THREE.PointLight(0xf59e0b, 0.6, 9, 1.5);
    pierLightLeft.position.set(-3.8, 2.6, -0.82);
    scene.add(pierLightLeft);

    const pierLightRight = new THREE.PointLight(0xf59e0b, 0.6, 9, 1.5);
    pierLightRight.position.set(3.8, 2.6, -0.82);
    scene.add(pierLightRight);

    // 4. Left Bank Classroom Whiteboard Easter Egg Prop
    const whiteboardProp = buildWhiteboardProp(sketchTex);
    whiteboardProp.position.set(-8.6, 0.55, -3.5);
    whiteboardProp.rotation.y = 0.42;
    scene.add(whiteboardProp);

    // 5. Right Bank Pak Tani's Cozy House + Wooden Fence
    const cozyHouse = buildCozyHouse(bannerTex);
    cozyHouse.group.position.set(10.6, 0.55, -0.6);
    scene.add(cozyHouse.group);

    // Wooden Fence around Right Bank garden
    for (let i = 0; i < 6; i++) {
      const fPost = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.65, 0.14),
        postMat,
      );
      fPost.position.set(7.8 + i * 0.95, 0.85, 3.6);
      fPost.castShadow = true;
      scene.add(fPost);
    }
    const fRail = new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 0.1, 0.08),
      postMat,
    );
    fRail.position.set(10.2, 0.98, 3.6);
    scene.add(fRail);

    // 6. Stylized Low-Poly Trees & Bouncing Wildflowers on Both Islands
    const treePlacements = [
      { x: -12.5, z: -4.2, s: 1.25, c: 0x16a34a },
      { x: -13.8, z: -1.2, s: 1.45, c: 0x22c55e },
      { x: -12.8, z: 2.5, s: 1.15, c: 0x15803d },
      { x: -10.5, z: 4.8, s: 1.3, c: 0x22c55e },
      { x: -9.4, z: -5.4, s: 1.05, c: 0x4ade80 },
      { x: 13.4, z: -4.5, s: 1.35, c: 0x16a34a },
      { x: 14.2, z: -0.8, s: 1.5, c: 0x15803d },
      { x: 13.2, z: 3.2, s: 1.2, c: 0x22c55e },
      { x: 9.2, z: -5.2, s: 1.1, c: 0x4ade80 },
      { x: 11.4, z: 5.1, s: 1.25, c: 0x16a34a },
    ];
    const trees: THREE.Group[] = [];
    treePlacements.forEach((t) => {
      const tree = buildStylizedTree(t.s, t.c);
      tree.position.set(t.x, 0.54, t.z);
      scene.add(tree);
      trees.push(tree);
    });

    // Bouncing Wildflowers (InstancedMesh for crisp performance)
    const flowerCount = 32;
    const flowerStemGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.25, 6);
    const flowerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
    });
    const flowersInstanced = new THREE.InstancedMesh(
      flowerStemGeo,
      flowerMat,
      flowerCount,
    );
    const flowerMatrices: THREE.Matrix4[] = [];
    const flowerColors = [0xf43f5e, 0xfacc15, 0xa855f7, 0xf97316];
    const _dummy = new THREE.Object3D();
    const _col = new THREE.Color();

    for (let i = 0; i < flowerCount; i++) {
      const isLeft = i < flowerCount / 2;
      const angle = (i / (flowerCount / 2)) * Math.PI * 2;
      const radius = 3.2 + (i % 4) * 0.85;
      const fx = (isLeft ? -10.5 : 10.5) + Math.cos(angle) * radius;
      const fz = Math.sin(angle) * radius * 1.15;
      _dummy.position.set(fx, 0.66, fz);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      flowersInstanced.setMatrixAt(i, _dummy.matrix);
      flowerMatrices.push(_dummy.matrix.clone());
      flowersInstanced.setColorAt(i, _col.setHex(flowerColors[i % flowerColors.length]));
    }
    flowersInstanced.instanceMatrix.needsUpdate = true;
    if (flowersInstanced.instanceColor) flowersInstanced.instanceColor.needsUpdate = true;
    flowersInstanced.computeBoundingSphere();
    scene.add(flowersInstanced);

    // Floating Lily Pads on the River
    const lilyMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.55,
    });
    const lotusMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      roughness: 0.35,
    });
    const lilyPads: THREE.Group[] = [];
    const lilyCoords = [
      [-1.8, -3.6],
      [1.4, -4.2],
      [-0.6, 3.5],
      [2.1, 3.9],
      [-2.4, 2.6],
      [0.4, -2.8],
    ];
    lilyCoords.forEach(([lx, lz], idx) => {
      const lGroup = new THREE.Group();
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.04, 14, 1, false, 0, Math.PI * 1.85),
        lilyMat,
      );
      lGroup.add(pad);
      if (idx % 2 === 0) {
        const flower = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.14, 0),
          lotusMat,
        );
        flower.position.y = 0.08;
        lGroup.add(flower);
      }
      lGroup.position.set(lx, 0.01, lz);
      scene.add(lGroup);
      lilyPads.push(lGroup);
    });

    // =========================================================================
    // HERO 3D ACTORS: BOAT, PAK TANI, 1. SAYUR-SAYURAN, 2. SERIGALA, 3. KAMBING
    // =========================================================================
    const boatParts = buildSailboat(woodTex);
    const boatGroup = boatParts.group;
    boatGroup.position.set(BOAT_X_LEFT, 0.02, 0);
    scene.add(boatGroup);

    // Pak Tani stands proudly on the left bench inside the boat
    const pakTani = buildPakTani();
    pakTani.group.position.set(-0.75, 0.54, 0);
    pakTani.group.rotation.set(0, Math.PI / 2, 0);
    boatGroup.add(pakTani.group);

    // Boat raycast proxy for clicking the boat directly to row
    const boatHitProxy = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 2.4, 1.8),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    boatHitProxy.position.set(0, 1.1, 0);
    boatHitProxy.userData.isBoat = true;
    boatGroup.add(boatHitProxy);

    const cabbageParts = buildCabbage(shadowTex);
    const wolfParts = buildWolf(shadowTex);
    const goatParts = buildGoat(shadowTex);

    const items: Record<ItemType, THREE.Group> = {
      cabbage: cabbageParts.group,
      wolf: wolfParts.group,
      goat: goatParts.group,
    };

    ITEM_ORDER.forEach((key) => {
      const pos = LEFT_BANK_SLOTS[key];
      items[key].position.copy(pos);
      items[key].rotation.set(0, Math.PI / 2, 0);
      items[key].scale.set(1, 1, 1);
      scene.add(items[key]);
    });

    // =========================================================================
    // ZERO-GC POOLED PARTICLE SYSTEMS (WATER FOAM, CHIMNEY SMOKE, CUTSCENE BURSTS, FIREFLIES)
    // =========================================================================
    const POOL_COUNT = 48;
    const particleGeo = new THREE.DodecahedronGeometry(0.16, 0);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, POOL_COUNT);
    particleMesh.frustumCulled = false;

    interface PooledParticle {
      active: boolean;
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      scale: number;
      life: number;
      maxLife: number;
    }
    const particles: PooledParticle[] = Array.from({ length: POOL_COUNT }, () => ({
      active: false,
      pos: new THREE.Vector3(0, -100, 0),
      vel: new THREE.Vector3(),
      scale: 0.001,
      life: 0,
      maxLife: 1,
    }));
    let pCursor = 0;

    const spawnParticle = (
      x: number,
      y: number,
      z: number,
      vx: number,
      vy: number,
      vz: number,
      colorHex: number,
      scale = 1.0,
      maxLife = 1.2,
    ) => {
      const p = particles[pCursor];
      p.active = true;
      p.pos.set(x, y, z);
      p.vel.set(vx, vy, vz);
      p.scale = scale;
      p.life = 0;
      p.maxLife = maxLife;
      particleMesh.setColorAt(pCursor, _col.setHex(colorHex));
      if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
      pCursor = (pCursor + 1) % POOL_COUNT;
    };

    const spawnBurst = (origin: THREE.Vector3, colorHex: number, count = 12) => {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const speed = 1.2 + Math.random() * 2.2;
        spawnParticle(
          origin.x,
          origin.y + 0.45,
          origin.z,
          Math.cos(angle) * speed,
          1.8 + Math.random() * 2.0,
          Math.sin(angle) * speed,
          colorHex,
          0.9 + Math.random() * 0.6,
          0.65 + Math.random() * 0.35,
        );
      }
    };
    scene.add(particleMesh);

    // 2. Night Firefly Particles
    const fireflyCount = 36;
    const fireflyPositions = new Float32Array(fireflyCount * 3);
    for (let i = 0; i < fireflyCount; i++) {
      fireflyPositions[i * 3] = (Math.random() - 0.5) * 26;
      fireflyPositions[i * 3 + 1] = 1.0 + Math.random() * 4.2;
      fireflyPositions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    const fireflyGeo = new THREE.BufferGeometry();
    fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3));
    const fireflyMat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.28,
      transparent: true,
      opacity: 0.0,
    });
    const firefliesPoints = new THREE.Points(fireflyGeo, fireflyMat);
    scene.add(firefliesPoints);

    // =========================================================================
    // CHARACTER CLICK / LOAD INTERACTION ANIMATIONS (GROWL, BLEAT, LEAF RUSTLE)
    // =========================================================================
    const interactionExpiry: Record<ItemType, number> = {
      cabbage: 0,
      wolf: 0,
      goat: 0,
    };

    const showBadgeReaction = (item: ItemType) => {
      const span = reactionRefs.current[item];
      if (!span) return;
      span.style.opacity = '1';
      span.style.transform = 'translate(-50%, -100%) scale(1)';
      if (reactionTimersRef.current[item] !== null) {
        window.clearTimeout(reactionTimersRef.current[item]!);
      }
      reactionTimersRef.current[item] = window.setTimeout(() => {
        if (reactionRefs.current[item]) {
          reactionRefs.current[item]!.style.opacity = '0';
          reactionRefs.current[item]!.style.transform =
            'translate(-50%, -90%) scale(0.85)';
        }
      }, 950);
    };

    const triggerInteractionAnim = (item: ItemType) => {
      interactionExpiry[item] = performance.now() + 720;
      showBadgeReaction(item);

      if (item === 'cabbage') {
        // Vegetable Leaves Rustling ("Kresk-kresk!"): outer leaves flare & shiver rapidly
        cabbageParts.group.getWorldPosition(_worldPos);
        spawnBurst(_worldPos, 0x22c55e, 10);

        gsap.killTweensOf(cabbageParts.cabbageHead.rotation);
        gsap.fromTo(
          cabbageParts.cabbageHead.rotation,
          { z: -0.22, x: 0.16 },
          {
            z: 0,
            x: 0,
            duration: 0.65,
            ease: 'elastic.out(1.3, 0.22)',
          },
        );

        cabbageParts.outerLeaves.forEach((leaf, idx) => {
          gsap.killTweensOf(leaf.rotation);
          gsap.fromTo(
            leaf.rotation,
            { x: 0.68 + (idx % 2) * 0.15 },
            {
              x: 0.28,
              duration: 0.68,
              delay: idx * 0.025,
              ease: 'elastic.out(1.2, 0.25)',
            },
          );
        });
      } else if (item === 'wolf') {
        // Wolf Growling ("Grrr! Auuu!"): chest puffs, ears pin back, head lunges & snout vibrates
        wolfParts.group.getWorldPosition(_worldPos);
        spawnBurst(_worldPos, 0xf59e0b, 10);

        gsap.killTweensOf(wolfParts.chestMesh.scale);
        gsap.fromTo(
          wolfParts.chestMesh.scale,
          { x: 1.28, y: 1.26, z: 1.24 },
          { x: 1, y: 1, z: 1, duration: 0.65, ease: 'elastic.out(1.1, 0.3)' },
        );

        gsap.killTweensOf(wolfParts.headGroup.rotation);
        gsap.fromTo(
          wolfParts.headGroup.rotation,
          { x: 0.24, z: -0.22, y: 0 },
          { x: 0, z: 0, y: 0, duration: 0.65, ease: 'elastic.out(1.2, 0.28)' },
        );

        gsap.killTweensOf(wolfParts.snoutMesh.position);
        gsap.fromTo(
          wolfParts.snoutMesh.position,
          { y: -0.02 },
          {
            y: -0.06,
            duration: 0.08,
            repeat: 5,
            yoyo: true,
            ease: 'sine.inOut',
          },
        );

        gsap.killTweensOf(wolfParts.leftEar.rotation);
        gsap.killTweensOf(wolfParts.rightEar.rotation);
        gsap.fromTo(
          wolfParts.leftEar.rotation,
          { z: 0.56, x: -0.28 },
          { z: 0.18, x: 0, duration: 0.65, ease: 'elastic.out(1.2, 0.3)' },
        );
        gsap.fromTo(
          wolfParts.rightEar.rotation,
          { z: -0.56, x: -0.28 },
          { z: -0.18, x: 0, duration: 0.65, ease: 'elastic.out(1.2, 0.3)' },
        );
      } else if (item === 'goat') {
        // Goat Bleating ("Mbek!"): excited bodyRig hop, head tilts up, beard/jaw vibrates rapidly, ears flap
        goatParts.group.getWorldPosition(_worldPos);
        spawnBurst(_worldPos, 0xfef08a, 10);

        gsap.killTweensOf(goatParts.bodyRig.position);
        gsap.fromTo(
          goatParts.bodyRig.position,
          { y: 0.28 },
          { y: 0, duration: 0.6, ease: 'bounce.out' },
        );

        gsap.killTweensOf(goatParts.headGroup.rotation);
        gsap.fromTo(
          goatParts.headGroup.rotation,
          { x: -0.34, z: 0.14 },
          { x: 0, z: 0, duration: 0.65, ease: 'elastic.out(1.2, 0.3)' },
        );

        gsap.killTweensOf(goatParts.beardMesh.scale);
        gsap.fromTo(
          goatParts.beardMesh.scale,
          { y: 1.45, x: 1.15 },
          {
            y: 1.0,
            x: 1.0,
            duration: 0.08,
            repeat: 5,
            yoyo: true,
            ease: 'sine.inOut',
          },
        );

        gsap.killTweensOf(goatParts.leftEar.rotation);
        gsap.killTweensOf(goatParts.rightEar.rotation);
        gsap.fromTo(
          goatParts.leftEar.rotation,
          { z: 1.15 },
          { z: 0.65, duration: 0.6, ease: 'elastic.out(1.3, 0.25)' },
        );
        gsap.fromTo(
          goatParts.rightEar.rotation,
          { z: -1.15 },
          { z: -0.65, duration: 0.6, ease: 'elastic.out(1.3, 0.25)' },
        );
      }
    };

    // Store scene actors for external effects
    const actorsObj = {
      scene,
      camera,
      controls,
      boatGroup,
      passengerSlot: boatParts.passengerSlot,
      pakTani,
      items,
      cabbageParts,
      wolfParts,
      goatParts,
      interactionExpiry,
      triggerInteractionAnim,
      activeItemTweens: {
        cabbage: null,
        wolf: null,
        goat: null,
      } as Record<ItemType, gsap.core.Timeline | null>,
      isBoarding: {
        cabbage: false,
        wolf: false,
        goat: false,
      } as Record<ItemType, boolean>,
      crossingPassenger: null as ItemType | null,
      boatCrossingTl: null as gsap.core.Timeline | null,
      prevMoves: 0,
      prevBoatSide: 'left' as BankSide,
      sunLight,
      hemiLight,
      pierLightLeft,
      pierLightRight,
      windowMaterial: cozyHouse.windowMaterial,
      lanternMat,
      bowLanternMat: boatParts.bowLanternMat,
      firefliesPoints,
      cutsceneAnchor: new THREE.Vector3(-6.5, 2.2, 0),
      cutsceneActive: 'none' as ConflictType,
      spawnBurst,
      spawnWaterRipple,
      cameraGoalPos: new THREE.Vector3(
        0,
        10.8 * (1 + (initialCamScale - 1) * 0.78),
        17.5 * initialCamScale,
      ),
      cameraGoalLook: new THREE.Vector3(0, 1.0, 0),
      useScriptedCamera: false,
    };
    sceneActorsRef.current = actorsObj;

    // Cancel scripted camera transition when user manually rotates camera & trigger HUD auto-focus
    const onControlStart = () => {
      actorsObj.useScriptedCamera = false;
      callbacksRef.current.onOrbitChange?.(true);
    };
    const onControlEnd = () => {
      callbacksRef.current.onOrbitChange?.(false);
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('end', onControlEnd);

    // =========================================================================
    // RAYCASTING FOR DIRECT 3D CHARACTER & BOAT CLICKS
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clickables: THREE.Object3D[] = [
      cabbageParts.group,
      wolfParts.group,
      goatParts.group,
      boatHitProxy,
    ];

    let downPos = { x: 0, y: 0 };
    const onPointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (shellRef.current !== 'playing' || crossingRef.current) return;
      const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      if (dist > 8) return; // Ignore orbit drags

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickables, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj) {
          if (obj.userData?.itemType) {
            const item = obj.userData.itemType as ItemType;
            if (canToggleItem(stateRef.current, item)) {
              callbacksRef.current.onSelectItem(item);
            }
            return;
          }
          if (obj.userData?.isBoat) {
            callbacksRef.current.onRowBoat();
            return;
          }
          obj = obj.parent;
        }
      }
    };

    let lastHoverTime = 0;
    const onPointerMove = (e: PointerEvent) => {
      if (shellRef.current !== 'playing') return;
      const now = performance.now();
      if (now - lastHoverTime < 65) return;
      lastHoverTime = now;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickables, true);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    // Pre-warm shaders on GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Helper to synchronously project 3D world coordinates to 2D floating badges & cutscene bubble
    const projectOverlays = (cw: number, ch: number) => {
      camera.updateMatrixWorld();
      ITEM_ORDER.forEach((key) => {
        const btn = badgeRefs.current[key];
        if (!btn) return;
        items[key].getWorldPosition(_worldPos);
        _projVec.copy(_worldPos);
        if (cw < 640) {
          _projVec.y += key === 'goat' ? 2.15 : key === 'wolf' ? 1.52 : 0.92;
        } else {
          _projVec.y += 1.42;
        }
        _projVec.project(camera);

        if (_projVec.z >= -1 && _projVec.z <= 1 && shellRef.current === 'playing') {
          const sx = THREE.MathUtils.clamp((_projVec.x * 0.5 + 0.5) * cw, 38, cw - 38);
          const sy = THREE.MathUtils.clamp((-_projVec.y * 0.5 + 0.5) * ch, 76, ch - 130);
          btn.style.transform = `translate3d(${Math.round(sx)}px, ${Math.round(sy)}px, 0) translate(-50%, -100%)`;
          btn.style.opacity = '1';
        } else {
          btn.style.opacity = '0';
        }
      });

      if (bubbleRef.current) {
        if (actorsObj.cutsceneActive !== 'none') {
          _projVec.copy(actorsObj.cutsceneAnchor);
          _projVec.project(camera);
          if (_projVec.z >= -1 && _projVec.z <= 1) {
            const marginX = Math.min(220, cw * 0.44);
            const bx = THREE.MathUtils.clamp((_projVec.x * 0.5 + 0.5) * cw, marginX, cw - marginX);
            const by = THREE.MathUtils.clamp((-_projVec.y * 0.5 + 0.5) * ch, 110, ch - 230);
            bubbleRef.current.style.transform = `translate3d(${Math.round(bx)}px, ${Math.round(by)}px, 0) translate(-50%, -100%)`;
            bubbleRef.current.style.opacity = '1';
          }
        } else {
          bubbleRef.current.style.opacity = '0';
        }
      }
    };

    // ResizeObserver for responsive viewport (re-frames camera for portrait mobile vs landscape)
    let currentW = width;
    let currentH = height;
    const handleResize = () => {
      const el = mountRef.current;
      if (!el) return;
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.innerHeight;
      if (w === currentW && h === currentH) return;
      const prevScale = getAspectCameraScale(currentW / currentH);
      currentW = w;
      currentH = h;
      const nextAspect = w / h;
      const nextScale = getAspectCameraScale(nextAspect);
      camera.aspect = nextAspect;
      camera.fov = getResponsiveFov(nextAspect);
      camera.updateProjectionMatrix();
      if (Math.abs(nextScale - prevScale) > 0.04) {
        const targetY = 10.8 * (1 + (nextScale - 1) * 0.78);
        const targetZ = 17.5 * nextScale;
        actorsObj.cameraGoalPos.set(0, targetY, targetZ);
        camera.position.set(0, targetY, targetZ);
        controls.target.set(0, 1.0, 0);
        controls.update();
      }
      renderer.setSize(w, h);
      renderer.render(scene, camera);
      projectOverlays(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Render initial frame immediately on mount
    renderer.render(scene, camera);
    projectOverlays(width, height);

    // =========================================================================
    // MAIN ANIMATION LOOP (WITH SOFTWARE-WEBGL AFTERDRAW PACING)
    // =========================================================================
    const clock = new THREE.Clock();
    let frameId = 0;
    let smokeAccum = 0;
    let foamAccum = 0;
    let rippleAccum = 0;
    let prevBoatX = BOAT_X_LEFT;
    let wasRowing = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = clock.getElapsedTime();
      const nowPerf = performance.now();

      // 1. GPU Sin-Wave Vertex Displacement Shader Uniforms + Scrolling Caustics & Bump Map
      waterTex.offset.y = (elapsed * 0.045) % 1;
      waterTex.offset.x = Math.sin(elapsed * 0.35) * 0.04;
      waterBumpTex.offset.y = -(elapsed * 0.065) % 1;
      waterBumpTex.offset.x = (elapsed * 0.03) % 1;

      const bx = boatGroup.position.x;
      const bz = boatGroup.position.z;
      const isRowingNow = crossingRef.current || actorsObj.crossingPassenger !== null;
      const boatVx = (bx - prevBoatX) / Math.max(dt, 0.001);
      const isMovingAlongPath = isRowingNow || Math.abs(boatVx) > 0.12;

      if (isRowingNow && !wasRowing) {
        boatWakeFoamUniforms.uStartX.value = bx;
        boatWakeFoamUniforms.uBoatDir.value = bx <= 0 ? 1.0 : -1.0;
      } else if (Math.abs(boatVx) > 0.25) {
        boatWakeFoamUniforms.uBoatDir.value = boatVx > 0 ? 1.0 : -1.0;
      }
      wasRowing = isRowingNow;
      prevBoatX = bx;

      const targetWake = isMovingAlongPath ? 1.0 : 0.0;
      const wakeStrength = THREE.MathUtils.damp(
        waterUniforms.uWakeStrength.value,
        targetWake,
        isMovingAlongPath ? 8.0 : 2.1,
        dt,
      );

      waterUniforms.uTime.value = elapsed;
      waterUniforms.uBoatPos.value.set(bx, bz);
      waterUniforms.uWakeStrength.value = wakeStrength;

      // Update Secondary Boat-Path Foam Layer Uniforms
      boatWakeFoamUniforms.uTime.value = elapsed;
      boatWakeFoamUniforms.uBoatX.value = bx;
      boatWakeFoamUniforms.uWakeIntensity.value = wakeStrength;

      // Animate Shoreline Lapping Whitewater Foam Rings around both Islands
      shoreFoamMeshes.forEach((sf) => {
        const pulse = Math.sin(elapsed * 2.4 + sf.phase);
        const s = 1 + pulse * 0.018;
        sf.mesh.scale.set(s, 1, s);
        sf.mat.opacity = 0.38 + pulse * 0.22;
      });

      // Animate Flowing River Current Ribbons
      streamLines.forEach((sl) => {
        const zNext = ((sl.baseZ + elapsed * sl.speed + 11) % 22) - 11;
        sl.mesh.position.z = zNext;
        sl.mesh.position.x = sl.baseX + Math.sin(elapsed * 1.8 + sl.phase) * 0.14;
        sl.mesh.position.y =
          0.01 +
          Math.sin(sl.mesh.position.x * 0.72 + elapsed * 2.4) * 0.075 +
          Math.cos(zNext * 0.72 - elapsed * 2.9) * 0.045;
      });

      // Advance Expanding Concentric Water Ripple Rings (Riak Air)
      for (let i = 0; i < RIPPLE_COUNT; i++) {
        const r = rippleRings[i];
        if (!r.active) continue;
        r.life += dt;
        if (r.life >= r.maxLife) {
          r.active = false;
          r.mat.opacity = 0;
          r.mesh.position.y = -50;
          continue;
        }
        const p = r.life / r.maxLife;
        const curScale = THREE.MathUtils.lerp(r.startScale, r.maxScale, p);
        r.mesh.scale.set(curScale * 1.25, 1, curScale);
        r.mat.opacity = (1 - p) * 0.68;
      }

      // 2. Boat Gentle Bobbing, Sail Billowing & Pak Tani Expressive Rowing Motion
      const bobWave =
        Math.sin(bx * 0.72 + elapsed * 2.4) * 0.065 +
        Math.cos(elapsed * 2.8) * 0.025;
      boatGroup.position.y = 0.03 + bobWave;
      boatGroup.rotation.z =
        Math.sin(elapsed * 2.1) * 0.042 +
        (isRowingNow ? Math.sin(elapsed * 13.5) * 0.032 : 0);
      boatGroup.rotation.x = Math.cos(elapsed * 2.4) * 0.028;

      // Sail, pennant flag, and rudder animation
      boatParts.sailMesh.rotation.y =
        Math.sin(elapsed * 2.5) * 0.08 + (isRowingNow ? 0.12 : 0);
      boatParts.flagMesh.rotation.y = Math.sin(elapsed * 7.5) * 0.25;
      boatParts.rudderGroup.rotation.y = Math.sin(elapsed * 3.2) * 0.18;
      boatParts.bowWakeGroup.scale.setScalar(
        isRowingNow ? 1.08 + Math.sin(elapsed * 10) * 0.08 : 0.92 + Math.sin(elapsed * 3) * 0.04,
      );

      // Wake Ripples & Foam Particle System Triggered Along the Path of the Boat
      rippleAccum += dt;
      if (isMovingAlongPath) {
        const rowCycle = elapsed * 13.5;
        const boatDir = boatWakeFoamUniforms.uBoatDir.value;
        pakTani.oarPivot.rotation.z = Math.sin(rowCycle) * 0.64;
        pakTani.oarPivot.rotation.x = Math.cos(rowCycle) * 0.44;
        // Pak Tani leans his torso and nods as he rows the boat with his passenger attached to the boat!
        pakTani.group.rotation.x = Math.sin(rowCycle) * 0.15;
        pakTani.headGroup.rotation.x = Math.cos(rowCycle) * 0.09;

        if (rippleAccum > 0.12) {
          rippleAccum = 0;
          // Expanding V-wake ripple rings spawned strictly along the stern path behind the moving boat
          spawnWaterRipple(
            bx - boatDir * 0.85,
            bz + (Math.random() - 0.5) * 0.32,
            0.52,
            2.65,
            1.15,
          );
        }

        foamAccum += dt;
        if (foamAccum > 0.042) {
          foamAccum = 0;
          // Pair of aerated V-wake foam particles trailing along the boat's crossing corridor
          const sternX = bx - boatDir * (0.95 + Math.random() * 0.45);
          const sideSign = Math.random() > 0.5 ? 1 : -1;
          spawnParticle(
            sternX,
            0.12,
            bz + sideSign * (0.22 + Math.random() * 0.48),
            -boatDir * (0.65 + Math.random() * 0.55),
            0.42 + Math.random() * 0.48,
            sideSign * (0.35 + Math.random() * 0.45),
            Math.random() > 0.3 ? 0xf0f9ff : 0x38bdf8,
            0.92,
            0.78,
          );
        }
      } else {
        pakTani.oarPivot.rotation.z = Math.sin(elapsed * 2) * 0.06;
        pakTani.oarPivot.rotation.x = 0;
        pakTani.group.rotation.x = 0;
        pakTani.headGroup.rotation.x = 0;

        if (rippleAccum > 0.65) {
          rippleAccum = 0;
          spawnWaterRipple(
            boatGroup.position.x,
            boatGroup.position.z,
            0.46,
            1.75,
            1.35,
          );
        }
      }

      // 3. Character Idle Animations & Cutscene Choreography
      const curState = stateRef.current;
      if (actorsObj.cutsceneActive === 'wolf_eats_goat') {
        // Wolf chases Goat in a comical circle on the unattended bank!
        const bankCenterX = curState.conflictBank === 'right' ? 6.35 : -6.5;
        const radius = 1.35;
        const goatAngle = elapsed * 4.8;
        const wolfAngle = goatAngle - 0.95;

        goatParts.group.position.set(
          bankCenterX + Math.cos(goatAngle) * radius,
          0.55 + Math.abs(Math.sin(elapsed * 14)) * 0.38,
          Math.sin(goatAngle) * radius,
        );
        goatParts.group.rotation.set(0, -goatAngle, 0);

        wolfParts.group.position.set(
          bankCenterX + Math.cos(wolfAngle) * radius,
          0.55 + Math.abs(Math.cos(elapsed * 14)) * 0.34,
          Math.sin(wolfAngle) * radius,
        );
        wolfParts.group.rotation.set(0, -wolfAngle, 0);

        if (Math.random() < 0.35) {
          spawnParticle(
            wolfParts.group.position.x,
            0.65,
            wolfParts.group.position.z,
            (Math.random() - 0.5) * 1.2,
            0.9 + Math.random() * 0.8,
            (Math.random() - 0.5) * 1.2,
            0xfef3c7,
            0.95,
            0.55,
          );
        }
      } else if (actorsObj.cutsceneActive === 'goat_eats_cabbage') {
        // Goat hops next to Sayur-Sayuran and chomps rapidly with green leaf particle bursts!
        const cabPos = cabbageParts.group.position;
        goatParts.group.position.x = THREE.MathUtils.damp(
          goatParts.group.position.x,
          cabPos.x,
          6,
          dt,
        );
        goatParts.group.position.z = THREE.MathUtils.damp(
          goatParts.group.position.z,
          cabPos.z + 0.82,
          6,
          dt,
        );
        goatParts.group.position.y = 0.55 + Math.abs(Math.sin(elapsed * 12)) * 0.25;
        goatParts.group.rotation.set(0, Math.PI, 0);
        goatParts.headGroup.rotation.x = Math.sin(elapsed * 18) * 0.35;

        const shrink = Math.max(0.12, cabbageParts.cabbageHead.scale.x - dt * 0.35);
        cabbageParts.cabbageHead.scale.setScalar(shrink);

        if (Math.random() < 0.4) {
          spawnParticle(
            cabPos.x + (Math.random() - 0.5) * 0.4,
            cabPos.y + 0.5,
            cabPos.z + (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 1.8,
            1.5 + Math.random() * 1.2,
            (Math.random() - 0.5) * 1.8,
            Math.random() > 0.35 ? 0x22c55e : 0xf97316,
            0.85,
            0.65,
          );
        }
      } else if (curState.isVictory) {
        // Victory celebration hops!
        cabbageParts.cabbageHead.rotation.z = Math.sin(elapsed * 8) * 0.14;
        wolfParts.tailMesh.rotation.z = Math.sin(elapsed * 14) * 0.45;
        goatParts.bodyRig.position.y = Math.abs(Math.sin(elapsed * 9)) * 0.24;
        goatParts.headGroup.rotation.x = Math.sin(elapsed * 10) * 0.25;
      } else {
        // =====================================================================
        // DISTINCT PEACEFUL IDLE ANIMATIONS FOR SAYUR-SAYURAN, SERIGALA & KAMBING
        // =====================================================================
        // 1. Sayur-Sayuran: Gentle vegetable bunch wiggle + outer leaves breathing flutter
        if (nowPerf > interactionExpiry.cabbage) {
          cabbageParts.cabbageHead.rotation.z = Math.sin(elapsed * 2.8) * 0.065;
          cabbageParts.cabbageHead.rotation.y = Math.cos(elapsed * 2.1) * 0.08;
          cabbageParts.outerLeaves.forEach((leaf, idx) => {
            leaf.rotation.x = 0.28 + Math.sin(elapsed * 3.2 + idx * 1.05) * 0.065;
          });
        }

        // 2. Serigala (Wolf): Rhythmic chest/torso breathing + periodic ear twitching + tail wag + suspicious glance
        wolfParts.tailMesh.rotation.z = Math.sin(elapsed * 4.5) * 0.28;
        if (nowPerf > interactionExpiry.wolf) {
          const breath = Math.sin(elapsed * 2.7);
          wolfParts.chestMesh.scale.set(
            1 + breath * 0.065,
            1 + breath * 0.075,
            1 + breath * 0.055,
          );
          wolfParts.bodyMesh.scale.set(
            1 + breath * 0.035,
            1 + breath * 0.04,
            0.75 + breath * 0.025,
          );

          // Crisp staggered ear twitching
          const twitchL =
            Math.sin(elapsed * 16.0) *
            Math.pow(Math.max(0, Math.sin(elapsed * 1.45)), 8);
          const twitchR =
            Math.cos(elapsed * 18.0) *
            Math.pow(Math.max(0, Math.sin(elapsed * 1.85 + 1.3)), 8);
          wolfParts.leftEar.rotation.z = 0.18 + twitchL * 0.42;
          wolfParts.rightEar.rotation.z = -0.18 - twitchR * 0.42;

          wolfParts.headGroup.rotation.y = Math.sin(elapsed * 1.6) * 0.22;
          wolfParts.headGroup.rotation.x = Math.cos(elapsed * 2.0) * 0.045;
        }

        // 3. Kambing (Goat): Periodic happy little hops + cheerful head nods + floppy ear/tail wiggles
        goatParts.tailMesh.rotation.z = Math.sin(elapsed * 6.5) * 0.22;
        if (nowPerf > interactionExpiry.goat) {
          const hopWave = Math.max(0, Math.sin(elapsed * 3.8));
          goatParts.bodyRig.position.y = Math.pow(hopWave, 2) * 0.15;
          goatParts.bodyRig.rotation.x = Math.sin(elapsed * 3.8) * 0.05;

          goatParts.headGroup.rotation.x = Math.sin(elapsed * 4.6) * 0.16;
          goatParts.headGroup.rotation.z = Math.cos(elapsed * 2.3) * 0.045;
          goatParts.beardMesh.rotation.x =
            0.2 + Math.sin(elapsed * 4.6 - 0.5) * 0.12;

          goatParts.leftEar.rotation.z = 0.65 + Math.sin(elapsed * 5.2) * 0.12;
          goatParts.rightEar.rotation.z = -0.65 - Math.sin(elapsed * 5.2) * 0.12;
        }
      }

      // 4. Lily pads gentle bobbing
      lilyPads.forEach((pad, idx) => {
        pad.position.y = 0.01 + Math.sin(elapsed * 2 + idx) * 0.025;
      });

      // 5. Puffing Chimney Smoke from Pak Tani's Cozy House
      smokeAccum += dt;
      if (smokeAccum > 0.38) {
        smokeAccum = 0;
        spawnParticle(
          10.6 + 0.85,
          0.55 + 4.05,
          -0.6 - 0.55,
          0.15 + (Math.random() - 0.5) * 0.25,
          0.85 + Math.random() * 0.35,
          (Math.random() - 0.5) * 0.25,
          0xf1f5f9,
          0.75,
          2.2,
        );
      }

      // Advance Pooled Particles
      for (let i = 0; i < POOL_COUNT; i++) {
        const p = particles[i];
        if (!p.active) {
          _dummy.position.set(0, -100, 0);
          _dummy.scale.setScalar(0.001);
          _dummy.updateMatrix();
          particleMesh.setMatrixAt(i, _dummy.matrix);
          continue;
        }
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }
        p.pos.addScaledVector(p.vel, dt);
        const progress = p.life / p.maxLife;
        const s = p.scale * Math.sin(progress * Math.PI);
        _dummy.position.copy(p.pos);
        _dummy.scale.setScalar(Math.max(0.01, s));
        _dummy.updateMatrix();
        particleMesh.setMatrixAt(i, _dummy.matrix);
      }
      particleMesh.instanceMatrix.needsUpdate = true;

      // 6. Camera Choreography: Title Screen Tour vs Scripted Cutscene Pan vs OrbitControls
      const camScale = getAspectCameraScale(camera.aspect);
      const camYScale = 1 + (camScale - 1) * 0.78;
      if (shellRef.current === 'title') {
        const tourAngle = Math.sin(elapsed * 0.28) * 0.38;
        _desiredCamPos.set(
          Math.sin(tourAngle) * 18.5 * Math.min(1.25, camScale),
          (10.2 + Math.cos(elapsed * 0.4) * 0.6) * camYScale,
          Math.cos(tourAngle) * 17.5 * camScale,
        );
        camera.position.lerp(_desiredCamPos, 1 - Math.exp(-3 * dt));
        controls.target.lerp(_camTarget.set(0, 1.4, 0), 1 - Math.exp(-3 * dt));
        camera.lookAt(controls.target);
      } else if (actorsObj.useScriptedCamera) {
        const dampFactor = 1 - Math.exp(-4.5 * dt);
        camera.position.lerp(actorsObj.cameraGoalPos, dampFactor);
        controls.target.lerp(actorsObj.cameraGoalLook, dampFactor);
        camera.lookAt(controls.target);
      } else {
        controls.update();
      }

      renderer.render(scene, camera);

      // 7. Project 3D Coordinates to 2D Floating Badges & Cutscene Bubble
      const cw = mountRef.current?.clientWidth || window.innerWidth;
      const ch = mountRef.current?.clientHeight || window.innerHeight;
      projectOverlays(cw, ch);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ITEM_ORDER.forEach((k) => {
        if (reactionTimersRef.current[k] !== null) {
          clearTimeout(reactionTimersRef.current[k]!);
        }
      });
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('end', onControlEnd);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // 2. Trigger character interaction animation (Growl, Bleat, Leaf Rustle) on click/load
  useEffect(() => {
    if (!interactionTrigger) return;
    const actors = sceneActorsRef.current;
    if (!actors) return;
    actors.triggerInteractionAnim(interactionTrigger.item);
  }, [interactionTrigger]);

  // 3. Sync Lighting Mode (Siang / Senja / Malam)
  useEffect(() => {
    const actors = sceneActorsRef.current;
    if (!actors) return;

    const {
      scene,
      sunLight,
      hemiLight,
      pierLightLeft,
      pierLightRight,
      windowMaterial,
      lanternMat,
      firefliesPoints,
    } = actors;

    const presets: Record<
      LightingMode,
      {
        skyHex: number;
        sunHex: number;
        sunInt: number;
        sunPos: [number, number, number];
        hemiSky: number;
        hemiGround: number;
        hemiInt: number;
        pointInt: number;
        emissiveInt: number;
        fireflyOpacity: number;
      }
    > = {
      day: {
        skyHex: 0xbae6fd,
        sunHex: 0xfffbeb,
        sunInt: 1.85,
        sunPos: [12, 22, 14],
        hemiSky: 0xe0f2fe,
        hemiGround: 0x3f6212,
        hemiInt: 0.85,
        pointInt: 0.35,
        emissiveInt: 0.25,
        fireflyOpacity: 0.0,
      },
      dusk: {
        skyHex: 0xfdba74,
        sunHex: 0xf97316,
        sunInt: 1.55,
        sunPos: [-16, 9, 12],
        hemiSky: 0xfed7aa,
        hemiGround: 0x451a03,
        hemiInt: 0.72,
        pointInt: 1.8,
        emissiveInt: 1.35,
        fireflyOpacity: 0.45,
      },
      night: {
        skyHex: 0x0f172a,
        sunHex: 0x60a5fa,
        sunInt: 0.55,
        sunPos: [-10, 18, -10],
        hemiSky: 0x1e293b,
        hemiGround: 0x090d16,
        hemiInt: 0.45,
        pointInt: 3.2,
        emissiveInt: 2.2,
        fireflyOpacity: 0.95,
      },
    };

    const p = presets[lightingMode];
    scene.background = new THREE.Color(p.skyHex);
    scene.fog = new THREE.FogExp2(p.skyHex, 0.016);

    sunLight.color.setHex(p.sunHex);
    sunLight.intensity = p.sunInt;
    sunLight.position.set(...p.sunPos);

    hemiLight.color.setHex(p.hemiSky);
    hemiLight.groundColor.setHex(p.hemiGround);
    hemiLight.intensity = p.hemiInt;

    pierLightLeft.intensity = p.pointInt;
    pierLightRight.intensity = p.pointInt;
    windowMaterial.emissiveIntensity = p.emissiveInt;
    lanternMat.emissiveIntensity = p.emissiveInt;
    actors.bowLanternMat.emissiveIntensity = p.emissiveInt * 1.1;
    (firefliesPoints.material as THREE.PointsMaterial).opacity = p.fireflyOpacity;
  }, [lightingMode]);

  // 4. Reset Camera Handler
  useEffect(() => {
    const actors = sceneActorsRef.current;
    if (!actors) return;
    const camScale = getAspectCameraScale(actors.camera.aspect);
    const camYScale = 1 + (camScale - 1) * 0.78;
    actors.cameraGoalPos.set(0, 10.8 * camYScale, 17.5 * camScale);
    actors.cameraGoalLook.set(0, 1.0, 0);
    actors.useScriptedCamera = true;
  }, [cameraResetTrigger]);

  // 5. Sync Item Positions, Parabolic GSAP Jump Animations, Boat Coordinate System Attachment & Cutscenes
  useEffect(() => {
    const actors = sceneActorsRef.current;
    if (!actors) return;

    const {
      boatGroup,
      passengerSlot,
      pakTani,
      items,
      cabbageParts,
      scene,
      spawnBurst,
      spawnWaterRipple,
    } = actors;

    // Reset vegetable bunch scale if recovering from goat_eats_cabbage conflict via Undo/Reset
    if (gameState.conflict === 'none') {
      cabbageParts.cabbageHead.scale.setScalar(1);
    }

    // Helper: Parabolic jump of an item INTO the boat's `passengerSlot` coordinate system
    const animateItemToBoat = (
      key: ItemType,
      facingRotY: number,
      onDone?: () => void,
    ) => {
      const meshGroup = items[key];
      actors.activeItemTweens[key]?.kill();
      gsap.killTweensOf(meshGroup.position);
      gsap.killTweensOf(meshGroup.scale);

      meshGroup.updateWorldMatrix(true, false);
      passengerSlot.updateWorldMatrix(true, false);
      meshGroup.getWorldPosition(_worldPos);

      // Attach the passenger group directly to the boat's `passengerSlot` coordinate system
      if (meshGroup.parent !== passengerSlot) {
        passengerSlot.add(meshGroup);
      }
      const startLocal = passengerSlot.worldToLocal(_worldPos.clone());
      meshGroup.position.copy(startLocal);
      meshGroup.rotation.set(0, facingRotY, 0);
      meshGroup.scale.set(1, 1, 1);
      actors.isBoarding[key] = true;

      const proxy = { t: 0 };
      const tl = gsap.timeline({
        onComplete: () => {
          actors.isBoarding[key] = false;
          meshGroup.position.set(0, 0, 0);
          meshGroup.rotation.set(0, facingRotY, 0);
          meshGroup.scale.set(1, 1, 1);
          meshGroup.getWorldPosition(_worldPos);
          spawnBurst(_worldPos, 0xfef08a, 8);
          spawnWaterRipple(boatGroup.position.x, boatGroup.position.z, 0.55, 2.4, 1.15);
          onDone?.();
        },
      });
      tl.to(
        proxy,
        {
          t: 1,
          duration: 0.38,
          ease: 'power2.out',
          onUpdate: () => {
            const p = proxy.t;
            meshGroup.position.x = THREE.MathUtils.lerp(startLocal.x, 0, p);
            meshGroup.position.z = THREE.MathUtils.lerp(startLocal.z, 0, p);
            meshGroup.position.y =
              THREE.MathUtils.lerp(startLocal.y, 0, p) +
              Math.sin(p * Math.PI) * 1.45;
          },
        },
        0,
      );
      tl.fromTo(
        meshGroup.scale,
        { x: 0.84, y: 1.22, z: 0.84 },
        { x: 1, y: 1, z: 1, duration: 0.38, ease: 'elastic.out(1, 0.4)' },
        0,
      );
      actors.activeItemTweens[key] = tl;
    };

    // Helper: Detach passenger from the boat's coordinate system into world `scene` and jump onto bank slot
    const animateItemToBank = (
      key: ItemType,
      targetBank: BankSide,
      animateJump: boolean,
      onDone?: () => void,
    ) => {
      const meshGroup = items[key];
      const targetSlot =
        targetBank === 'left' ? LEFT_BANK_SLOTS[key] : RIGHT_BANK_SLOTS[key];
      const targetRotY = targetBank === 'left' ? Math.PI / 2 : -Math.PI / 2;

      actors.activeItemTweens[key]?.kill();
      actors.isBoarding[key] = false;
      gsap.killTweensOf(meshGroup.position);
      gsap.killTweensOf(meshGroup.scale);

      meshGroup.updateWorldMatrix(true, false);
      meshGroup.getWorldPosition(_worldPos);

      if (meshGroup.parent !== scene) {
        scene.add(meshGroup);
      }
      meshGroup.rotation.set(0, targetRotY, 0);
      meshGroup.scale.set(1, 1, 1);

      if (!animateJump) {
        meshGroup.position.copy(targetSlot);
        onDone?.();
        return;
      }

      const startWorld = _worldPos.clone();
      meshGroup.position.copy(startWorld);

      const proxy = { t: 0 };
      const tl = gsap.timeline({
        onComplete: () => {
          meshGroup.position.copy(targetSlot);
          meshGroup.rotation.set(0, targetRotY, 0);
          meshGroup.scale.set(1, 1, 1);
          spawnBurst(targetSlot, 0x4ade80, 10);
          onDone?.();
        },
      });
      tl.to(
        proxy,
        {
          t: 1,
          duration: 0.45,
          ease: 'power2.out',
          onUpdate: () => {
            const p = proxy.t;
            meshGroup.position.x = THREE.MathUtils.lerp(
              startWorld.x,
              targetSlot.x,
              p,
            );
            meshGroup.position.z = THREE.MathUtils.lerp(
              startWorld.z,
              targetSlot.z,
              p,
            );
            meshGroup.position.y =
              THREE.MathUtils.lerp(startWorld.y, targetSlot.y, p) +
              Math.sin(p * Math.PI) * 1.5;
          },
        },
        0,
      );
      tl.fromTo(
        meshGroup.scale,
        { x: 1.22, y: 0.78, z: 1.22 },
        { x: 1, y: 1, z: 1, duration: 0.45, ease: 'elastic.out(1, 0.4)' },
        0,
      );
      actors.activeItemTweens[key] = tl;
    };

    const targetBoatX =
      gameState.boatSide === 'left' ? BOAT_X_LEFT : BOAT_X_RIGHT;
    const isUndoOrReset =
      gameState.moves === 0 || gameState.moves < actors.prevMoves;
    const isForwardCrossing =
      gameState.moves > actors.prevMoves &&
      gameState.boatSide !== actors.prevBoatSide;

    actors.prevMoves = gameState.moves;
    actors.prevBoatSide = gameState.boatSide;

    if (isUndoOrReset) {
      // Immediate clean restoration on Undo [U] or Reset [R]
      actors.boatCrossingTl?.kill();
      gsap.killTweensOf(boatGroup.position);
      actors.cutsceneActive = 'none';
      actors.crossingPassenger = null;

      boatGroup.position.x = targetBoatX;
      const boatFacingY =
        gameState.boatSide === 'left' ? Math.PI / 2 : -Math.PI / 2;
      pakTani.group.rotation.set(0, boatFacingY, 0);

      ITEM_ORDER.forEach((key) => {
        actors.activeItemTweens[key]?.kill();
        actors.isBoarding[key] = false;
        const meshGroup = items[key];
        if (gameState.boatPassenger === key) {
          if (meshGroup.parent !== passengerSlot) {
            passengerSlot.add(meshGroup);
          }
          meshGroup.position.set(0, 0, 0);
          meshGroup.rotation.set(0, boatFacingY, 0);
          meshGroup.scale.set(1, 1, 1);
        } else {
          const onLeft = gameState.leftBank.includes(key);
          animateItemToBank(key, onLeft ? 'left' : 'right', false);
        }
      });

      const camScale = getAspectCameraScale(actors.camera.aspect);
      const camYScale = 1 + (camScale - 1) * 0.78;
      actors.cameraGoalPos.set(0, 10.8 * camYScale, 17.5 * camScale);
      actors.cameraGoalLook.set(0, 1.0, 0);
      actors.useScriptedCamera = true;
      return;
    }

    if (isForwardCrossing) {
      // =======================================================================
      // 2-PHASE BOAT CROSSING CHOREOGRAPHY:
      // Phase 1: Passenger is attached to `passengerSlot` (inside `boatGroup`'s coordinate system)
      //          and animates as a single hierarchical unit with the boat while Pak Tani rows across!
      // Phase 2: Only after `boatGroup` arrives at `targetBoatX` does the passenger detach to `scene`
      //          and hop onto the destination island!
      // =======================================================================
      actors.boatCrossingTl?.kill();
      gsap.killTweensOf(boatGroup.position);

      const lastLog = gameState.moveLog[gameState.moveLog.length - 1];
      const carriedPassenger: ItemType | null = lastLog?.passenger ?? null;
      const toSide = gameState.boatSide;
      const travelFacingY = toSide === 'right' ? Math.PI / 2 : -Math.PI / 2;

      actors.crossingPassenger = carriedPassenger;
      pakTani.group.rotation.set(0, travelFacingY, 0);

      // Ensure non-carried items stay on their respective banks
      ITEM_ORDER.forEach((key) => {
        if (key === carriedPassenger) return;
        const onLeft = gameState.leftBank.includes(key);
        const expectedBank: BankSide = onLeft ? 'left' : 'right';
        if (items[key].parent !== scene) {
          animateItemToBank(key, expectedBank, true);
        } else {
          const targetSlot =
            expectedBank === 'left'
              ? LEFT_BANK_SLOTS[key]
              : RIGHT_BANK_SLOTS[key];
          if (items[key].position.distanceTo(targetSlot) > 0.15) {
            animateItemToBank(key, expectedBank, false);
          }
        }
      });

      let boardDelay = 0;
      if (carriedPassenger !== null) {
        const passengerMesh = items[carriedPassenger];
        const activeTl = actors.activeItemTweens[carriedPassenger];
        if (passengerMesh.parent !== passengerSlot) {
          // If triggered via Teacher Demo Mode before boarding, hop into `passengerSlot` first!
          animateItemToBoat(carriedPassenger, travelFacingY);
          boardDelay = 0.38;
        } else if (actors.isBoarding[carriedPassenger] && activeTl) {
          // If the user clicked an item and immediately pressed [Spasi] while the boarding jump is mid-air,
          // let the jump into `passengerSlot` finish first before the boat pushes off the dock!
          boardDelay = Math.max(0.05, activeTl.duration() - activeTl.time());
        } else {
          // Already seated in `passengerSlot`: lock to local (0, 0, 0) in boat coordinate space!
          activeTl?.kill();
          actors.isBoarding[carriedPassenger] = false;
          gsap.killTweensOf(passengerMesh.position);
          gsap.killTweensOf(passengerMesh.scale);
          passengerMesh.position.set(0, 0, 0);
          passengerMesh.rotation.set(0, travelFacingY, 0);
          passengerMesh.scale.set(1, 1, 1);
        }
      }

      // Gently pan camera to follow Pak Tani's boat across the river
      const camScale = getAspectCameraScale(actors.camera.aspect);
      const camYScale = 1 + (camScale - 1) * 0.78;
      actors.cameraGoalPos.set(
        toSide === 'right' ? 1.8 : -1.8,
        10.2 * camYScale,
        16.8 * camScale,
      );
      actors.cameraGoalLook.set(
        toSide === 'right' ? 1.2 : -1.2,
        1.0,
        0,
      );
      actors.useScriptedCamera = true;

      const crossingTl = gsap.timeline({ delay: boardDelay });
      crossingTl.to(boatGroup.position, {
        x: targetBoatX,
        duration: 0.92,
        ease: 'power2.inOut',
        onStart: () => {
          // Guarantee passenger is locked inside `passengerSlot` (boat coordinate system) during rowing
          if (carriedPassenger !== null) {
            const passengerMesh = items[carriedPassenger];
            actors.activeItemTweens[carriedPassenger]?.kill();
            actors.isBoarding[carriedPassenger] = false;
            if (passengerMesh.parent !== passengerSlot) {
              passengerSlot.add(passengerMesh);
            }
            passengerMesh.position.set(0, 0, 0);
            passengerMesh.rotation.set(0, travelFacingY, 0);
            passengerMesh.scale.set(1, 1, 1);
          }
          spawnWaterRipple(boatGroup.position.x, boatGroup.position.z, 0.6, 2.5, 1.15);
        },
        onComplete: () => {
          // Boat has arrived at the destination pier!
          actors.crossingPassenger = null;
          const nextFacingY = toSide === 'left' ? Math.PI / 2 : -Math.PI / 2;
          pakTani.group.rotation.set(0, nextFacingY, 0);
          spawnWaterRipple(boatGroup.position.x, boatGroup.position.z, 0.65, 2.6, 1.25);

          const curScale = getAspectCameraScale(actors.camera.aspect);
          const curYScale = 1 + (curScale - 1) * 0.78;

          if (gameState.conflict !== 'none' && gameState.conflictBank) {
            // Conflict on the unattended bank left behind!
            actors.cutsceneActive = gameState.conflict;
            const focusX = gameState.conflictBank === 'left' ? -6.5 : 6.35;
            actors.cutsceneAnchor.set(focusX, 2.35, 0);
            actors.cameraGoalPos.set(
              focusX * 0.75,
              6.8 * Math.min(1.3, curYScale),
              10.5 * Math.min(1.4, curScale),
            );
            actors.cameraGoalLook.set(focusX, 1.0, 0);
            actors.useScriptedCamera = true;
            callbacksRef.current.onCrossingComplete();
          } else if (carriedPassenger !== null) {
            // Phase 2: Now that Pak Tani's boat has docked, detach from boat and jump onto the island!
            animateItemToBank(carriedPassenger, toSide, true, () => {
              if (gameState.isVictory) {
                actors.cameraGoalPos.set(
                  5.4,
                  7.2 * Math.min(1.3, curYScale),
                  11.5 * Math.min(1.4, curScale),
                );
                actors.cameraGoalLook.set(7.5, 1.3, 0);
                actors.useScriptedCamera = true;
              } else {
                actors.cameraGoalPos.set(0, 10.8 * curYScale, 17.5 * curScale);
                actors.cameraGoalLook.set(0, 1.0, 0);
              }
              callbacksRef.current.onCrossingComplete();
            });
          } else {
            actors.cameraGoalPos.set(0, 10.8 * curYScale, 17.5 * curScale);
            actors.cameraGoalLook.set(0, 1.0, 0);
            callbacksRef.current.onCrossingComplete();
          }
        },
      });
      actors.boatCrossingTl = crossingTl;
      return;
    }

    // =========================================================================
    // BOARDING / UNLOADING ON CURRENT BANK (NO BOAT CROSSING)
    // =========================================================================
    // Guard: if a boat crossing is currently active, never prematurely detach the crossing passenger!
    if (actors.crossingPassenger !== null) {
      return;
    }

    actors.cutsceneActive = gameState.conflict;
    const currentBoatFacingY =
      gameState.boatSide === 'left' ? Math.PI / 2 : -Math.PI / 2;

    ITEM_ORDER.forEach((key) => {
      const meshGroup = items[key];
      const isInBoat = gameState.boatPassenger === key;
      const isOnLeft = gameState.leftBank.includes(key);
      const targetBank: BankSide = isOnLeft ? 'left' : 'right';

      if (isInBoat) {
        if (meshGroup.parent !== passengerSlot) {
          animateItemToBoat(key, currentBoatFacingY);
        }
      } else {
        if (meshGroup.parent !== scene) {
          animateItemToBank(key, targetBank, true);
        } else {
          const targetSlot =
            targetBank === 'left' ? LEFT_BANK_SLOTS[key] : RIGHT_BANK_SLOTS[key];
          if (
            meshGroup.position.distanceTo(targetSlot) > 0.15 &&
            gameState.conflict === 'none'
          ) {
            animateItemToBank(key, targetBank, false);
          }
        }
      }
    });
  }, [gameState]);

  const cutsceneSpeechText =
    gameState.conflict === 'wolf_eats_goat'
      ? 'Waduh! Serigalanya mengejar Kambing karena Pak Tani tidak ada di sana untuk menjaga!'
      : gameState.conflict === 'goat_eats_cabbage'
        ? 'Nyam nyam nyam! Kambingnya kenyang memakan habis Sayur-Sayuran segar milik Pak Tani!'
        : '';

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Dedicated WebGL Mount Container */}
      <div
        ref={mountRef}
        data-testid="river-webgl-canvas"
        className="w-full h-full"
      />

      {/* Projected 3D Floating Character Badges & Interaction Onomatopoeia Popups */}
      <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
        {ITEM_ORDER.map((itemKey) => {
          const meta = ITEMS_META[itemKey];
          const clickable = canToggleItem(gameState, itemKey) && !isCrossing;
          const lastLog = gameState.moveLog[gameState.moveLog.length - 1];
          const isRidingCrossing = isCrossing && lastLog?.passenger === itemKey;
          const isInBoat = gameState.boatPassenger === itemKey || isRidingCrossing;

          return (
            <button
              key={itemKey}
              ref={(el) => {
                badgeRefs.current[itemKey] = el;
              }}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSelectItem(itemKey)}
              aria-label={`Pilih ${meta.name} di pulau`}
              className={`pointer-events-auto absolute top-0 left-0 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold tracking-tight transition-opacity whitespace-nowrap backdrop-blur-md ${
                isInBoat
                  ? 'bg-amber-300/90 text-slate-950 border-2 border-slate-900 shadow-[0_3px_0_rgba(15,23,42,0.9)] cursor-pointer hover:bg-amber-200'
                  : clickable
                    ? 'bg-white/85 text-slate-900 border-2 border-slate-900/90 shadow-[0_3px_0_rgba(15,23,42,0.88)] cursor-pointer hover:bg-emerald-50/95'
                    : 'bg-slate-900/70 text-white border border-slate-600/80 opacity-65 cursor-default'
              }`}
              style={{ opacity: 0 }}
            >
              {/* Floating Onomatopoeia Reaction Bubble when Clicked/Loaded */}
              <span
                ref={(el) => {
                  reactionRefs.current[itemKey] = el;
                }}
                data-testid={`reaction-bubble-${itemKey}`}
                className="pointer-events-none absolute -top-2 left-1/2 bg-amber-200/95 backdrop-blur-sm text-slate-950 border-2 border-slate-900 shadow-[0_2px_0_#0f172a] px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-display font-extrabold whitespace-nowrap transition-all duration-150"
                style={{
                  opacity: 0,
                  transform: 'translate(-50%, -90%) scale(0.85)',
                }}
              >
                {ITEM_REACTION_TEXT[itemKey]}
              </span>
              <span className="hidden sm:inline">{meta.name}</span>
              <span className="inline sm:hidden">
                {itemKey === 'cabbage' ? '1. Sayur' : meta.name}
              </span>
              {isInBoat && (
                <span className="hidden sm:inline ml-1 text-[10px] font-extrabold text-amber-950">
                  · Di Perahu
                </span>
              )}
            </button>
          );
        })}

        {/* Projected Comic Speech Bubble during Failure Cutscenes */}
        <div
          ref={bubbleRef}
          className="pointer-events-none absolute top-0 left-0 max-w-[260px] sm:max-w-sm bg-amber-100/90 backdrop-blur-md border-2 border-slate-900 shadow-[0_6px_0_rgba(15,23,42,0.9)] rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-slate-900 transition-opacity duration-200"
          style={{ opacity: 0 }}
        >
          <p className="font-display text-xs sm:text-base font-bold leading-snug">
            {cutsceneSpeechText}
          </p>
        </div>
      </div>
    </div>
  );
};
