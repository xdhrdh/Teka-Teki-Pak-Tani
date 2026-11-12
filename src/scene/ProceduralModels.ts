import * as THREE from 'three';

/**
 * Generates a procedural radial soft contact shadow texture.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.55)');
  grad.addColorStop(0.6, 'rgba(15, 23, 42, 0.22)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates a procedural wood plank texture for piers, boat, and house timber.
 */
export function createWoodTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#92400e';
  ctx.fillRect(0, 0, 256, 256);

  // Wood grain streaks
  for (let i = 0; i < 48; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(120, 53, 15, 0.35)' : 'rgba(180, 83, 9, 0.28)';
    const y = (i / 48) * 256;
    ctx.fillRect(0, y, 256, 3 + (i % 3));
  }

  // Plank seams
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 3;
  for (let y = 0; y < 256; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates the Easter Egg Classroom Whiteboard marker sketch texture:
 * Shows stickman Pak Tani in Caping hat, sailboat on waves, and the 3 numbered circles (1. Kol, 2. Serigala, 3. Kambing).
 */
export function createWhiteboardSketchTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 340;
  const ctx = canvas.getContext('2d')!;

  // Whiteboard glossy off-white surface
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 340);

  // Subtle grid lines
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let x = 0; x < 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 340);
    ctx.stroke();
  }
  for (let y = 0; y < 340; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Header marker text
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('PAPAN TULIS LOGIKA PAK TANI', 68, 40);

  // Underline
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(68, 50);
  ctx.lineTo(445, 50);
  ctx.stroke();

  // Draw 3 numbered item circles on the left
  const items = [
    { num: '1', label: 'Sayur', y: 110, color: '#16a34a' },
    { num: '2', label: 'Serigala', y: 185, color: '#334155' },
    { num: '3', label: 'Kambing', y: 260, color: '#d97706' },
  ];

  items.forEach((it) => {
    ctx.strokeStyle = it.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(75, it.y, 26, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = it.color;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(it.num, 68, it.y + 8);

    ctx.font = 'bold 17px sans-serif';
    ctx.fillText(it.label, 112, it.y + 6);
  });

  // Draw stickman Pak Tani with conical Caping hat in center boat
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  // Boat hull
  ctx.beginPath();
  ctx.moveTo(225, 225);
  ctx.lineTo(355, 225);
  ctx.lineTo(335, 258);
  ctx.lineTo(245, 258);
  ctx.closePath();
  ctx.stroke();

  // Stickman body & head
  ctx.beginPath();
  ctx.arc(285, 165, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(285, 179);
  ctx.lineTo(285, 225);
  ctx.stroke();

  // Conical Caping hat
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.moveTo(255, 156);
  ctx.lineTo(285, 132);
  ctx.lineTo(315, 156);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Blue river waves
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 4;
  for (let w = 0; w < 3; w++) {
    const wy = 278 + w * 16;
    ctx.beginPath();
    ctx.moveTo(205, wy);
    ctx.quadraticCurveTo(245, wy - 10, 285, wy);
    ctx.quadraticCurveTo(325, wy + 10, 365, wy);
    ctx.stroke();
  }

  // Draw House sketch on the right
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 4;
  // Roof
  ctx.beginPath();
  ctx.moveTo(395, 165);
  ctx.lineTo(445, 120);
  ctx.lineTo(495, 165);
  ctx.closePath();
  ctx.stroke();
  // Walls
  ctx.strokeStyle = '#1e293b';
  ctx.strokeRect(408, 165, 74, 68);

  // Dashed arrow from boat to house
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = '#16a34a';
  ctx.beginPath();
  ctx.moveTo(335, 195);
  ctx.lineTo(395, 195);
  ctx.stroke();
  ctx.setLineDash([]);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates a festive banner texture above Pak Tani's house.
 */
export function createBannerTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 10;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.fillStyle = '#78350f';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('RUMAH PAK TANI', 256, 76);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * 1. Builds Pak Tani (The Farmer) as a multi-part hierarchical THREE.Group:
 * Traditional conical hat (Caping), head, eyes, traditional Lurik tunic, trousers, arms, and wooden oar.
 */
export function buildPakTani(): {
  group: THREE.Group;
  oarPivot: THREE.Group;
  headGroup: THREE.Group;
} {
  const group = new THREE.Group();
  group.name = 'PakTani';

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xe0ac69,
    roughness: 0.65,
    metalness: 0.05,
  });
  const tunicMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e, // Deep teal woven tunic
    roughness: 0.8,
    metalness: 0.05,
  });
  const sashMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Batik gold sash
    roughness: 0.5,
    metalness: 0.15,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.85,
    metalness: 0.05,
  });
  const capingMat = new THREE.MeshStandardMaterial({
    color: 0xeab308, // Woven bamboo yellow-gold
    roughness: 0.75,
    metalness: 0.1,
  });
  const capingRimMat = new THREE.MeshStandardMaterial({
    color: 0xa16207,
    roughness: 0.5,
    metalness: 0.1,
  });

  // Legs (grounded at y=0)
  const legGeo = new THREE.CylinderGeometry(0.11, 0.1, 0.45, 10);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.14, 0.225, 0);
  leftLeg.castShadow = true;

  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.set(0.14, 0.225, 0);
  rightLeg.castShadow = true;
  group.add(leftLeg, rightLeg);

  // Torso Tunic
  const torsoGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.62, 12);
  const torso = new THREE.Mesh(torsoGeo, tunicMat);
  torso.position.set(0, 0.72, 0);
  torso.castShadow = true;
  group.add(torso);

  // Waist Sash
  const sashGeo = new THREE.CylinderGeometry(0.285, 0.285, 0.12, 12);
  const sash = new THREE.Mesh(sashGeo, sashMat);
  sash.position.set(0, 0.52, 0);
  group.add(sash);

  // Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.22, 0);

  const headGeo = new THREE.SphereGeometry(0.24, 16, 16);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // Eyes & Friendly Mustache
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.2,
  });
  const eyeGeo = new THREE.SphereGeometry(0.038, 8, 8);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.08, 0.03, 0.21);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.08, 0.03, 0.21);
  headGroup.add(leftEye, rightEye);

  // Conical Caping Hat (Primary iconic silhouette)
  const capingConeGeo = new THREE.ConeGeometry(0.56, 0.34, 16);
  const capingCone = new THREE.Mesh(capingConeGeo, capingMat);
  capingCone.position.set(0, 0.26, 0);
  capingCone.castShadow = true;
  headGroup.add(capingCone);

  const capingRimGeo = new THREE.TorusGeometry(0.55, 0.03, 8, 24);
  const capingRim = new THREE.Mesh(capingRimGeo, capingRimMat);
  capingRim.rotation.x = Math.PI / 2;
  capingRim.position.set(0, 0.1, 0);
  headGroup.add(capingRim);

  const capingTopKnob = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 8, 8),
    capingRimMat,
  );
  capingTopKnob.position.set(0, 0.43, 0);
  headGroup.add(capingTopKnob);

  group.add(headGroup);

  // Arms & Oar Pivot
  const armGeo = new THREE.CylinderGeometry(0.075, 0.065, 0.44, 8);
  const leftArm = new THREE.Mesh(armGeo, tunicMat);
  leftArm.position.set(-0.32, 0.8, 0.08);
  leftArm.rotation.z = 0.3;
  leftArm.rotation.x = -0.4;
  group.add(leftArm);

  const oarPivot = new THREE.Group();
  oarPivot.position.set(0.32, 0.85, 0.1);

  const rightArm = new THREE.Mesh(armGeo, tunicMat);
  rightArm.position.set(0, -0.12, 0.08);
  rightArm.rotation.x = -0.6;
  oarPivot.add(rightArm);

  // Wooden Oar (Dayung)
  const oarWoodMat = new THREE.MeshStandardMaterial({
    color: 0x92400e,
    roughness: 0.6,
    metalness: 0.1,
  });
  const oarShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, 1.55, 8),
    oarWoodMat,
  );
  oarShaft.position.set(0.08, -0.35, 0.22);
  oarShaft.rotation.z = -0.38;
  oarShaft.rotation.x = 0.25;
  oarShaft.castShadow = true;

  const oarBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.45, 0.04),
    oarWoodMat,
  );
  oarBlade.position.set(0.32, -0.92, 0.38);
  oarBlade.rotation.z = -0.38;
  oarBlade.rotation.x = 0.25;
  oarPivot.add(oarShaft, oarBlade);

  group.add(oarPivot);

  return { group, oarPivot, headGroup };
}

