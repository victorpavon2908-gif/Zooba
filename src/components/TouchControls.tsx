import React, { useRef, useState } from 'react';
import { RotateCcw, Shield, Sparkles, PlusCircle, Bomb, Crosshair, Zap, Repeat, Swords } from 'lucide-react';
import { sound } from '../audio/soundEngine';
import { WeaponId } from '../types';

interface TouchControlsProps {
  onMove: (vector: { x: number; y: number }) => void;
  onAim: (vector: { x: number; y: number }) => void;
  onShoot: (isShooting: boolean) => void;
  onDodge: () => void;
  onReload: () => void;
  onHeal: () => void;
  onInteract: () => void;
  onGrenade?: () => void;
  onDeployGlooWall?: () => void;
  onToggleAim?: () => void;
  onSprint?: (sprinting: boolean) => void;
  onMelee?: () => void;
  onSwitchWeapon?: () => void;
  currentWeapon?: WeaponId;
  stamina?: number;
  maxStamina?: number;
  isSprinting?: boolean;
  meleeCooldown?: number;
  grenadesCount?: number;
  grenadeCooldown?: number;
  isAimingMode?: boolean;
  isReloading: boolean;
  reloadProgress: number;
  rollCooldown: number;
  hasUsableMedkit: boolean;
  canInteract: boolean;
  interactLabel?: string;
  isTwinStickMode?: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMove,
  onAim,
  onShoot,
  onDodge,
  onReload,
  onHeal,
  onInteract,
  onGrenade,
  onDeployGlooWall,
  onToggleAim,
  onSprint,
  onMelee,
  onSwitchWeapon,
  currentWeapon = 'pistol',
  stamina = 100,
  maxStamina = 100,
  isSprinting = false,
  meleeCooldown = 0,
  grenadesCount = 0,
  grenadeCooldown = 0,
  isAimingMode = false,
  isReloading,
  reloadProgress,
  rollCooldown,
  hasUsableMedkit,
  canInteract,
  interactLabel = 'LOOT',
  isTwinStickMode = true,
}) => {
  // Left Joystick state
  const leftZoneRef = useRef<HTMLDivElement | null>(null);
  const [leftTouchId, setLeftTouchId] = useState<number | null>(null);
  const [leftOrigin, setLeftOrigin] = useState<{ x: number; y: number } | null>(null);
  const [leftCurrent, setLeftCurrent] = useState<{ x: number; y: number } | null>(null);

  // Right Joystick state (Aim & Fire)
  const rightZoneRef = useRef<HTMLDivElement | null>(null);
  const [rightTouchId, setRightTouchId] = useState<number | null>(null);
  const [rightOrigin, setRightOrigin] = useState<{ x: number; y: number } | null>(null);
  const [rightCurrent, setRightCurrent] = useState<{ x: number; y: number } | null>(null);

  const maxRadius = 50;

  // Left Joystick Touch Handlers
  const handleLeftTouchStart = (e: React.TouchEvent) => {
    if (leftTouchId !== null) return;
    const touch = e.changedTouches[0];
    setLeftTouchId(touch.identifier);
    setLeftOrigin({ x: touch.clientX, y: touch.clientY });
    setLeftCurrent({ x: touch.clientX, y: touch.clientY });
    onMove({ x: 0, y: 0 });
  };

  const handleLeftTouchMove = (e: React.TouchEvent) => {
    if (leftTouchId === null || !leftOrigin) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === leftTouchId) {
        const dx = touch.clientX - leftOrigin.x;
        const dy = touch.clientY - leftOrigin.y;
        const dist = Math.hypot(dx, dy);
        const clampedDist = Math.min(dist, maxRadius);
        const angle = Math.atan2(dy, dx);

        const curX = leftOrigin.x + Math.cos(angle) * clampedDist;
        const curY = leftOrigin.y + Math.sin(angle) * clampedDist;
        setLeftCurrent({ x: curX, y: curY });

        const normalizedMag = clampedDist / maxRadius;
        onMove({
          x: Math.cos(angle) * normalizedMag,
          y: Math.sin(angle) * normalizedMag,
        });
        break;
      }
    }
  };

  const handleLeftTouchEnd = (e: React.TouchEvent) => {
    if (leftTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === leftTouchId) {
        setLeftTouchId(null);
        setLeftOrigin(null);
        setLeftCurrent(null);
        onMove({ x: 0, y: 0 });
        break;
      }
    }
  };

  // Right Joystick Touch Handlers (Twin Stick)
  const handleRightTouchStart = (e: React.TouchEvent) => {
    if (!isTwinStickMode || rightTouchId !== null) return;
    const touch = e.changedTouches[0];
    setRightTouchId(touch.identifier);
    setRightOrigin({ x: touch.clientX, y: touch.clientY });
    setRightCurrent({ x: touch.clientX, y: touch.clientY });
    onShoot(true);
  };

  const handleRightTouchMove = (e: React.TouchEvent) => {
    if (!isTwinStickMode || rightTouchId === null || !rightOrigin) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === rightTouchId) {
        const dx = touch.clientX - rightOrigin.x;
        const dy = touch.clientY - rightOrigin.y;
        const dist = Math.hypot(dx, dy);
        const clampedDist = Math.min(dist, maxRadius);
        const angle = Math.atan2(dy, dx);

        setRightCurrent({
          x: rightOrigin.x + Math.cos(angle) * clampedDist,
          y: rightOrigin.y + Math.sin(angle) * clampedDist,
        });

        onAim({
          x: Math.cos(angle),
          y: Math.sin(angle),
        });
        onShoot(true);
        break;
      }
    }
  };

  const handleRightTouchEnd = (e: React.TouchEvent) => {
    if (!isTwinStickMode || rightTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === rightTouchId) {
        setRightTouchId(null);
        setRightOrigin(null);
        setRightCurrent(null);
        onShoot(false);
        break;
      }
    }
  };

  return (
    <div id="touch-controls-container" className="absolute inset-0 pointer-events-none select-none z-20">
      {/* Left Move Touch Zone */}
      <div
        ref={leftZoneRef}
        id="touch-zone-left"
        onTouchStart={handleLeftTouchStart}
        onTouchMove={handleLeftTouchMove}
        onTouchEnd={handleLeftTouchEnd}
        onTouchCancel={handleLeftTouchEnd}
        className="absolute bottom-0 left-0 w-1/2 h-3/5 pointer-events-auto"
      >
        {/* Visual Joystick */}
        {leftOrigin && leftCurrent ? (
          <div
            className="absolute rounded-full border-2 border-emerald-500/50 bg-emerald-950/30 backdrop-blur-xs pointer-events-none transition-transform"
            style={{
              width: maxRadius * 2,
              height: maxRadius * 2,
              left: leftOrigin.x - maxRadius,
              top: leftOrigin.y - maxRadius,
            }}
          >
            {/* Inner knob */}
            <div
              className="absolute w-8 h-8 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/50"
              style={{
                left: leftCurrent.x - leftOrigin.x + maxRadius - 16,
                top: leftCurrent.y - leftOrigin.y + maxRadius - 16,
              }}
            />
          </div>
        ) : (
          /* Idle visual prompt */
          <div className="absolute bottom-12 left-10 flex items-center gap-2 opacity-40 pointer-events-none text-[11px] font-tech text-slate-400">
            <div className="w-14 h-14 rounded-full border border-dashed border-slate-500 flex items-center justify-center">
              <span className="text-xs">MOVE</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Sprint Button above Left Joystick */}
      {onSprint && (
        <div className="absolute bottom-44 left-6 pointer-events-auto flex items-center gap-2">
          <button
            id="btn-touch-sprint"
            onTouchStart={(e) => {
              e.stopPropagation();
              onSprint(true);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              onSprint(false);
            }}
            onMouseDown={() => onSprint(true)}
            onMouseUp={() => onSprint(false)}
            className={`w-13 h-13 rounded-full border-2 flex flex-col items-center justify-center font-tech transition-all shadow-lg ${
              isSprinting
                ? 'bg-amber-500 border-yellow-200 text-slate-950 shadow-amber-500/50 scale-105'
                : stamina <= 15
                ? 'bg-slate-900/80 border-slate-700 text-slate-500 opacity-60'
                : 'bg-slate-900/85 hover:bg-slate-800 border-amber-500/60 text-amber-400'
            }`}
            title="Correr / Sprint Táctico (Shift)"
          >
            <Zap className={`w-5 h-5 ${isSprinting ? 'fill-slate-950 text-slate-950 animate-bounce' : 'text-amber-400'}`} />
            <span className="text-[7px] font-bold leading-none mt-0.5">{isSprinting ? 'CORRIENDO' : 'SPRINT'}</span>
          </button>
          <div className="w-1.5 h-10 bg-slate-950 rounded-full border border-slate-700 overflow-hidden flex flex-col justify-end">
            <div
              className={`w-full transition-all ${stamina > 40 ? 'bg-amber-400' : 'bg-rose-500'}`}
              style={{ height: `${Math.round((stamina / maxStamina) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Right Aim / Fire Zone (Twin stick) */}
      {isTwinStickMode && (
        <div
          ref={rightZoneRef}
          id="touch-zone-right"
          onTouchStart={handleRightTouchStart}
          onTouchMove={handleRightTouchMove}
          onTouchEnd={handleRightTouchEnd}
          onTouchCancel={handleRightTouchEnd}
          className="absolute bottom-0 right-0 w-1/2 h-3/5 pointer-events-auto"
        >
          {/* Visual Right Joystick */}
          {rightOrigin && rightCurrent ? (
            <div
              className="absolute rounded-full border-2 border-rose-500/50 bg-rose-950/30 backdrop-blur-xs pointer-events-none"
              style={{
                width: maxRadius * 2,
                height: maxRadius * 2,
                left: rightOrigin.x - maxRadius,
                top: rightOrigin.y - maxRadius,
              }}
            >
              <div
                className="absolute w-8 h-8 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50"
                style={{
                  left: rightCurrent.x - rightOrigin.x + maxRadius - 16,
                  top: rightCurrent.y - rightOrigin.y + maxRadius - 16,
                }}
              />
            </div>
          ) : (
            <div className="absolute bottom-12 right-12 flex items-center gap-2 opacity-40 pointer-events-none text-[11px] font-tech text-slate-400">
              <div className="w-14 h-14 rounded-full border border-dashed border-rose-500 flex items-center justify-center text-rose-400">
                <span className="text-xs">AIM/FIRE</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons Cluster: fixed grid, each control gets a dedicated touch slot */}
      <div id="mobile-combat-controls" className="absolute bottom-5 right-3 sm:bottom-8 sm:right-5 grid grid-cols-4 gap-2 pointer-events-auto items-end">
        {/* Row 1: Tactical Targeting & Weapon Switch */}
        <div className="contents">
          {/* Weapon Switch Button */}
          {onSwitchWeapon && (
            <button
              id="btn-touch-switch-weapon"
              onClick={onSwitchWeapon}
              className="w-11 h-11 rounded-full border-2 border-sky-500/60 bg-slate-900/85 active:bg-sky-950 flex flex-col items-center justify-center font-tech transition-all shadow-md text-sky-300"
              title="Cambiar Arma (Tecla Q / 1-5)"
            >
              <Repeat className="w-4 h-4 text-sky-400" />
              <span className="text-[7px] font-bold mt-0.5 uppercase">{currentWeapon}</span>
            </button>
          )}

          {/* Aim / Lock-on Toggle Button */}
          {onToggleAim && (
            <button
              id="btn-touch-aim"
              onClick={onToggleAim}
              className={`w-11 h-11 rounded-full border-2 flex flex-col items-center justify-center font-tech transition-all shadow-md ${
                isAimingMode
                  ? 'bg-rose-600/90 border-rose-300 text-white shadow-rose-600/50 animate-pulse'
                  : 'bg-slate-900/85 active:bg-slate-800 border-slate-600 text-slate-300'
              }`}
              title="Mira Táctica y Puntería Asistida (Tecla F)"
            >
              <Crosshair className={`w-4 h-4 ${isAimingMode ? 'text-white rotate-45' : 'text-slate-300'}`} />
              <span className="text-[7px] font-bold mt-0.5">{isAimingMode ? 'MIRA ON' : 'MIRA'}</span>
            </button>
          )}

          {/* Grenade / Bomb Button */}
          {onGrenade && (
            <button
              id="btn-touch-grenade"
              onClick={onGrenade}
              disabled={grenadesCount <= 0 || grenadeCooldown > 0}
              className={`w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center font-tech transition-all shadow-lg ${
                grenadesCount <= 0 || grenadeCooldown > 0
                  ? 'bg-slate-900/80 border-slate-700 text-slate-600 opacity-60'
                  : 'bg-amber-600 active:scale-95 active:bg-amber-500 border-yellow-300 text-white shadow-amber-600/50'
              }`}
              title="Lanzar Bomba / Granada Táctica (Tecla G)"
            >
              <Bomb className="w-5 h-5 text-yellow-100" />
              <span className="text-[8px] font-bold leading-none mt-0.5">
                {grenadeCooldown > 0 ? `${Math.ceil(grenadeCooldown)}s` : `BOMBA (${grenadesCount})`}
              </span>
            </button>
          )}
        </div>

          {onDeployGlooWall && (
            <button id="btn-touch-gloo" onClick={onDeployGlooWall}
              className="w-12 h-12 rounded-xl border-2 border-cyan-400/70 bg-cyan-950/90 active:scale-95 text-cyan-200 shadow-lg shadow-cyan-500/30 flex flex-col items-center justify-center font-tech"
              title="Desplegar muro de protección">
              <span className="text-lg leading-none">◆</span>
              <span className="text-[8px] font-bold">GLOO</span>
            </button>
          )}

        {/* Row 2: Melee CQC Attack, Heal and Interact */}
        <div className="contents">
          {/* Tactical Melee Attack */}
          {onMelee && (
            <button
              id="btn-touch-melee"
              onClick={onMelee}
              disabled={meleeCooldown > 0}
              className={`w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center font-tech transition-all shadow-lg ${
                meleeCooldown > 0
                  ? 'bg-slate-900/80 border-slate-700 text-slate-600 opacity-60'
                  : 'bg-indigo-600 active:scale-95 active:bg-indigo-500 border-indigo-300 text-white shadow-indigo-600/50'
              }`}
              title="Ataque CQC Cuchillo (Tecla V)"
            >
              <Swords className="w-5 h-5 text-indigo-100" />
              <span className="text-[8px] font-bold mt-0.5">{meleeCooldown > 0 ? 'COOLDOWN' : 'CUCHILLO'}</span>
            </button>
          )}

          {/* Heal / Medkit Button */}
          {hasUsableMedkit && (
            <button
              id="btn-quick-heal"
              onClick={onHeal}
              className="w-12 h-12 rounded-full bg-emerald-600 active:scale-95 active:bg-emerald-500 text-white shadow-lg shadow-emerald-700/50 border border-emerald-400 flex flex-col items-center justify-center font-tech transition-transform"
            >
              <PlusCircle className="w-5 h-5 text-emerald-100" />
              <span className="text-[8px] font-bold">HEAL</span>
            </button>
          )}

          {/* Interact / Loot Button (lights up when near crate or helipad) */}
          {canInteract && (
            <button
              id="btn-interact-crate"
              onClick={onInteract}
              className="w-13 h-13 rounded-full bg-amber-500 active:scale-95 active:bg-amber-400 text-slate-950 shadow-xl shadow-amber-500/50 border-2 border-yellow-200 flex flex-col items-center justify-center font-tech font-bold transition-transform animate-bounce"
            >
              <Sparkles className="w-5 h-5 text-slate-900" />
              <span className="text-[9px]">{interactLabel}</span>
            </button>
          )}
        </div>

        {/* Row 2: Dodge Roll and Reload */}
        <div className="contents">
          {/* Reload Button */}
          <button
            id="btn-touch-reload"
            onClick={onReload}
            disabled={isReloading}
            className={`w-12 h-12 rounded-full border flex flex-col items-center justify-center font-tech shadow-md transition-all ${
              isReloading
                ? 'bg-slate-800 border-sky-400 text-sky-400'
                : 'bg-slate-900/80 active:bg-slate-800 border-slate-600 text-slate-200'
            }`}
          >
            <RotateCcw className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`} />
            <span className="text-[8px] mt-0.5">{isReloading ? `${Math.round(reloadProgress * 100)}%` : 'RELOAD'}</span>
          </button>

          {/* Dodge / Roll Button */}
          <button
            id="btn-touch-dodge"
            onClick={onDodge}
            disabled={rollCooldown > 0}
            className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center font-tech font-bold shadow-lg transition-transform ${
              rollCooldown > 0
                ? 'bg-slate-800/80 border-slate-700 text-slate-500 opacity-60'
                : 'bg-sky-600 active:scale-95 active:bg-sky-500 border-sky-300 text-white shadow-sky-600/40'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[9px]">ROLL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
