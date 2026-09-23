/**
 * Core Game Engine for Bounty Run 2D
 * Handles map generation, physics, collision detection, enemy AI, weapon firing,
 * extraction progression, mobile controls and state transitions.
 */

import {
  Player,
  Enemy,
  Bullet,
  Particle,
  FloorDecal,
  Crate,
  Barrel,
  Wall,
  ExtractionZone,
  FloatingText,
  SectorMission,
  GameSettings,
  LootItem,
  WeaponId,
  Grenade,
  HealthStation,
  HealthPickup,
  MapSector,
  GlooWall,
  WarStructure,
  House3D,
  Cave3D,
  Mountain3D,
  MilitaryFacility3D,
  Vegetation3D,
  Rock3D,
  AIState,
} from '../types';
import { WEAPONS, LOOT_CATALOG } from './gameData';
import { sound } from '../audio/soundEngine';
import { createWorldStructures, getTerrainHeight } from './terrain';

export class GameEngine {
  public player: Player;
  public enemies: Enemy[] = [];
  public bullets: Bullet[] = [];
  public grenades: Grenade[] = [];
  public particles: Particle[] = [];
  public decals: FloorDecal[] = [];
  public crates: Crate[] = [];
  public barrels: Barrel[] = [];
  public walls: Wall[] = [];
  public glooWalls: GlooWall[] = [];
  public warStructures: WarStructure[] = [];
  public extraction: ExtractionZone;
  public floatingTexts: FloatingText[] = [];

  // Expanded map & Tactical Guide Map data
  public healthStations: HealthStation[] = [];
  public healthPickups: HealthPickup[] = [];
  public sectors: MapSector[] = [];
  public nearestHealthStation: HealthStation | null = null;

  // 3D Explorable World Elements
  public mountains: Mountain3D[] = [];
  public houses: House3D[] = [];
  public caves: Cave3D[] = [];
  public militaryFacilities: MilitaryFacility3D[] = [];
  public vegetation: Vegetation3D[] = [];
  public rocks: Rock3D[] = [];

  public mission: SectorMission;
  public settings: GameSettings;
  public arenaSize: number = 3200;

  public camX: number = 0;
  public camY: number = 0;
  public screenShakeAmount: number = 0;

  public isGameOver: boolean = false;
  public isExtracted: boolean = false;
  public extractionTriggeredWave: boolean = false;

  private nextEntityId: number = 1;

  // Touch & input states
  public moveVector: { x: number; y: number } = { x: 0, y: 0 };
  public aimVector: { x: number; y: number } = { x: 0, y: 0 };
  public isShootingIntent: boolean = false;
  public cursorWorldPos: { x: number; y: number } = { x: 0, y: 0 };

  // Nearest interactive target
  public nearestCrate: Crate | null = null;
  public isNearExtraction: boolean = false;

  constructor(mission: SectorMission, settings: GameSettings, backpackCapacity: number = 5) {
    this.mission = mission;
    this.settings = settings;

    // Initialize player at spawn with Free Fire stats & gear
    this.player = {
      x: 350,
      y: 350,
      vx: 0,
      vy: 0,
      radius: 16,
      speed: 215,
      health: 100,
      maxHealth: 100,
      shield: 100, // Free Fire Chaleco Shield
      maxShield: 100,
      armorLevel: 2,
      helmetLevel: 2,
      armor: 20,
      angle: 0,
      isRolling: false,
      rollTimer: 0,
      rollDuration: 0.28,
      rollCooldown: 0,
      rollVx: 0,
      rollVy: 0,
      isCrouching: false,
      currentWeapon: 'ak47',
      ammo: WEAPONS.ak47.magSize,
      isReloading: false,
      reloadProgress: 0,
      shotTimer: 0,
      backpack: [],
      maxBackpackSlots: backpackCapacity,
      kills: 0,
      damageFlash: 0,
      shieldFlash: 0,
      grenades: 4,
      maxGrenades: 4,
      grenadeCooldown: 0,
      glooWalls: 3, // Free Fire Muros de Hielo
      maxGlooWalls: 5,
      glooWallCooldown: 0,
      isAimingMode: false,
      aimLockedTargetId: null,
      stamina: 100,
      maxStamina: 100,
      isSprinting: false,
      meleeCooldown: 0,
      isMeleeAttacking: false,
      meleeTimer: 0,
      unlockedWeapons: ['ak47', 'mp40', 'm1014', 'awm', 'katana', 'pistol', 'rifle', 'smg', 'shotgun', 'plasma'],
      ammoByWeapon: {
        ak47: WEAPONS.ak47.magSize,
        mp40: WEAPONS.mp40.magSize,
        m1014: WEAPONS.m1014.magSize,
        awm: WEAPONS.awm.magSize,
        katana: 999,
        pistol: WEAPONS.pistol.magSize,
        shotgun: WEAPONS.shotgun.magSize,
        rifle: WEAPONS.rifle.magSize,
        smg: WEAPONS.smg.magSize,
        plasma: WEAPONS.plasma.magSize,
      },
    };

    // Initialize camera directly on player spawn position for instant centering
    this.camX = this.player.x;
    this.camY = this.player.y;

    // Extraction Pad placed in Sector 06 Fortified Helipad Outpost
    this.extraction = {
      x: 2750,
      y: 2750,
      radius: 80,
      countdown: mission.extractionTimeSec,
      timeInZone: 0,
      requiredStayTime: 5.0, // 5 seconds inside zone to extract
      isActive: true,
      isExtracting: false,
      hologramAngle: 0,
    };

    this.initMap();
  }

