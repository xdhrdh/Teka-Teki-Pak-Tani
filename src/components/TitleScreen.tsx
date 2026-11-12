import React from 'react';
import { Maximize2, Minimize2, Play, Volume2, VolumeX } from 'lucide-react';

interface TitleScreenProps {
  isMuted: boolean;
  isFullscreen: boolean;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onStartGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  isMuted,
  isFullscreen,
  onToggleMute,
  onToggleFullscreen,
  onStartGame,
}) => {
  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-3.5 sm:p-8">
      {/* Top-Right Bar: Procedural Kalimba & River Soundscape + Full Screen Toggle */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          data-testid="soundscape-toggle-title"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Nyalakan Musik Kalimba & Suara Sungai' : 'Matikan Musik Kalimba & Suara Sungai'}
          className="pointer-events-auto neo-btn bg-white/85 backdrop-blur-md hover:bg-white text-slate-900 min-h-[42px] px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-600 shrink-0" /> : <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          <span className="hidden xs:inline sm:inline">
            {isMuted ? 'Musik: Mati' : 'Musik Kalimba & Sungai'}
          </span>
          <span className="inline xs:hidden sm:hidden">
            {isMuted ? 'Mati' : 'Musik'}
          </span>
        </button>

        <button
          type="button"
          data-testid="fullscreen-toggle-title"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Keluar dari Layar Penuh [F]' : 'Layar Penuh [F]'}
          title={isFullscreen ? 'Keluar dari Layar Penuh [F]' : 'Layar Penuh [F]'}
          className={`pointer-events-auto neo-btn min-h-[42px] px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap cursor-pointer backdrop-blur-md ${
            isFullscreen
              ? 'bg-amber-300/90 text-slate-950 hover:bg-amber-200'
              : 'bg-white/85 hover:bg-white text-slate-900'
          }`}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-slate-900 shrink-0" />
          ) : (
            <Maximize2 className="w-4 h-4 text-sky-700 shrink-0" />
          )}
          <span>{isFullscreen ? 'Keluar Penuh' : 'Layar Penuh'}</span>
          <span className="hidden sm:inline font-mono-tabular text-[11px] font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded">
            [F]
          </span>
        </button>
      </div>

      {/* Responsive Hero Title Lockup over 3D Live World Tour */}
      <div className="my-auto w-full max-w-xl mx-auto sm:mx-0 pointer-events-auto">
        <div className="glass-dock rounded-3xl p-4 sm:p-8">
          {/* Custom Inline SVG Title Emblem */}
          <div className="mb-3 sm:mb-4">
            <svg
              viewBox="0 0 540 120"
              className="w-full h-auto max-h-24 sm:max-h-28 overflow-visible"
              role="img"
              aria-label="Teka-Teki Sungai Pak Tani: Serigala, Kambing & Kol"
            >
              {/* Decorative Wooden Plaque Banner */}
              <rect
                x="4"
                y="6"
                width="532"
                height="108"
                rx="22"
                fill="#fef3c7"
                stroke="#1e293b"
                strokeWidth="5"
              />
              <rect
                x="14"
                y="14"
                width="512"
                height="92"
                rx="16"
                fill="#fde68a"
                stroke="#d97706"
                strokeWidth="3"
                strokeDasharray="8 6"
              />
              {/* Conical Caping Hat Emblem on Left */}
              <g transform="translate(56, 60)">
                <circle cx="0" cy="0" r="30" fill="#38bdf8" stroke="#1e293b" strokeWidth="3.5" />
                <path
                  d="M -24 6 L 0 -18 L 24 6 Z"
                  fill="#eab308"
                  stroke="#1e293b"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                <path
                  d="M -18 14 Q 0 24 18 14"
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </g>
              {/* Main Display Title */}
              <text
                x="104"
                y="54"
                fill="#1e293b"
                fontFamily="Fredoka, Plus Jakarta Sans, sans-serif"
                fontWeight="700"
                fontSize="29"
              >
                Teka-Teki Sungai Pak Tani
              </text>
              <text
                x="104"
                y="86"
                fill="#b45309"
                fontFamily="Fredoka, Plus Jakarta Sans, sans-serif"
                fontWeight="700"
                fontSize="20"
              >
                1. Sayur-Sayuran  ·  2. Serigala  ·  3. Kambing
              </text>
            </svg>
          </div>

          <p className="text-slate-800 text-xs sm:text-base font-medium leading-relaxed mb-4 sm:mb-6">
            Bantu <strong className="text-slate-950">Pak Tani</strong> menyeberangkan{' '}
            <strong className="text-emerald-800">1. Sayur-Sayuran</strong>,{' '}
            <strong className="text-slate-900">2. Serigala</strong>, dan{' '}
            <strong className="text-amber-800">3. Kambing</strong> ke rumah di seberang sungai.
            Perahu hanya muat <strong className="text-slate-950">1 penumpang</strong> bersama Pak Tani!
          </p>

          {/* Primary Action Button (Thumb-Friendly Full-Width on Mobile, Auto on Desktop) */}
          <div className="flex items-center">
            <button
              type="button"
              data-start="true"
              onClick={onStartGame}
              className="neo-btn w-full sm:w-auto justify-center bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-display font-bold text-base sm:text-lg min-h-[48px] px-7 py-3.5 rounded-2xl flex items-center gap-2.5 whitespace-nowrap cursor-pointer"
            >
              <Play className="w-5 h-5 fill-slate-950 shrink-0" />
              <span>Mulai Bermain</span>
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Control Hint Pill at Bottom */}
      <div className="text-slate-900 glass-pill rounded-2xl px-3.5 py-2 self-center sm:self-start text-[11px] sm:text-sm font-semibold tracking-tight text-center sm:text-left">
        <span className="hidden sm:inline">
          Pintasan Proyektor Kelas: [1] Sayur-Sayuran · [2] Serigala · [3] Kambing · [Spasi] Dayung · [H] Mode Fokus · [F] Layar Penuh
        </span>
        <span className="inline sm:hidden">
          Sentuh objek 3D atau tombol di bawah untuk menaikkan ke perahu & mendayung!
        </span>
      </div>
    </div>
  );
};