/**
 * Generates a tileable procedural river water texture with turquoise depth gradients,
 * shimmering caustic bands, and subtle surface ripple highlights.
 */
export function createWaterTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base turquoise-aqua river color
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#0284c7');
  grad.addColorStop(0.5, '#0ea5e9');
  grad.addColorStop(1, '#0284c7');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Soft wavy caustic light ribbons
  for (let i = 0; i < 28; i++) {
    const yBase = (i / 28) * 512;
    ctx.strokeStyle =
      i % 3 === 0
        ? 'rgba(186, 230, 253, 0.34)'
        : i % 2 === 0
          ? 'rgba(125, 211, 252, 0.24)'
          : 'rgba(3, 105, 161, 0.22)';
    ctx.lineWidth = 4 + (i % 4) * 2;
    ctx.beginPath();
    for (let x = 0; x <= 512; x += 16) {
      const waveY =
        yBase +
        Math.sin((x / 512) * Math.PI * 4 + i * 0.9) * 14 +
        Math.cos((x / 512) * Math.PI * 2 - i * 0.5) * 8;
      if (x === 0) ctx.moveTo(x, waveY);
      else ctx.lineTo(x, waveY);
    }
    ctx.stroke();
  }

  // Sparkling sun-glint ovals
  for (let i = 0; i < 45; i++) {
    const rx = ((i * 97) % 480) + 16;
    const ry = ((i * 173) % 480) + 16;
    const rw = 14 + (i % 5) * 6;
    const rh = 3 + (i % 3) * 2;
    ctx.fillStyle = 'rgba(224, 242, 254, 0.35)';
    ctx.beginPath();
    ctx.ellipse(rx, ry, rw, rh, (i % 3) * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3.5, 3.0);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates a tileable grayscale bump map for fine water surface micro-ripples.
 */
export function createWaterBumpTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 32; i++) {
    const yBase = (i / 32) * 256;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.45)' : 'rgba(30,30,30,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= 256; x += 8) {
      const wy = yBase + Math.sin((x / 256) * Math.PI * 4 + i * 0.7) * 7;
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 4);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * 2. Builds Perahu Layar Kecil (The Sailboat) with detailed Indonesian river craft woodwork:
 * Sculpted hull, raised bow & stern stems, gunwale trim, slatted floorboards, hull ribs,
 * woven passenger mat, lifebuoy, bow lantern, rudder, rigging stays, boom spar, billowing sail,
 * and a dedicated `passengerSlot` Group in the boat's local coordinate system.
 */