  private initMap() {
    const size = this.arenaSize;

    // 0. Initialize 3D World Structures (Mountains, Houses, Caves, Facilities, Vegetation, Rocks)
    const worldStructures = createWorldStructures(size);
    this.mountains = worldStructures.mountains;
    this.houses = worldStructures.houses;
    this.caves = worldStructures.caves;
    this.militaryFacilities = worldStructures.militaryFacilities;
    this.vegetation = worldStructures.vegetation;
    this.rocks = worldStructures.rocks;

    // 1. Define the 6 World Sectors
    this.sectors = [
      {
        id: 'sec-01',
        code: 'SEC-01',
        name: 'Túnel de Acceso & Búnker Subterráneo Nivel -2',
        x: 0,
        y: 0,
        w: 1600,
        h: 1000,
        color: 'rgba(14, 165, 233, 0.04)',
        description: 'Túneles de entrada subterránea con escondites tácticos y cajas de suministros de madera.',
      },
      {
        id: 'sec-02',
        code: 'SEC-02',
        name: 'Almacén de Cajas de Madera & Pasillos de Carga',
        x: 1600,
        y: 0,
        w: 1600,
        h: 1000,
        color: 'rgba(239, 68, 68, 0.04)',
        description: 'Galería subterránea repleta de cajas de madera, pasillos estrechos y puestos de guardia robótica.',
      },
      {
        id: 'sec-03',
        code: 'SEC-03',
        name: 'Refugio Médico & Laboratorio Subterráneo',
        x: 0,
        y: 1000,
        w: 1400,
        h: 1100,
        color: 'rgba(34, 197, 94, 0.04)',
        description: 'Instalaciones subterráneas de nanotecnología y estaciones médicas protegidas en nichos.',
      },
      {
        id: 'sec-04',
        code: 'SEC-04',
        name: 'Catacumbas del Reactor & Generador Geotérmico',
        x: 1400,
        y: 1000,
        w: 1800,
        h: 1100,
        color: 'rgba(245, 158, 11, 0.04)',
        description: 'Pasillos oscuros subterráneos con tuberías de vapor y escondites detrás de cajas reforzadas.',
      },
      {
        id: 'sec-05',
        code: 'SEC-05',
        name: 'Búnker Blindado & Escondites Tácticos',
        x: 0,
        y: 2100,
        w: 1500,
        h: 1100,
        color: 'rgba(168, 85, 247, 0.04)',
        description: 'Laberinto de pasillos fortificados y escondites secretos con cajas de madera y municiones.',
      },
      {
        id: 'sec-06',
        code: 'SEC-06',
        name: 'Pozo de Extracción & Ascensor a Superficie',
        x: 1500,
        y: 2100,
        w: 1700,
        h: 1100,
        color: 'rgba(16, 185, 129, 0.04)',
        description: 'Plataforma del ascensor vertical que conecta el mundo subterráneo con el helipuerto de superficie.',
      },
    ];

    // 2. Outer Perimeter Walls (3200 x 3200 Subterranean Complex)
    this.walls = [
      // Top wall
      { x: 0, y: 0, w: size, h: 45, height3D: 80, type: 'outer', label: 'BÚNKER SUBTERRÁNEO NIVEL -2' },
      // Left wall
      { x: 0, y: 0, w: 45, h: size, height3D: 80, type: 'outer', label: 'TÚNEL PERIMETRAL OESTE' },
      // Bottom wall
      { x: 0, y: size - 45, w: size, h: 45, height3D: 80, type: 'outer', label: 'GALERÍA DE CONTENCIÓN SUR' },
      // Right wall
      { x: size - 45, y: 0, w: 45, h: size, height3D: 80, type: 'outer', label: 'POZO DE EVACUACIÓN ESTE' },

      // =========================================================================
      // PASILLOS PRINCIPALES Y TÚNELES SUBTERRÁNEOS (Corridors)
      // =========================================================================
      // Pasillo Arterial Horizontal Superior Y: 1000 (con aberturas y nichos)
      { x: 45, y: 980, w: 580, h: 40, height3D: 65, type: 'inner', label: 'PASILLO LAB-03' },
      { x: 740, y: 980, w: 860, h: 40, height3D: 65, type: 'inner', label: 'TÚNEL CENTRAL' },
      { x: 1780, y: 980, w: 1375, h: 40, height3D: 65, type: 'inner', label: 'PASILLO CATACUMBAS SEC-04' },

      // Pasillo Vertical Central X: 1600
      { x: 1600, y: 45, w: 40, h: 420, height3D: 65, type: 'inner', label: 'PASILLO ALMACÉN SEC-02' },
      { x: 1600, y: 620, w: 40, h: 360, height3D: 65, type: 'inner' },

      // Pasillo Arterial Horizontal Inferior Y: 2100
      { x: 45, y: 2100, w: 620, h: 40, height3D: 65, type: 'inner', label: 'PASILLO BÚNKER SEC-05' },
      { x: 820, y: 2100, w: 680, h: 40, height3D: 65, type: 'inner', label: 'TÚNEL DE CONEXIÓN' },
      { x: 1720, y: 2100, w: 1435, h: 40, height3D: 65, type: 'inner', label: 'PASILLO POZO SEC-06' },

      // Vertical Divider X: 1500 (entre SEC-05 y SEC-06)
      { x: 1500, y: 2140, w: 40, h: 450, height3D: 65, type: 'inner', label: 'COMPUERTA BÚNKER' },
      { x: 1500, y: 2750, w: 40, h: 405, height3D: 65, type: 'inner', label: 'ASCENSOR SUBTERRÁNEO' },

      // =========================================================================
      // ESCONDITES TÁCTICOS Y NICHOS SUBTERRÁNEOS (Alcoves & Cover Hideouts)
      // =========================================================================
      // Escondite 1 (SEC-01): Nicho de emboscada con cajas de madera
      { x: 260, y: 380, w: 35, h: 220, height3D: 55, type: 'corrugated', label: 'ESCONDITE TÁCTICO A-1' },
      { x: 260, y: 600, w: 220, h: 35, height3D: 55, type: 'corrugated' },

      // Escondite 2 (SEC-01): Pasillo lateral cubierto
      { x: 740, y: 220, w: 35, h: 440, height3D: 55, type: 'corrugated', label: 'PASILLO REFUGIO -01' },
      { x: 1050, y: 440, w: 340, h: 35, height3D: 55, type: 'corrugated' },

      // Escondite 3 (SEC-02): Pasillo de almacenamiento con cajas de madera apiladas
      { x: 1850, y: 280, w: 35, h: 460, height3D: 55, type: 'corrugated', label: 'ALMACÉN CAJAS MADERA' },
      { x: 2100, y: 560, w: 440, h: 35, height3D: 55, type: 'corrugated', label: 'ESCONDITE BÚNKER B-1' },
      { x: 2540, y: 220, w: 35, h: 370, height3D: 55, type: 'corrugated' },
      { x: 2780, y: 520, w: 330, h: 35, height3D: 55, type: 'corrugated', label: 'NICHO DE EMBOSCADA' },

      // Escondite 4 (SEC-03): Túnel médico subterráneo
      { x: 280, y: 1350, w: 380, h: 35, height3D: 55, type: 'corrugated', label: 'ESCONDITE MÉDICO C-1' },
      { x: 800, y: 1220, w: 35, h: 540, height3D: 55, type: 'corrugated', label: 'PASILLO DE SEGURIDAD' },
      { x: 350, y: 1780, w: 440, h: 35, height3D: 55, type: 'corrugated' },
      { x: 960, y: 1480, w: 360, h: 35, height3D: 55, type: 'corrugated', label: 'NICHO SUBTERRÁNEO' },

      // Escondite 5 (SEC-04): Pasillos de tuberías y escondites del reactor
      { x: 1920, y: 1220, w: 380, h: 35, height3D: 55, type: 'corrugated', label: 'PASILLO CATACUMBAS' },
      { x: 2300, y: 1220, w: 35, h: 480, height3D: 55, type: 'corrugated', label: 'ESCONDITE DEL GENERADOR' },
      { x: 1880, y: 1700, w: 420, h: 35, height3D: 55, type: 'corrugated' },
      { x: 2650, y: 1420, w: 35, h: 440, height3D: 55, type: 'corrugated', label: 'NICHO TÁCTICO D-2' },

      // Escondite 6 (SEC-05): Laberinto fortificado y búnkeres de madera
      { x: 300, y: 2480, w: 35, h: 460, height3D: 55, type: 'corrugated', label: 'PASILLO BLINDADO' },
      { x: 550, y: 2680, w: 460, h: 35, height3D: 55, type: 'corrugated', label: 'ESCONDITE DE CAJAS E-1' },
      { x: 960, y: 2320, w: 35, h: 480, height3D: 55, type: 'corrugated', label: 'BÚNKER SECRETO' },

      // Escondite 7 (SEC-06): Pasillos hacia el ascensor de evacuación
      { x: 1880, y: 2420, w: 35, h: 450, height3D: 55, type: 'corrugated', label: 'PASILLO DE EVACUACIÓN' },
      { x: 2180, y: 2320, w: 420, h: 35, height3D: 55, type: 'corrugated', label: 'ESCONDITE DE SALIDA' },
      { x: 2420, y: 2950, w: 580, h: 35, height3D: 55, type: 'corrugated', label: 'PLATAFORMA ELEVADORA' },
    ];

    // 3. Estaciones de Vida (Medical Health Stations) across the world
    this.healthStations = [
      {
        id: this.nextEntityId++,
        x: 720,
        y: 360,
        radius: 55,
        availableHeals: 5,
        maxHeals: 5,
        cooldown: 0,
        label: 'CLÍNICA HANGAR 01',
        isActive: true,
      },
      {
        id: this.nextEntityId++,
        x: 2380,
        y: 360,
        radius: 55,
        availableHeals: 5,
        maxHeals: 5,
        cooldown: 0,
        label: 'CÁPSULA MÉDICA SEC-02',
        isActive: true,
      },
      {
        id: this.nextEntityId++,
        x: 550,
        y: 1550,
        radius: 60,
        availableHeals: 6,
        maxHeals: 6,
        cooldown: 0,
        label: 'LABORATORIO DE SALUD SEC-03',
        isActive: true,
      },
      {
        id: this.nextEntityId++,
        x: 2100,
        y: 1480,
        radius: 55,
        availableHeals: 5,
        maxHeals: 5,
        cooldown: 0,
        label: 'ESTACIÓN DE NANORECARGA SEC-04',
        isActive: true,
      },
      {
        id: this.nextEntityId++,
        x: 2280,
        y: 2500,
        radius: 60,
        availableHeals: 6,
        maxHeals: 6,
        cooldown: 0,
        label: 'CLÍNICA DE EXTRACCIÓN SEC-06',
        isActive: true,
      },
    ];

    // 4. Floating Health Pickups (Núcleos de Vida & Botiquines Sueltos)
    const pickupLocations = [
      { x: 380, y: 280, amount: 40, type: 'medkit' },
      { x: 880, y: 460, amount: 50, type: 'nanite_core' },
      { x: 1200, y: 320, amount: 40, type: 'stim' },
      { x: 2050, y: 420, amount: 50, type: 'nanite_core' },
      { x: 2700, y: 380, amount: 50, type: 'medkit' },
      { x: 420, y: 1200, amount: 50, type: 'nanite_core' },
      { x: 680, y: 1720, amount: 60, type: 'nanite_core' },
      { x: 1100, y: 1600, amount: 45, type: 'stim' },
      { x: 1680, y: 1350, amount: 50, type: 'nanite_core' },
      { x: 2520, y: 1680, amount: 55, type: 'medkit' },
      { x: 2900, y: 1250, amount: 45, type: 'stim' },
      { x: 480, y: 2550, amount: 65, type: 'nanite_core' },
      { x: 850, y: 2820, amount: 50, type: 'medkit' },
      { x: 1820, y: 2750, amount: 50, type: 'nanite_core' },
      { x: 2550, y: 2520, amount: 60, type: 'medkit' },
    ];

    pickupLocations.forEach((loc) => {
      this.healthPickups.push({
        id: this.nextEntityId++,
        x: loc.x,
        y: loc.y,
        healAmount: loc.amount,
        type: loc.type as any,
        collected: false,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    });

    // 5. Crates across the vast subterranean complex (Over 45 crates, heavy focus on wooden crates)
    const crateConfigs: Array<{ x: number; y: number; type: 'wood' | 'military' | 'medical' | 'safe' }> = [
      // Sector 01: Entrada & Túnel de Acceso Subterráneo
      { x: 240, y: 240, type: 'wood' },
      { x: 280, y: 280, type: 'wood' },
      { x: 320, y: 250, type: 'wood' }, // Crate cluster 1
      { x: 290, y: 410, type: 'wood' }, // Inside Escondite A-1
      { x: 320, y: 440, type: 'wood' }, // Cover inside Escondite A-1
      { x: 440, y: 220, type: 'wood' },
      { x: 580, y: 380, type: 'military' },
      { x: 780, y: 260, type: 'wood' }, // Pasillo Refugio -01
      { x: 820, y: 320, type: 'medical' },
      { x: 960, y: 480, type: 'wood' },
      { x: 1080, y: 480, type: 'wood' }, // Pasillo cover
      { x: 1240, y: 320, type: 'safe' },

      // Sector 02: Almacén de Cajas de Madera & Pasillos de Carga (Major wooden depot)
      { x: 1720, y: 240, type: 'wood' },
      { x: 1750, y: 280, type: 'wood' },
      { x: 1890, y: 320, type: 'wood' }, // Stacking in Almacén Cajas
      { x: 1920, y: 350, type: 'wood' },
      { x: 1960, y: 310, type: 'wood' },
      { x: 2020, y: 320, type: 'wood' },
      { x: 2150, y: 590, type: 'wood' }, // Inside Escondite B-1
      { x: 2190, y: 620, type: 'wood' },
      { x: 2280, y: 480, type: 'military' },
      { x: 2580, y: 250, type: 'wood' },
      { x: 2650, y: 340, type: 'safe' },
      { x: 2820, y: 550, type: 'wood' }, // Nicho de Emboscada
      { x: 2860, y: 580, type: 'wood' },
      { x: 2920, y: 450, type: 'military' },

      // Sector 03: Refugio Médico & Escondites de Nanotecnología
      { x: 260, y: 1180, type: 'medical' },
      { x: 310, y: 1390, type: 'wood' }, // Escondite Médico C-1
      { x: 350, y: 1420, type: 'wood' },
      { x: 520, y: 1420, type: 'medical' },
      { x: 740, y: 1650, type: 'military' },
      { x: 840, y: 1260, type: 'wood' }, // Pasillo de Seguridad
      { x: 1000, y: 1520, type: 'wood' }, // Nicho Subterráneo
      { x: 1080, y: 1350, type: 'safe' },
      { x: 1220, y: 1750, type: 'wood' },

      // Sector 04: Catacumbas del Reactor & Generador Geotérmico
      { x: 1620, y: 1250, type: 'wood' },
      { x: 1960, y: 1260, type: 'wood' }, // Pasillo Catacumbas
      { x: 2050, y: 1380, type: 'military' },
      { x: 2340, y: 1260, type: 'wood' }, // Escondite Generador
      { x: 2380, y: 1290, type: 'wood' },
      { x: 2450, y: 1550, type: 'military' },
      { x: 2690, y: 1460, type: 'wood' }, // Nicho D-2
      { x: 2820, y: 1320, type: 'safe' },
      { x: 2950, y: 1780, type: 'military' },

      // Sector 05: Búnker Fortificado & Escondites Tácticos
      { x: 240, y: 2350, type: 'safe' },
      { x: 340, y: 2520, type: 'wood' }, // Pasillo Blindado
      { x: 480, y: 2520, type: 'safe' },
      { x: 590, y: 2720, type: 'wood' }, // Escondite de Cajas E-1
      { x: 630, y: 2750, type: 'wood' },
      { x: 720, y: 2420, type: 'military' },
      { x: 880, y: 2850, type: 'safe' },
      { x: 1000, y: 2360, type: 'wood' }, // Búnker Secreto
      { x: 1150, y: 2650, type: 'military' },

      // Sector 06: Pozo de Extracción & Ascensor Subterráneo
      { x: 1750, y: 2350, type: 'wood' },
      { x: 1920, y: 2460, type: 'wood' }, // Pasillo Evacuación
      { x: 2050, y: 2550, type: 'medical' },
      { x: 2220, y: 2360, type: 'wood' }, // Escondite Salida
      { x: 2260, y: 2390, type: 'wood' },
      { x: 2350, y: 2380, type: 'military' },
      { x: 2550, y: 2680, type: 'military' },
      { x: 2950, y: 2650, type: 'safe' },
    ];

    crateConfigs.forEach((cfg) => {
      const lootCount = cfg.type === 'safe' ? 2 : 1;
      const lootItems: LootItem[] = [];
      for (let i = 0; i < lootCount; i++) {
        lootItems.push(this.generateRandomLoot(cfg.type));
      }

      this.crates.push({
        id: this.nextEntityId++,
        x: cfg.x,
        y: cfg.y,
        width: 38,
        height: 38,
        isOpened: false,
        loot: lootItems,
        type: cfg.type,
        health: 50,
      });
    });

    // 6. Barrels (Toxic biohazard green & Explosive red)
    const barrelConfigs: Array<{ x: number; y: number; type: 'toxic' | 'explosive' | 'metal' }> = [
      { x: 340, y: 460, type: 'toxic' },
      { x: 375, y: 470, type: 'toxic' },
      { x: 620, y: 260, type: 'explosive' },
      { x: 740, y: 450, type: 'metal' },
      { x: 1120, y: 520, type: 'explosive' },
      { x: 1950, y: 480, type: 'explosive' },
      { x: 2200, y: 260, type: 'toxic' },
      { x: 2750, y: 440, type: 'metal' },
      { x: 440, y: 1320, type: 'toxic' },
      { x: 475, y: 1340, type: 'toxic' },
      { x: 880, y: 1520, type: 'explosive' },
      { x: 1820, y: 1450, type: 'explosive' },
      { x: 2250, y: 1720, type: 'toxic' },
      { x: 2720, y: 1820, type: 'explosive' },
      { x: 420, y: 2750, type: 'toxic' },
      { x: 680, y: 2880, type: 'explosive' },
      { x: 1120, y: 2450, type: 'explosive' },
      { x: 1820, y: 2520, type: 'metal' },
      { x: 2150, y: 2820, type: 'explosive' },
      { x: 2620, y: 2480, type: 'toxic' },
      { x: 2880, y: 2880, type: 'explosive' },
    ];

    barrelConfigs.forEach((b) => {
      this.barrels.push({
        id: this.nextEntityId++,
        x: b.x,
        y: b.y,
        radius: 14,
        type: b.type,
        health: b.type === 'explosive' ? 25 : 40,
        maxHealth: 40,
      });
    });

    // 7. Generar Zonas de Guerra 3D, Casas en Ruinas y Trincheras
    this.warStructures = [
      // =======================================================================
      // CASA 3D PRINCIPAL EN RUINAS (ZONA DE GUERRA - SECTOR CENTRAL)
      // =======================================================================
      { id: this.nextEntityId++, x: 1250, y: 550, w: 420, h: 360, height3D: 75, type: 'ruined_house', label: 'CASA PRINCIPAL EN RUINAS - SALA TÁCTICA' },
      { id: this.nextEntityId++, x: 1260, y: 560, w: 400, h: 340, height3D: 0, type: 'room_floor', label: 'SUELO DE OPERACIONES' },
      { id: this.nextEntityId++, x: 1250, y: 720, w: 180, h: 30, height3D: 65, type: 'broken_wall', label: 'MURO DIVISORIO CON FISURAS' },
      { id: this.nextEntityId++, x: 1200, y: 920, w: 90, h: 50, height3D: 25, type: 'rubble_pile', label: 'ESCOMBROS DE CONCRETO' },
      { id: this.nextEntityId++, x: 1680, y: 580, w: 80, h: 60, height3D: 30, type: 'rubble_pile' },

      // CASA 3D EN RUINAS 2 (SECTOR 03 - LABORATORIO DERUIDO)
      { id: this.nextEntityId++, x: 650, y: 1350, w: 380, h: 320, height3D: 70, type: 'ruined_house', label: 'CASA MÉDICA EN RUINAS' },
      { id: this.nextEntityId++, x: 660, y: 1360, w: 360, h: 300, height3D: 0, type: 'room_floor' },
      { id: this.nextEntityId++, x: 600, y: 1400, w: 70, h: 50, height3D: 22, type: 'rubble_pile' },

      // CASA 3D EN RUINAS 3 (SECTOR 04 - CATACUMBAS DE GUERRA)
      { id: this.nextEntityId++, x: 2050, y: 1250, w: 420, h: 350, height3D: 75, type: 'ruined_house', label: 'ESTACIÓN FORTIFICADA EN RUINAS' },
      { id: this.nextEntityId++, x: 2060, y: 1260, w: 400, h: 330, height3D: 0, type: 'room_floor' },

      // CASA 3D EN RUINAS 4 (SECTOR 05 - BÚNKER DERUIDO)
      { id: this.nextEntityId++, x: 480, y: 2250, w: 390, h: 330, height3D: 75, type: 'ruined_house', label: 'FORTÍN EN RUINAS' },

      // =======================================================================
      // BÚNKERES DE SACOS DE ARENA (SANDBAG BUNKERS)
      // =======================================================================
      { id: this.nextEntityId++, x: 420, y: 320, w: 110, h: 45, height3D: 35, type: 'sandbag_bunker', label: 'BÚNKER DE SACOS OESTE' },
      { id: this.nextEntityId++, x: 1050, y: 520, w: 120, h: 45, height3D: 35, type: 'sandbag_bunker', label: 'TRINCHERA DE COMBATE' },
      { id: this.nextEntityId++, x: 1720, y: 880, w: 130, h: 45, height3D: 35, type: 'sandbag_bunker', label: 'PUESTO DE GUARDIA DE SACOS' },
      { id: this.nextEntityId++, x: 820, y: 1750, w: 120, h: 45, height3D: 35, type: 'sandbag_bunker' },
      { id: this.nextEntityId++, x: 2320, y: 1680, w: 130, h: 45, height3D: 35, type: 'sandbag_bunker' },
      { id: this.nextEntityId++, x: 1350, y: 2450, w: 120, h: 45, height3D: 35, type: 'sandbag_bunker', label: 'DEFENSA DE SACOS SUR' },
      { id: this.nextEntityId++, x: 2480, y: 2650, w: 130, h: 45, height3D: 35, type: 'sandbag_bunker' },

      // =======================================================================
      // VEHÍCULOS MILITARES BLINDADOS DESTRUIDOS (MILITARY TRUCKS & JEEPS 3D)
      // =======================================================================
      { id: this.nextEntityId++, x: 880, y: 680, w: 130, h: 70, height3D: 45, type: 'military_truck', label: 'CAMIÓN MILITAR BLINDADO DESTRUIDO' },
      { id: this.nextEntityId++, x: 1850, y: 620, w: 130, h: 70, height3D: 45, type: 'military_truck', label: 'TRANSPORTE DE TROPAS EN LLAMAS' },
      { id: this.nextEntityId++, x: 1450, y: 1520, w: 120, h: 65, height3D: 42, type: 'military_truck', label: 'JEEP MILITAR CALCINADO' },
      { id: this.nextEntityId++, x: 2150, y: 2450, w: 135, h: 72, height3D: 45, type: 'military_truck', label: 'CONVOY BLINDADO DERRIBADO' },

      // =======================================================================
      // ERIZOS ANTITANQUE Y ALAMBRE DE PÚAS (CZECH HEDGEHOGS)
      // =======================================================================
      { id: this.nextEntityId++, x: 740, y: 480, w: 60, h: 60, height3D: 38, type: 'barbed_wire', label: 'ERIZO ANTITANQUE CON PÚAS' },
      { id: this.nextEntityId++, x: 1580, y: 480, w: 60, h: 60, height3D: 38, type: 'barbed_wire' },
      { id: this.nextEntityId++, x: 1150, y: 1380, w: 60, h: 60, height3D: 38, type: 'barbed_wire' },
      { id: this.nextEntityId++, x: 1980, y: 1820, w: 60, h: 60, height3D: 38, type: 'barbed_wire' },
      { id: this.nextEntityId++, x: 1650, y: 2750, w: 60, h: 60, height3D: 38, type: 'barbed_wire' },
    ];

    // 8. Spawn Pro Combat Robot Squads con gran variedad (Francotiradores, Rushers, Drones, Titanes, Boss)
    const robotSpawns = [
      // Sector 01: Entrada & Búnker Norte
      { x: 580, y: 280, type: 'sniper', model: 'Francotirador Cyborg Cíber-01', eye: '#38bdf8', chassis: '#0f172a' },
      { x: 920, y: 380, type: 'rusher', model: 'Soldado Asalto Cobra Mk-I', eye: '#eab308', chassis: '#1e293b' },
      { x: 1260, y: 520, type: 'enforcer', model: 'Centinela Táctico Mech V2', eye: '#ef4444', chassis: '#334155' },
      { x: 750, y: 650, type: 'drone', model: 'Dron Aéreo de Plasma P-01', eye: '#06b6d4', chassis: '#0284c7' },

      // Sector 02: Almacén de Cajas & Zona de Guerra Este
      { x: 1820, y: 360, type: 'rusher', model: 'Soldado Asalto Cobra Mk-I', eye: '#eab308', chassis: '#1e293b' },
      { x: 2150, y: 440, type: 'sniper', model: 'Francotirador Cyborg Cíber-01', eye: '#38bdf8', chassis: '#0f172a' },
      { x: 2680, y: 420, type: 'heavy', model: 'Titán Goliat Mk-IV', eye: '#f97316', chassis: '#0f172a' },
      { x: 2950, y: 550, type: 'drone', model: 'Dron Aéreo de Plasma P-01', eye: '#06b6d4', chassis: '#0284c7' },

      // Sector 03: Laboratorio & Refugio Médico
      { x: 480, y: 1250, type: 'drone', model: 'Dron Aéreo de Plasma P-01', eye: '#22c55e', chassis: '#1e293b' },
      { x: 740, y: 1520, type: 'rusher', model: 'Soldado Asalto Cobra Mk-I', eye: '#eab308', chassis: '#1e293b' },
      { x: 1120, y: 1680, type: 'heavy', model: 'Titán Goliat Mk-IV', eye: '#f97316', chassis: '#0f172a' },
      { x: 920, y: 1280, type: 'sniper', model: 'Francotirador Cyborg Cíber-01', eye: '#38bdf8', chassis: '#0f172a' },

      // Sector 04: Catacumbas del Reactor & Casa Fortificada
      { x: 1720, y: 1350, type: 'enforcer', model: 'Centinela Táctico Mech V2', eye: '#ef4444', chassis: '#334155' },
      { x: 2120, y: 1650, type: 'heavy', model: 'Titán Goliat Mk-IV', eye: '#f97316', chassis: '#0f172a' },
      { x: 2540, y: 1380, type: 'rusher', model: 'Soldado Asalto Cobra Mk-I', eye: '#eab308', chassis: '#1e293b' },
      { x: 2850, y: 1620, type: 'sniper', model: 'Francotirador Cyborg Cíber-01', eye: '#38bdf8', chassis: '#0f172a' },

      // Sector 05: Vault Boss & Guardia Blindada
      { x: 520, y: 2450, type: 'enforcer', model: 'Centinela Táctico Mech V2', eye: '#ef4444', chassis: '#334155' },
      { x: 780, y: 2650, type: 'boss', model: 'Dreadnought Dominador Omega', eye: '#dc2626', chassis: '#020617' },
      { x: 1180, y: 2520, type: 'heavy', model: 'Titán Goliat Mk-IV', eye: '#f97316', chassis: '#0f172a' },
      { x: 420, y: 2850, type: 'drone', model: 'Dron Aéreo de Plasma P-01', eye: '#06b6d4', chassis: '#0284c7' },

      // Sector 06: Outpost de Extracción & Helipuerto
      { x: 1850, y: 2650, type: 'rusher', model: 'Soldado Asalto Cobra Mk-I', eye: '#eab308', chassis: '#1e293b' },
      { x: 2220, y: 2420, type: 'sniper', model: 'Francotirador Cyborg Cíber-01', eye: '#38bdf8', chassis: '#0f172a' },
      { x: 2520, y: 2820, type: 'heavy', model: 'Titán Goliat Mk-IV', eye: '#f97316', chassis: '#0f172a' },
      { x: 2950, y: 2520, type: 'enforcer', model: 'Centinela Táctico Mech V2', eye: '#ef4444', chassis: '#334155' },
    ];

    robotSpawns.forEach((s) => {
      this.spawnEnemy(s.x, s.y, s.type as any, s.eye, s.chassis, s.model);
    });
  }

  private generateRandomLoot(crateType: string): LootItem {
    const tierMultiplier = this.mission.lootMultiplier;
    let candidateCatalog = LOOT_CATALOG;
    if (crateType === 'safe') {
      candidateCatalog = LOOT_CATALOG.filter((item) => item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legendary');
    } else if (crateType === 'medical') {
      candidateCatalog = LOOT_CATALOG.filter((item) => item.category === 'medical');
    }

    const item = candidateCatalog[Math.floor(Math.random() * candidateCatalog.length)];
    return {
      ...item,
      value: Math.round(item.value * tierMultiplier),
    };
  }

  public spawnEnemy(
    x: number,
    y: number,
    type: 'grunt' | 'enforcer' | 'heavy' | 'boss' | 'sniper' | 'rusher' | 'drone' = 'grunt',
    eyeColor: string = '#38bdf8',
    chassisColor: string = '#1e293b',
    robotModel: string = 'Dron Asalto Ciber-01'
  ) {
    const isHeavy = type === 'heavy';
    const isEnforcer = type === 'enforcer';
    const isBoss = type === 'boss';
    const isSniper = type === 'sniper';
    const isRusher = type === 'rusher';
    const isDrone = type === 'drone';

    let hp = 75;
    let speed = 150;
    let dmg = 12;
    let attackRate = 0.8;
    let range = 310;
    let visionRange = 280;

    if (isBoss) {
      hp = 500;
      speed = 110;
      dmg = 26;
      attackRate = 0.5;
      range = 400;
      visionRange = 360;
    } else if (isHeavy) {
      hp = 240;
      speed = 95;
      dmg = 20;
      attackRate = 0.45;
      range = 380;
      visionRange = 300;
    } else if (isEnforcer) {
      hp = 130;
      speed = 135;
      dmg = 15;
      attackRate = 0.7;
      range = 330;
      visionRange = 290;
    } else if (isSniper) {
      hp = 85;
      speed = 125;
      dmg = 34; // Sniper high damage
      attackRate = 0.35;
      range = 520;
      visionRange = 450;
    } else if (isRusher) {
      hp = 95;
      speed = 215; // Fast rushing speed
      dmg = 8;
      attackRate = 1.8; // High fire rate
      range = 240;
      visionRange = 340;
    } else if (isDrone) {
      hp = 65;
      speed = 185;
      dmg = 10;
      attackRate = 1.1;
      range = 290;
      visionRange = 310;
    }

    this.enemies.push({
      id: this.nextEntityId++,
      type: type as any,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: isBoss ? 26 : isHeavy ? 20 : 16,
      speed,
      health: hp,
      maxHealth: hp,
      angle: Math.random() * Math.PI * 2,
      state: 'patrol',
      patrolOriginX: x,
      patrolOriginY: y,
      patrolTargetX: x + (Math.random() - 0.5) * 160,
      patrolTargetY: y + (Math.random() - 0.5) * 160,
      patrolTimer: 2 + Math.random() * 3,
      attackCooldown: 0,
      attackRate,
      damage: dmg,
      range,
      visionRange,
      fovAngle: isSniper ? Math.PI * 0.9 : Math.PI * 0.75,
      damageFlash: 0,
      color: chassisColor,
      beanieColor: eyeColor,
      robotModel,
      eyeColor,
      chassisColor,
      laserAimActive: isEnforcer || isBoss || isSniper,
    });
  }

  /**
   * Main update step
   */
  public update(dt: number) {
    if (this.isGameOver || this.isExtracted) return;

    // Cap dt for smooth physics
    const delta = Math.min(dt, 0.08);

    // Screen shake decay
    if (this.screenShakeAmount > 0) {
      this.screenShakeAmount = Math.max(0, this.screenShakeAmount - delta * 18);
    }

    // Update Extraction Zone Countdown & Stay logic
    this.updateExtraction(delta);

    // Update Player
    this.updatePlayer(delta);

    // Update Grenades (ballistic parabolic trajectory & detonation)
    this.updateGrenades(delta);

    // Update Enemies AI
    this.updateEnemies(delta);

    // Update Bullets
    this.updateBullets(delta);

    // Update Barrels & Hazards
    this.updateBarrels(delta);

    // Update Particles
    this.updateParticles(delta);

    // Update Floating Health Pickups & Stations
    this.updateHealthPickups(delta);
    this.updateHealthStations(delta);

    // Update Free Fire Gloo Walls (Muros de Hielo)
    this.updateGlooWalls(delta);

    // Update Floating Texts
    this.updateFloatingTexts(delta);

    // Camera follow player with smooth damping + tactical aim lead
    const aimLeadDist = this.player.isAimingMode ? 70 : 25;
    const targetCamX = this.player.x + Math.cos(this.player.angle) * aimLeadDist;
    const targetCamY = this.player.y + Math.sin(this.player.angle) * aimLeadDist;
    this.camX += (targetCamX - this.camX) * 0.12;
    this.camY += (targetCamY - this.camY) * 0.12;

    // Nearest interactive crate detection
    this.checkProximities();
  }

  private updateExtraction(dt: number) {
    if (this.extraction.countdown > 0) {
      this.extraction.countdown -= dt;
      if (this.extraction.countdown <= 0) {
        this.extraction.countdown = 0;
        sound.playExtractionBeep();
        this.addFloatingText(this.extraction.x, this.extraction.y - 30, 'EXTRACTION HELIPAD READY!', '#34d399', 18);
      }
    }

    // Check if player is inside the extraction zone
    const distToExtract = Math.hypot(this.player.x - this.extraction.x, this.player.y - this.extraction.y);
    this.isNearExtraction = distToExtract < this.extraction.radius + 10;

    if (this.isNearExtraction) {
      this.extraction.isExtracting = true;
      this.extraction.timeInZone += dt;

      // Spawn extraction horde reinforcements when first stepping in to build tension!
      if (!this.extractionTriggeredWave) {
        this.extractionTriggeredWave = true;
        sound.playEnemyAlert();
        this.addFloatingText(this.player.x, this.player.y - 45, '⚠ HOSTILE AMBUSH DETECTED! HOLD POSITION!', '#ef4444', 16);
        this.spawnAmbushWave();
      }

      // Check for successful extraction
      if (this.extraction.timeInZone >= this.extraction.requiredStayTime) {
        this.completeExtraction();
      }
    } else {
      this.extraction.isExtracting = false;
      this.extraction.timeInZone = Math.max(0, this.extraction.timeInZone - dt * 0.5);
    }
  }

  private spawnAmbushWave() {
    const ext = this.extraction;
    const angles = [0.4, 1.2, 2.2, 3.8];
    angles.forEach((ang) => {
      const sx = ext.x + Math.cos(ang) * 280;
      const sy = ext.y + Math.sin(ang) * 280;
      this.spawnEnemy(sx, sy, 'enforcer', '#f43f5e', '#881337');
    });
  }

  private completeExtraction() {
    this.isExtracted = true;
    sound.playExtractionSuccess();
    if (navigator.vibrate && this.settings.haptics) {
      navigator.vibrate([150, 100, 200, 100, 300]);
    }
  }

  private updatePlayer(dt: number) {
    const p = this.player;

    // Flash decay
    if (p.damageFlash > 0) p.damageFlash -= dt * 6;
    if (p.shotTimer > 0) p.shotTimer -= dt;
    if (p.rollCooldown > 0) p.rollCooldown -= dt;
    if (p.grenadeCooldown > 0) p.grenadeCooldown -= dt;

    // Hitmarker timer decay
    if (p.hitmarkerTimer && p.hitmarkerTimer > 0) {
      p.hitmarkerTimer -= dt;
      if (p.hitmarkerTimer <= 0) {
        p.hitmarkerTimer = 0;
        p.hitmarkerIsHeadshot = false;
      }
    }

    // Jump physics & vertical ballistic arc (with gravity and landing impact)
    if (p.jumpCooldown && p.jumpCooldown > 0) p.jumpCooldown -= dt;
    if (p.isJumping) {
      p.jumpVz = (p.jumpVz || 0) - 580 * dt; // gravity pull
      p.jumpZ = Math.max(0, (p.jumpZ || 0) + (p.jumpVz || 0) * dt);
      if (p.jumpZ <= 0 && (p.jumpVz || 0) <= 0) {
        p.jumpZ = 0;
        p.jumpVz = 0;
        p.isJumping = false;
        p.jumpCooldown = 0.45;
        sound.playLand();
        if (navigator.vibrate && this.settings.haptics) {
          navigator.vibrate(12);
        }
        for (let lp = 0; lp < 8; lp++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 20 + Math.random() * 35;
          this.addParticle(p.x, p.y, Math.cos(ang) * spd, Math.sin(ang) * spd, 0.25, 4, 'rgba(148, 163, 184, 0.55)');
        }
      }
    }

    // Dodge Roll physics
    if (p.isRolling) {
      p.rollTimer -= dt;
      p.x += p.rollVx * dt;
      p.y += p.rollVy * dt;

      // Spawn roll smoke/dust particles
      this.addParticle(p.x, p.y, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, 0.25, 4, 'rgba(148, 163, 184, 0.4)');

      if (p.rollTimer <= 0) {
        p.isRolling = false;
        p.rollCooldown = 0.85; // roll cooldown
      }
      this.resolveWallCollisions(p);
      return;
    }

    // Movement input and sprint mechanics
    const inputX = this.moveVector.x;
    const inputY = this.moveVector.y;
    const mag = Math.hypot(inputX, inputY);

    // Stamina calculation
    if (p.isSprinting && mag > 0.1 && p.stamina > 0) {
      p.stamina = Math.max(0, p.stamina - dt * 25);
      if (p.stamina <= 0) {
        p.isSprinting = false;
        this.addFloatingText(p.x, p.y - 30, '¡AGOTADO!', '#ef4444', 12);
      }
    } else {
      p.stamina = Math.min(p.maxStamina, p.stamina + dt * 20);
    }

    // Melee attack timer
    if (p.meleeCooldown > 0) p.meleeCooldown -= dt;
    if (p.isMeleeAttacking) {
      p.meleeTimer = (p.meleeTimer || 0) - dt;
      if (p.meleeTimer <= 0) {
        p.isMeleeAttacking = false;
      }
    }

    if (mag > 0.02) {
      const normX = inputX / (mag > 1 ? mag : 1);
      const normY = inputY / (mag > 1 ? mag : 1);
      const sprintMultiplier = (p.isSprinting && mag > 0.1) ? 1.6 : 1.0;
      const crouchMultiplier = p.isCrouching ? 0.6 : 1.0;
      const currentSpeed = p.speed * sprintMultiplier * crouchMultiplier;

      // Snappy, commercial-grade immediate acceleration & momentum
      const targetVx = normX * currentSpeed;
      const targetVy = normY * currentSpeed;
      const accelRate = 42;
      p.vx += (targetVx - p.vx) * Math.min(1, dt * accelRate);
      p.vy += (targetVy - p.vy) * Math.min(1, dt * accelRate);

      // Sprint dust particles
      if (p.isSprinting && Math.random() < 0.25) {
        this.addParticle(p.x, p.y + 4, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, 0.2, 3, 'rgba(148, 163, 184, 0.45)');
      }
    } else {
      // Snappy responsive braking (immediate stop, no sluggish ice-skating drift)
      const brakeRate = 48;
      p.vx += (0 - p.vx) * Math.min(1, dt * brakeRate);
      p.vy += (0 - p.vy) * Math.min(1, dt * brakeRate);
      if (Math.abs(p.vx) < 1.5) p.vx = 0;
      if (Math.abs(p.vy) < 1.5) p.vy = 0;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Boundary constraints
    p.x = Math.max(50, Math.min(this.arenaSize - 50, p.x));
    p.y = Math.max(50, Math.min(this.arenaSize - 50, p.y));

    // Collision with walls & props
    this.resolveWallCollisions(p);
    this.resolvePropCollisions(p);

    // =========================================================================
    // SMART TACTICAL AIM & ORIENTATION
    // - When firing or aiming: auto-aim locks on target or follows aim stick.
    // - When moving/navigating without shooting: character faces travel direction immediately!
    // =========================================================================
    const aimMag = Math.hypot(this.aimVector.x, this.aimVector.y);
    const isCombatIntent = this.isShootingIntent || p.isAimingMode || aimMag > 0.15;
    const target = this.findAutoAimTarget();

    if (isCombatIntent && target) {
      if (p.aimLockedTargetId !== target.id) {
        p.aimLockedTargetId = target.id;
        sound.playLockOn();
        if (navigator.vibrate && this.settings.haptics) {
          navigator.vibrate(18);
        }
      }
      // Orient smoothly and quickly towards target during combat
      const angleToRobot = Math.atan2(target.y - p.y, target.x - p.x);
      let angleDiff = angleToRobot - p.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      p.angle += angleDiff * Math.min(1.0, dt * 22.0);
      this.cursorWorldPos = { x: target.x, y: target.y };
    } else if (aimMag > 0.15) {
      // Manual Aim Stick orientation
      p.aimLockedTargetId = null;
      const targetAimAngle = Math.atan2(this.aimVector.y, this.aimVector.x);
      let diff = targetAimAngle - p.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      p.angle += diff * Math.min(1.0, dt * 24.0);
    } else if (mag > 0.08) {
      // Smooth travel direction orientation (no backwards moonwalking!)
      p.aimLockedTargetId = null;
      const targetMoveAngle = Math.atan2(p.vy, p.vx);
      let diff = targetMoveAngle - p.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      p.angle += diff * Math.min(1.0, dt * 20.0);
    } else if (target && this.settings.autoAim) {
      // Idle sentry lock-on when standing still
      p.aimLockedTargetId = target.id;
      const angleToRobot = Math.atan2(target.y - p.y, target.x - p.x);
      let angleDiff = angleToRobot - p.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      p.angle += angleDiff * Math.min(1.0, dt * 14.0);
      this.cursorWorldPos = { x: target.x, y: target.y };
    } else {
      p.aimLockedTargetId = null;
    }

    // Weapon Reloading
    const weapon = WEAPONS[p.currentWeapon];
    if (p.isReloading) {
      p.reloadProgress += dt / weapon.reloadTime;
      if (p.reloadProgress >= 1.0) {
        p.isReloading = false;
        p.reloadProgress = 0;
        p.ammo = weapon.magSize;
        p.ammoByWeapon[p.currentWeapon] = weapon.magSize;
        sound.playReload();
        this.addFloatingText(p.x, p.y - 30, 'RECARGADO', '#38bdf8', 13);
      }
    }

    // Weapon Firing
    if (this.isShootingIntent && !p.isRolling) {
      this.firePlayerWeapon();
    }
  }

  public findAutoAimTarget(): Enemy | null {
    let bestEnemy: Enemy | null = null;
    let minScore = Infinity;
    const viewRadius = 580;

    for (const enemy of this.enemies) {
      if (enemy.state === 'dead') continue;
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= viewRadius) {
        // Línea de visión directa sin muros sólidos interfiriendo
        if (!this.hasLineOfSight(this.player.x, this.player.y, enemy.x, enemy.y)) {
          continue;
        }

        const enemyAngle = Math.atan2(dy, dx);
        let angleDiff = Math.abs(this.player.angle - enemyAngle);
        while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);

        // Prioridad sticky al objetivo actualmente fijado para evitar saltos erráticos
        const isCurrentTarget = this.player.aimLockedTargetId === enemy.id;
        const stickyBonus = isCurrentTarget ? -130 : 0;

        const score = dist + angleDiff * 55 + stickyBonus;
        if (score < minScore) {
          minScore = score;
          bestEnemy = enemy;
        }
      }
    }

    return bestEnemy;
  }

  public hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    for (const w of this.walls) {
      if (w.x + w.w < minX || w.x > maxX || w.y + w.h < minY || w.y > maxY) continue;
      if (this.lineIntersectsBox(x1, y1, x2, y2, w.x, w.y, w.w, w.h)) {
        return false;
      }
    }

    for (const gw of this.glooWalls) {
      const d = this.distToSegment(gw.x, gw.y, x1, y1, x2, y2);
      if (d < gw.width * 0.45) return false;
    }

    return true;
  }

  private lineIntersectsBox(x1: number, y1: number, x2: number, y2: number, bx: number, by: number, bw: number, bh: number): boolean {
    return (
      this.lineIntersectsLine(x1, y1, x2, y2, bx, by, bx + bw, by) ||
      this.lineIntersectsLine(x1, y1, x2, y2, bx + bw, by, bx + bw, by + bh) ||
      this.lineIntersectsLine(x1, y1, x2, y2, bx + bw, by + bh, bx, by + bh) ||
      this.lineIntersectsLine(x1, y1, x2, y2, bx, by + bh, bx, by)
    );
  }

  private lineIntersectsLine(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): boolean {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return false;
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }

  private distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  public firePlayerWeapon() {
    const p = this.player;
    if (p.isReloading || p.isRolling) return;

    const weapon = WEAPONS[p.currentWeapon];
    const fireInterval = 1.0 / weapon.fireRate;

    if (p.shotTimer > 0) return;

    if (p.ammo <= 0) {
      this.triggerReload();
      return;
    }

    // Asegurar que el disparo salga exactamente hacia el robot fijado
    const lockedTarget = this.findAutoAimTarget();
    if (lockedTarget) {
      p.angle = Math.atan2(lockedTarget.y - p.y, lockedTarget.x - p.x);
    }

    // Fire shot
    p.ammo--;
    p.ammoByWeapon[p.currentWeapon] = p.ammo;
    p.shotTimer = fireInterval;
    sound.playShoot(weapon.id);

    // Haptic kickback on mobile
    if (navigator.vibrate && this.settings.haptics) {
      navigator.vibrate(25);
    }

    // Screen shake
    if (this.settings.screenShake) {
      this.screenShakeAmount = Math.min(6, this.screenShakeAmount + 2.5);
    }

    // Spawn bullets
    for (let i = 0; i < weapon.bulletsPerShot; i++) {
      const spreadAngle = (Math.random() - 0.5) * weapon.spread;
      const finalAngle = p.angle + spreadAngle;

      this.bullets.push({
        x: p.x + Math.cos(p.angle) * 18,
        y: p.y + Math.sin(p.angle) * 18,
        vx: Math.cos(finalAngle) * weapon.bulletSpeed,
        vy: Math.sin(finalAngle) * weapon.bulletSpeed,
        damage: weapon.damage,
        rangeRemaining: weapon.range,
        fromPlayer: true,
        color: weapon.color,
        radius: weapon.id === 'plasma' ? 4 : 2.5,
      });
    }

    // Eject shell casing particle
    const casingAngle = p.angle + Math.PI * 0.5 + (Math.random() - 0.5) * 0.3;
    this.addParticle(
      p.x,
      p.y,
      Math.cos(casingAngle) * 70,
      Math.sin(casingAngle) * 70,
      0.35,
      2.5,
      '#fbbf24',
      'casing'
    );

    // Auto reload when empty
    if (p.ammo <= 0) {
      this.triggerReload();
    }
  }

  public triggerReload() {
    const p = this.player;
    const weapon = WEAPONS[p.currentWeapon];
    if (p.isReloading || p.ammo === weapon.magSize) return;

    p.isReloading = true;
    p.reloadProgress = 0;
    sound.playReload();
  }

  public switchWeapon(weaponId: WeaponId): boolean {
    const p = this.player;
    if (p.currentWeapon === weaponId) return false;
    // Save current ammo
    p.ammoByWeapon[p.currentWeapon] = p.ammo;
    p.currentWeapon = weaponId;
    p.ammo = p.ammoByWeapon[weaponId] !== undefined ? p.ammoByWeapon[weaponId] : WEAPONS[weaponId].magSize;
    p.isReloading = false;
    p.reloadProgress = 0;
    p.shotTimer = 0.12;
    sound.playWeaponSwitch();
    this.addFloatingText(p.x, p.y - 35, `EQUIPADO: ${WEAPONS[weaponId].name}`, WEAPONS[weaponId].color, 13);
    return true;
  }

  public cycleNextWeapon(): boolean {
    const p = this.player;
    const weapons = p.unlockedWeapons;
    if (!weapons || weapons.length <= 1) return false;
    const idx = weapons.indexOf(p.currentWeapon);
    const nextIdx = (idx + 1) % weapons.length;
    return this.switchWeapon(weapons[nextIdx]);
  }

  public cyclePrevWeapon(): boolean {
    const p = this.player;
    const weapons = p.unlockedWeapons;
    if (!weapons || weapons.length <= 1) return false;
    const idx = weapons.indexOf(p.currentWeapon);
    const prevIdx = (idx - 1 + weapons.length) % weapons.length;
    return this.switchWeapon(weapons[prevIdx]);
  }

  public setSprinting(active: boolean) {
    if (active && this.player.stamina <= 5) return;
    this.player.isSprinting = active;
  }

  public triggerMelee(): boolean {
    const p = this.player;
    if (p.meleeCooldown > 0 || p.isRolling) return false;
    p.meleeCooldown = 0.45;
    p.isMeleeAttacking = true;
    p.meleeTimer = 0.22;
    sound.playMelee();
    if (navigator.vibrate && this.settings.haptics) {
      navigator.vibrate([25, 20, 35]);
    }

    // Spawn tactical slash particles in front arc
    for (let i = -3; i <= 3; i++) {
      const angle = p.angle + (i * Math.PI) / 14;
      const dist = 36;
      this.addParticle(
        p.x + Math.cos(angle) * dist,
        p.y + Math.sin(angle) * dist,
        Math.cos(angle) * 110,
        Math.sin(angle) * 110,
        0.2,
        4,
        '#38bdf8',
        'spark'
      );
    }

    // Damage enemies in close melee arc
    let hitCount = 0;
    this.enemies.forEach((enemy) => {
      if (enemy.state === 'dead') return;
      const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
      if (dist <= 65) {
        const enemyAngle = Math.atan2(enemy.y - p.y, enemy.x - p.x);
        let diff = Math.abs(enemyAngle - p.angle);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        if (diff < Math.PI * 0.48) {
          hitCount++;
          this.damageEnemy(enemy, 85);
          enemy.x += Math.cos(p.angle) * 35;
          enemy.y += Math.sin(p.angle) * 35;
          this.addFloatingText(enemy.x, enemy.y - 30, '¡CUCHILLAZO! 85 DMG', '#38bdf8', 13);
        }
      }
    });

    if (hitCount > 0) {
      this.screenShakeAmount = Math.max(this.screenShakeAmount, 5);
    }
    return true;
  }

  public triggerDodge() {
    const p = this.player;
    if (p.isRolling || p.rollCooldown > 0) return;

    p.isRolling = true;
    p.rollTimer = p.rollDuration;

    // Direction of roll
    const moveMag = Math.hypot(this.moveVector.x, this.moveVector.y);
    let rollAngle = p.angle;
    if (moveMag > 0.1) {
      rollAngle = Math.atan2(this.moveVector.y, this.moveVector.x);
    }

    const rollSpeed = p.speed * 2.3;
    p.rollVx = Math.cos(rollAngle) * rollSpeed;
    p.rollVy = Math.sin(rollAngle) * rollSpeed;

    sound.playDodge();
    if (navigator.vibrate && this.settings.haptics) {
      navigator.vibrate(40);
    }
  }

  public triggerJump(): boolean {
    const p = this.player;
    if (p.isJumping || p.isRolling || (p.jumpCooldown && p.jumpCooldown > 0)) return false;
    p.isJumping = true;
    p.jumpZ = 0;
    p.jumpVz = 215; // Smooth parabolic arc
    p.jumpCooldown = 0.52;
    sound.playJump();
    if (navigator.vibrate && this.settings.haptics) {
      navigator.vibrate(18);
    }
    // Launch dust puff particles
    for (let i = 0; i < 6; i++) {
      this.addParticle(p.x, p.y, (Math.random() - 0.5) * 22, (Math.random() - 0.5) * 22, 0.25, 3.5, 'rgba(148, 163, 184, 0.5)');
    }
    return true;
  }

  public toggleAimMode() {
    this.player.isAimingMode = !this.player.isAimingMode;
    if (this.player.isAimingMode) {
      sound.playLockOn();
      this.addFloatingText(this.player.x, this.player.y - 40, 'MIRA TÁCTICA ACTIVADA', '#38bdf8', 13);
    } else {
      this.addFloatingText(this.player.x, this.player.y - 40, 'MIRA DESACTIVADA', '#94a3b8', 12);
    }
  }

  public throwGrenade(): boolean {
    const p = this.player;
    if (p.grenades <= 0 || p.grenadeCooldown > 0 || p.isRolling) return false;

    p.grenades--;
    p.grenadeCooldown = 1.2; // 1.2s cooldown between tosses

    // Calculate target position: towards locked enemy, or towards player angle
    let targetX: number;
    let targetY: number;

    const lockedEnemy = this.enemies.find((e) => e.id === p.aimLockedTargetId && e.state !== 'dead');
    if (lockedEnemy) {
      targetX = lockedEnemy.x;
      targetY = lockedEnemy.y;
    } else {
      const throwDist = 175;
      targetX = p.x + Math.cos(p.angle) * throwDist;
      targetY = p.y + Math.sin(p.angle) * throwDist;
    }

    // Keep grenade within arena
    targetX = Math.max(60, Math.min(this.arenaSize - 60, targetX));
    targetY = Math.max(60, Math.min(this.arenaSize - 60, targetY));

    sound.playGrenadeThrow();
    if (navigator.vibrate && this.settings.haptics) {
      navigator.vibrate([40, 20, 50]);
    }

    this.grenades.push({
      id: Date.now() + Math.random(),
      x: p.x,
      y: p.y,
      startX: p.x,
      startY: p.y,
      targetX,
      targetY,
      vx: (targetX - p.x) / 0.85,
      vy: (targetY - p.y) / 0.85,
      height: 0,
      timer: 0,
      totalTime: 0.85,
      radius: 110,
      damage: 140,
      exploded: false,
    });

    this.addFloatingText(p.x, p.y - 30, '¡GRANADA LANZADA!', '#f97316', 14);
    return true;
  }

  private updateGrenades(dt: number) {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.timer += dt;
      const progress = Math.min(1, g.timer / g.totalTime);

      // Interpolate planar position
      g.x = g.startX + (g.targetX - g.startX) * progress;
      g.y = g.startY + (g.targetY - g.startY) * progress;

      // Parabolic flight height arc (apex at mid-flight)
      g.height = Math.sin(progress * Math.PI) * 45;

      // Smoke trail while flying
      if (Math.random() < 0.6) {
        this.addParticle(
          g.x + (Math.random() - 0.5) * 4,
          g.y - g.height,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          0.3,
          4,
          'rgba(203, 213, 225, 0.45)',
          'smoke'
        );
      }

      // Detonation
      if (progress >= 1 && !g.exploded) {
        g.exploded = true;
        this.detonateGrenade(g);
        this.grenades.splice(i, 1);
      }
    }
  }

