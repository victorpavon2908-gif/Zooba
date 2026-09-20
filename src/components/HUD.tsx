import React from 'react';
import { Heart, Crosshair, Volume2, VolumeX, Settings, ShoppingBag, ShieldAlert, Smartphone, Bomb, Zap, RotateCcw, Swords, Map } from 'lucide-react';
import { Player, ExtractionZone, Enemy, Crate, LootItem, SectorMission, WeaponId, HealthStation, HealthPickup } from '../types';
import { WEAPONS } from '../game/gameData';
import { Radar } from './Radar';
import { LootInventoryBar } from './LootInventoryBar';

interface HUDProps {
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
  onToggleAim?: () => void;
  onSwitchWeapon?: (weaponId: WeaponId) => void;
  onReload?: () => void;
  onMelee?: () => void;
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
  onOpenInstall,
  onOpenMap,
  onUseItem,
  onDropItem,
  onGrenade,
  onToggleAim,
  onSwitchWeapon,
  onReload,
  onMelee,
}) => {
  const currentWeapon = WEAPONS[player.currentWeapon];
  const hpPercent = Math.max(0, Math.min(100, Math.round((player.health / player.maxHealth) * 100)));
  const staminaPercent = Math.max(0, Math.min(100, Math.round(((player.stamina ?? 100) / (player.maxStamina ?? 100)) * 100)));

  const extMinutes = Math.floor(Math.max(0, extraction.countdown) / 60);
  const extSeconds = Math.floor(Math.max(0, extraction.countdown) % 60);
  const timeStr = `${extMinutes}:${extSeconds < 10 ? '0' : ''}${extSeconds}`;

  return (
    <div id="game-hud-root" className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-3 sm:p-4">
      {/* TOP BAR */}
      <div className="flex items-start justify-between w-full">
        {/* Top Left: Tactical Radar (matches screenshot) */}
        <div className="pointer-events-auto flex flex-col gap-1.5">
          <Radar
            player={player}
            enemies={enemies}
            extraction={extraction}
            crates={crates}
            healthStations={healthStations}
            healthPickups={healthPickups}
            onOpenMap={onOpenMap}
          />
          <button
            onClick={onOpenMap}
            className="text-[10px] font-mono tracking-wider text-slate-400 font-bold bg-slate-900/80 hover:bg-slate-800 hover:text-emerald-300 px-2 py-0.5 rounded border border-slate-800 self-start transition-colors flex items-center gap-1 cursor-pointer"
            title="Abrir Mapa Táctico de Guía (M)"
          >
            <Map className="w-3 h-3 text-emerald-400" />
            <span>{mission.sectorCode} • {mission.name}</span>
          </button>
        </div>

        {/* Top Center: Extraction Banner */}
        <div className="flex flex-col items-center">
          <div
            id="extraction-banner"
            className={`px-3 py-1 rounded-md border flex items-center gap-2 backdrop-blur-md transition-all ${
              extraction.countdown <= 0 || extraction.isExtracting
                ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/20 animate-pulse'
                : 'bg-slate-900/80 border-slate-700 text-slate-200 shadow-md'
            }`}
          >
            <ShieldAlert className={`w-4 h-4 ${extraction.isExtracting ? 'text-emerald-400 animate-spin' : 'text-slate-400'}`} />
            <span className="font-tech font-bold text-xs tracking-wider">EXTRACTION:</span>
            <span className="font-mono font-bold text-sm tracking-widest text-emerald-400">
              {timeStr}
            </span>
          </div>

          {extraction.isExtracting && (
            <div className="text-[10px] font-tech font-bold text-emerald-300 mt-1 bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-500/50">
              STAY IN ZONE: {Math.max(0, Math.round(extraction.requiredStayTime - extraction.timeInZone))}s
            </div>
          )}
        </div>

        {/* Top Right: Utility Controls (Sound, Settings, Armory, Map) */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/85 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/80 shadow-lg">
          {onOpenMap && (
            <button
              id="btn-hud-map"
              onClick={onOpenMap}
              className="px-2.5 py-1.5 rounded bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              title="Abrir Mapa de Guía Táctico (M)"
            >
              <Map className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">MAPA</span>
            </button>
          )}

          <button
            id="btn-toggle-sound"
            onClick={onToggleMute}
            className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            id="btn-open-armory"
            onClick={onOpenArmory}
            className="p-2 rounded hover:bg-slate-800 text-amber-400 hover:text-amber-300 transition-colors"
            title="Black Market Armory"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>

          {onOpenInstall && (
            <button
              id="btn-hud-install"
              onClick={onOpenInstall}
              className="p-2 rounded hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 transition-colors"
              title="Instalar en Celular / APK"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          )}

          <button
            id="btn-open-settings"
            onClick={onOpenSettings}
            className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="flex flex-col sm:flex-row items-end justify-between w-full gap-2">
        {/* Bottom Left: Health Bar + Stamina Bar + Loot Inventory */}
        <div className="pointer-events-auto flex flex-col gap-1.5 max-w-[280px]">
          {/* Health Bar (matches screenshot: [♥] [======] 80%) */}
          <div id="health-bar-container" className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 shadow-xl">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse shrink-0" />
            <div className="flex-1 h-3 bg-slate-950 rounded-xs overflow-hidden border border-slate-700 p-0.5">
              <div
                className={`h-full rounded-xs transition-all duration-200 ${
                  hpPercent > 50
                    ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                    : hpPercent > 25
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    : 'bg-gradient-to-r from-rose-600 to-red-500'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
            <span className="font-tech font-bold text-xs text-slate-200 min-w-[32px] text-right">
              {hpPercent}%
            </span>
          </div>

          {/* Stamina Bar */}
          <div id="stamina-bar-container" className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700/80 shadow-md">
            <Zap className={`w-3.5 h-3.5 ${player.isSprinting ? 'text-amber-300 animate-bounce' : 'text-amber-400'} shrink-0`} />
            <div className="flex-1 h-2 bg-slate-950 rounded-xs overflow-hidden border border-slate-800 p-0.5">
              <div
                className={`h-full rounded-xs transition-all duration-100 ${
                  staminaPercent > 25 ? 'bg-gradient-to-r from-amber-500 to-yellow-300' : 'bg-rose-500'
                }`}
                style={{ width: `${staminaPercent}%` }}
              />
            </div>
            <span className="font-tech text-[10px] font-bold text-amber-300 min-w-[32px] text-right">
              {player.isSprinting ? 'RUN' : `${staminaPercent}%`}
            </span>
          </div>

          {/* Loot Inventory Row */}
          <LootInventoryBar
            loot={player.backpack}
            maxSlots={player.maxBackpackSlots}
            onUseItem={onUseItem}
            onDropItem={onDropItem}
          />
        </div>

        {/* Bottom Right: Arsenal Selector & Combat Action Controls */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5 self-end">
          {/* Tactical Weapon Arsenal Selector Strip */}
          <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-lg border border-slate-700 shadow-xl overflow-x-auto max-w-[95vw]">
            {(player.unlockedWeapons || ['pistol', 'shotgun', 'rifle', 'smg', 'plasma']).map((wId, idx) => {
              const def = WEAPONS[wId];
              if (!def) return null;
              const isEquipped = player.currentWeapon === wId;
              const weaponAmmo = player.ammoByWeapon ? player.ammoByWeapon[wId] : def.magSize;
              return (
                <button
                  key={wId}
                  id={`hud-weapon-select-${wId}`}
                  onClick={() => onSwitchWeapon?.(wId)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all text-xs font-tech font-bold ${
                    isEquipped
                      ? 'bg-sky-600/90 text-white shadow-md shadow-sky-500/30 border border-sky-300'
                      : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-slate-700'
                  }`}
                  title={`${def.name} (Tecla ${idx + 1})`}
                >
                  <span className="text-[9px] font-mono opacity-60">[{idx + 1}]</span>
                  <span className="truncate max-w-[65px]">{def.name}</span>
                  <span className={`text-[10px] font-mono px-1 rounded ${isEquipped ? 'bg-sky-950 text-sky-200' : 'bg-slate-900 text-slate-400'}`}>
                    {weaponAmmo !== undefined ? weaponAmmo : def.magSize}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Row: Melee CQC, Reload, Grenade, Aim, Current Weapon status */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {/* Melee Knife Button */}
            {onMelee && (
              <button
                id="hud-btn-melee"
                onClick={onMelee}
                disabled={player.meleeCooldown > 0}
                className={`px-2.5 py-1.5 rounded-lg border backdrop-blur-md flex items-center gap-1.5 transition-all shadow-md ${
                  player.meleeCooldown > 0
                    ? 'bg-slate-900/60 border-slate-800 text-slate-600 opacity-60'
                    : 'bg-indigo-950/90 active:scale-95 border-indigo-400 text-indigo-200 shadow-indigo-500/20'
                }`}
                title="Ataque Cuerpo a Cuerpo con Cuchillo Táctico (Tecla V)"
              >
                <Swords className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-tech text-xs font-bold hidden sm:inline">CQC</span>
                <span className="text-[10px] font-mono text-indigo-400 font-bold">[V]</span>
              </button>
            )}

            {/* Manual Reload Button */}
            {onReload && (
              <button
                id="hud-btn-manual-reload"
                onClick={onReload}
                disabled={player.isReloading || player.ammo === currentWeapon.magSize}
                className={`px-2.5 py-1.5 rounded-lg border backdrop-blur-md flex items-center gap-1.5 transition-all shadow-md ${
                  player.isReloading
                    ? 'bg-sky-950 border-sky-400 text-sky-300 animate-pulse'
                    : player.ammo === currentWeapon.magSize
                    ? 'bg-slate-900/60 border-slate-800 text-slate-600 opacity-60'
                    : 'bg-slate-900/85 hover:bg-slate-800 active:scale-95 border-slate-600 text-slate-200'
                }`}
                title="Recargar Arma (Tecla R)"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${player.isReloading ? 'animate-spin text-sky-400' : 'text-slate-300'}`} />
                <span className="font-tech text-xs font-bold">
                  {player.isReloading ? `${Math.round(player.reloadProgress * 100)}%` : 'RECARGAR'}
                </span>
                <span className="text-[10px] font-mono text-slate-400 hidden sm:inline font-bold">[R]</span>
              </button>
            )}

            {/* Tactical Aim Mode Button */}
            <button
              id="hud-btn-toggle-aim"
              onClick={onToggleAim}
              className={`px-2.5 py-1.5 rounded-lg border backdrop-blur-md flex items-center gap-1.5 transition-all shadow-md ${
                player.isAimingMode
                  ? 'bg-rose-950/90 border-rose-400 text-rose-300 shadow-rose-500/20 animate-pulse'
                  : 'bg-slate-900/85 hover:bg-slate-800 border-slate-700 text-slate-300'
              }`}
              title="Activar/Desactivar Mira Táctica (Tecla F)"
            >
              <Crosshair className={`w-3.5 h-3.5 ${player.isAimingMode ? 'text-rose-400 rotate-45' : 'text-slate-400'}`} />
              <span className="font-tech text-xs font-bold hidden sm:inline">
                {player.isAimingMode ? 'MIRA ON' : 'MIRA'}
              </span>
              <span className="text-[10px] font-mono text-slate-400 hidden sm:inline font-bold">[F]</span>
            </button>

            {/* Grenade / Bomb Quick Toss Button */}
            <button
              id="hud-btn-throw-grenade"
              onClick={onGrenade}
              disabled={player.grenades <= 0 || player.grenadeCooldown > 0}
              className={`px-2.5 py-1.5 rounded-lg border backdrop-blur-md flex items-center gap-1.5 transition-all shadow-md ${
                player.grenades <= 0 || player.grenadeCooldown > 0
                  ? 'bg-slate-900/60 border-slate-800 text-slate-600 opacity-60'
                  : 'bg-amber-950/90 active:scale-95 border-amber-500 text-amber-300 shadow-amber-500/20'
              }`}
              title="Lanzar Bomba/Granada (Tecla G)"
            >
              <Bomb className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-tech text-xs font-bold">
                {player.grenadeCooldown > 0 ? `${Math.ceil(player.grenadeCooldown)}s` : player.grenades}
              </span>
              <span className="text-[10px] font-mono text-amber-500 hidden sm:inline font-bold">[G]</span>
            </button>

            {/* Current Weapon & Ammo Box */}
            <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 shadow-xl">
              <div className="flex flex-col items-end">
                <span className="font-tech font-bold text-xs text-sky-400 tracking-wide">
                  {currentWeapon.name}
                </span>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className={`text-lg font-bold ${player.ammo === 0 ? 'text-rose-500 animate-bounce' : 'text-slate-100'}`}>
                    {player.ammo}
                  </span>
                  <span className="text-xs text-slate-500">/{currentWeapon.magSize}</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-md bg-slate-800 border border-slate-600 flex items-center justify-center text-sky-400">
                <Crosshair className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