export function buildSailboat(woodTex: THREE.CanvasTexture): {
  group: THREE.Group;
  sailMesh: THREE.Mesh;
  flagMesh: THREE.Mesh;
  rudderGroup: THREE.Group;
  bowLanternMat: THREE.MeshStandardMaterial;
  passengerSlot: THREE.Group;
  bowWakeGroup: THREE.Group;
} {
  const group = new THREE.Group();
  group.name = 'Sailboat';

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: woodTex,
    roughness: 0.62,
    metalness: 0.08,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x5c240a,
    roughness: 0.42,
    metalness: 0.16,
  });
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.72,
    metalness: 0.05,
  });
  const slatMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.68,
    metalness: 0.05,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.25,
    metalness: 0.75,
  });
  const ropeMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    roughness: 0.85,
    metalness: 0.02,
  });

  // Main Boat Hull (Extruded tapered riverboat profile)
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-1.75, -0.78);
  hullShape.quadraticCurveTo(0, -0.98, 1.75, -0.78);
  hullShape.lineTo(2.25, 0);
  hullShape.lineTo(1.75, 0.78);
  hullShape.quadraticCurveTo(0, 0.98, -1.75, 0.78);
  hullShape.lineTo(-2.25, 0);
  hullShape.closePath();

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: 0.44,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.09,
    bevelThickness: 0.09,
  };
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, extrudeSettings);
  hullGeo.rotateX(Math.PI / 2);
  const hullMesh = new THREE.Mesh(hullGeo, hullMat);
  hullMesh.position.y = 0.48;
  hullMesh.castShadow = true;
  hullMesh.receiveShadow = true;
  group.add(hullMesh);

  // Decorative Teal/Gold Waterline Stripe along Hull Sides
  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0x0d9488,
    roughness: 0.45,
    metalness: 0.1,
  });
  const sideStripeGeo = new THREE.BoxGeometry(3.1, 0.08, 1.78);
  const sideStripe = new THREE.Mesh(sideStripeGeo, stripeMat);
  sideStripe.position.set(0, 0.34, 0);
  group.add(sideStripe);

  // Traditional Upturned Bow & Stern Stem Finials (Lunas Haluan & Buritan Perahu)
  const stemGeo = new THREE.BoxGeometry(0.18, 0.55, 0.14);
  const bowStem = new THREE.Mesh(stemGeo, trimMat);
  bowStem.position.set(2.12, 0.58, 0);
  bowStem.rotation.z = -0.35;
  bowStem.castShadow = true;

  const sternStem = new THREE.Mesh(stemGeo, trimMat);
  sternStem.position.set(-2.12, 0.58, 0);
  sternStem.rotation.z = 0.35;
  sternStem.castShadow = true;
  group.add(bowStem, sternStem);

  // Upper Gunwale Trim Rails (Port & Starboard)
  const railGeo = new THREE.BoxGeometry(3.35, 0.07, 0.1);
  const portRail = new THREE.Mesh(railGeo, trimMat);
  portRail.position.set(0, 0.56, -0.82);
  const starboardRail = new THREE.Mesh(railGeo, trimMat);
  starboardRail.position.set(0, 0.56, 0.82);
  group.add(portRail, starboardRail);

  // Inner Deck Floor + Raised Wooden Floorboard Slats
  const deckGeo = new THREE.BoxGeometry(3.0, 0.08, 1.32);
  const deckMesh = new THREE.Mesh(deckGeo, deckMat);
  deckMesh.position.y = 0.45;
  deckMesh.receiveShadow = true;
  group.add(deckMesh);

  for (let i = -5; i <= 5; i++) {
    const slat = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.025, 1.22),
      slatMat,
    );
    slat.position.set(i * 0.25, 0.5, 0);
    slat.receiveShadow = true;
    group.add(slat);
  }

  // Internal Hull Structural Ribs (Gading-gading Perahu)
  for (let i = -2; i <= 2; i++) {
    const ribL = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.24, 0.09),
      trimMat,
    );
    ribL.position.set(i * 0.68, 0.52, -0.74);
    const ribR = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.24, 0.09),
      trimMat,
    );
    ribR.position.set(i * 0.68, 0.52, 0.74);
    group.add(ribL, ribR);
  }

  // Benches for Pak Tani (left/stern) and Passenger (right/bow)
  const benchGeo = new THREE.BoxGeometry(0.46, 0.09, 1.44);
  const leftBench = new THREE.Mesh(benchGeo, trimMat);
  leftBench.position.set(-0.78, 0.54, 0);
  leftBench.castShadow = true;
  leftBench.receiveShadow = true;

  const rightBench = new THREE.Mesh(benchGeo, trimMat);
  rightBench.position.set(0.72, 0.54, 0);
  rightBench.castShadow = true;
  rightBench.receiveShadow = true;
  group.add(leftBench, rightBench);

  // Woven Pandan Passenger Mat (Tikar Pandan) on the Passenger Bench
  const matMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.025, 0.86),
    new THREE.MeshStandardMaterial({
      color: 0x84cc16,
      roughness: 0.7,
      metalness: 0.05,
    }),
  );
  matMesh.position.set(0.72, 0.59, 0);
  matMesh.receiveShadow = true;
  group.add(matMesh);

  // Dedicated Passenger Coordinate System Slot attached directly to Boat Group
  const passengerSlot = new THREE.Group();
  passengerSlot.name = 'BoatPassengerSlot';
  passengerSlot.position.set(0.72, 0.54, 0);
  group.add(passengerSlot);

  // Coiled Mooring Rope & Brass Bollard at the Bow
  const coilTorus1 = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.035, 8, 16),
    ropeMat,
  );
  coilTorus1.rotation.x = Math.PI / 2;
  coilTorus1.position.set(1.55, 0.53, 0.22);
  const coilTorus2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.032, 8, 16),
    ropeMat,
  );
  coilTorus2.rotation.x = Math.PI / 2;
  coilTorus2.position.set(1.55, 0.57, 0.22);
  group.add(coilTorus1, coilTorus2);

  // Warm Bow Lantern on Curved Wooden Post
  const lanternPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.045, 0.62, 8),
    trimMat,
  );
  lanternPost.position.set(1.82, 0.82, -0.22);
  lanternPost.rotation.z = -0.15;
  group.add(lanternPost);

  const bowLanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });
  const bowLantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 10, 10),
    bowLanternMat,
  );
  bowLantern.position.set(1.9, 1.1, -0.22);
  const lanternCap = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.09, 8),
    brassMat,
  );
  lanternCap.position.set(1.9, 1.2, -0.22);
  group.add(bowLantern, lanternCap);

  // Classic Red & White Lifebuoy Ring on the Hull Side
  const lifebuoyGroup = new THREE.Group();
  lifebuoyGroup.position.set(-0.15, 0.44, 0.89);
  const buoyTorus = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.06, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 }),
  );
  lifebuoyGroup.add(buoyTorus);
  for (let b = 0; b < 4; b++) {
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.14, 0.14),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }),
    );
    const angle = (b / 4) * Math.PI * 2;
    band.position.set(Math.cos(angle) * 0.2, Math.sin(angle) * 0.2, 0);
    band.rotation.z = angle;
    lifebuoyGroup.add(band);
  }
  group.add(lifebuoyGroup);

  // Stern Rudder & Tiller (Kemudi Belakang)
  const rudderGroup = new THREE.Group();
  rudderGroup.position.set(-2.22, 0.35, 0);
  const rudderBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.36, 0.05),
    trimMat,
  );
  rudderBlade.position.set(-0.14, -0.05, 0);
  const tillerBar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.48, 6),
    slatMat,
  );
  tillerBar.rotation.z = Math.PI / 2 - 0.25;
  tillerBar.position.set(0.14, 0.2, 0);
  rudderGroup.add(rudderBlade, tillerBar);
  group.add(rudderGroup);

  // Wooden Mast with Brass Mast Collar & Rope Lashings
  const mastGeo = new THREE.CylinderGeometry(0.055, 0.08, 2.65, 10);
  const mast = new THREE.Mesh(mastGeo, trimMat);
  mast.position.set(0, 1.76, -0.45);
  mast.castShadow = true;
  group.add(mast);

  const mastCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.13, 0.14, 10),
    brassMat,
  );
  mastCollar.position.set(0, 0.54, -0.45);
  group.add(mastCollar);

  // Horizontal Wooden Boom Spar at bottom of sail
  const boomSpar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.042, 1.42, 8),
    slatMat,
  );
  boomSpar.rotation.z = Math.PI / 2 - 0.1;
  boomSpar.position.set(0.68, 1.16, -0.45);
  boomSpar.castShadow = true;
  group.add(boomSpar);

  // Rigging Shroud Lines from Mast Top to Gunwales
  const stayGeo = new THREE.CylinderGeometry(0.012, 0.012, 2.45, 6);
  const stayLeft = new THREE.Mesh(stayGeo, ropeMat);
  stayLeft.position.set(-0.55, 1.65, -0.58);
  stayLeft.rotation.z = -0.44;
  stayLeft.rotation.x = 0.1;

  const stayRight = new THREE.Mesh(stayGeo, ropeMat);
  stayRight.position.set(0.55, 1.65, -0.15);
  stayRight.rotation.z = 0.44;
  stayRight.rotation.x = -0.22;
  group.add(stayLeft, stayRight);

  // Billowing Triangular Sail with Warm Decorative Stripe
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0);
  sailShape.lineTo(1.32, 0.14);
  sailShape.quadraticCurveTo(0.62, 0.98, 0, 1.72);
  sailShape.closePath();

  const sailGeo = new THREE.ExtrudeGeometry(sailShape, {
    depth: 0.035,
    bevelEnabled: true,
    bevelSize: 0.015,
    bevelThickness: 0.015,
  });
  const sailMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7, // Warm cream canvas sail
    roughness: 0.55,
    metalness: 0.02,
  });
  const sailMesh = new THREE.Mesh(sailGeo, sailMat);
  sailMesh.position.set(0.04, 1.15, -0.46);
  sailMesh.castShadow = true;
  group.add(sailMesh);

  // Red Pennant Flag at top of mast
  const flagMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.4,
  });
  const flagGeo = new THREE.ConeGeometry(0.15, 0.48, 4);
  flagGeo.rotateZ(-Math.PI / 2);
  const flagMesh = new THREE.Mesh(flagGeo, flagMat);
  flagMesh.position.set(0.22, 3.04, -0.45);
  group.add(flagMesh);

  // Attached Waterline Foam Rim & V-Wake around the Boat Hull
  const bowWakeGroup = new THREE.Group();
  bowWakeGroup.position.set(0, 0.04, 0);
  const wakeMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });

  // Elliptical foam ring hugging the boat hull waterline
  const hullFoamRing = new THREE.Mesh(
    new THREE.RingGeometry(1.05, 1.24, 24),
    wakeMat,
  );
  hullFoamRing.rotation.x = -Math.PI / 2;
  hullFoamRing.scale.set(1.95, 0.85, 1);
  bowWakeGroup.add(hullFoamRing);

  // V-shaped bow wave trails on left and right sides
  const wakeWingGeo = new THREE.BoxGeometry(1.1, 0.03, 0.12);
  const wakeWing1 = new THREE.Mesh(wakeWingGeo, wakeMat);
  wakeWing1.position.set(1.6, 0.01, -0.55);
  wakeWing1.rotation.y = 0.42;
  const wakeWing2 = new THREE.Mesh(wakeWingGeo, wakeMat);
  wakeWing2.position.set(1.6, 0.01, 0.55);
  wakeWing2.rotation.y = -0.42;
  const wakeWing3 = new THREE.Mesh(wakeWingGeo, wakeMat);
  wakeWing3.position.set(-1.6, 0.01, -0.55);
  wakeWing3.rotation.y = -0.42;
  const wakeWing4 = new THREE.Mesh(wakeWingGeo, wakeMat);
  wakeWing4.position.set(-1.6, 0.01, 0.55);
  wakeWing4.rotation.y = 0.42;
  bowWakeGroup.add(wakeWing1, wakeWing2, wakeWing3, wakeWing4);

  group.add(bowWakeGroup);

  return {
    group,
    sailMesh,
    flagMesh,
    rudderGroup,
    bowLanternMat,
    passengerSlot,
    bowWakeGroup,
  };
}