  private detonateGrenade(g: Grenade) {
    sound.playExplosion();
    this.screenShakeAmount = Math.max(this.screenShakeAmount, 16);

    // Shockwave ring particle
    this.addParticle(g.x, g.y, 0, 0, 0.5, g.radius, '#f97316', 'shockwave');

    // Scorch decal mark on floor
    this.decals.push({
      x: g.x,
      y: g.y,
      size: 32 + Math.random() * 12,
      color: '#09090b',
      alpha: 0.8,
      type: 'scorch',
    });

    // Intense fire & debris particles
    for (let p = 0; p < 24; p++) {
      const angle = (Math.PI * 2 * p) / 24 + (Math.random() - 0.5) * 0.3;
      const speed = 70 + Math.random() * 140;
      this.addParticle(
        g.x,
        g.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.5 + Math.random() * 0.4,
        8 + Math.random() * 7,
        Math.random() > 0.4 ? '#f97316' : '#eab308',
        'spark'
      );
    }

    // Heavy damage to all enemies within blast radius with quadratic falloff
    this.enemies.forEach((enemy) => {
      if (enemy.state === 'dead') return;
      const dist = Math.hypot(enemy.x - g.x, enemy.y - g.y);
      if (dist < g.radius) {
        const falloff = 1 - dist / g.radius;
        const damageDealt = Math.round(g.damage * falloff);
        this.damageEnemy(enemy, damageDealt);
        // Blast knockback push
        const pushAngle = Math.atan2(enemy.y - g.y, enemy.x - g.x);
        enemy.x += Math.cos(pushAngle) * (35 * falloff);
        enemy.y += Math.sin(pushAngle) * (35 * falloff);
      }
    });

    // Barrels explosion trigger
    this.barrels.forEach((b) => {
      if (b.exploded) return;
      const dist = Math.hypot(b.x - g.x, b.y - g.y);
      if (dist < g.radius) {
        this.damageBarrel(b, g.damage);
      }
    });

    // Player blast damage if too close (unless performing tactical roll)
    const dToPlayer = Math.hypot(this.player.x - g.x, this.player.y - g.y);
    if (dToPlayer < g.radius * 0.75 && !this.player.isRolling) {
      const falloff = 1 - dToPlayer / (g.radius * 0.75);
      const playerDamage = Math.round(45 * falloff);
      this.damagePlayer(playerDamage);
    }
  }

