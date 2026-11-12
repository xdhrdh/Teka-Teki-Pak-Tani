/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  GameState,
  ItemType,
  LightingMode,
  canToggleItem,
  createInitialState,
  rowBoat,
  toggleLoadItem,
  undoLastMove,
} from './game/rules';
import { soundEngine } from './audio/SoundEngine';
import { RiverCrossingCanvas } from './components/RiverCrossingCanvas';
import { TitleScreen } from './components/TitleScreen';
import { ClassroomHUD } from './components/ClassroomHUD';

type ShellState = 'title' | 'playing' | 'paused' | 'gameover';

export default function App() {
  const [shellState, setShellState] = useState<ShellState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'playing';
      }
    }
    return 'title';
  });

  const [gameState, setGameState] = useState<GameState>(() => createInitialState());
  const [lightingMode, setLightingMode] = useState<LightingMode>('day');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fullscreenNotice, setFullscreenNotice] = useState<string | null>(null);
  const [isCrossing, setIsCrossing] = useState<boolean>(false);
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  // Default Immersive Mode: Papan Tulis Logika starts collapsed so the 3D Left Bank is 100% unobstructed
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState<boolean>(false);
  const [showHintBanner, setShowHintBanner] = useState<boolean>(false);
  const [cameraResetTrigger, setCameraResetTrigger] = useState<number>(0);
  const [interactionTrigger, setInteractionTrigger] = useState<{
    item: ItemType;
    seq: number;
  } | null>(null);

  const crossingTimeoutRef = useRef<number | null>(null);
  const noticeTimeoutRef = useRef<number | null>(null);

  // Sync shell state to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = shellState;
  }, [shellState]);

  // Keep isFullscreen state synced with browser Fullscreen API events (including Esc / F11)
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      if (noticeTimeoutRef.current !== null) {
        clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  // Toggle Full Screen Mode [F]
  const handleToggleFullscreen = useCallback(async () => {
    soundEngine.playClick();
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        } else {
          setIsFullscreen((prev) => !prev);
        }
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Graceful fallback if embedded iframe restricts native fullscreen
      setIsFullscreen((prev) => !prev);
      setFullscreenNotice('Mode tampilan layar penuh dioptimalkan untuk jendela ini');
      if (noticeTimeoutRef.current !== null) {
        clearTimeout(noticeTimeoutRef.current);
      }
      noticeTimeoutRef.current = window.setTimeout(() => {
        setFullscreenNotice(null);
      }, 2400);
    }
  }, []);

  // Game Timer during 'playing'
  useEffect(() => {
    if (shellState !== 'playing') return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [shellState]);

  const clearCrossingTimeout = () => {
    if (crossingTimeoutRef.current !== null) {
      clearTimeout(crossingTimeoutRef.current);
      crossingTimeoutRef.current = null;
    }
  };

  // Start Game Handler
  const handleStartGame = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    clearCrossingTimeout();
    setGameState(createInitialState());
    setElapsedSeconds(0);
    setIsCrossing(false);
    setShowHintBanner(false);
    setShellState('playing');
    soundEngine.playClick();
    soundEngine.startAmbientBgm();
  }, []);

  // Select / Toggle Item (1. Sayur-Sayuran, 2. Serigala, 3. Kambing)
  const handleSelectItem = useCallback(
    (item: ItemType) => {
      if (shellState !== 'playing' || isCrossing) return;
      if (!canToggleItem(gameState, item)) return;
      const isLoading = gameState.boatPassenger !== item;
      soundEngine.playItemSound(item, isLoading);
      setInteractionTrigger((prev) => ({
        item,
        seq: (prev?.seq ?? 0) + 1,
      }));
      setGameState((prev) => {
        if (!canToggleItem(prev, item)) return prev;
        return toggleLoadItem(prev, item);
      });
    },
    [shellState, isCrossing, gameState],
  );

  // Finish crossing callback (from GSAP boat animation or fallback timer)
  const finalizeCrossingOutcome = useCallback((nextState: GameState) => {
    setIsCrossing(false);
    if (nextState.conflict !== 'none') {
      soundEngine.playFailureCutscene(nextState.conflict);
      setShellState('gameover');
    } else if (nextState.isVictory) {
      soundEngine.playVictoryFanfare();
      setShellState('gameover');
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
        });
      } catch {}
    }
  }, []);

  // Row Boat Across the River
  const handleRowBoat = useCallback(() => {
    if (shellState !== 'playing' || isCrossing) return;
    setGameState((prev) => {
      if (prev.conflict !== 'none' || prev.isVictory) return prev;
      const hasPassenger = prev.boatPassenger !== null;
      const next = rowBoat(prev);
      setIsCrossing(true);
      soundEngine.playRowingSplashes();

      clearCrossingTimeout();
      // Full crossing takes ~0.92s + 0.45s passenger disembark hop when carrying an item
      const crossingDurationMs = hasPassenger ? 1450 : 980;
      crossingTimeoutRef.current = window.setTimeout(() => {
        finalizeCrossingOutcome(next);
      }, crossingDurationMs);

      return next;
    });
  }, [shellState, isCrossing, finalizeCrossingOutcome]);

  // Undo 1 Step (Restores exact state before the mistake)
  const handleUndo = useCallback(() => {
    clearCrossingTimeout();
    setIsCrossing(false);
    soundEngine.playClick();
    setGameState((prev) => undoLastMove(prev));
    setShellState('playing');
  }, []);

  // Reset to Beginning
  const handleReset = useCallback(() => {
    clearCrossingTimeout();
    setIsCrossing(false);
    soundEngine.playClick();
    setGameState(createInitialState());
    setElapsedSeconds(0);
    setShellState('playing');
  }, []);

  // Cycle Lighting (Siang -> Senja -> Malam)
  const handleCycleLighting = useCallback(() => {
    soundEngine.playClick();
    setLightingMode((prev) =>
      prev === 'day' ? 'dusk' : prev === 'dusk' ? 'night' : 'day',
    );
  }, []);

  // Toggle Procedural Soundscape & Audio Mute
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      if (!next) {
        soundEngine.startAmbientBgm();
        soundEngine.playClick();
      }
      return next;
    });
  }, []);

  // Global Classroom & Desktop Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      // Full Screen Toggle [F] works across all screens
      if (e.code === 'KeyF') {
        e.preventDefault();
        handleToggleFullscreen();
        return;
      }

      // Title Screen Start Handshake (Enter or Space)
      if (shellState === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartGame();
        }
        return;
      }

      // Pause Toggle (Escape or P)
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (shellState === 'playing') {
          e.preventDefault();
          setShellState('paused');
        } else if (shellState === 'paused') {
          e.preventDefault();
          setShellState('playing');
        }
        return;
      }

      // Undo [U] and Reset [R] work in both 'playing' and 'gameover'
      if (e.code === 'KeyU') {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (e.code === 'KeyR') {
        e.preventDefault();
        handleReset();
        return;
      }

      if (shellState !== 'playing') return;

      if (e.code === 'Digit1' || e.code === 'Numpad1') {
        e.preventDefault();
        handleSelectItem('cabbage');
      } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault();
        handleSelectItem('wolf');
      } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
        e.preventDefault();
        handleSelectItem('goat');
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleRowBoat();
      } else if (e.code === 'KeyH') {
        e.preventDefault();
        setIsDockCollapsed((prev) => !prev);
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        setIsWhiteboardOpen((prev) => !prev);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleMute();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    shellState,
    handleStartGame,
    handleSelectItem,
    handleRowBoat,
    handleUndo,
    handleReset,
    handleToggleMute,
    handleToggleFullscreen,
  ]);

  return (
    <main className="relative w-screen h-screen h-[100dvh] overflow-hidden select-none">
      {/* 3D Interactive River Crossing Viewport */}
      <RiverCrossingCanvas
        gameState={gameState}
        shellState={shellState}
        lightingMode={lightingMode}
        isCrossing={isCrossing}
        cameraResetTrigger={cameraResetTrigger}
        interactionTrigger={interactionTrigger}
        onSelectItem={handleSelectItem}
        onRowBoat={handleRowBoat}
        onCrossingComplete={() => {}}
        onOrbitChange={setIsOrbiting}
      />

      {/* Title Screen Overlay */}
      {shellState === 'title' && (
        <TitleScreen
          isMuted={isMuted}
          isFullscreen={isFullscreen}
          onToggleMute={handleToggleMute}
          onToggleFullscreen={handleToggleFullscreen}
          onStartGame={handleStartGame}
        />
      )}

      {/* Classroom & Mobile-Responsive HUD Overlay */}
      <ClassroomHUD
        gameState={gameState}
        shellState={shellState}
        lightingMode={lightingMode}
        isMuted={isMuted}
        isFullscreen={isFullscreen}
        isCrossing={isCrossing}
        isOrbiting={isOrbiting}
        elapsedSeconds={elapsedSeconds}
        isDockCollapsed={isDockCollapsed}
        isWhiteboardOpen={isWhiteboardOpen}
        showHintBanner={showHintBanner}
        fullscreenNotice={fullscreenNotice}
        onSelectItem={handleSelectItem}
        onRowBoat={handleRowBoat}
        onUndo={handleUndo}
        onReset={handleReset}
        onCycleLighting={handleCycleLighting}
        onResetCamera={() => setCameraResetTrigger((c) => c + 1)}
        onToggleMute={handleToggleMute}
        onToggleFullscreen={handleToggleFullscreen}
        onTogglePause={() =>
          setShellState((s) => (s === 'paused' ? 'playing' : 'paused'))
        }
        onReturnTitle={() => {
          clearCrossingTimeout();
          setIsCrossing(false);
          setShellState('title');
        }}
        onToggleDock={() => setIsDockCollapsed((c) => !c)}
        onToggleWhiteboard={() => setIsWhiteboardOpen((o) => !o)}
        onToggleHint={() => {
          soundEngine.playClick();
          setShowHintBanner((h) => !h);
        }}
      />
    </main>
  );
}