/**
  * 3. Builds 1. Sayur-Sayuran (Assorted Fresh Vegetables Basket) —
  * Lush green leafy veggies, bright orange carrots with leafy tops, ripe red tomatoes,
  * and a glossy purple eggplant nestled inside a rustic wooden harvest basket.
  */
export function buildCabbage(shadowTex: THREE.CanvasTexture): {
  group: THREE.Group;
  cabbageHead: THREE.Group;
  outerLeaves: THREE.Mesh[];
} {
  const group = new THREE.Group();
  group.name = 'cabbage';

  // Soft contact shadow disc
  const shadowMesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.66, 16),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    }),
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.015;
  group.add(shadowMesh);

  const basketMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.82,
    metalness: 0.05,
  });
  const basketRimMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.55,
    metalness: 0.1,
  });
  const coreLeafMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80, // Fresh sawi / lettuce green
    roughness: 0.45,
    metalness: 0.05,
  });
  const outerLeafMat = new THREE.MeshStandardMaterial({
    color: 0x16a34a, // Rich leafy green
    roughness: 0.6,
    metalness: 0.02,
  });
  const carrotMat = new THREE.MeshStandardMaterial({
    color: 0xf97316, // Bright carrot orange
    roughness: 0.4,
    metalness: 0.05,
  });
  const tomatoMat = new THREE.MeshStandardMaterial({
    color: 0xef4444, // Ripe tomato red
    roughness: 0.25,
    metalness: 0.08,
  });
  const eggplantMat = new THREE.MeshStandardMaterial({
    color: 0x9333ea, // Glossy purple terong / eggplant
    roughness: 0.28,
    metalness: 0.1,
  });

  // Wooden Basket Base
  const basketBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.38, 0.38, 14),
    basketMat,
  );
  basketBase.position.y = 0.19;
  basketBase.castShadow = true;
  basketBase.receiveShadow = true;
  group.add(basketBase);

  // Woven Basket Rim
  const basketRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.52, 0.055, 8, 20),
    basketRimMat,
  );
  basketRim.rotation.x = Math.PI / 2;
  basketRim.position.y = 0.38;
  group.add(basketRim);

  // Vegetable Bunch Group (wiggles, rustles leaves, and scales/chomps during Goat cutscene)
  const cabbageHead = new THREE.Group();
  cabbageHead.name = 'cabbageHead';
  cabbageHead.position.y = 0.44;

  // 1. Fresh Green Sawi / Lettuce Bunch in center-back
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 12),
    coreLeafMat,
  );
  core.position.set(-0.06, 0.05, -0.06);
  core.castShadow = true;
  cabbageHead.add(core);

  // 2. 6 Outer Crinkled Leafy Veggie Leaves around the basket rim
  const outerLeaves: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.23, 10, 10),
      outerLeafMat,
    );
    leaf.scale.set(1.18, 0.82, 0.65);
    leaf.position.set(
      Math.cos(angle) * 0.26,
      -0.02 + (i % 2) * 0.04,
      Math.sin(angle) * 0.26,
    );
    leaf.rotation.y = -angle + Math.PI / 2;
    leaf.rotation.x = 0.32;
    leaf.castShadow = true;
    cabbageHead.add(leaf);
    outerLeaves.push(leaf);
  }

  // 3. Two Bright Orange Carrots sticking out with green leafy tops
  const buildCarrot = (
    x: number,
    y: number,
    z: number,
    rotZ: number,
    rotX: number,
  ) => {
    const carrotGroup = new THREE.Group();
    carrotGroup.position.set(x, y, z);
    carrotGroup.rotation.set(rotX, 0, rotZ);

    const body = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.48, 10),
      carrotMat,
    );
    body.rotation.x = Math.PI; // Tip pointing down into basket, thick top sticking up
    body.castShadow = true;
    carrotGroup.add(body);

    // Feathery green carrot top leaves
    for (let k = 0; k < 3; k++) {
      const sprout = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.18, 6),
        coreLeafMat,
      );
      sprout.position.set(
        (k - 1) * 0.035,
        0.28,
        (k % 2 === 0 ? 1 : -1) * 0.02,
      );
      sprout.rotation.z = (k - 1) * 0.32;
      carrotGroup.add(sprout);
    }
    return carrotGroup;
  };

  cabbageHead.add(buildCarrot(0.16, 0.16, 0.1, -0.42, 0.25));
  cabbageHead.add(buildCarrot(0.04, 0.18, 0.2, -0.18, 0.45));

  // 4. Two Ripe Red Tomatoes with tiny green stems
  const buildTomato = (x: number, y: number, z: number, radius: number) => {
    const tGroup = new THREE.Group();
    tGroup.position.set(x, y, z);
    const fruit = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 12, 12),
      tomatoMat,
    );
    fruit.scale.set(1.05, 0.88, 1.05);
    fruit.castShadow = true;
    tGroup.add(fruit);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.04, 0.06, 6),
      outerLeafMat,
    );
    stem.position.y = radius * 0.85;
    tGroup.add(stem);
    return tGroup;
  };

  cabbageHead.add(buildTomato(-0.18, 0.08, 0.16, 0.16));
  cabbageHead.add(buildTomato(0.18, 0.06, -0.15, 0.14));

  // 5. Glossy Purple Eggplant (Terong) on the side
  const eggplant = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.105, 0.36, 10),
    eggplantMat,
  );
  eggplant.position.set(-0.16, 0.14, -0.14);
  eggplant.rotation.set(-0.35, 0.2, 0.45);
  eggplant.castShadow = true;
  cabbageHead.add(eggplant);

  group.add(cabbageHead);

  // Invisible raycast proxy box for easy clicking by kids
  const hitProxy = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 1.25, 1.25),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.position.y = 0.55;
  hitProxy.userData.itemType = 'cabbage';
  group.add(hitProxy);

  return { group, cabbageHead, outerLeaves };
}