  public useMedkit(): boolean {
    const p = this.player;
    if (p.health >= p.maxHealth) return false;

    // Search backpack for medical item
    const medIndex = p.backpack.findIndex((item) => item.usable);
    if (medIndex === -1) return false;

    const medItem = p.backpack[medIndex];
    p.backpack.splice(medIndex, 1);

    const healAmt = medItem.id === 'nano_stim' ? 35 : 50;
    p.health = Math.min(p.maxHealth, p.health + healAmt);

    sound.playHeal();
    this.addFloatingText(p.x, p.y - 35, `+${healAmt} HP`, '#4ade80', 16);
    return true;
  }

  public healPlayerDirect(amount: number = 50): boolean {
    const p = this.player;
    // 1. If player has medkit in backpack, use it first
    if (this.useMedkit()) return true;

    // 2. If near active health station, recharge from station
    if (this.nearestHealthStation && p.health < p.maxHealth) {
      const healAmt = Math.min(p.maxHealth - p.health, 60);
      p.health += healAmt;
      sound.playHeal();
      this.addFloatingText(p.x, p.y - 35, `+${healAmt} VIDA RECARGADA!`, '#22c55e', 16);
      for (let i = 0; i < 12; i++) {
        const ang = Math.random() * Math.PI * 2;
        this.addParticle(p.x, p.y, Math.cos(ang) * 45, Math.sin(ang) * 45, 0.45, 4, '#22c55e', 'spark');
      }
      return true;
    }

    // 3. Emergency field nanite injection
    if (p.health < p.maxHealth) {
      const healAmt = Math.min(p.maxHealth - p.health, amount);
      p.health += healAmt;
      sound.playHeal();
      this.addFloatingText(p.x, p.y - 35, `+${healAmt} VIDA RECARGADA!`, '#4ade80', 16);
      for (let i = 0; i < 14; i++) {
        const ang = Math.random() * Math.PI * 2;
        this.addParticle(p.x, p.y, Math.cos(ang) * 50, Math.sin(ang) * 50, 0.5, 4.5, '#4ade80', 'spark');
      }
      return true;
    }

    this.addFloatingText(p.x, p.y - 35, 'VIDA AL MÁXIMO', '#38bdf8', 13);
    return false;
  }

