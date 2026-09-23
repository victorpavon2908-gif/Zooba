import React from 'react';
import { Play, ShoppingBag, Settings, ShieldAlert, Sparkles, Crosshair, Smartphone } from 'lucide-react';
import { SectorMission } from '../types';

interface TitleScreenProps {
  mission: SectorMission;
  cash: number;
  onStartGame: () => void;
  onOpenArmory: () => void;
  onOpenSettings: () => void;
  onOpenInstall: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  mission,
  cash,
  onStartGame,
  onOpenArmory,
  onOpenSettings,
  onOpenInstall,
}) => {
  return (
    <div
      id="title-screen-root"
      className="absolute inset-0 bg-slate-950 flex flex-col justify-between p-3 sm:p-6 z-30 overflow-y-auto bg-scanlines"
      style={{
        paddingTop: 'max(12px, env(safe-area-inset-top, 12px))',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
        paddingLeft: 'max(16px, env(safe-area-inset-left, 16px))',
        paddingRight: 'max(16px, env(safe-area-inset-right, 16px))',
      }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between w-full max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-mono text-xs text-emerald-400 tracking-wider font-bold">
            SECTOR STATUS: HOSTILE
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="btn-header-install"
            onClick={onOpenInstall}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/90 border border-emerald-500/60 hover:bg-emerald-900 text-emerald-300 font-tech font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">INSTALAR</span> APK / MÓVIL
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 text-emerald-300 font-mono font-bold text-xs shadow-sm">
            <span>BALANCE:</span>
            <span>${cash.toLocaleString()}</span>
          </div>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Title & Hero Banner */}
      <div className="flex flex-col items-center text-center my-auto max-w-2xl mx-auto py-6">
        {/* Hologram Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-tech font-bold uppercase tracking-widest mb-4 shadow-lg shadow-emerald-500/10">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Extraction Looter Protocol</span>
        </div>

        {/* Title Logo homage to "Bounty Run 2D" */}
        <div className="relative">
          <h1 className="text-5xl sm:text-7xl font-tech font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
            BOUNTY <span className="text-emerald-400 drop-shadow-[0_0_25px_rgba(52,211,153,0.6)]">RUN</span>
          </h1>
          <span className="absolute -bottom-2 -right-4 text-xs sm:text-sm font-mono font-bold px-2 py-0.5 rounded bg-emerald-500 text-slate-950 shadow-md">
            2D HD
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-400 font-sans max-w-md mt-4 leading-relaxed">
          Infiltra el almacén industrial, saquea cajas y contenedores con botín de alto valor, neutraliza las patrullas enemigas y sobrevive hasta la extracción en helicóptero.
        </p>

        {/* Tactical Mission Card */}
        <div className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3.5 mt-6 backdrop-blur-md flex items-center justify-between text-left">
          <div>
            <span className="text-[10px] font-mono text-emerald-400 tracking-wider font-bold block">
              ZONA OBJETIVO:
            </span>
            <span className="font-tech font-bold text-sm text-slate-100">
              {mission.sectorCode} • {mission.name}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Dificultad: {mission.difficulty} | Ventana extracción: {mission.extractionTimeSec}s
            </span>
          </div>

          <button
            onClick={onOpenArmory}
            className="py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-400 font-tech font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>CAMBIAR</span>
          </button>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full mt-6">
          <button
            id="btn-play-game"
            onClick={onStartGame}
            className="flex-1 py-4 px-8 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 active:scale-98 font-tech font-bold text-base text-slate-950 shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>DESPLEGAR EN EL SECTOR</span>
          </button>

          <button
            id="btn-title-armory"
            onClick={onOpenArmory}
            className="py-4 px-6 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 font-tech font-bold text-sm text-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>MERCADO NEGRO</span>
          </button>
        </div>
      </div>

      {/* Footer Controls Guide */}
      <div className="max-w-4xl mx-auto w-full pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2 font-mono">
        <div className="flex items-center gap-4">
          <span>📱 <strong>Móvil:</strong> Joystick izq (Mover), der (Apuntar/Disparo), Botones (Roll/Reload/Heal)</span>
        </div>
        <div className="flex items-center gap-3">
          <span>💻 <strong>PC:</strong> WASD (Mover) • Mouse (Disparar) • Espacio (Rodar) • E (Saquear) • R (Recargar)</span>
        </div>
      </div>
    </div>
  );
};