/**
 * 4. Builds 2. Serigala (Wolf) — Stylized low-poly wolf with charcoal coat, pointy ears, bushy tail, and amber eyes.
 */
export function buildWolf(shadowTex: THREE.CanvasTexture): {
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  chestMesh: THREE.Mesh;
  headGroup: THREE.Group;
  snoutMesh: THREE.Mesh;
  leftEar: THREE.Mesh;
  rightEar: THREE.Mesh;
  tailMesh: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.name = 'wolf';

  const shadowMesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.72, 16),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    }),
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.015;
  group.add(shadowMesh);

  const furMat = new THREE.MeshStandardMaterial({
    color: 0x475569, // Slate charcoal coat
    roughness: 0.78,
    metalness: 0.08,
  });
  const chestMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Lighter silver chest ruff & snout underside
    roughness: 0.55,
    metalness: 0.05,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.25,
    metalness: 0.15,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15, // Expressive amber eyes
    emissive: 0xca8a04,
    emissiveIntensity: 0.25,
    roughness: 0.2,
  });

  // 4 Legs
  const legGeo = new THREE.CylinderGeometry(0.085, 0.065, 0.46, 8);
  const legPositions = [
    [-0.18, 0.23, 0.28],
    [0.18, 0.23, 0.28],
    [-0.18, 0.23, -0.28],
    [0.18, 0.23, -0.28],
  ];
  legPositions.forEach(([lx, ly, lz]) => {
    const leg = new THREE.Mesh(legGeo, furMat);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    group.add(leg);
  });

  // Main Body Torso (expands/contracts during breathing)
  const bodyMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.42, 0.85),
    furMat,
  );
  bodyMesh.position.set(0, 0.56, 0);
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // Fluffy Chest Ruff
  const chestMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 10),
    chestMat,
  );
  chestMesh.position.set(0, 0.62, 0.34);
  chestMesh.scale.set(1, 1.1, 0.85);
  group.add(chestMesh);

  // Head Group (for suspicious looking, ear twitching, & growling)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.92, 0.44);

  const headCube = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.36, 0.42),
    furMat,
  );
  headCube.castShadow = true;
  headGroup.add(headCube);

  // Long Snout + Nose
  const snoutMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.18, 0.34),
    chestMat,
  );
  snoutMesh.position.set(0, -0.05, 0.28);
  snoutMesh.castShadow = true;
  headGroup.add(snoutMesh);

  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 8),
    darkMat,
  );
  nose.position.set(0, 0.02, 0.45);
  headGroup.add(nose);

  // Pointy Ears (with bottom pivot for expressive twitching)
  const earGeo = new THREE.ConeGeometry(0.1, 0.26, 6);
  earGeo.translate(0, 0.11, 0);
  const leftEar = new THREE.Mesh(earGeo, furMat);
  leftEar.position.set(-0.14, 0.17, -0.04);
  leftEar.rotation.z = 0.15;

  const rightEar = new THREE.Mesh(earGeo, furMat);
  rightEar.position.set(0.14, 0.17, -0.04);
  rightEar.rotation.z = -0.15;
  headGroup.add(leftEar, rightEar);

  // Expressive Eyes
  const eyeGeo = new THREE.SphereGeometry(0.048, 8, 8);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.11, 0.06, 0.21);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.11, 0.06, 0.21);
  headGroup.add(leftEye, rightEye);

  group.add(headGroup);

  // Bushy Wagging Tail
  const tailGeo = new THREE.ConeGeometry(0.14, 0.56, 8);
  tailGeo.translate(0, 0.24, 0);
  const tailMesh = new THREE.Mesh(tailGeo, furMat);
  tailMesh.position.set(0, 0.62, -0.42);
  tailMesh.rotation.x = -0.85;
  tailMesh.castShadow = true;
  group.add(tailMesh);

  // Raycast proxy
  const hitProxy = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 1.35, 1.35),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.position.y = 0.65;
  hitProxy.userData.itemType = 'wolf';
  group.add(hitProxy);

  return {
    group,
    bodyMesh,
    chestMesh,
    headGroup,
    snoutMesh,
    leftEar,
    rightEar,
    tailMesh,
  };
}