  public interactNearest(): boolean {
    // 1. Check health station recharge
    if (this.nearestHealthStation && this.player.health < this.player.maxHealth) {
      return this.healPlayerDirect(50);
    }

    // 2. Check crates
    if (this.nearestCrate && !this.nearestCrate.isOpened) {
      this.openCrate(this.nearestCrate);
      return true;
    }

    return false;
  }

  private openCrate(crate: Crate) {
    crate.isOpened = true;
    sound.playCrateOpen();

    // Check if backpack has room
    crate.loot.forEach((item) => {
      if (this.player.backpack.length < this.player.maxBackpackSlots) {
        this.player.backpack.push(item);
        sound.playLootPickup(item.rarity);
        this.addFloatingText(crate.x, crate.y - 25, `+ ${item.name} ($${item.value})`, '#fde047', 14);
      } else {
        this.addFloatingText(crate.x, crate.y - 25, 'BACKPACK FULL! ($' + item.value + ' LOST)', '#ef4444', 13);
      }
    });
  }

  private checkProximities() {
    // Check closest crate
    let closestCrate: Crate | null = null;
    let minDist = 75;

    this.crates.forEach((crate) => {
      if (crate.isOpened) return;
      const d = Math.hypot(this.player.x - crate.x, this.player.y - crate.y);
      if (d < minDist) {
        minDist = d;
        closestCrate = crate;
      }
    });
    this.nearestCrate = closestCrate;

    // Check closest health station
    let closestStation: HealthStation | null = null;
    let minStationDist = 80;

    this.healthStations.forEach((hs) => {
      const d = Math.hypot(this.player.x - hs.x, this.player.y - hs.y);
      if (d < hs.radius + 20 && d < minStationDist) {
        minStationDist = d;
        closestStation = hs;
      }
    });
    this.nearestHealthStation = closestStation;
  }

