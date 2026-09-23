import React, { useRef, useState } from 'react';
import { RotateCcw, Shield, Sparkles, PlusCircle, Bomb, Crosshair, Zap, Repeat, Swords, Eye } from 'lucide-react';
import { WeaponId } from '../types';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

interface TouchControlsProps {
  onMove: (vector: { x: number; y: number }) => void;
  onAim: (vector: { x: number; y: number }) => void;
  onShoot: (isShooting: boolean) => void;
  onDodge: () => void;
  onCrouch?: () => void;
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
  ammo?: number;
  maxAmmo?: number;
  stamina?: number;
  maxStamina?: number;
  isSprinting?: boolean;
  isCrouching?: boolean;
  meleeCooldown?: number;
  grenadesCount?: number;
  grenadeCooldown?: number;
  glooWallsCount?: number;
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
  onCrouch,
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
  ammo,
  maxAmmo,
  stamina = 100,
  maxStamina = 100,
  isSprinting = false,
  isCrouching = false,
  meleeCooldown = 0,
  grenadesCount = 0,
  grenadeCooldown = 0,
  glooWallsCount = 3,
  isAimingMode = false,
  isReloading,
  reloadProgress,
  rollCooldown,
  hasUsableMedkit,
  canInteract,
  interactLabel = 'ABRIR',
  isTwinStickMode = true,
}) => {
  const { isSmallPhone, isTablet } = useResponsiveLayout();

  // Left Movement Joystick
  const [leftTouchId, setLeftTouchId] = useState<number | null>(null);
  const [leftOrigin, setLeftOrigin] = useState<{ x: number; y: number } | null>(null);
  const [leftCurrent, setLeftCurrent] = useState<{ x: number; y: number } | null>(null);

  // Right Combat Touchpad (Aim / Drag-to-Fire)
  const [rightTouchId, setRightTouchId] = useState<number | null>(null);
  const [rightOrigin, setRightOrigin] = useState<{ x: number; y: number } | null>(null);
  const [rightCurrent, setRightCurrent] = useState<{ x: number; y: number } | null>(null);

  const maxRadius = isSmallPhone ? 46 : isTablet ? 60 : 52;

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
        let dx = touch.clientX - leftOrigin.x;
        let dy = touch.clientY - leftOrigin.y;
        const dist = Math.hypot(dx, dy);

        // Auto-sprint when pulling joystick past 85% forward
        if (dy < -maxRadius * 0.85 && Math.abs(dx) < maxRadius * 0.7 && onSprint && !isSprinting) {
          onSprint(true);
        } else if (dist < maxRadius * 0.4 && isSprinting && onSprint) {
          onSprint(false);
        }

        if (dist > maxRadius) {
          dx = (dx / dist) * maxRadius;
          dy = (dy / dist) * maxRadius;
        }

        setLeftCurrent({ x: leftOrigin.x + dx, y: leftOrigin.y + dy });
        onMove({ x: dx / maxRadius, y: dy / maxRadius });
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

  // Right Trigger Touch Handlers (Firing & Fine Aim)
  const handleRightTouchStart = (e: React.TouchEvent) => {
    if (rightTouchId !== null) return;
    const touch = e.changedTouches[0];
    setRightTouchId(touch.identifier);
    setRightOrigin({ x: touch.clientX, y: touch.clientY });
    setRightCurrent({ x: touch.clientX, y: touch.clientY });
    onShoot(true);
  };

  const handleRightTouchMove = (e: React.TouchEvent) => {
    if (rightTouchId === null || !rightOrigin) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === rightTouchId) {
        let dx = touch.clientX - rightOrigin.x;
        let dy = touch.clientY - rightOrigin.y;
        const dist = Math.hypot(dx, dy);
        if (dist > maxRadius) {
          dx = (dx / dist) * maxRadius;
          dy = (dy / dist) * maxRadius;
        }
        setRightCurrent({ x: rightOrigin.x + dx, y: rightOrigin.y + dy });

        if (dist > 8) {
          onAim({ x: dx / maxRadius, y: dy / maxRadius });
        }
        break;
      }
    }
  };

  const handleRightTouchEnd = (e: React.TouchEvent) => {
    if (rightTouchId === null) return;
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
    <div
      id="touch-controls-container"
      className="absolute inset-0 pointer-events-none select-none z-20 overflow-hidden"
    >
      {/* ========================================================================= */}
      {/* 1. BOTTOM-LEFT: Pure Virtual Movement Joystick Zone                       */}
      {/* ========================================================================= */}
      <div
        id="touch-zone-left"
        onTouchStart={handleLeftTouchStart}
        onTouchMove={handleLeftTouchMove}
        onTouchEnd={handleLeftTouchEnd}
        onTouchCancel={handleLeftTouchEnd}
        className="absolute bottom-0 left-0 w-1/2 h-2/3 pointer-events-auto flex items-end justify-start"
        style={{
          paddingLeft: 'max(16px, env(safe-area-inset-left, 16px))',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
        }}
      >
        {/* Sprint Toggle Pill above Joystick */}
        {onSprint && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSprint(!isSprinting);
            }}
            className={`absolute flex items-center gap-1 px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
              isSprinting
                ? 'bg-amber-500 border-amber-300 text-slate-950 font-bold shadow-lg shadow-amber-500/40 animate-pulse'
                : 'bg-slate-950/80 border-slate-700 text-amber-400'
            }`}
            style={{
              bottom: isSmallPhone ? '150px' : isTablet ? '180px' : '160px',
              left: 'max(24px, env(safe-area-inset-left, 24px))',
            }}
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="text-[10px] font-tech font-bold">{isSprinting ? 'SPRINT ON' : 'AUTO RUN'}</span>
          </div>
        )}

        {/* Dynamic Movement Joystick Visuals */}
        {leftOrigin && leftCurrent ? (
          <div
            className="fixed pointer-events-none -translate-x-1/2 -translate-y-1/2 z-30"
            style={{ left: leftOrigin.x, top: leftOrigin.y }}
          >
            {/* Outer ring */}
            <div
              className="rounded-full border-2 border-sky-400/40 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center shadow-2xl"
              style={{ width: maxRadius * 2, height: maxRadius * 2 }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-sky-400/40" />
            </div>
            {/* Inner draggable thumb */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-sky-400 to-cyan-600 border border-white shadow-xl flex items-center justify-center"
              style={{
                left: leftCurrent.x - leftOrigin.x + maxRadius,
                top: leftCurrent.y - leftOrigin.y + maxRadius,
                width: maxRadius * 0.85,
                height: maxRadius * 0.85,
              }}
            >
              <div className="w-3 h-3 rounded-full bg-white/70" />
            </div>
          </div>
        ) : (
          /* Static thumb indicator when idle */
          <div
            className="rounded-full border-2 border-slate-600/50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center opacity-70 mb-4 ml-4"
            style={{ width: maxRadius * 2, height: maxRadius * 2 }}
          >
            <div className="w-8 h-8 rounded-full border border-sky-400/30 bg-sky-500/20 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. CENTER-RIGHT: Contextual Loot / Interact Prompt                         */}
      {/* ========================================================================= */}
      {canInteract && (
        <div
          id="context-action-container"
          className="absolute pointer-events-auto z-30"
          style={{
            right: isTablet ? '230px' : '175px',
            bottom: isSmallPhone ? '110px' : '140px',
          }}
        >
          <button
            id="btn-interact-crate"
            onClick={onInteract}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 active:scale-95 text-slate-950 shadow-2xl shadow-amber-500/80 border-2 border-white flex items-center gap-2 font-tech font-black text-xs tracking-wider animate-bounce"
          >
            <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
            <span>{interactLabel}</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. BOTTOM-RIGHT: Ergonomic Combat Radial Controller                       */}
      {/* ========================================================================= */}
      <div
        id="touch-combat-radial-cluster"
        className="absolute bottom-0 right-0 pointer-events-auto"
        style={{
          width: isSmallPhone ? '240px' : isTablet ? '310px' : '270px',
          height: isSmallPhone ? '240px' : isTablet ? '310px' : '270px',
          paddingRight: 'max(12px, env(safe-area-inset-right, 12px))',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
        }}
      >
        <div className="relative w-full h-full">
          {/* Tactical Throwables Row on top border: Grenade & Gloo Wall */}
          <div className="absolute top-1 right-2 flex items-center gap-2 z-20">
            {/* Gloo Wall (Muro de Hielo) */}
            {onDeployGlooWall && (
              <button
                id="btn-touch-gloo"
                onClick={onDeployGlooWall}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border-2 border-cyan-400 bg-cyan-950/90 active:scale-90 text-cyan-200 shadow-lg shadow-cyan-500/30 flex flex-col items-center justify-center font-tech transition-transform"
                title="Desplegar Muro Gloo"
              >
                <span className="text-xs">🧊</span>
                <span className="text-[7px] font-bold text-cyan-300">({glooWallsCount})</span>
              </button>
            )}

            {/* Grenade Button */}
            {onGrenade && (
              <button
                id="btn-touch-grenade"
                onClick={onGrenade}
                disabled={grenadesCount <= 0 || grenadeCooldown > 0}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl border-2 flex flex-col items-center justify-center font-tech transition-all shadow-lg active:scale-90 ${
                  grenadesCount <= 0 || grenadeCooldown > 0
                    ? 'bg-slate-900/80 border-slate-700 text-slate-600 opacity-60'
                    : 'bg-amber-600 active:bg-amber-500 border-amber-300 text-white shadow-amber-600/40'
                }`}
                title="Lanzar Granada Táctica"
              >
                <Bomb className="w-3.5 h-3.5 text-amber-100" />
                <span className="text-[7px] font-bold leading-none">
                  {grenadeCooldown > 0 ? `${Math.ceil(grenadeCooldown)}s` : `${grenadesCount}`}
                </span>
              </button>
            )}
          </div>

          {/* Quick Heal / Medkit Button (Top-left of radial arc) */}
          <button
            id="btn-quick-heal"
            onClick={onHeal}
            disabled={!hasUsableMedkit}
            className={`absolute w-12 h-12 sm:w-13 sm:h-13 rounded-full border-2 flex flex-col items-center justify-center font-tech shadow-xl transition-all active:scale-90 z-20 ${
              hasUsableMedkit
                ? 'bg-emerald-600 active:bg-emerald-500 border-emerald-300 text-white shadow-emerald-600/50 animate-pulse'
                : 'bg-slate-900/80 border-slate-700 text-slate-600 opacity-50'
            }`}
            style={{
              bottom: isSmallPhone ? '125px' : '145px',
              right: isSmallPhone ? '120px' : '145px',
            }}
            title="Curar Salud / Usar Botiquín"
          >
            <PlusCircle className="w-4 h-4 text-emerald-100" />
            <span className="text-[7px] font-bold">CURAR</span>
          </button>

          {/* AIM / MIRA TÁCTICA BUTTON (Directly above Fire button) */}
          {onToggleAim && (
            <button
              id="btn-touch-aim"
              onClick={onToggleAim}
              className={`absolute w-12 h-12 sm:w-13 sm:h-13 rounded-full border-2 flex flex-col items-center justify-center font-tech shadow-xl transition-all active:scale-90 z-20 ${
                isAimingMode
                  ? 'bg-rose-600 border-rose-200 text-white shadow-rose-600/60 ring-2 ring-rose-400 animate-pulse'
                  : 'bg-slate-900/90 active:bg-slate-800 border-slate-600 text-slate-200'
              }`}
              style={{
                bottom: isSmallPhone ? '95px' : '110px',
                right: isSmallPhone ? '14px' : '18px',
              }}
              title="Mira Táctica y Fijación ADS"
            >
              <Crosshair className={`w-4 h-4 ${isAimingMode ? 'text-white rotate-45' : 'text-slate-300'}`} />
              <span className="text-[7px] font-bold tracking-tight">{isAimingMode ? 'LOCK' : 'MIRA'}</span>
            </button>
          )}

          {/* RECARGAR BUTTON (Above-left of Fire button) */}
          <button
            id="btn-touch-reload"
            onClick={onReload}
            disabled={isReloading}
            className={`absolute w-12 h-12 sm:w-13 sm:h-13 rounded-full border-2 flex flex-col items-center justify-center font-tech shadow-xl transition-all active:scale-90 z-20 ${
              isReloading
                ? 'bg-sky-950 border-sky-400 text-sky-300 ring-2 ring-sky-400/50'
                : 'bg-slate-900/90 active:bg-slate-800 border-slate-600 text-slate-200'
            }`}
            style={{
              bottom: isSmallPhone ? '88px' : '102px',
              right: isSmallPhone ? '74px' : '88px',
            }}
            title="Recargar Munición"
          >
            <RotateCcw className={`w-4 h-4 ${isReloading ? 'animate-spin text-sky-400' : 'text-slate-300'}`} />
            <span className="text-[7px] font-bold mt-0.5">
              {isReloading ? `${Math.round(reloadProgress * 100)}%` : 'RELOAD'}
            </span>
          </button>

          {/* RODAR / DODGE ROLL (Left of Fire button) */}
          <button
            id="btn-touch-dodge"
            onClick={onDodge}
            disabled={rollCooldown > 0}
            className={`absolute w-12 h-12 sm:w-13 sm:h-13 rounded-full border-2 flex flex-col items-center justify-center font-tech font-bold shadow-xl transition-all active:scale-90 z-20 ${
              rollCooldown > 0
                ? 'bg-slate-800/80 border-slate-700 text-slate-500 opacity-60'
                : 'bg-sky-600 active:bg-sky-500 border-sky-300 text-white shadow-sky-600/50'
            }`}
            style={{
              bottom: isSmallPhone ? '14px' : '18px',
              right: isSmallPhone ? '95px' : '110px',
            }}
            title="Rodar para Esquivar Balas"
          >
            <Shield className="w-4 h-4 text-sky-100" />
            <span className="text-[7px] font-bold">RODAR</span>
          </button>

          {/* AGACHARSE / CROUCH (Below-left of Fire button) */}
          {onCrouch && (
            <button
              id="btn-touch-crouch"
              onClick={onCrouch}
              className={`absolute w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 flex flex-col items-center justify-center font-tech shadow-lg transition-all active:scale-90 z-20 ${
                isCrouching
                  ? 'bg-amber-600 border-amber-200 text-white shadow-amber-600/50 ring-2 ring-amber-400'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300'
              }`}
              style={{
                bottom: isSmallPhone ? '14px' : '18px',
                right: isSmallPhone ? '152px' : '172px',
              }}
              title="Agacharse / Tomar Cobertura"
            >
              <span className="text-xs leading-none">🧎</span>
              <span className="text-[6px] font-bold mt-0.5">{isCrouching ? 'BAJO' : 'AGACH'}</span>
            </button>
          )}

          {/* PRIMARY DISPARAR BUTTON (Large Prominent Trigger Button) */}
          <div
            id="btn-touch-fire-container"
            onTouchStart={handleRightTouchStart}
            onTouchMove={handleRightTouchMove}
            onTouchEnd={handleRightTouchEnd}
            onTouchCancel={handleRightTouchEnd}
            className="absolute rounded-full bg-gradient-to-br from-rose-500 via-red-600 to-rose-700 active:from-rose-400 active:to-red-500 border-3 border-rose-200 text-white shadow-2xl shadow-rose-600/70 flex flex-col items-center justify-center font-tech active:scale-95 transition-transform cursor-pointer select-none z-30"
            style={{
              bottom: isSmallPhone ? '10px' : '14px',
              right: isSmallPhone ? '10px' : '14px',
              width: isSmallPhone ? '76px' : isTablet ? '90px' : '82px',
              height: isSmallPhone ? '76px' : isTablet ? '90px' : '82px',
            }}
          >
            <Crosshair className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-md" />
            <span className="text-[8px] sm:text-[9px] font-black tracking-widest mt-0.5">DISPARO</span>
            {/* Luminous pulse ring */}
            <div className="absolute inset-0 rounded-full border-2 border-rose-300/40 animate-ping pointer-events-none opacity-30" />
          </div>
        </div>
      </div>
    </div>
  );
};