/**
 * 5. Builds 3. Kambing (Goat) — Fluffy white low-poly goat with curved horns, beard, and pink ears.
 */
export function buildGoat(shadowTex: THREE.CanvasTexture): {
  group: THREE.Group;
  bodyRig: THREE.Group;
  headGroup: THREE.Group;
  beardMesh: THREE.Mesh;
  leftEar: THREE.Mesh;
  rightEar: THREE.Mesh;
  tailMesh: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.name = 'goat';

  const shadowMesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.68, 16),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    }),
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.015;
  group.add(shadowMesh);

  // Inner bodyRig allows happy hops without interfering with group.position during boat boarding
  const bodyRig = new THREE.Group();
  group.add(bodyRig);

  const woolMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc, // Fluffy crisp white
    roughness: 0.85,
    metalness: 0.02,
  });
  const hornMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Warm golden-brown horns
    roughness: 0.4,
    metalness: 0.15,
  });
  const earMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6, // Cute pink ears
    roughness: 0.55,
    metalness: 0.05,
  });
  const hoofMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.35,
    metalness: 0.1,
  });

  // 4 Legs with Hooves
  const legGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.44, 8);
  const legCoords = [
    [-0.16, 0.22, 0.24],
    [0.16, 0.22, 0.24],
    [-0.16, 0.22, -0.24],
    [0.16, 0.22, -0.24],
  ];
  legCoords.forEach(([lx, ly, lz]) => {
    const leg = new THREE.Mesh(legGeo, hoofMat);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    bodyRig.add(leg);
  });

  // Fluffy Multi-Sphere Body
  const mainBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 12, 12),
    woolMat,
  );
  mainBody.scale.set(0.95, 0.9, 1.25);
  mainBody.position.set(0, 0.58, 0);
  mainBody.castShadow = true;
  bodyRig.add(mainBody);

  const frontPuff = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 10),
    woolMat,
  );
  frontPuff.position.set(0, 0.64, 0.22);
  bodyRig.add(frontPuff);

  // Cute Little Tail
  const tailMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 8, 8),
    woolMat,
  );
  tailMesh.position.set(0, 0.68, -0.44);
  bodyRig.add(tailMesh);

  // Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.92, 0.38);

  const headMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.32, 0.42),
    woolMat,
  );
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Little White Beard (Janggut Kambing - bobs when bleating "Mbek!")
  const beardMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.22, 6),
    woolMat,
  );
  beardMesh.rotation.x = Math.PI;
  beardMesh.position.set(0, -0.22, 0.14);
  headGroup.add(beardMesh);

  // Cute Curved Horns
  const hornGeo = new THREE.TorusGeometry(0.14, 0.042, 8, 14, Math.PI * 0.85);
  const leftHorn = new THREE.Mesh(hornGeo, hornMat);
  leftHorn.position.set(-0.12, 0.2, -0.05);
  leftHorn.rotation.y = Math.PI / 2;
  leftHorn.rotation.z = 0.4;

  const rightHorn = new THREE.Mesh(hornGeo, hornMat);
  rightHorn.position.set(0.12, 0.2, -0.05);
  rightHorn.rotation.y = Math.PI / 2;
  rightHorn.rotation.z = 0.4;
  headGroup.add(leftHorn, rightHorn);

  // Pink Floppy Ears
  const earGeo = new THREE.BoxGeometry(0.18, 0.07, 0.09);
  const leftEar = new THREE.Mesh(earGeo, earMat);
  leftEar.position.set(-0.23, 0.06, -0.02);
  leftEar.rotation.z = 0.35;

  const rightEar = new THREE.Mesh(earGeo, earMat);
  rightEar.position.set(0.23, 0.06, -0.02);
  rightEar.rotation.z = -0.35;
  headGroup.add(leftEar, rightEar);

  // Eyes & Pink Nose
  const eyeGeo = new THREE.SphereGeometry(0.042, 8, 8);
  const leftEye = new THREE.Mesh(eyeGeo, hoofMat);
  leftEye.position.set(-0.11, 0.05, 0.21);
  const rightEye = new THREE.Mesh(eyeGeo, hoofMat);
  rightEye.position.set(0.11, 0.05, 0.21);
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.08, 0.06),
    earMat,
  );
  nose.position.set(0, -0.04, 0.22);
  headGroup.add(leftEye, rightEye, nose);

  bodyRig.add(headGroup);

  // Raycast proxy
  const hitProxy = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 1.35, 1.35),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.position.y = 0.65;
  hitProxy.userData.itemType = 'goat';
  group.add(hitProxy);

  return {
    group,
    bodyRig,
    headGroup,
    beardMesh,
    leftEar,
    rightEar,
    tailMesh,
  };
}