  private updateHealthPickups(dt: number) {
    for (const pickup of this.healthPickups) {
      if (pickup.collected) continue;
      pickup.pulsePhase = (pickup.pulsePhase + dt * 3.5) % (Math.PI * 2);

      const dist = Math.hypot(this.player.x - pickup.x, this.player.y - pickup.y);
      // Auto-collect when stepping over pickup
      if (dist < this.player.radius + 22) {
        pickup.collected = true;

        if (this.player.health < this.player.maxHealth) {
          const healAmount = Math.min(this.player.maxHealth - this.player.health, pickup.healAmount);
          this.player.health += healAmount;
          sound.playHeal();
          this.addFloatingText(this.player.x, this.player.y - 35, `+${healAmount} VIDA RECARGADA!`, '#22c55e', 16);
        } else if (this.player.backpack.length < this.player.maxBackpackSlots) {
          this.player.backpack.push({
            id: 'medkit',
            name: 'Botiquín Nanotecnológico',
            value: 125,
            rarity: 'uncommon',
            category: 'medical',
            description: 'Inyector nanotecnológico que regenera +50 puntos de salud de inmediato.',
            icon: 'Heart',
            usable: true,
          });
          sound.playLootPickup('uncommon');
          this.addFloatingText(this.player.x, this.player.y - 30, '+ BOTIQUÍN GUARDADO', '#86efac', 14);
        } else {
          this.addFloatingText(this.player.x, this.player.y - 30, 'SALUD AL MÁXIMO', '#38bdf8', 13);
        }

        // Green healing particle burst
        for (let p = 0; p < 14; p++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 35 + Math.random() * 50;
          this.addParticle(pickup.x, pickup.y, Math.cos(angle) * spd, Math.sin(angle) * spd, 0.45, 4, '#22c55e', 'spark');
        }
      }
    }
  }

  private updateHealthStations(dt: number) {
    for (const hs of this.healthStations) {
      if (hs.cooldown > 0) hs.cooldown -= dt;

      const dist = Math.hypot(this.player.x - hs.x, this.player.y - hs.y);
      // If player stands inside medical recharge zone
      if (dist < hs.radius && this.player.health < this.player.maxHealth && hs.cooldown <= 0) {
        const healTick = 30;
        this.player.health = Math.min(this.player.maxHealth, this.player.health + healTick);
        hs.cooldown = 1.1; // Pulse cooldown
        sound.playHeal();
        this.addFloatingText(this.player.x, this.player.y - 35, `+${healTick} VIDA ESTACIÓN!`, '#22c55e', 15);

        for (let p = 0; p < 12; p++) {
          const angle = Math.random() * Math.PI * 2;
          this.addParticle(hs.x, hs.y, Math.cos(angle) * 40, Math.sin(angle) * 40, 0.5, 4, '#4ade80', 'spark');
        }
      }
    }
  }

