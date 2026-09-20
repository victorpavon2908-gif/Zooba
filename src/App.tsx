/**
 * Bounty Run 2D - Mobile Extraction Shooter
 * Main Application Component
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine';
import { IsometricRenderer } from './game/renderer';
import { HUD } from './components/HUD';
import { TouchControls } from './components/TouchControls';
import { ExtractionSummaryModal } from './components/ExtractionSummaryModal';
import { ArmoryModal } from './components/ArmoryModal';
import { SettingsModal } from './components/SettingsModal';
import { TitleScreen } from './components/TitleScreen';
import { InstallAppModal } from './components/InstallAppModal';
import { TacticalGuideMapModal } from './components/TacticalGuideMapModal';
import { GameScreen, GameSettings, SectorMission, WeaponId } from './types';
import { SECTOR_MISSIONS, WEAPONS } from './game/gameData';
import { sound } from './audio/soundEngine';

const STORAGE_KEY = 'bounty_run_save_v1';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Persistent Player Profile State
  const [cash, setCash] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved).cash || 500;
      } catch (e) {
        return 500;
      }
    }
    return 500; // Starting fund
  });

  const [unlockedWeapons, setUnlockedWeapons] = useState<WeaponId[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved).unlockedWeapons || ['pistol'];
      } catch (e) {
        return ['pistol'];
      }
    }
    return ['pistol'];
  });

  const [equippedWeapon, setEquippedWeapon] = useState<WeaponId>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved).equippedWeapon || 'pistol';
      } catch (e) {
        return 'pistol';
      }
    }
    return 'pistol';
  });

  const [backpackTier, setBackpackTier] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved).backpackTier || 0;
      } catch (e) {
        return 0;
      }
    }
    return 0; // 5 slots
  });

  const [armorTier, setArmorTier] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved).armorTier || 0;
      } catch (e) {
        return 0;
      }
    }
    return 0; // 15% armor
  });

  // Settings
  const [settings, setSettings] = useState<GameSettings>({
    autoAim: true,
    haptics: true,
    soundVolume: 0.8,
    musicVolume: 0.7,
    screenShake: true,
    touchControlsStyle: 'twin-stick',
    highGraphics: true,
  });

  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Active Screen & Modals
  const [gameScreen, setGameScreen] = useState<GameScreen>('menu');
  const [selectedMissionId, setSelectedMissionId] = useState<string>('sector_warehouse');
  const [showArmory, setShowArmory] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);
  const [showGuideMap, setShowGuideMap] = useState<boolean>(false);

  // HUD Reactive snapshot
  const [hudTick, setHudTick] = useState<number>(0);

  // Save profile helper
  const saveProfile = useCallback(
    (newCash: number, newWeapons: WeaponId[], newEquipped: WeaponId, newBp: number, newArm: number) => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          cash: newCash,
          unlockedWeapons: newWeapons,
          equippedWeapon: newEquipped,
          backpackTier: newBp,
          armorTier: newArm,
        })
      );
    },
    []
  );

  const currentMission =
    SECTOR_MISSIONS.find((m) => m.id === selectedMissionId) || SECTOR_MISSIONS[0];

  const getCapacityFromTier = (tier: number) => {
    switch (tier) {
      case 1:
        return 7;
      case 2:
        return 9;
      case 3:
        return 12;
      default:
        return 5;
    }
  };

  const getArmorFromTier = (tier: number) => {
    switch (tier) {
      case 1:
        return 30;
      case 2:
        return 45;
      default:
        return 15;
    }
  };

  // Start / Restart Game Session
  const startGameSession = useCallback(() => {
    const capacity = getCapacityFromTier(backpackTier);
    const armor = getArmorFromTier(armorTier);

    const engine = new GameEngine(currentMission, settings, capacity);
    engine.player.currentWeapon = equippedWeapon;
    engine.player.ammo = WEAPONS[equippedWeapon].magSize;
    engine.player.armor = armor;

    engineRef.current = engine;
    setGameScreen('playing');
    setShowSummary(false);
    setShowArmory(false);
    sound.playReload();
  }, [currentMission, settings, backpackTier, armorTier, equippedWeapon]);

  // Main Game Loop
  useEffect(() => {
    if (gameScreen !== 'playing') return;

    let animId: number;

    const loop = (time: number) => {
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      const engine = engineRef.current;
      const canvas = canvasRef.current;

      if (engine && canvas) {
        // Step physics & AI
        engine.update(dt);

        // Check victory or defeat triggers
        if ((engine.isGameOver || engine.isExtracted) && !showSummary) {
          setShowSummary(true);

          if (engine.isExtracted) {
            // Calculate total loot & deposit
            const lootTotal = engine.player.backpack.reduce((sum, i) => sum + i.value, 0);
            const totalReward = lootTotal + engine.player.kills * 120 + 500;
            const updatedCash = cash + totalReward;
            setCash(updatedCash);
            saveProfile(updatedCash, unlockedWeapons, equippedWeapon, backpackTier, armorTier);
          } else if (engine.isGameOver) {
            // Pity insurance $100
            const updatedCash = cash + 100;
            setCash(updatedCash);
            saveProfile(updatedCash, unlockedWeapons, equippedWeapon, backpackTier, armorTier);
          }
        }

        // Ensure canvas pixel buffer is always calibrated to viewport dimensions
        const dpr = window.devicePixelRatio || 1;
        const expectedW = Math.floor(window.innerWidth * dpr);
        const expectedH = Math.floor(window.innerHeight * dpr);
        if (canvas.width !== expectedW || canvas.height !== expectedH) {
          canvas.width = expectedW;
          canvas.height = expectedH;
          canvas.style.width = `${window.innerWidth}px`;
          canvas.style.height = `${window.innerHeight}px`;
        }

        // Render Canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Camera with screen shake offset
          let drawCamX = engine.camX;
          let drawCamY = engine.camY;
          if (engine.screenShakeAmount > 0) {
            drawCamX += (Math.random() - 0.5) * engine.screenShakeAmount * 4;
            drawCamY += (Math.random() - 0.5) * engine.screenShakeAmount * 4;
          }

          IsometricRenderer.render(
            ctx,
            canvas,
            drawCamX,
            drawCamY,
            engine.player,
            engine.enemies,
            engine.bullets,
            engine.grenades,
            engine.particles,
            engine.decals,
            engine.crates,
            engine.barrels,
            engine.walls,
            engine.extraction,
            engine.floatingTexts,
            engine.arenaSize,
            engine.mission.theme,
            settings.highGraphics,
            engine.healthStations,
            engine.healthPickups
          );
        }

        // Trigger React UI HUD update periodically (15 times/sec) to avoid React render churn
        setHudTick((t) => (t + 1) % 10000);
      }

      animId = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [gameScreen, showSummary, cash, unlockedWeapons, equippedWeapon, backpackTier, armorTier, saveProfile, settings.highGraphics]);

  // Handle Resize for High-DPI Canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Desktop Keyboard and Mouse Listeners
  useEffect(() => {
    const keysPressed: Record<string, boolean> = {};

    const updateKeyboardMovement = () => {
      const engine = engineRef.current;
      if (!engine) return;

      let sx = 0; // Screen X
      let sy = 0; // Screen Y
      if (keysPressed['KeyW'] || keysPressed['ArrowUp']) sy -= 1;
      if (keysPressed['KeyS'] || keysPressed['ArrowDown']) sy += 1;
      if (keysPressed['KeyA'] || keysPressed['ArrowLeft']) sx -= 1;
      if (keysPressed['KeyD'] || keysPressed['ArrowRight']) sx += 1;

      const sMag = Math.hypot(sx, sy);
      if (sMag > 0) {
        // Screen-to-isometric projection transformation:
        // Ensures pressing W moves straight UP on screen, D moves RIGHT, etc.
        const normSx = sx / sMag;
        const normSy = sy / sMag;
        const wx = (normSx / 0.866025 + normSy / 0.5) * 0.5;
        const wy = (normSy / 0.5 - normSx / 0.866025) * 0.5;
        const wMag = Math.hypot(wx, wy);
        engine.moveVector = { x: wx / wMag, y: wy / wMag };
      } else {
        engine.moveVector = { x: 0, y: 0 };
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      keysPressed[e.code] = true;

      const engine = engineRef.current;
      if (!engine) return;

      if (e.code === 'Space') {
        engine.triggerDodge();
      } else if (e.code === 'KeyR') {
        engine.triggerReload();
      } else if (e.code === 'KeyV') {
        engine.triggerMelee();
      } else if (e.code === 'KeyQ') {
        engine.cyclePrevWeapon();
      } else if (e.code === 'KeyE') {
        engine.interactNearest();
      } else if (e.code === 'KeyF' || e.code === 'KeyT') {
        engine.toggleAimMode();
      } else if (e.code === 'KeyH') {
        engine.useMedkit();
      } else if (e.code === 'KeyG') {
        engine.throwGrenade();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        engine.setSprinting(true);
      } else if (e.code.startsWith('Digit')) {
        const slot = parseInt(e.code.replace('Digit', ''), 10) - 1;
        if (slot >= 0 && slot < engine.player.unlockedWeapons.length) {
          engine.switchWeapon(engine.player.unlockedWeapons[slot]);
        }
      } else if (e.code === 'KeyM') {
        setShowGuideMap((prev) => !prev);
      }

      updateKeyboardMovement();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.code] = false;
      const engine = engineRef.current;
      if (engine && (e.code === 'ShiftLeft' || e.code === 'ShiftRight')) {
        engine.setSprinting(false);
      }
      updateKeyboardMovement();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const engine = engineRef.current;
      const canvas = canvasRef.current;
      if (!engine || !canvas) return;

      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;

      const world = IsometricRenderer.toWorld(
        e.clientX,
        e.clientY,
        engine.camX,
        engine.camY,
        w,
        h
      );

      // Si hay un robot fijado en el campo de visión, la mira se mantiene apuntando al robot
      if (engine.player.aimLockedTargetId !== null) {
        const locked = engine.enemies.find((en) => en.id === engine.player.aimLockedTargetId && en.state !== 'dead');
        if (locked) {
          engine.cursorWorldPos = { x: locked.x, y: locked.y };
          engine.player.angle = Math.atan2(locked.y - engine.player.y, locked.x - engine.player.x);
          return;
        }
      }

      engine.cursorWorldPos = world;
      engine.player.angle = Math.atan2(world.y - engine.player.y, world.x - engine.player.x);
    };

    const handleMouseDown = (e: MouseEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (e.button === 0) {
        engine.isShootingIntent = true;
      } else if (e.button === 2) {
        // Right click tactical aim toggle
        engine.toggleAimMode();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0 && engineRef.current) {
        engineRef.current.isShootingIntent = false;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (e.deltaY > 0) {
        engine.cycleNextWeapon();
      } else if (e.deltaY < 0) {
        engine.cyclePrevWeapon();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Handlers for Touch Controls
  const handleTouchMove = useCallback((vec: { x: number; y: number }) => {
    if (engineRef.current) {
      const mag = Math.hypot(vec.x, vec.y);
      if (mag > 0.02) {
        // Screen joystick to isometric world mapping
        const normX = vec.x / mag;
        const normY = vec.y / mag;
        const wx = (normX / 0.866025 + normY / 0.5) * 0.5;
        const wy = (normY / 0.5 - normX / 0.866025) * 0.5;
        const wMag = Math.hypot(wx, wy);
        engineRef.current.moveVector = { x: (wx / wMag) * mag, y: (wy / wMag) * mag };
      } else {
        engineRef.current.moveVector = { x: 0, y: 0 };
      }
    }
  }, []);

  const handleTouchAim = useCallback((vec: { x: number; y: number }) => {
    if (engineRef.current) {
      engineRef.current.aimVector = vec;
    }
  }, []);

  const handleTouchShoot = useCallback((isShooting: boolean) => {
    if (engineRef.current) {
      engineRef.current.isShootingIntent = isShooting;
    }
  }, []);

  const handleTouchDodge = useCallback(() => {
    engineRef.current?.triggerDodge();
  }, []);

  const handleTouchReload = useCallback(() => {
    engineRef.current?.triggerReload();
  }, []);

  const handleTouchHeal = useCallback(() => {
    engineRef.current?.useMedkit();
  }, []);

  const handleTouchInteract = useCallback(() => {
    engineRef.current?.interactNearest();
  }, []);

  const handleTouchGrenade = useCallback(() => {
    engineRef.current?.throwGrenade();
  }, []);

  const handleTouchToggleAim = useCallback(() => {
    engineRef.current?.toggleAimMode();
  }, []);

  const handleUseLootItem = useCallback((index: number) => {
    engineRef.current?.useMedkit();
  }, []);

  const handleDropLootItem = useCallback((index: number) => {
    const engine = engineRef.current;
    if (engine && engine.player.backpack[index]) {
      const dropped = engine.player.backpack.splice(index, 1)[0];
      engine.addFloatingText(engine.player.x, engine.player.y - 20, `DROPPED ${dropped.name}`, '#94a3b8', 12);
      sound.playCrateOpen();
    }
  }, []);

  // Armory Transactions
  const handleEquipWeapon = (id: WeaponId) => {
    setEquippedWeapon(id);
    if (engineRef.current) {
      engineRef.current.player.currentWeapon = id;
      engineRef.current.player.ammo = WEAPONS[id].magSize;
    }
    saveProfile(cash, unlockedWeapons, id, backpackTier, armorTier);
  };

  const handleBuyWeapon = (id: WeaponId, price: number) => {
    if (cash >= price && !unlockedWeapons.includes(id)) {
      const updatedCash = cash - price;
      const updatedWeapons = [...unlockedWeapons, id];
      setCash(updatedCash);
      setUnlockedWeapons(updatedWeapons);
      setEquippedWeapon(id);
      if (engineRef.current) {
        engineRef.current.player.currentWeapon = id;
        engineRef.current.player.ammo = WEAPONS[id].magSize;
      }
      saveProfile(updatedCash, updatedWeapons, id, backpackTier, armorTier);
    }
  };

  const handleUpgradeBackpack = (tier: number, price: number) => {
    if (cash >= price) {
      const updatedCash = cash - price;
      setCash(updatedCash);
      setBackpackTier(tier);
      if (engineRef.current) {
        engineRef.current.player.maxBackpackSlots = getCapacityFromTier(tier);
      }
      saveProfile(updatedCash, unlockedWeapons, equippedWeapon, tier, armorTier);
    }
  };

  const handleUpgradeArmor = (tier: number, price: number) => {
    if (cash >= price) {
      const updatedCash = cash - price;
      setCash(updatedCash);
      setArmorTier(tier);
      if (engineRef.current) {
        engineRef.current.player.armor = getArmorFromTier(tier);
      }
      saveProfile(updatedCash, unlockedWeapons, equippedWeapon, backpackTier, tier);
    }
  };

  const engine = engineRef.current;
  const hasUsableMedkit = !!engine?.player.backpack.some((i) => i.usable);
  const canInteract = !!engine?.nearestCrate && !engine.nearestCrate.isOpened;

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 font-sans select-none">
      {/* 2.5D Isometric Game Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none cursor-crosshair"
      />

      {/* Title & Mission Briefing Screen */}
      {gameScreen === 'menu' && (
        <TitleScreen
          mission={currentMission}
          cash={cash}
          onStartGame={startGameSession}
          onOpenArmory={() => setShowArmory(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenInstall={() => setShowInstallModal(true)}
        />
      )}

      {/* In-Game HUD Interface */}
      {gameScreen === 'playing' && engine && (
        <>
          <HUD
            player={engine.player}
            enemies={engine.enemies}
            extraction={engine.extraction}
            crates={engine.crates}
            healthStations={engine.healthStations}
            healthPickups={engine.healthPickups}
            mission={engine.mission}
            isMuted={isMuted}
            onToggleMute={() => {
              const next = !isMuted;
              setIsMuted(next);
              sound.setMuted(next);
            }}
            onOpenArmory={() => setShowArmory(true)}
            onOpenSettings={() => setShowSettings(true)}
            onOpenInstall={() => setShowInstallModal(true)}
            onOpenMap={() => setShowGuideMap(true)}
            onUseItem={handleUseLootItem}
            onDropItem={handleDropLootItem}
            onGrenade={handleTouchGrenade}
            onToggleAim={handleTouchToggleAim}
            onSwitchWeapon={(wId) => engine.switchWeapon(wId)}
            onReload={() => engine.triggerReload()}
            onMelee={() => engine.triggerMelee()}
          />

          {/* Touch Virtual Joysticks & Mobile Buttons */}
          <TouchControls
            onMove={handleTouchMove}
            onAim={handleTouchAim}
            onShoot={handleTouchShoot}
            onDodge={handleTouchDodge}
            onReload={handleTouchReload}
            onHeal={handleTouchHeal}
            onInteract={handleTouchInteract}
            onGrenade={handleTouchGrenade}
            onToggleAim={handleTouchToggleAim}
            onSprint={(sprinting) => engine.setSprinting(sprinting)}
            onMelee={() => engine.triggerMelee()}
            onSwitchWeapon={() => engine.cycleNextWeapon()}
            currentWeapon={engine.player.currentWeapon}
            stamina={engine.player.stamina}
            maxStamina={engine.player.maxStamina}
            isSprinting={engine.player.isSprinting}
            meleeCooldown={engine.player.meleeCooldown}
            grenadesCount={engine.player.grenades}
            grenadeCooldown={engine.player.grenadeCooldown}
            isAimingMode={engine.player.isAimingMode}
            isReloading={engine.player.isReloading}
            reloadProgress={engine.player.reloadProgress}
            rollCooldown={engine.player.rollCooldown}
            hasUsableMedkit={hasUsableMedkit}
            canInteract={canInteract}
            interactLabel={canInteract ? 'SEARCH' : 'LOOT'}
            isTwinStickMode={settings.touchControlsStyle === 'twin-stick'}
          />
        </>
      )}

      {/* Extraction / Mission Summary Modal (Victory or K.I.A.) */}
      {showSummary && engine && (
        <ExtractionSummaryModal
          isSuccess={engine.isExtracted}
          player={engine.player}
          onContinue={() => {
            setShowSummary(false);
            setShowArmory(true);
            setGameScreen('menu');
          }}
          onRetry={() => {
            startGameSession();
          }}
        />
      )}

      {/* Armory & Black Market Modal */}
      {showArmory && (
        <ArmoryModal
          cash={cash}
          unlockedWeapons={unlockedWeapons}
          equippedWeapon={equippedWeapon}
          backpackTier={backpackTier}
          armorTier={armorTier}
          selectedMissionId={selectedMissionId}
          onEquipWeapon={handleEquipWeapon}
          onBuyWeapon={handleBuyWeapon}
          onUpgradeBackpack={handleUpgradeBackpack}
          onUpgradeArmor={handleUpgradeArmor}
          onSelectMission={setSelectedMissionId}
          onStartRaid={() => {
            setShowArmory(false);
            startGameSession();
          }}
          onClose={() => setShowArmory(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={(newSettings) => {
            setSettings((prev) => ({ ...prev, ...newSettings }));
            if (engineRef.current) {
              engineRef.current.settings = { ...engineRef.current.settings, ...newSettings };
            }
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Install Mobile PWA / APK Modal */}
      {showInstallModal && (
        <InstallAppModal onClose={() => setShowInstallModal(false)} />
      )}

      {/* Tactical Guide Map Modal */}
      {engine && (
        <TacticalGuideMapModal
          isOpen={showGuideMap}
          onClose={() => setShowGuideMap(false)}
          player={engine.player}
          enemies={engine.enemies}
          extraction={engine.extraction}
          crates={engine.crates}
          healthStations={engine.healthStations}
          healthPickups={engine.healthPickups}
          sectors={engine.sectors}
          arenaSize={engine.arenaSize}
        />
      )}
    </div>
  );
}