/**
 * 6. Builds the 3D Classroom Whiteboard Prop standing near the Left Bank dock.
 */
export function buildWhiteboardProp(sketchTex: THREE.CanvasTexture): THREE.Group {
  const group = new THREE.Group();
  group.name = 'WhiteboardProp';

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.6,
    metalness: 0.1,
  });
  const boardMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: sketchTex,
    roughness: 0.25,
    metalness: 0.05,
  });

  // Wooden Easel Legs
  const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8);
  const leftLeg = new THREE.Mesh(legGeo, frameMat);
  leftLeg.position.set(-0.85, 1.05, 0);
  leftLeg.rotation.z = -0.06;
  leftLeg.castShadow = true;

  const rightLeg = new THREE.Mesh(legGeo, frameMat);
  rightLeg.position.set(0.85, 1.05, 0);
  rightLeg.rotation.z = 0.06;
  rightLeg.castShadow = true;

  const backLeg = new THREE.Mesh(legGeo, frameMat);
  backLeg.position.set(0, 1.0, -0.45);
  backLeg.rotation.x = 0.35;
  backLeg.castShadow = true;
  group.add(leftLeg, rightLeg, backLeg);

  // Frame Backing
  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 1.45, 0.1),
    frameMat,
  );
  backing.position.set(0, 1.45, 0.02);
  backing.castShadow = true;
  group.add(backing);

  // Whiteboard Sketch Surface (offset slightly in +Z to avoid Z-fighting)
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(1.92, 1.28),
    boardMat,
  );
  surface.position.set(0, 1.45, 0.08);
  group.add(surface);

  // Marker Tray + Cute Colored Markers
  const tray = new THREE.Mesh(
    new THREE.BoxGeometry(1.95, 0.08, 0.18),
    frameMat,
  );
  tray.position.set(0, 0.76, 0.1);
  group.add(tray);

  return group;
}