  private updateEnemies(dt: number) {
    const p = this.player;

    this.enemies.forEach((enemy) => {
      if (enemy.state === 'dead') return;

      if (enemy.damageFlash > 0) enemy.damageFlash -= dt * 6;
      if (enemy.attackCooldown > 0) enemy.attackCooldown -= dt;

      const distToPlayer = Math.hypot(p.x - enemy.x, p.y - enemy.y);
      const angleToPlayer = Math.atan2(p.y - enemy.y, p.x - enemy.x);

      // Vision check with line of sight
      const angleDiff = Math.abs(((angleToPlayer - enemy.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const hasLOS = this.hasLineOfSight(enemy.x, enemy.y, p.x, p.y);
      const canSeePlayer =
        hasLOS &&
        distToPlayer < enemy.visionRange &&
        (angleDiff < enemy.fovAngle * 0.5 || distToPlayer < 95);

      // Titan Boss Phase logic
      if (enemy.isBoss || enemy.type === 'titan_boss' || enemy.type === 'boss') {
        const hpRatio = enemy.health / enemy.maxHealth;
        if (hpRatio <= 0.33) {
          enemy.bossPhase = 3; // Frenzy / Enraged phase
          enemy.speed = 150;
        } else if (hpRatio <= 0.66) {
          enemy.bossPhase = 2; // Missile & defense drone phase
          enemy.speed = 120;
        } else {
          enemy.bossPhase = 1;
        }
      }

      // AI State Transitions
      if (canSeePlayer) {
        if (enemy.state === 'patrol' || enemy.state === 'idle' || enemy.state === 'search') {
          sound.playEnemyAlert();
          this.addFloatingText(enemy.x, enemy.y - 30, '¡ALERTA!', '#ef4444', 14);
          enemy.state = 'detect';
          enemy.alertTimer = 0.25;
        }

        // Low health tactical behavior: TAKE_COVER or RETREAT
        const hpRatio = enemy.health / enemy.maxHealth;
        if (hpRatio < 0.35 && !enemy.isBoss) {
          if (enemy.type.includes('drone')) {
            enemy.state = 'retreat';
          } else {
            enemy.state = 'take_cover';
          }
        } else if (distToPlayer <= enemy.range) {
          // Tactical Flanking vs Direct Attack
          if (enemy.type === 'rusher' || enemy.type === 'assault_bot') {
            enemy.state = 'flank';
          } else {
            enemy.state = 'attack';
          }
        } else {
          enemy.state = 'chase';
        }
      } else if (enemy.state === 'chase' || enemy.state === 'attack' || enemy.state === 'flank') {
        // Lost sight of player: transition to SEARCH
        enemy.state = 'search';
        enemy.searchTimer = 4.0;
        enemy.patrolTargetX = p.x + (Math.random() - 0.5) * 80;
        enemy.patrolTargetY = p.y + (Math.random() - 0.5) * 80;
      }

      // AI State Execution
      switch (enemy.state) {
        case 'detect':
          enemy.alertTimer = (enemy.alertTimer || 0) - dt;
          enemy.angle = angleToPlayer;
          enemy.vx = 0;
          enemy.vy = 0;
          if (enemy.alertTimer <= 0) {
            enemy.state = 'chase';
          }
          break;

        case 'attack':
          enemy.angle = angleToPlayer;
          if (enemy.attackCooldown <= 0 && !p.isRolling) {
            enemy.attackCooldown = enemy.attackRate;
            this.fireEnemyWeapon(enemy);

            // Boss multi-shot
            if (enemy.bossPhase === 2 && Math.random() < 0.4) {
              setTimeout(() => {
                if (enemy.state !== 'dead') this.fireEnemyWeapon(enemy);
              }, 180);
            }
          }
          // Lateral combat strafe
          const strafeAngle = angleToPlayer + Math.PI / 2;
          const strafeDir = Math.sin(Date.now() * 0.004 + enemy.id);
          enemy.vx = Math.cos(strafeAngle) * strafeDir * (enemy.speed * 0.55);
          enemy.vy = Math.sin(strafeAngle) * strafeDir * (enemy.speed * 0.55);
          break;

        case 'flank':
          // Circle around player while keeping distance
          enemy.angle = angleToPlayer;
          enemy.flankDirection = enemy.flankDirection || (Math.random() > 0.5 ? 1 : -1);
          const flankTargetAngle = angleToPlayer + (Math.PI * 0.4) * enemy.flankDirection;
          enemy.vx = Math.cos(flankTargetAngle) * enemy.speed;
          enemy.vy = Math.sin(flankTargetAngle) * enemy.speed;
          if (enemy.attackCooldown <= 0 && distToPlayer <= enemy.range * 1.1) {
            enemy.attackCooldown = enemy.attackRate;
            this.fireEnemyWeapon(enemy);
          }
          break;

        case 'take_cover':
          // Move away from player line of sight towards nearest wall or rock
          const coverAngle = angleToPlayer + Math.PI;
          enemy.angle = angleToPlayer;
          enemy.vx = Math.cos(coverAngle) * (enemy.speed * 0.85);
          enemy.vy = Math.sin(coverAngle) * (enemy.speed * 0.85);
          if (enemy.attackCooldown <= 0 && Math.random() < 0.3) {
            enemy.attackCooldown = enemy.attackRate * 1.5;
            this.fireEnemyWeapon(enemy);
          }
          break;

        case 'retreat':
          // Drone or wounded unit fleeing
          const retreatAngle = angleToPlayer + Math.PI;
          enemy.angle = retreatAngle;
          enemy.vx = Math.cos(retreatAngle) * (enemy.speed * 1.1);
          enemy.vy = Math.sin(retreatAngle) * (enemy.speed * 1.1);
          break;

        case 'search':
          enemy.searchTimer = (enemy.searchTimer || 0) - dt;
          const searchDist = Math.hypot(enemy.patrolTargetX - enemy.x, enemy.patrolTargetY - enemy.y);
          if (searchDist > 20) {
            const sAngle = Math.atan2(enemy.patrolTargetY - enemy.y, enemy.patrolTargetX - enemy.x);
            enemy.angle = sAngle;
            enemy.vx = Math.cos(sAngle) * (enemy.speed * 0.65);
            enemy.vy = Math.sin(sAngle) * (enemy.speed * 0.65);
          } else {
            enemy.vx = 0;
            enemy.vy = 0;
            enemy.angle += dt * 1.8; // Looking around 360°
          }
          if (enemy.searchTimer <= 0) {
            enemy.state = 'patrol';
            enemy.patrolTimer = 2.0;
          }
          break;

        case 'chase':
          enemy.angle = angleToPlayer;
          enemy.vx = Math.cos(angleToPlayer) * enemy.speed;
          enemy.vy = Math.sin(angleToPlayer) * enemy.speed;
          break;

        case 'patrol':
        default:
          enemy.patrolTimer -= dt;
          if (enemy.patrolTimer <= 0) {
            enemy.patrolTimer = 3.0 + Math.random() * 3.5;
            enemy.patrolTargetX = enemy.patrolOriginX + (Math.random() - 0.5) * 180;
            enemy.patrolTargetY = enemy.patrolOriginY + (Math.random() - 0.5) * 180;
          }
          const pDist = Math.hypot(enemy.patrolTargetX - enemy.x, enemy.patrolTargetY - enemy.y);
          if (pDist > 16) {
            const pAngle = Math.atan2(enemy.patrolTargetY - enemy.y, enemy.patrolTargetX - enemy.x);
            enemy.angle = pAngle;
            enemy.vx = Math.cos(pAngle) * (enemy.speed * 0.45);
            enemy.vy = Math.sin(pAngle) * (enemy.speed * 0.45);
          } else {
            enemy.vx = 0;
            enemy.vy = 0;
          }
          break;
      }

      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

      // Obstacle & boundary collisions
      this.resolveWallCollisions(enemy);
      this.resolvePropCollisions(enemy);
      enemy.x = Math.max(50, Math.min(this.arenaSize - 50, enemy.x));
      enemy.y = Math.max(50, Math.min(this.arenaSize - 50, enemy.y));
    });
  }

  private fireEnemyWeapon(enemy: Enemy) {
    const spread = 0.15;
    const finalAngle = enemy.angle + (Math.random() - 0.5) * spread;

    this.bullets.push({
      x: enemy.x + Math.cos(enemy.angle) * 16,
      y: enemy.y + Math.sin(enemy.angle) * 16,
      vx: Math.cos(finalAngle) * 520,
      vy: Math.sin(finalAngle) * 520,
      damage: enemy.damage,
      rangeRemaining: enemy.range * 1.2,
      fromPlayer: false,
      color: '#f87171',
      radius: 2.5,
    });

    sound.playShoot('pistol');
  }

  private updateBullets(dt: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const stepX = b.vx * dt;
      const stepY = b.vy * dt;
      b.x += stepX;
      b.y += stepY;
      b.rangeRemaining -= Math.hypot(stepX, stepY);

      let collided = false;

      // Wall collision
      for (const wall of this.walls) {
        if (b.x >= wall.x && b.x <= wall.x + wall.w && b.y >= wall.y && b.y <= wall.y + wall.h) {
          collided = true;
          this.createSparks(b.x, b.y, b.color);
          break;
        }
      }

      // Barrel collision
      if (!collided) {
        for (const barrel of this.barrels) {
          if (barrel.exploded) continue;
          if (Math.hypot(b.x - barrel.x, b.y - barrel.y) < barrel.radius + b.radius) {
            collided = true;
            this.damageBarrel(barrel, b.damage);
            break;
          }
        }
      }

      // Free Fire Gloo Wall collision (Muro de Hielo absorbs bullets)
      if (!collided) {
        for (let wIdx = this.glooWalls.length - 1; wIdx >= 0; wIdx--) {
          const gw = this.glooWalls[wIdx];
          const dist = Math.hypot(b.x - gw.x, b.y - gw.y);
          if (dist < gw.width * 0.55 + b.radius) {
            collided = true;
            gw.health -= b.damage;
            sound.playShieldDeflect();
            // Cyan ice sparks
            for (let s = 0; s < 5; s++) {
              const ang = Math.random() * Math.PI * 2;
              this.addParticle(b.x, b.y, Math.cos(ang) * 45, Math.sin(ang) * 45, 0.25, 3.5, '#38bdf8', 'spark');
            }
            if (gw.health <= 0) {
              this.addFloatingText(gw.x, gw.y - 30, '¡MURO GLOO DESTRUIDO!', '#38bdf8', 14);
              this.glooWalls.splice(wIdx, 1);
            }
            break;
          }
        }
      }

      // 3D War Structure collision
      if (!collided) {
        for (const ws of this.warStructures) {
          if (ws.type === 'room_floor') continue;
          if (b.x >= ws.x && b.x <= ws.x + ws.w && b.y >= ws.y && b.y <= ws.y + ws.h) {
            collided = true;
            this.createSparks(b.x, b.y, ws.type === 'military_truck' ? '#f97316' : '#94a3b8');
            break;
          }
        }
      }

      // Player collision (enemy bullets)
      if (!collided && !b.fromPlayer) {
        const p = this.player;
        const isJumpingDodge = p.isJumping && (p.jumpZ || 0) > 12;
        if (!p.isRolling && !isJumpingDodge && Math.hypot(b.x - p.x, b.y - p.y) < p.radius + b.radius) {
          collided = true;
          // When crouching, character has smaller tactical exposure and absorbs less damage
          const finalDmg = p.isCrouching ? Math.round(b.damage * 0.7) : b.damage;
          this.damagePlayer(finalDmg);
        } else if (isJumpingDodge && Math.hypot(b.x - p.x, b.y - p.y) < p.radius + b.radius + 8) {
          // Whistling near-miss spark while jumping over enemy fire
          this.addParticle(b.x, b.y, b.vx * 0.1, b.vy * 0.1, 0.15, 2, '#38bdf8', 'spark');
        }
      }

      // Enemy collision (player bullets)
      if (!collided && b.fromPlayer) {
        for (const enemy of this.enemies) {
          if (enemy.state === 'dead') continue;
          if (Math.hypot(b.x - enemy.x, b.y - enemy.y) < enemy.radius + b.radius) {
            collided = true;
            this.damageEnemy(enemy, b.damage, b.vx, b.vy);
            break;
          }
        }
      }

      if (collided || b.rangeRemaining <= 0) {
        this.bullets.splice(i, 1);
      }
    }
  }

  private damagePlayer(amount: number) {
    const p = this.player;

    // Free Fire Shield (Chaleco) absorbs damage first!
    if (p.shield && p.shield > 0) {
      sound.playShieldDeflect();
      p.shieldFlash = 1.0;
      if (p.shield >= amount) {
        p.shield -= amount;
        this.addFloatingText(p.x, p.y - 35, `-${amount} ESCUDO`, '#38bdf8', 15);
        amount = 0;
      } else {
        const absorbed = p.shield;
        amount -= absorbed;
        p.shield = 0;
        this.addFloatingText(p.x, p.y - 35, `-${absorbed} ¡ESCUDO ROTO!`, '#38bdf8', 16);
      }
    }

    if (amount > 0) {
      const mitigated = Math.round(amount * (1 - p.armor / 100));
      p.health = Math.max(0, p.health - mitigated);
      p.damageFlash = 1.0;
      sound.playHit(true);

      if (navigator.vibrate && this.settings.haptics) {
        navigator.vibrate([60, 40, 80]);
      }

      this.addFloatingText(p.x, p.y - 25, `-${mitigated} HP`, '#ef4444', 16);

      if (p.health <= 0) {
        this.isGameOver = true;
        sound.playGameOver();
      }
    }
  }

  private damageEnemy(enemy: Enemy, amount: number, bulletVx?: number, bulletVy?: number) {
    // 1. HEADSHOT & CRITICAL HIT SYSTEM
    const isAwm = this.player.currentWeapon === 'awm';
    const isShotgun = this.player.currentWeapon === 'm1014' || this.player.currentWeapon === 'shotgun';
    const headshotChance = isAwm ? 0.65 : (isShotgun ? 0.35 : 0.22);
    const isHeadshot = Math.random() < headshotChance;

    const damageMultiplier = isHeadshot ? (isAwm ? 2.5 : 2.0) : 1.0;
    const finalAmount = Math.round(amount * damageMultiplier);

    enemy.health -= finalAmount;
    enemy.damageFlash = 1.0;

    // Trigger visual hitmarker on HUD
    this.player.hitmarkerTimer = 0.22;
    this.player.hitmarkerIsHeadshot = isHeadshot;

    if (isHeadshot) {
      sound.playHeadshot();
      this.addFloatingText(enemy.x, enemy.y - 32, `¡HEADSHOT! -${finalAmount}`, '#ef4444', 18);
      // Crimson impact sparks
      for (let s = 0; s < 8; s++) {
        const ang = Math.random() * Math.PI * 2;
        this.addParticle(enemy.x, enemy.y, Math.cos(ang) * 95, Math.sin(ang) * 95, 0.28, 4, '#ef4444', 'spark');
      }
    } else {
      sound.playHitmarker();
      this.addFloatingText(enemy.x, enemy.y - 20, `-${finalAmount}`, '#fde047', 14);
      for (let s = 0; s < 4; s++) {
        const ang = Math.random() * Math.PI * 2;
        this.addParticle(enemy.x, enemy.y, Math.cos(ang) * 60, Math.sin(ang) * 60, 0.2, 3, '#fde047', 'spark');
      }
    }

    // 2. STAGGER & KNOCKBACK REACTION
    if (bulletVx !== undefined && bulletVy !== undefined) {
      const kDist = Math.hypot(bulletVx, bulletVy);
      if (kDist > 0.001) {
        const knock = isHeadshot ? 16 : 8;
        enemy.x += (bulletVx / kDist) * knock;
        enemy.y += (bulletVy / kDist) * knock;
        enemy.vx *= 0.25;
        enemy.vy *= 0.25;
      }
    }

    // 3. SQUAD COMBAT AI: Alert nearby patrol units within 340 units
    this.enemies.forEach((other) => {
      if (other.id !== enemy.id && other.state !== 'dead') {
        const d = Math.hypot(other.x - enemy.x, other.y - enemy.y);
        if (d < 340 && (other.state === 'patrol' || other.state === 'idle' || other.state === 'search')) {
          other.state = Math.random() > 0.4 ? 'flank' : 'chase';
          other.patrolTargetX = this.player.x;
          other.patrolTargetY = this.player.y;
        }
      }
    });

    // 4. WOUNDED ENEMY COMBAT REACTION
    if (enemy.health > 0) {
      if (enemy.health < enemy.maxHealth * 0.35 && !enemy.isBoss) {
        enemy.state = enemy.type.includes('drone') ? 'retreat' : 'take_cover';
      } else {
        enemy.state = 'chase';
      }
      enemy.angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
    }

    if (enemy.health <= 0) {
      enemy.state = 'dead';
      this.player.kills++;

      // Robot death: Scorch and circuit explosion decals
      this.decals.push({
        x: enemy.x,
        y: enemy.y,
        size: enemy.type === 'boss' ? 32 : enemy.type === 'heavy' ? 24 : 18,
        color: '#0f172a',
        alpha: 0.7,
        type: 'scorch',
      });

      // Robot explosion particles: sparks, electrical arcs, and mechanical debris
      const sparkCount = enemy.type === 'boss' ? 24 : enemy.type === 'heavy' ? 18 : 12;
      for (let s = 0; s < sparkCount; s++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 40 + Math.random() * 80;
        this.addParticle(
          enemy.x,
          enemy.y,
          Math.cos(ang) * spd,
          Math.sin(ang) * spd,
          0.3 + Math.random() * 0.3,
          3 + Math.random() * 3,
          Math.random() > 0.4 ? '#38bdf8' : '#fbbf24',
          'spark'
        );
      }

      // Spawn loot cash
      const droppedCash = 140 + Math.floor(Math.random() * 240);
      this.addFloatingText(enemy.x, enemy.y - 25, `+ $${droppedCash} CASH`, '#22c55e', 14);

      // High chance (45%) to drop a floating Health Pickup on the ground for player to recharge!
      if (Math.random() < 0.45) {
        this.healthPickups.push({
          id: this.nextEntityId++,
          x: enemy.x + (Math.random() - 0.5) * 16,
          y: enemy.y + (Math.random() - 0.5) * 16,
          healAmount: enemy.type === 'heavy' || enemy.type === 'boss' ? 65 : 45,
          type: enemy.type === 'heavy' || enemy.type === 'boss' ? 'nanite_core' : 'medkit',
          collected: false,
          pulsePhase: Math.random() * Math.PI * 2,
        });
        this.addFloatingText(enemy.x, enemy.y - 45, '+ NÚCLEO DE VIDA', '#4ade80', 14);
      } else if (Math.random() < 0.35 && this.player.backpack.length < this.player.maxBackpackSlots) {
        // Direct backpack medkit
        const med = LOOT_CATALOG.find((i) => i.id === 'medkit')!;
        this.player.backpack.push(med);
        sound.playLootPickup('uncommon');
        this.addFloatingText(enemy.x, enemy.y - 45, '+ BOTIQUÍN TÁCTICO', '#38bdf8', 13);
      }
    }
  }

  private damageBarrel(barrel: Barrel, amount: number) {
    barrel.health -= amount;
    if (barrel.health <= 0 && !barrel.exploded) {
      barrel.exploded = true;
      sound.playExplosion();

      // Shockwave particle
      this.addParticle(barrel.x, barrel.y, 0, 0, 0.4, 75, '#ef4444', 'shockwave');

      // Blast damage to nearby entities
      const blastRadius = 90;
      const blastDamage = 65;

      // Damage player
      const dToP = Math.hypot(this.player.x - barrel.x, this.player.y - barrel.y);
      if (dToP < blastRadius && !this.player.isRolling) {
        this.damagePlayer(Math.round(blastDamage * (1 - dToP / blastRadius)));
      }

      // Damage enemies
      this.enemies.forEach((e) => {
        if (e.state === 'dead') return;
        const dToE = Math.hypot(e.x - barrel.x, e.y - barrel.y);
        if (dToE < blastRadius) {
          this.damageEnemy(e, Math.round(blastDamage * (1 - dToE / blastRadius)));
        }
      });
    }
  }

  private updateBarrels(dt: number) {
    // Toxic barrel continuous green vapor particles
    this.barrels.forEach((b) => {
      if (b.type === 'toxic' && !b.exploded && Math.random() < 0.15) {
        this.addParticle(
          b.x + (Math.random() - 0.5) * 12,
          b.y - 10,
          (Math.random() - 0.5) * 10,
          -15 - Math.random() * 15,
          0.6,
          5,
          '#4ade80',
          'toxic'
        );
      }
    });
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      if (p.type === 'shockwave') {
        p.size += dt * 160;
      }

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateFloatingTexts(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= dt * 32;
      ft.life += dt;
      ft.alpha = Math.max(0, 1 - ft.life / 1.1);

      if (ft.life >= 1.1) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  public addFloatingText(x: number, y: number, text: string, color: string = '#ffffff', size: number = 14) {
    this.floatingTexts.push({
      id: this.nextEntityId++,
      x,
      y,
      text,
      color,
      alpha: 1.0,
      life: 0,
      size,
    });
  }

  public addParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    maxLife: number,
    size: number,
    color: string,
    type: 'spark' | 'smoke' | 'blood' | 'casing' | 'toxic' | 'shockwave' = 'spark'
  ) {
    this.particles.push({
      x,
      y,
      vx,
      vy,
      life: 0,
      maxLife,
      size,
      color,
      alpha: 1.0,
      decay: 1.0 / maxLife,
      type,
    });
  }

  private createSparks(x: number, y: number, color: string) {
    for (let i = 0; i < 4; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 70;
      this.addParticle(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd, 0.18, 2, color);
    }
  }

  public deployGlooWall(): boolean {
    const p = this.player;
    if (p.glooWalls <= 0 || p.glooWallCooldown > 0) {
      this.addFloatingText(p.x, p.y - 35, 'SIN PAREDES GLOO', '#06b6d4', 13);
      return false;
    }

    p.glooWalls--;
    p.glooWallCooldown = 1.0;

    // Free Fire deploy position right ahead of player
    const deployDist = 48;
    const wallX = p.x + Math.cos(p.angle) * deployDist;
    const wallY = p.y + Math.sin(p.angle) * deployDist;

    const newGloo: GlooWall = {
      id: this.nextEntityId++,
      x: wallX,
      y: wallY,
      angle: p.angle,
      width: 75,
      height: 60,
      health: 320,
      maxHealth: 320,
      duration: 30, // 30s tactical lifespan
      maxDuration: 30,
      pulsePhase: 0,
    };

    this.glooWalls.push(newGloo);
    sound.playGlooWallDeploy();

    // Cyan frost explosion particles
    for (let i = 0; i < 22; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 70;
      this.addParticle(wallX, wallY, Math.cos(ang) * spd, Math.sin(ang) * spd, 0.4, 5, '#38bdf8', 'spark');
    }

    if (navigator.vibrate && this.settings.haptics) {
      navigator.vibrate([30, 20, 40]);
    }

    this.addFloatingText(wallX, wallY - 45, '¡PARED GLOO DESPLEGADA!', '#38bdf8', 15);
    return true;
  }

  public toggleCrouch() {
    this.player.isCrouching = !this.player.isCrouching;
    if (this.player.isCrouching) {
      this.player.speed = 140; // Slower when crouched
      this.addFloatingText(this.player.x, this.player.y - 30, 'AGACHADO', '#94a3b8', 12);
    } else {
      this.player.speed = 215;
      this.addFloatingText(this.player.x, this.player.y - 30, 'DE PIE', '#38bdf8', 12);
    }
  }

  private updateGlooWalls(dt: number) {
    if (this.player.glooWallCooldown > 0) {
      this.player.glooWallCooldown -= dt;
    }
    if (this.player.shieldFlash && this.player.shieldFlash > 0) {
      this.player.shieldFlash -= dt * 4;
    }

    for (let i = this.glooWalls.length - 1; i >= 0; i--) {
      const gw = this.glooWalls[i];
      gw.duration -= dt;
      gw.pulsePhase = (gw.pulsePhase + dt * 2.8) % (Math.PI * 2);

      if (gw.duration <= 0 || gw.health <= 0) {
        for (let p = 0; p < 14; p++) {
          const ang = Math.random() * Math.PI * 2;
          this.addParticle(gw.x, gw.y, Math.cos(ang) * 45, Math.sin(ang) * 45, 0.35, 4, '#38bdf8', 'spark');
        }
        this.glooWalls.splice(i, 1);
      }
    }
  }

  private resolveWallCollisions(entity: { x: number; y: number; radius: number }) {
    // 1. Static labyrinth walls
    for (const wall of this.walls) {
      const closestX = Math.max(wall.x, Math.min(entity.x, wall.x + wall.w));
      const closestY = Math.max(wall.y, Math.min(entity.y, wall.y + wall.h));

      const dx = entity.x - closestX;
      const dy = entity.y - closestY;
      const dist = Math.hypot(dx, dy);

      if (dist < entity.radius && dist > 0.001) {
        const overlap = entity.radius - dist;
        entity.x += (dx / dist) * overlap;
        entity.y += (dy / dist) * overlap;
      }
    }

    // 2. Free Fire Gloo Walls (Muros de Hielo)
    for (const gw of this.glooWalls) {
      const dx = entity.x - gw.x;
      const dy = entity.y - gw.y;
      const dist = Math.hypot(dx, dy);
      const gwRadius = gw.width * 0.45;
      if (dist < entity.radius + gwRadius && dist > 0.001) {
        const overlap = (entity.radius + gwRadius) - dist;
        entity.x += (dx / dist) * overlap;
        entity.y += (dy / dist) * overlap;
      }
    }

    // 3. 3D War Structures (Ruined houses, bunkers, military trucks, barbed wire)
    for (const ws of this.warStructures) {
      if (ws.type === 'room_floor' || ws.type === 'rubble_pile') continue;
      // Tactical Jump: Vault over sandbag bunkers and low obstacles when jumping!
      if (entity === (this.player as any) && this.player.isJumping && (this.player.jumpZ || 0) > 12) {
        if (ws.type === 'sandbag_bunker' || ws.type === 'barbed_wire') continue;
      }
      const closestX = Math.max(ws.x, Math.min(entity.x, ws.x + ws.w));
      const closestY = Math.max(ws.y, Math.min(entity.y, ws.y + ws.h));
      const dx = entity.x - closestX;
      const dy = entity.y - closestY;
      const dist = Math.hypot(dx, dy);

      if (dist < entity.radius && dist > 0.001) {
        const overlap = entity.radius - dist;
        entity.x += (dx / dist) * overlap;
        entity.y += (dy / dist) * overlap;
      }
    }

    // 4. 3D Houses Outer Walls (with doorway clearance)
    for (const h of this.houses) {
      const halfW = h.width / 2;
      const halfD = h.depth / 2;
      if (Math.abs(entity.x - h.x) < halfW + entity.radius && Math.abs(entity.y - h.y) < halfD + entity.radius) {
        const dDist = Math.hypot(entity.x - h.doorX, entity.y - h.doorY);
        if (dDist > h.doorWidth * 0.6) {
          const overlapL = entity.x - (h.x - halfW);
          const overlapR = h.x + halfW - entity.x;
          const overlapT = entity.y - (h.y - halfD);
          const overlapB = h.y + halfD - entity.y;
          const minOverlap = Math.min(overlapL, overlapR, overlapT, overlapB);
          if (minOverlap > 0 && minOverlap < entity.radius + 6) {
            if (minOverlap === overlapL) entity.x = h.x - halfW - entity.radius;
            else if (minOverlap === overlapR) entity.x = h.x + halfW + entity.radius;
            else if (minOverlap === overlapT) entity.y = h.y - halfD - entity.radius;
            else entity.y = h.y + halfD + entity.radius;
          }
        }
      }
    }

    // 5. 3D Rocks
    for (const r of this.rocks) {
      const dx = entity.x - r.x;
      const dy = entity.y - r.y;
      const dist = Math.hypot(dx, dy);
      const minD = entity.radius + r.radius * 0.85;
      if (dist < minD && dist > 0.001) {
        const overlap = minD - dist;
        entity.x += (dx / dist) * overlap;
        entity.y += (dy / dist) * overlap;
      }
    }
  }

  private resolvePropCollisions(entity: { x: number; y: number; radius: number }) {
    // Crates collision
    for (const c of this.crates) {
      const half = c.width * 0.5;
      const closestX = Math.max(c.x - half, Math.min(entity.x, c.x + half));
      const closestY = Math.max(c.y - half, Math.min(entity.y, c.y + half));
      const dx = entity.x - closestX;
      const dy = entity.y - closestY;
      const dist = Math.hypot(dx, dy);
      if (dist < entity.radius && dist > 0.001) {
        const overlap = entity.radius - dist;
        entity.x += (dx / dist) * overlap;
        entity.y += (dy / dist) * overlap;
      }
    }

    // Barrels collision
    for (const b of this.barrels) {
      if (b.exploded) continue;
      const dx = entity.x - b.x;
      const dy = entity.y - b.y;
      const dist = Math.hypot(dx, dy);
      const minDist = entity.radius + b.radius;
      if (dist < minDist && dist > 0.001) {
        const overlap = minDist - dist;
        entity.x += (dx / dist) * overlap;
        entity.y += (dy / dist) * overlap;
      }
    }
  }
}
