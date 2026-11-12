import React from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Lightbulb,
  Maximize2,
  Minimize2,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Sun,
  Sunrise,
  Undo2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  GameState,
  ITEMS_META,
  ITEM_ORDER,
  ItemType,
  LightingMode,
  calculateStars,
  canToggleItem,
  getItemLocation,
  getSocraticHint,
} from '../game/rules';

interface ClassroomHUDProps {
  gameState: GameState;
  shellState: 'title' | 'playing' | 'paused' | 'gameover';
  lightingMode: LightingMode;
  isMuted: boolean;
  isFullscreen: boolean;
  isCrossing: boolean;
  isOrbiting: boolean;
  elapsedSeconds: number;
  isDockCollapsed: boolean;
  isWhiteboardOpen: boolean;
  showHintBanner: boolean;
  fullscreenNotice?: string | null;
  onSelectItem: (item: ItemType) => void;
  onRowBoat: () => void;
  onUndo: () => void;
  onReset: () => void;
  onCycleLighting: () => void;
  onResetCamera: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onTogglePause: () => void;
  onReturnTitle: () => void;
  onToggleDock: () => void;
  onToggleWhiteboard: () => void;
  onToggleHint: () => void;
}

const MOBILE_SHORT_NAMES: Record<ItemType, string> = {
  cabbage: '1. Sayur',
  wolf: '2. Serigala',
  goat: '3. Kambing',
};

/**
 * Custom Code-Authored Inline SVG Icons matching the 3D in-world models 1-to-1
 */