/**
 * 7. Builds Pak Tani's Cozy House on the Right Bank with pitched roof, chimney, warm windows, and Victory Banner.
 */
export function buildCozyHouse(bannerTex: THREE.CanvasTexture): {
  group: THREE.Group;
  windowMaterial: THREE.MeshStandardMaterial;
  chimneyWorldPos: THREE.Vector3;
} {
  const group = new THREE.Group();
  group.name = 'CozyHouse';

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.9,
    metalness: 0.05,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7, // Warm cream cottage wall
    roughness: 0.75,
    metalness: 0.02,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xc2410c, // Terracotta roof tiles
    roughness: 0.6,
    metalness: 0.08,
  });
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.65,
    metalness: 0.1,
  });
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.35, // Glows brighter in dusk/night mode!
    roughness: 0.15,
    metalness: 0.1,
  });

  // Stone Foundation
  const foundation = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.35, 3.0),
    stoneMat,
  );
  foundation.position.y = 0.175;
  foundation.receiveShadow = true;
  foundation.castShadow = true;
  group.add(foundation);

  // Main Cottage Walls
  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(3.1, 2.0, 2.7),
    wallMat,
  );
  walls.position.y = 1.35;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  // Pitched Pyramid Roof
  const roofGeo = new THREE.ConeGeometry(2.75, 1.55, 4);
  roofGeo.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 3.1;
  roof.castShadow = true;
  group.add(roof);

  // Brick Chimney
  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 1.3, 0.48),
    stoneMat,
  );
  chimney.position.set(0.85, 3.35, -0.55);
  chimney.castShadow = true;
  group.add(chimney);

  // Wooden Front Door (facing Left toward the river, -X)
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 1.25, 0.72),
    timberMat,
  );
  door.position.set(-1.55, 0.98, 0);
  group.add(door);

  // Warm Glowing Windows (Front -X and Side +Z)
  const winFrontLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.58, 0.58),
    windowMaterial,
  );
  winFrontLeft.position.set(-1.55, 1.45, -0.82);

  const winFrontRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.58, 0.58),
    windowMaterial,
  );
  winFrontRight.position.set(-1.55, 1.45, 0.82);

  const winSide = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.62, 0.12),
    windowMaterial,
  );
  winSide.position.set(0, 1.45, 1.35);
  group.add(winFrontLeft, winFrontRight, winSide);

  // Victory Banner Archway beside the house
  const bannerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: bannerTex,
    roughness: 0.4,
  });
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8);
  const post1 = new THREE.Mesh(postGeo, timberMat);
  post1.position.set(-1.95, 1.1, -1.6);
  const post2 = new THREE.Mesh(postGeo, timberMat);
  post2.position.set(-1.95, 1.1, 1.6);
  const bannerSign = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.65, 2.9),
    bannerMat,
  );
  bannerSign.position.set(-1.95, 2.1, 0);
  group.add(post1, post2, bannerSign);

  const chimneyWorldPos = new THREE.Vector3(0.85, 4.05, -0.55);

  return { group, windowMaterial, chimneyWorldPos };
}

/**
 * 8. Builds a stylized low-poly composite tree with trunk and 3 layered foliage spheres.
 */
export function buildStylizedTree(scale = 1, tintHex = 0x22c55e): THREE.Group {
  const tree = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.85,
  });
  const foliageMat = new THREE.MeshStandardMaterial({
    color: tintHex,
    roughness: 0.65,
    metalness: 0.02,
  });

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16 * scale, 0.24 * scale, 1.1 * scale, 8),
    trunkMat,
  );
  trunk.position.y = 0.55 * scale;
  trunk.castShadow = true;
  tree.add(trunk);

  const c1 = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.75 * scale, 1),
    foliageMat,
  );
  c1.position.set(0, 1.35 * scale, 0);
  c1.castShadow = true;

  const c2 = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.58 * scale, 1),
    foliageMat,
  );
  c2.position.set(0.28 * scale, 1.75 * scale, 0.15 * scale);
  c2.castShadow = true;

  const c3 = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.52 * scale, 1),
    foliageMat,
  );
  c3.position.set(-0.25 * scale, 1.65 * scale, -0.18 * scale);
  c3.castShadow = true;

  tree.add(c1, c2, c3);
  return tree;
}
