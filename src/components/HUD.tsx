import React, { useState } from 'react';
import { 
  Heart, Crosshair, Volume2, VolumeX, Settings, ShoppingBag, 
  ShieldAlert, Zap, RotateCcw, MapPin, ChevronUp, ChevronDown, Radio, Eye
} from 'lucide-react';
import { Player, ExtractionZone, Enemy, Crate, SectorMission, WeaponId, HealthStation, HealthPickup } from '../types';
import { WEAPONS } from '../game/gameData';
import { Radar } from './Radar';
import { LootInventoryBar } from './LootInventoryBar';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

export interface HUDProps {
  player: Player;
  enemies: Enemy[];
  extraction: ExtractionZone;
  crates: Crate[];
  healthStations?: HealthStation[];
  healthPickups?: HealthPickup[];
  mission: SectorMission;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenArmory: () => void;
  onOpenSettings: () => void;
  onOpenInstall?: () => void;
  onOpenMap?: () => void;
  onUseItem: (index: number) => void;
  onDropItem: (index: number) => void;
  onGrenade?: () => void;
  onDeployGlooWall?: () => void;
  onToggleAim?: () => void;
  onSwitchWeapon?: (weaponId: WeaponId) => void;
  onReload?: () => void;
  onMelee?: () => void;
  onCrouch?: () => void;
  cameraZoom?: 'wide' | 'standard' | 'close';
  onCycleCameraZoom?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  enemies,
  extraction,
  crates,
  healthStations = [],
  healthPickups = [],
  mission,
  isMuted,
  onToggleMute,
  onOpenArmory,
  onOpenSettings,
  onOpenMap,
  onUseItem,
  onDropItem,
  onSwitchWeapon,
  cameraZoom = 'wide',
  onCycleCameraZoom,
}) => {
  const { isTouch, radarSize } = useResponsiveLayout();
  const [isBackpackOpen, setIsBackpackOpen] = useState(false);

  const currentWeapon = WEAPONS[player.currentWeapon] || WEAPONS['pistol'];
  const hpPercent = Math.max(0, Math.min(100, Math.round((player.health / player.maxHealth) * 100)));
  const shieldPercent = Math.max(0, Math.min(100, Math.round((player.shield / Math.max(1, player.maxShield)) * 100)));
  const staminaPercent = Math.max(0, Math.min(100, Math.round(((player.stamina ?? 100) / (player.maxStamina ?? 100)) * 100)));

  const extMinutes = Math.floor(Math.max(0, extraction.countdown) / 60);
  const extSeconds = Math.floor(Math.max(0, extraction.countdown) % 60);
  const timeStr = `${extMinutes}:${extSeconds < 10 ? '0' : ''}${extSeconds}`;

  // Extraction stay progress when inside the helipad zone
  const stayProgress = Math.min(1, (extraction.timeInZone || 0) / Math.max(1, extraction.requiredStayTime || 5));
  const remainingStaySec = Math.max(0, (extraction.requiredStayTime || 5) - (extraction.timeInZone || 0)).toFixed(1);

  return (
    <div
      id="game-hud-root"
      className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between"
      style={{
        paddingTop: 'max(8px, env(safe-area-inset-top, 8px))',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
        paddingLeft: 'max(12px, env(safe-area-inset-left, 12px))',
        paddingRight: 'max(12px, env(safe-area-inset-right, 12px))',
      }}
    >
      {/* Red Peripheral Damage Vignette */}
      {player.damageFlash > 0.05 && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-75 z-0"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(239,68,68,0) 45%, rgba(239,68,68,0.5) 100%)',
          }}
        />
      )}

      {/* Dynamic 2.5D Tactical Center Crosshair */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-10">
        <div className="relative flex items-center justify-center">
          <div
            className={`w-2 h-2 rounded-full transition-all ${
              player.aimLockedTargetId
                ? 'bg-rose-500 scale-150 ring-4 ring-rose-500/40'
                : player.isAimingMode
                ? 'bg-emerald-400 scale-125'
                : 'bg-white/80'
            }`}
          />
          {/* Tactical aim brackets */}
          <div
            className={`absolute w-0.5 transition-all ${
              player.isAimingMode ? 'h-2.5 -top-3.5 bg-emerald-400' : 'h-2 -top-3 bg-white/70'
            }`}
          />
          <div
            className={`absolute w-0.5 transition-all ${
              player.isAimingMode ? 'h-2.5 -bottom-3.5 bg-emerald-400' : 'h-2 -bottom-3 bg-white/70'
            }`}
          />
          <div
            className={`absolute h-0.5 transition-all ${
              player.isAimingMode ? 'w-2.5 -left-3.5 bg-emerald-400' : 'w-2 -left-3 bg-white/70'
            }`}
          />
          <div
            className={`absolute h-0.5 transition-all ${
              player.isAimingMode ? 'w-2.5 -right-3.5 bg-emerald-400' : 'w-2 -right-3 bg-white/70'
            }`}
          />

          {/* Free Fire Style Hitmarker Ticks (White for standard hit, Crimson for Headshot) */}
          {player.hitmarkerTimer && player.hitmarkerTimer > 0 && (
            <div className={`absolute pointer-events-none flex items-center justify-center transition-transform ${player.hitmarkerIsHeadshot ? 'scale-125' : 'scale-100'}`}>
              <div className={`absolute w-3 h-0.5 -translate-x-3 -translate-y-3 -rotate-45 rounded-full ${player.hitmarkerIsHeadshot ? 'bg-red-500 shadow-sm shadow-red-500' : 'bg-white shadow-sm shadow-yellow-300'}`} />
              <div className={`absolute w-3 h-0.5 translate-x-3 -translate-y-3 rotate-45 rounded-full ${player.hitmarkerIsHeadshot ? 'bg-red-500 shadow-sm shadow-red-500' : 'bg-white shadow-sm shadow-yellow-300'}`} />
              <div className={`absolute w-3 h-0.5 -translate-x-3 translate-y-3 rotate-45 rounded-full ${player.hitmarkerIsHeadshot ? 'bg-red-500 shadow-sm shadow-red-500' : 'bg-white shadow-sm shadow-yellow-300'}`} />
              <div className={`absolute w-3 h-0.5 translate-x-3 translate-y-3 -rotate-45 rounded-full ${player.hitmarkerIsHeadshot ? 'bg-red-500 shadow-sm shadow-red-500' : 'bg-white shadow-sm shadow-yellow-300'}`} />
              {player.hitmarkerIsHeadshot && (
                <div className="absolute -top-6 text-[9px] font-black font-tech tracking-wider text-red-500 animate-bounce">
                  CRÍTICO
                </div>
              )}
            </div>
          )}

          {/* Combat Stance Indicators */}
          {player.isCrouching && (
            <div className="absolute top-7 px-2 py-0.5 rounded-full bg-amber-500/90 text-slate-950 text-[8px] font-black font-tech tracking-wider shadow whitespace-nowrap">
              COBERTURA (-30% DAÑO)
            </div>
          )}
          {player.isJumping && (
            <div className="absolute top-7 px-2 py-0.5 rounded-full bg-sky-500/90 text-white text-[8px] font-black font-tech tracking-wider shadow whitespace-nowrap">
              SALTO TÁCTICO
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. TOP BAR: Ergonomic Professional Distribution                           */}
      {/* ========================================================================= */}
      <div className="flex items-start justify-between w-full">
        {/* TOP-LEFT: Modern Tactical Radar Minimap & Sector Pill */}
        <div className="pointer-events-auto flex flex-col gap-1 items-start">
          <Radar
            player={player}
            enemies={enemies}
            extraction={extraction}
            crates={crates}
            healthStations={healthStations}
            healthPickups={healthPickups}
            onOpenMap={onOpenMap}
            size={radarSize}
          />
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold tracking-wider">{mission.name || mission.sectorCode}</span>
          </div>
        </div>

        {/* TOP-CENTER: Extraction Status & In-Zone Evacuation Gauge */}
        <div className="pointer-events-auto flex flex-col items-center">
          {extraction.isExtracting ? (
            /* Active Evacuation Pulse Banner when inside zone */
            <div
              id="extraction-active-gauge"
              className="flex flex-col items-center bg-slate-950/90 backdrop-blur-md border-2 border-emerald-400/90 px-4 py-2 rounded-2xl shadow-2xl shadow-emerald-500/30 animate-pulse"
            >
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-spin" />
                <span className="font-tech font-extrabold text-xs text-emerald-300 tracking-wider">
                  EVACUACIÓN EN CURSO
                </span>
                <span className="font-mono font-bold text-xs text-white bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-400">
                  {remainingStaySec}s
                </span>
              </div>
              <div className="w-44 sm:w-52 h-2.5 bg-slate-900 rounded-full overflow-hidden border border-emerald-500/50 mt-1.5 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-green-300 transition-all duration-100"
                  style={{ width: `${stayProgress * 100}%` }}
                />
              </div>
              <span className="text-[9px] font-mono text-emerald-200/80 mt-0.5">
                ¡MANTÉN TU POSICIÓN EN LA ZONA!
              </span>
            </div>
          ) : (
            /* Standby / Countdown Pill */
            <div
              id="extraction-banner"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border backdrop-blur-md shadow-lg transition-all ${
                extraction.countdown === 0
                  ? 'bg-emerald-950/90 border-emerald-400/90 text-emerald-300 shadow-emerald-500/25 animate-pulse'
                  : 'bg-slate-950/85 border-slate-700/80 text-slate-200'
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${extraction.countdown === 0 ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
              <span className="font-tech font-bold text-xs tracking-wider">
                {extraction.countdown === 0 ? 'HELIPUERTO LISTO' : 'EXTRACCIÓN EN:'}
              </span>
              <span className="font-mono text-xs font-bold text-amber-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                {timeStr}
              </span>
            </div>
          )}
        </div>

        {/* TOP-RIGHT: Player Vitals, Backpack & Quick Tactical Utilities */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          {/* Quick Utility Icon Buttons (Map, Zoom, Audio, Armory, Settings) */}
          <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-lg">
            {onOpenMap && (
              <button
                id="hud-btn-map"
                onClick={onOpenMap}
                className="px-2 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-300 flex items-center gap-1 font-tech text-xs shadow-md transition-all active:scale-95"
                title="Abrir Mapa Táctico"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-[10px]">MAPA</span>
              </button>
            )}

            {onCycleCameraZoom && (
              <button
                id="hud-btn-zoom"
                onClick={onCycleCameraZoom}
                className="px-2 py-1 rounded-lg bg-sky-950/70 hover:bg-sky-900 border border-sky-500/60 text-sky-300 flex items-center gap-1 font-tech text-xs shadow-md transition-all active:scale-95"
                title={`Cambiar Zoom de Cámara (Actual: ${cameraZoom.toUpperCase()})`}
              >
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-bold text-[10px] uppercase">
                  {cameraZoom === 'wide' ? 'AMPLIO' : cameraZoom === 'standard' ? 'ESTÁNDAR' : 'CERCA'}
                </span>
              </button>
            )}

            <button
              id="hud-btn-mute"
              onClick={onToggleMute}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 shadow-md transition-all active:scale-95"
              title={isMuted ? 'Activar Sonido' : 'Silenciar'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-slate-300" />}
            </button>

            <button
              id="hud-btn-armory"
              onClick={onOpenArmory}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 shadow-md transition-all active:scale-95"
              title="Armería"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-sky-400" />
            </button>

            <button
              id="hud-btn-settings"
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 shadow-md transition-all active:scale-95"
              title="Ajustes y Calidad Gráfica"
            >
              <Settings className="w-3.5 h-3.5 text-slate-300" />
            </button>
          </div>

          {/* Vitals Pod: HP Bar, Shield Bar, Stamina & Backpack Toggle */}
          <div className="flex flex-col gap-1 w-44 sm:w-56 bg-slate-950/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800/90 shadow-xl">
            {/* Health Bar */}
            <div id="health-bar-container" className="flex items-center gap-1.5">
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500 shrink-0" />
              <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    hpPercent > 50
                      ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                      : hpPercent > 25
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      : 'bg-gradient-to-r from-rose-600 to-red-500 animate-pulse'
                  }`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
              <span className="font-tech font-bold text-[10px] text-slate-200 min-w-[28px] text-right">
                {hpPercent}%
              </span>
            </div>

            {/* Shield / Armor Bar */}
            <div id="shield-bar-container" className="flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3 text-cyan-400 shrink-0" />
              <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-300 transition-all duration-200"
                  style={{ width: `${shieldPercent}%` }}
                />
              </div>
              <span className="font-tech font-bold text-[10px] text-cyan-200 min-w-[28px] text-right">
                {Math.round(player.shield)}
              </span>
            </div>

            {/* Stamina & Backpack Row */}
            <div className="flex items-center justify-between gap-1.5 mt-0.5">
              <div className="flex-1 flex items-center gap-1">
                <Zap className={`w-2.5 h-2.5 ${player.isSprinting ? 'text-amber-300 animate-bounce' : 'text-amber-400'}`} />
                <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-100 ${staminaPercent > 30 ? 'bg-amber-400' : 'bg-rose-500'}`}
                    style={{ width: `${staminaPercent}%` }}
                  />
                </div>
              </div>

              {/* Backpack Trigger Pill */}
              <button
                id="hud-backpack-toggle"
                onClick={() => setIsBackpackOpen(!isBackpackOpen)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-tech font-bold border transition-all active:scale-95 ${
                  isBackpackOpen || player.backpack.length > 0
                    ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                <span>🎒</span>
                <span>{player.backpack.length}/{player.maxBackpackSlots}</span>
                {isBackpackOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronUp className="w-2.5 h-2.5" />}
              </button>
            </div>
          </div>

          {/* Expandable Backpack Inventory Drawer */}
          {isBackpackOpen && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-150 p-2 rounded-xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-md mt-1">
              <LootInventoryBar
                loot={player.backpack}
                maxSlots={player.maxBackpackSlots}
                onUseItem={onUseItem}
                onDropItem={onDropItem}
              />
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BOTTOM BAR: Compact Tactical Weapon Pod (Centered)                     */}
      {/* ========================================================================= */}
      <div className="flex items-end justify-center w-full pb-1">
        {/* Sleek Central Weapon & Ammo Card */}
        <div className="pointer-events-auto flex items-center gap-3 bg-slate-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-800 shadow-2xl">
          {/* Quick Weapon Switcher Tap */}
          {onSwitchWeapon && (
            <button
              onClick={() => {
                const unlocked = player.unlockedWeapons || ['pistol'];
                const currIdx = unlocked.indexOf(player.currentWeapon);
                const nextIdx = (currIdx + 1) % unlocked.length;
                onSwitchWeapon(unlocked[nextIdx]);
              }}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-90 border border-slate-700 text-sky-400 transition-transform shadow-md"
              title="Cambiar al siguiente arma del arsenal"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Weapon Details */}
          <div className="flex flex-col items-start min-w-[75px]">
            <div className="flex items-center gap-1">
              <span className="font-tech font-black text-xs text-sky-300 tracking-wider">
                {currentWeapon.name}
              </span>
              <span className="text-[8px] font-mono font-bold px-1 rounded bg-sky-950 border border-sky-800 text-sky-400 uppercase">
                {currentWeapon.type}
              </span>
            </div>
            {player.isReloading ? (
              <span className="text-amber-400 font-mono text-[9px] font-bold animate-pulse">
                RECARGANDO... {Math.round((player.reloadProgress || 0) * 100)}%
              </span>
            ) : (
              <span className="text-slate-400 text-[9px] font-mono">
                {player.ammo <= 5 ? '¡MUNICIÓN BAJA!' : 'CALIBRE ACTIVO'}
              </span>
            )}
          </div>

          {/* High-Visibility Ammo Digits */}
          <div className="flex items-baseline gap-1 font-mono pl-2 border-l border-slate-800">
            <span
              className={`text-xl font-black leading-none ${
                player.ammo === 0
                  ? 'text-rose-500 animate-bounce'
                  : player.ammo <= 5
                  ? 'text-amber-400'
                  : 'text-white'
              }`}
            >
              {player.ammo}
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              /{currentWeapon.magSize}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