export const ItemSvgIcon: React.FC<{ item: ItemType; className?: string }> = ({
  item,
  className = 'w-8 h-8',
}) => {
  if (item === 'cabbage') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        {/* Green Sawi / Leafy Veggies */}
        <circle
          cx="10"
          cy="10"
          r="5"
          fill="#22c55e"
          stroke="#1e293b"
          strokeWidth="1.8"
        />
        {/* Orange Carrot */}
        <path
          d="M14 5l4 2-3 7-2-1 1-8z"
          fill="#f97316"
          stroke="#1e293b"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Red Tomato */}
        <circle
          cx="15.5"
          cy="11.5"
          r="3.2"
          fill="#ef4444"
          stroke="#1e293b"
          strokeWidth="1.6"
        />
        {/* Wooden Harvest Basket */}
        <path
          d="M3.5 13.5h17l-2 6.5h-13l-2-6.5z"
          fill="#b45309"
          stroke="#1e293b"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (item === 'wolf') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        {/* Stylized Charcoal Wolf Head with Pointy Ears & Amber Eyes */}
        <path
          d="M5 4l4 5h6l4-5 1 9-4 6H8l-4-6 1-9z"
          fill="#475569"
          stroke="#1e293b"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="9.5" cy="12" r="1.4" fill="#facc15" />
        <circle cx="14.5" cy="12" r="1.4" fill="#facc15" />
        <polygon points="10,16 14,16 12,18.5" fill="#0f172a" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {/* Curved Golden Goat Horns */}
      <path
        d="M8 7C6 4 4 5 4 7"
        fill="none"
        stroke="#d97706"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M16 7c2-3 4-2 4 0"
        fill="none"
        stroke="#d97706"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Fluffy Cream Goat Head */}
      <rect
        x="6"
        y="7"
        width="12"
        height="11"
        rx="4"
        fill="#fffbeb"
        stroke="#1e293b"
        strokeWidth="2"
      />
      <circle cx="9.5" cy="12" r="1.3" fill="#0f172a" />
      <circle cx="14.5" cy="12" r="1.3" fill="#0f172a" />
      {/* Little Chin Beard */}
      <path
        d="M10.5 18l1.5 3 1.5-3"
        fill="#fde68a"
        stroke="#1e293b"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
};

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const ClassroomHUD: React.FC<ClassroomHUDProps> = ({
  gameState,
  shellState,
  lightingMode,
  isMuted,
  isFullscreen,
  isCrossing,
  isOrbiting,
  elapsedSeconds,
  isDockCollapsed,
  isWhiteboardOpen,
  showHintBanner,
  fullscreenNotice,
  onSelectItem,
  onRowBoat,
  onUndo,
  onReset,
  onCycleLighting,
  onResetCamera,
  onToggleMute,
  onToggleFullscreen,
  onTogglePause,
  onReturnTitle,
  onToggleDock,
  onToggleWhiteboard,
  onToggleHint,
}) => {
  if (shellState === 'title') return null;

  const hint = getSocraticHint(gameState);

  const lightingLabels: Record<LightingMode, string> = {
    day: 'Siang',
    dusk: 'Senja',
    night: 'Malam',
  };

  // Compute live river crossing summary for both the compact inline bar & Papan Tulis Logika drawer
  const lastLog = gameState.moveLog[gameState.moveLog.length - 1];
  const transitPassenger = isCrossing ? (lastLog?.passenger ?? null) : null;
  const displayPassenger = gameState.boatPassenger ?? transitPassenger;
  const displayLeft = transitPassenger
    ? gameState.leftBank.filter((id) => id !== transitPassenger)
    : gameState.leftBank;
  const displayRight = transitPassenger
    ? gameState.rightBank.filter((id) => id !== transitPassenger)
    : gameState.rightBank;
  const boatStatusText = isCrossing
    ? 'Menyeberang'
    : gameState.boatSide === 'left'
      ? 'Kiri'
      : 'Kanan';

  const isNight = lightingMode === 'night';
  const shouldAutoDim =
    (isCrossing || isOrbiting) && !isWhiteboardOpen && !showHintBanner;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2 sm:p-4">
      {/* =====================================================================
          TOP PERIMETER CLUSTER: LEFT (COMPACT IMMERSIVE STATUS + PAPAN LOGIKA)
          + RIGHT (TEACHER HINT, LIGHTING, CAMERA, UNDO/RESET, AUDIO, PAUSE & FULL SCREEN)
         ===================================================================== */}
      <div
        className={`flex flex-wrap lg:flex-nowrap items-start justify-between gap-1.5 sm:gap-2 hud-auto-focus ${
          shouldAutoDim ? 'hud-auto-focus-dimmed' : ''
        }`}
      >
        {/* Top-Left Cluster: Single-Line Frosted Glass Hero Move Counter + Compact Inline Map + Papan Logika Toggle */}
        <div
          data-testid="hud-top-left"
          className="flex flex-col gap-2 pointer-events-auto shrink-0 max-w-full"
        >
          <div
            className={`flex items-center gap-1.5 sm:gap-2 rounded-2xl px-2.5 sm:px-3 py-1 sm:py-1.5 whitespace-nowrap ${
              isNight ? 'glass-dock-night text-white' : 'glass-dock text-slate-900'
            }`}
          >
            {/* Hero-to-Kicker Typographic Hierarchy (~2.5:1 scale & tabular-nums) */}
            <div
              className={`flex items-baseline gap-1 sm:gap-1.5 pr-1.5 sm:pr-2 border-r-2 ${
                isNight ? 'border-slate-600' : 'border-slate-300/90'
              }`}
            >
              <span
                className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                  isNight ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                LANGKAH
              </span>
              <span
                data-testid="hud-moves-count"
                className={`font-display font-bold text-lg sm:text-2xl leading-none tabular-nums ${
                  isNight ? 'text-amber-300' : 'text-slate-900'
                }`}
              >
                {Math.round(gameState.moves)}
              </span>
              <span
                className={`text-[10px] sm:text-[11px] font-semibold tabular-nums ${
                  isNight ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                /7
              </span>
            </div>

            {/* Elapsed Time */}
            <div
              className={`flex items-baseline gap-1 sm:gap-1.5 pr-1.5 sm:pr-2 border-r-2 ${
                isNight ? 'border-slate-600' : 'border-slate-300/90'
              }`}
            >
              <span
                className={`hidden xs:inline text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                  isNight ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                WAKTU
              </span>
              <span
                className={`font-mono-tabular font-bold text-xs sm:text-sm ${
                  isNight ? 'text-slate-100' : 'text-slate-800'
                }`}
              >
                {formatTime(elapsedSeconds)}
              </span>
            </div>

            {/* Compact Default-Immersive Inline River Status (Unobstructed 3D View by Default) */}
            <div
              data-testid="compact-river-status"
              className={`hidden md:flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                isNight
                  ? 'bg-slate-800/80 border-slate-600 text-slate-200'
                  : 'bg-white/75 border-slate-300 text-slate-700'
              }`}
            >
              <span>Kiri:{displayLeft.length}</span>
              <span aria-hidden="true" className="opacity-50">
                ·
              </span>
              <span className={isNight ? 'text-sky-300' : 'text-sky-700'}>
                {displayPassenger
                  ? ITEMS_META[displayPassenger].name.replace(/^\d+\.\s*/, '')
                  : 'Perahu'}
              </span>
              <span aria-hidden="true" className="opacity-50">
                ·
              </span>
              <span className={isNight ? 'text-emerald-300' : 'text-emerald-700'}>
                Kanan:{displayRight.length}/3
              </span>
            </div>

            {/* Toggle Detailed Papan Tulis Logika Drawer */}
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleWhiteboard();
              }}
              aria-expanded={isWhiteboardOpen}
              title="Buka/Tutup Papan Tulis Logika [L]"
              className={`neo-btn min-h-[34px] sm:min-h-[36px] px-2 sm:px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                isWhiteboardOpen
                  ? 'bg-amber-300 text-slate-950'
                  : 'bg-white/90 hover:bg-white text-slate-900'
              }`}
            >
              <span className="hidden sm:inline">Papan Logika</span>
              <span className="inline sm:hidden">Peta</span>
              {isWhiteboardOpen ? (
                <ChevronUp className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              )}
            </button>
          </div>

          {/* Collapsible "Papan Tulis Logika" Mini-Map & Step-by-Step History Log */}
          {isWhiteboardOpen && (
            <div
              data-testid="logic-whiteboard-panel"
              className="glass-dock rounded-2xl p-3 sm:p-3.5 text-slate-900 w-[calc(100vw-1rem)] max-w-sm sm:w-96"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-slate-300/80">
                <span className="font-display font-bold text-xs sm:text-sm text-slate-900">
                  Peta Status Penyeberangan
                </span>
                <span className="text-[11px] sm:text-xs font-semibold text-slate-700">
                  Target: 7 Langkah
                </span>
              </div>

              {/* [Tepi Awal] --- [Perahu] ---> [Seberang Rumah] Diagram */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center bg-white/80 border-2 border-slate-300 rounded-xl p-2 mb-2">
                {/* Tepi Awal */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 mb-1">
                    Tepi Awal ({displayLeft.length})
                  </span>
                  <div className="flex items-center justify-center gap-1 min-h-6">
                    {displayLeft.length === 0 ? (
                      <span className="text-[11px] text-slate-400">Kosong</span>
                    ) : (
                      displayLeft.map((id) => (
                        <span
                          key={id}
                          className="text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded px-1.5 py-0.5"
                        >
                          {ITEMS_META[id].number}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Perahu */}
                <div className="flex flex-col items-center border-x border-slate-300 px-1">
                  <span className="text-[10px] sm:text-[11px] font-bold text-sky-700 mb-1">
                    Perahu ({boatStatusText})
                  </span>
                  <div className="flex items-center justify-center min-h-6">
                    <span className="text-[11px] sm:text-xs font-bold text-sky-950 bg-sky-100/90 border border-sky-400 rounded px-1.5 py-0.5 whitespace-nowrap">
                      {displayPassenger
                        ? `${ITEMS_META[displayPassenger].name}`
                        : 'Pak Tani'}
                    </span>
                  </div>
                </div>

                {/* Seberang Rumah */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 mb-1">
                    Seberang ({displayRight.length})
                  </span>
                  <div className="flex items-center justify-center gap-1 min-h-6">
                    {displayRight.length === 0 ? (
                      <span className="text-[11px] text-slate-400">Kosong</span>
                    ) : (
                      displayRight.map((id) => (
                        <span
                          key={id}
                          className="text-xs font-bold text-emerald-950 bg-emerald-100/90 border border-emerald-400 rounded px-1.5 py-0.5"
                        >
                          {ITEMS_META[id].number}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Move Log */}
              <div className="max-h-24 sm:max-h-28 overflow-y-auto space-y-1 text-xs">
                {gameState.moveLog.length === 0 ? (
                  <p className="text-slate-600 italic text-[11px] sm:text-xs">
                    Belum ada langkah. Pilih 1. Sayur-Sayuran, 2. Serigala, atau 3. Kambing!
                  </p>
                ) : (
                  gameState.moveLog.map((entry) => (
                    <div
                      key={entry.step}
                      className="flex items-center justify-between py-0.5 text-slate-800 border-b border-slate-200/70 last:border-none"
                    >
                      <span className="font-medium">{entry.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Top-Right Cluster: Frosted Glass Controls + Full Screen Toggle at Top-Right Corner */}
        <div
          data-testid="hud-top-right"
          className={`flex flex-nowrap items-center justify-end gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-2xl pointer-events-auto ml-auto shrink-0 ${
            isNight ? 'glass-dock-night' : 'glass-dock'
          }`}
        >
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleHint();
            }}
            aria-label="Petunjuk Guru"
            title="Petunjuk Guru"
            className={`neo-btn min-h-[34px] sm:min-h-[36px] px-2 sm:px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              showHintBanner
                ? 'bg-amber-300 text-slate-950'
                : 'bg-white/90 text-slate-900 hover:bg-amber-100'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="hidden sm:inline">Petunjuk</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleLighting();
            }}
            aria-label={`Ubah Cuaca Cahaya (Saat ini: ${lightingLabels[lightingMode]})`}
            title={`Ubah Cuaca Cahaya (Saat ini: ${lightingLabels[lightingMode]})`}
            className="neo-btn bg-white/90 hover:bg-white text-slate-900 min-h-[34px] sm:min-h-[36px] px-2 py-1 rounded-xl text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer"
          >
            {lightingMode === 'day' && <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
            {lightingMode === 'dusk' && <Sunrise className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
            {lightingMode === 'night' && <Moon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
            <span className="hidden md:inline">{lightingLabels[lightingMode]}</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onResetCamera();
            }}
            aria-label="Reset Kamera"
            title="Reset Kamera"
            className="neo-btn bg-white/90 hover:bg-white text-slate-900 min-h-[34px] sm:min-h-[36px] px-2 py-1 rounded-xl text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-slate-700 shrink-0" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onUndo();
            }}
            disabled={gameState.history.length === 0 || isCrossing}
            aria-label="Mundur 1 Langkah [U]"
            title="Mundur 1 Langkah [U]"
            className="neo-btn bg-white/90 hover:bg-white text-slate-900 min-h-[34px] sm:min-h-[36px] px-2 py-1 rounded-xl text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">[U]</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onReset();
            }}
            aria-label="Ulang dari Awal [R]"
            title="Ulang dari Awal [R]"
            className="neo-btn bg-white/90 hover:bg-white text-slate-900 min-h-[34px] sm:min-h-[36px] px-2 py-1 rounded-xl text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">[R]</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            data-testid="soundscape-toggle-hud"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={
              isMuted
                ? 'Nyalakan Musik Kalimba & Suara Sungai [M]'
                : 'Matikan Musik Kalimba & Suara Sungai [M]'
            }
            title={
              isMuted
                ? 'Nyalakan Musik Kalimba & Suara Sungai [M]'
                : 'Matikan Musik Kalimba & Suara Sungai [M]'
            }
            className="neo-btn bg-white/90 hover:bg-white text-slate-900 min-h-[34px] sm:min-h-[36px] px-2 py-1 rounded-xl text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            )}
            <span className="hidden lg:inline">{isMuted ? 'Mati' : 'Kalimba'}</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onTogglePause();
            }}
            aria-label="Jeda Permainan [P]"
            title="Jeda Permainan [P]"
            className="neo-btn bg-white/90 hover:bg-white text-slate-900 min-h-[34px] sm:min-h-[36px] px-2 py-1 rounded-xl cursor-pointer flex items-center justify-center"
          >
            <Pause className="w-3.5 h-3.5 shrink-0" />
          </button>

          {/* Dedicated Full Screen Toggle Button in the Top-Right Corner */}
          <button
            type="button"
            tabIndex={-1}
            data-testid="fullscreen-toggle-hud"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleFullscreen();
            }}
            aria-label={isFullscreen ? 'Keluar dari Layar Penuh [F]' : 'Layar Penuh [F]'}
            title={isFullscreen ? 'Keluar dari Layar Penuh [F]' : 'Layar Penuh [F]'}
            className={`neo-btn min-h-[34px] sm:min-h-[36px] px-2 sm:px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 sm:gap-1.5 whitespace-nowrap cursor-pointer ${
              isFullscreen
                ? 'bg-amber-300 text-slate-950 hover:bg-amber-200'
                : 'bg-sky-100/95 hover:bg-sky-200 text-slate-950'
            }`}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-slate-950 shrink-0" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-sky-800 shrink-0" />
            )}
            <span className="hidden sm:inline">
              {isFullscreen ? 'Keluar Penuh' : 'Layar Penuh'}
            </span>
            <span className="hidden md:inline font-mono-tabular text-[10px] font-bold bg-slate-900 text-white px-1 py-0.5 rounded">
              [F]
            </span>
          </button>
        </div>
      </div>

      {/* Optional Non-Blocking Fullscreen Notice Pill (e.g. if browser/iframe restricts Fullscreen) */}
      {fullscreenNotice && (
        <div
          role="status"
          className="mx-auto glass-pill rounded-xl px-4 py-1.5 text-xs font-bold text-slate-900 pointer-events-auto"
        >
          {fullscreenNotice}
        </div>
      )}

      {/* =====================================================================
          CONTEXTUAL BANNER: SOCRATIC TEACHER HINT
         ===================================================================== */}
      {showHintBanner && shellState === 'playing' && (
        <div className="mx-auto max-w-2xl w-full pointer-events-auto my-1.5 sm:my-2 px-1">
          <div
            data-testid="teacher-hint-banner"
            className="glass-dock rounded-2xl p-3 sm:p-4 text-slate-900 flex items-start justify-between gap-3"
          >
            <div>
              <div className="font-display font-bold text-xs sm:text-base text-amber-950 mb-0.5 sm:mb-1">
                {hint.title}
              </div>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed mb-1">
                {hint.message}
              </p>
              <p className="text-[11px] sm:text-xs font-bold text-emerald-900">
                Saran Guru: {hint.keyInsight}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleHint}
              aria-label="Tutup Petunjuk"
              className="p-1.5 text-slate-600 hover:text-slate-950 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          UNIFIED COLLAPSIBLE BOTTOM FROSTED-GLASS CONTROL DOCK (MOBILE & DESKTOP)
         ===================================================================== */}
      {shellState === 'playing' && (
        <div
          className={`mx-auto w-full max-w-[1140px] flex flex-col items-center pointer-events-auto mt-auto hud-auto-focus ${
            shouldAutoDim ? 'hud-auto-focus-dimmed' : ''
          }`}
        >
          {/* Collapse / Expand "Mode Fokus 3D" Toggle Tab */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleDock();
            }}
            className="neo-btn glass-pill hover:bg-white text-slate-900 px-3 sm:px-3.5 py-1 rounded-t-xl border-b-0 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {isDockCollapsed ? (
              <Eye className="w-3.5 h-3.5 text-sky-700 shrink-0" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-slate-700 shrink-0" />
            )}
            <span className="hidden sm:inline">
              {isDockCollapsed
                ? '▴ Tampilkan Kontrol [H]'
                : '▾ Mode Fokus 3D / Sembunyikan Kontrol [H]'}
            </span>
            <span className="inline sm:hidden">
              {isDockCollapsed ? '▴ Tampilkan Kontrol' : '▾ Sembunyikan Kontrol'}
            </span>
          </button>

          {!isDockCollapsed && (
            <div
              data-testid="hud-bottom-dock"
              className={`w-full rounded-2xl p-2 sm:p-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 sm:gap-2.5 ${
                isNight ? 'glass-dock-night' : 'glass-dock'
              }`}
            >
              {/* 3 Item Action Buttons: 3-Column Thumb Grid on Mobile, Flex Row on Desktop */}
              <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5 flex-1">
                {ITEM_ORDER.map((itemKey) => {
                  const meta = ITEMS_META[itemKey];
                  const isRidingCrossing =
                    isCrossing && lastLog?.passenger === itemKey;
                  const loc = isRidingCrossing
                    ? 'boat'
                    : getItemLocation(gameState, itemKey);
                  const enabled = canToggleItem(gameState, itemKey) && !isCrossing;
                  const isInBoat = loc === 'boat';

                  const locText =
                    loc === 'boat'
                      ? 'Di Perahu'
                      : loc === 'left'
                        ? 'Tepi Awal'
                        : 'Seberang';

                  return (
                    <button
                      key={itemKey}
                      type="button"
                      data-testid={`item-card-${itemKey}`}
                      disabled={!enabled}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSelectItem(itemKey);
                      }}
                      className={`neo-btn sm:flex-1 sm:min-w-[184px] min-h-[58px] sm:min-h-[54px] px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-xl flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-1 sm:gap-2 cursor-pointer ${
                        isInBoat
                          ? 'bg-amber-300/95 text-slate-950'
                          : enabled
                            ? 'bg-white/90 hover:bg-emerald-50/95 text-slate-900'
                            : 'bg-slate-200/75 text-slate-500'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2.5 min-w-0 w-full sm:w-auto">
                        <div
                          className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border ${
                            isInBoat
                              ? 'bg-amber-100 border-amber-500'
                              : enabled
                                ? 'bg-slate-100/90 border-slate-300'
                                : 'bg-slate-200/60 border-slate-300'
                          }`}
                        >
                          <ItemSvgIcon
                            item={itemKey}
                            className="w-5 h-5 sm:w-8 sm:h-8 shrink-0"
                          />
                        </div>
                        <div className="text-center sm:text-left min-w-0 w-full sm:w-auto">
                          <div className="font-display font-bold text-[11px] sm:text-sm xl:text-base leading-tight whitespace-nowrap">
                            <span className="hidden sm:inline">{meta.name}</span>
                            <span className="inline sm:hidden">
                              {MOBILE_SHORT_NAMES[itemKey]}
                            </span>
                          </div>
                          <div className="text-[10px] sm:text-[11px] font-semibold text-slate-600 truncate">
                            {locText}
                          </div>
                        </div>
                      </div>
                      <span className="hidden sm:inline font-mono-tabular text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded-md shrink-0">
                        [{meta.keyHint}]
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Primary Boat Rowing CTA Button (Full-Width Thumb Button on Mobile, Inline CTA on Desktop) */}
              <button
                type="button"
                data-testid="row-boat-button"
                disabled={isCrossing || gameState.conflict !== 'none' || gameState.isVictory}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onRowBoat();
                }}
                className="neo-btn w-full lg:w-auto justify-center bg-sky-400 hover:bg-sky-300 text-slate-950 font-display font-bold text-sm sm:text-base min-h-[46px] px-4 sm:px-5 py-2.5 sm:py-3.5 rounded-xl flex items-center gap-2.5 whitespace-nowrap cursor-pointer"
              >
                <span>
                  {isCrossing
                    ? 'Sedang Mendayung...'
                    : gameState.boatSide === 'left'
                      ? 'Dayung Perahu ke Seberang →'
                      : '← Dayung Perahu ke Tepi Awal'}
                </span>
                <span className="hidden sm:inline font-mono-tabular text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded-md">
                  [Spasi]
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          OUTCOME-MATCHED STATUS MODALS: PAUSE, CONFLICT FAILURE, & VICTORY
         ===================================================================== */}
      {shellState === 'paused' && (
        <div className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm pointer-events-auto flex items-center justify-center p-4">
          <div className="glass-dock rounded-3xl max-w-md w-full p-5 sm:p-6 text-slate-900 text-center">
            <h2 className="font-display font-bold text-xl sm:text-2xl mb-2">
              Permainan Dijeda
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 mb-5">
              Istirahat sejenak atau lanjutkan teka-teki penyeberangan sungai Pak Tani.
            </p>
            <div className="grid grid-cols-2 gap-3 bg-white/85 border-2 border-slate-900 rounded-2xl p-3 mb-5">
              <div>
                <div className="text-[11px] font-bold uppercase text-slate-500">
                  LANGKAH SAAT INI
                </div>
                <div className="font-display font-bold text-2xl tabular-nums">
                  {gameState.moves}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase text-slate-500">
                  DI SEBERANG RUMAH
                </div>
                <div className="font-display font-bold text-2xl tabular-nums">
                  {gameState.rightBank.length} / 3
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={onTogglePause}
                className="neo-btn bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-display font-bold min-h-[44px] px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Lanjutkan</span>
              </button>
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="neo-btn bg-sky-100 hover:bg-sky-200 text-slate-950 font-display font-bold min-h-[44px] px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
                <span>{isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}</span>
              </button>
              <button
                type="button"
                onClick={onReset}
                className="neo-btn bg-white hover:bg-slate-100 text-slate-900 font-display font-bold min-h-[44px] px-4 py-2.5 rounded-xl cursor-pointer"
              >
                Ulang dari Awal
              </button>
              <button
                type="button"
                onClick={onReturnTitle}
                className="neo-btn bg-amber-200 hover:bg-amber-300 text-slate-900 font-display font-bold min-h-[44px] px-4 py-2.5 rounded-xl cursor-pointer"
              >
                Layar Utama
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Failure Modal ("Ups, Belum Tepat!") */}
      {shellState === 'gameover' && gameState.conflict !== 'none' && (
        <div
          data-testid="conflict-modal"
          className="fixed inset-x-0 bottom-4 sm:bottom-6 z-40 pointer-events-auto flex justify-center px-3 sm:px-4"
        >
          <div className="bg-rose-50/90 backdrop-blur-md neo-card rounded-3xl max-w-xl w-full p-4 sm:p-6 text-slate-900">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2 mb-2.5 sm:mb-3">
              <h2 className="font-display font-bold text-lg sm:text-2xl text-rose-900">
                Ups, Belum Tepat!
              </h2>
              <span className="text-xs font-bold text-rose-800">
                Langkah ke-{gameState.moves} · Di{' '}
                {gameState.conflictBank === 'left' ? 'Tepi Awal' : 'Seberang Rumah'}
              </span>
            </div>

            <p className="text-xs sm:text-base text-slate-800 font-medium leading-relaxed mb-4">
              {gameState.conflict === 'wolf_eats_goat'
                ? 'Waduh! Serigala dan Kambing ditinggal berdua tanpa Pak Tani, sehingga Serigala langsung mengejar Kambing!'
                : 'Nyam nyam nyam! Kambing dan keranjang Sayur-Sayuran ditinggal berdua tanpa Pak Tani, sehingga Kambing memakan habis Sayur-Sayuran segar!'}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                data-start="true"
                onClick={onUndo}
                className="neo-btn flex-1 sm:flex-initial justify-center bg-amber-300 hover:bg-amber-200 text-slate-950 font-display font-bold text-xs sm:text-base min-h-[44px] px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <Undo2 className="w-4 h-4 shrink-0" />
                <span>Mundur 1 Langkah [U]</span>
              </button>

              <button
                type="button"
                onClick={onReset}
                className="neo-btn flex-1 sm:flex-initial justify-center bg-white hover:bg-slate-100 text-slate-900 font-display font-bold text-xs sm:text-base min-h-[44px] px-4 py-2.5 sm:py-3 rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>Ulang dari Awal [R]</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory Celebration Modal ("Luar Biasa! Detektif Logika Berhasil!") */}
      {shellState === 'gameover' && gameState.isVictory && (
        <div
          data-testid="victory-modal"
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm pointer-events-auto flex items-center justify-center p-4"
        >
          <div className="glass-dock rounded-3xl max-w-lg w-full p-5 sm:p-8 text-slate-900 text-center">
            {/* 3-Star SVG Badge */}
            <div className="flex items-center justify-center gap-2 mb-3">
              {[1, 2, 3].map((starIdx) => {
                const earned = starIdx <= calculateStars(gameState.moves);
                return (
                  <svg
                    key={starIdx}
                    viewBox="0 0 24 24"
                    className="w-9 h-9 sm:w-10 sm:h-10"
                    aria-hidden="true"
                  >
                    <polygon
                      points="12,2 15.1,8.3 22,9.3 17,14.1 18.2,21 12,17.7 5.8,21 7,14.1 2,9.3 8.9,8.3"
                      fill={earned ? '#facc15' : '#e2e8f0'}
                      stroke="#1e293b"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                );
              })}
            </div>

            <h2 className="font-display font-bold text-xl sm:text-3xl text-slate-900 mb-2">
              Luar Biasa! Detektif Logika Berhasil!
            </h2>
            <p className="text-xs sm:text-base text-slate-800 mb-5">
              Pak Tani berhasil menyeberangkan <strong>1. Sayur-Sayuran</strong>,{' '}
              <strong>2. Serigala</strong>, dan <strong>3. Kambing</strong> dengan
              selamat sampai ke rumah!
            </p>

            {/* Mastery Metrics (Moves, Optimal Target, Time Elapsed) */}
            <div className="grid grid-cols-3 gap-2 bg-white/85 border-2 border-slate-900 rounded-2xl p-3 mb-5 sm:mb-6">
              <div>
                <div className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-500">
                  TOTAL LANGKAH
                </div>
                <div className="font-display font-bold text-xl sm:text-2xl text-emerald-700 tabular-nums">
                  {gameState.moves}
                </div>
              </div>
              <div className="border-x border-slate-200">
                <div className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-500">
                  TARGET OPTIMAL
                </div>
                <div className="font-display font-bold text-xl sm:text-2xl text-slate-900 tabular-nums">
                  7
                </div>
              </div>
              <div>
                <div className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-500">
                  WAKTU SELESAI
                </div>
                <div className="font-mono-tabular font-bold text-lg sm:text-xl text-slate-900">
                  {formatTime(elapsedSeconds)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                data-start="true"
                onClick={onReset}
                className="neo-btn bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-display font-bold text-sm sm:text-base min-h-[46px] px-6 py-3 rounded-2xl flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Main Lagi</span>
              </button>
              <button
                type="button"
                onClick={onReturnTitle}
                className="neo-btn bg-white hover:bg-slate-100 text-slate-900 font-display font-bold text-sm sm:text-base min-h-[46px] px-5 py-3 rounded-2xl cursor-pointer"
              >
                Layar Utama
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
