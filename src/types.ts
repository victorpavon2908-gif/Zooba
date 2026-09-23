export type GameScreen = 'menu' | 'playing' | 'extracted' | 'gameover' | 'armory' | 'briefing';

export type WeaponId = 'pistol' | 'smg' | 'shotgun' | 'rifle' | 'plasma' | 'ak47' | 'mp40' | 'm1014' | 'awm' | 'katana' | 'vector' | 'm4';

export interface Weapon {
  id: WeaponId;
  name: string;
  type: string;
  damage: number;
  fireRate: number; // shots per second
  range: number;
  spread: number; // radians
  bulletsPerShot: number;
  magSize: number;
  reloadTime: number; // seconds
  bulletSpeed: number;
  color: string;
  price: number;
  unlocked: boolean;
  description: string;
  isMelee?: boolean;
}

export type LootRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface LootItem {
  id: string;
  name: string;
  rarity: LootRarity;
  value: number; // Cash value
  icon: string; // Emoji / key
  category: 'valuable' | 'medical' | 'intel' | 'tech' | 'armor' | 'tactical';
  description: string;
  usable?: boolean; // e.g. medkit heals, armor repairs, gloo walls
  shieldRestore?: number;
  glooWallCount?: number;
}

export interface GlooWall {
  id: number;
  x: number;
  y: number;
  angle: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  duration: number;
  maxDuration: number;
  pulsePhase: number;
}

export interface WarStructure {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  height3D: number;
  type: 'ruined_house' | 'sandbag_bunker' | 'military_truck' | 'barbed_wire' | 'rubble_pile' | 'broken_wall' | 'room_floor';
  label?: string;
  color?: string;
  rotation?: number;
  health?: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
  health: number;
  maxHealth: number;
  shield: number; // Free Fire Chaleco Shield HP (0-150)
  maxShield: number;
  armorLevel: number; // 1, 2, 3
  helmetLevel: number; // 1, 2, 3
  armor: number; // 0 - 100 percentage protection
  angle: number;
  isRolling: boolean;
  rollTimer: number;
  rollDuration: number;
  rollCooldown: number;
  rollVx: number;
  rollVy: number;
  isJumping?: boolean;
  jumpZ?: number;
  jumpVz?: number;
  jumpCooldown?: number;
  isCrouching?: boolean;
  hitmarkerTimer?: number;
  hitmarkerIsHeadshot?: boolean;
  currentWeapon: WeaponId;
  ammo: number;
  isReloading: boolean;
  reloadProgress: number;
  shotTimer: number;
  backpack: LootItem[];
  maxBackpackSlots: number;
  kills: number;
  damageFlash: number;
  shieldFlash?: number;
  grenades: number;
  maxGrenades: number;
  grenadeCooldown: number;
  glooWalls: number; // Free Fire Muros de Protección
  maxGlooWalls: number;
  glooWallCooldown: number;
  isAimingMode: boolean;
  aimLockedTargetId: number | null;
  stamina: number;
  maxStamina: number;
  isSprinting: boolean;
  meleeCooldown: number;
  isMeleeAttacking?: boolean;
  meleeTimer?: number;
  unlockedWeapons: WeaponId[];
  ammoByWeapon: Record<string, number>;
}

export interface Grenade {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  height: number;
  timer: number;
  totalTime: number;
  radius: number;
  damage: number;
  exploded: boolean;
}

export type EnemyType =
  | 'grunt'
  | 'enforcer'
  | 'heavy'
  | 'boss'
  | 'sniper'
  | 'rusher'
  | 'drone'
  | 'scout_drone'
  | 'combat_drone'
  | 'sentinel'
  | 'assault_bot'
  | 'heavy_bot'
  | 'defense_turret'
  | 'titan_boss';

export type AIState =
  | 'idle'
  | 'patrol'
  | 'search'
  | 'detect'
  | 'chase'
  | 'attack'
  | 'take_cover'
  | 'flank'
  | 'retreat'
  | 'alert'
  | 'dead';

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  z?: number; // 3D elevation
  vx: number;
  vy: number;
  vz?: number;
  radius: number;
  speed: number;
  health: number;
  maxHealth: number;
  angle: number;
  pitch?: number;
  state: AIState;
  patrolOriginX: number;
  patrolOriginY: number;
  patrolTargetX: number;
  patrolTargetY: number;
  patrolTimer: number;
  attackCooldown: number;
  attackRate: number;
  damage: number;
  range: number;
  visionRange: number;
  fovAngle: number;
  damageFlash: number;
  lootDrop?: LootItem;
  color: string;
  beanieColor: string;
  isBoss?: boolean;
  // Advanced 3D Robot Attributes & AI Behaviors
  robotModel?: string;
  eyeColor?: string;
  chassisColor?: string;
  laserAimActive?: boolean;
  flightAltitude?: number;
  alertTimer?: number;
  searchTimer?: number;
  coverTargetX?: number;
  coverTargetY?: number;
  flankTimer?: number;
  flankDirection?: number;
  bossPhase?: number;
  shieldHp?: number;
  maxShieldHp?: number;
}

export interface HealthStation {
  id: number;
  x: number;
  y: number;
  radius: number;
  availableHeals: number;
  maxHeals: number;
  cooldown: number;
  label: string;
  isActive: boolean;
}

export interface HealthPickup {
  id: number;
  x: number;
  y: number;
  healAmount: number;
  type: 'medkit' | 'nanite_core' | 'stim';
  collected: boolean;
  pulsePhase: number;
}

export interface MapSector {
  id: string;
  name: string;
  code: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  description: string;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  rangeRemaining: number;
  fromPlayer: boolean;
  color: string;
  radius: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  type?: 'spark' | 'smoke' | 'blood' | 'casing' | 'toxic' | 'shockwave';
}

export interface FloorDecal {
  x: number;
  y: number;
  size: number;
  color: string;
  alpha: number;
  type: 'blood' | 'scorch' | 'crack';
}

export interface Crate {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isOpened: boolean;
  loot: LootItem[];
  type: 'wood' | 'military' | 'medical' | 'safe';
  health: number;
}

export interface Barrel {
  id: number;
  x: number;
  y: number;
  radius: number;
  type: 'toxic' | 'explosive' | 'metal';
  health: number;
  maxHealth: number;
  isLeaking?: boolean;
  exploded?: boolean;
}

export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
  height3D: number;
  type: 'outer' | 'inner' | 'corrugated' | 'door';
  label?: string;
}

export interface Furniture3D {
  id: number;
  type: 'table' | 'chair' | 'bed' | 'wardrobe' | 'desk' | 'cabinet' | 'lamp' | 'debris' | 'pipes';
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
}

export interface House3D {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  doorX: number;
  doorY: number;
  doorWidth: number;
  doorWall: 'north' | 'south' | 'east' | 'west';
  hasRoof: boolean;
  isRuined: boolean;
  furniture: Furniture3D[];
  lootCrates: number[]; // crate ids inside
}

export interface Cave3D {
  id: number;
  name: string;
  entranceX: number;
  entranceY: number;
  interiorX: number;
  interiorY: number;
  radius: number;
  tunnelLength: number;
  tunnelAngle: number;
  ambientLightColor: string;
  hasWater: boolean;
  stalagmitesCount: number;
  treasureCrateId: number;
}

export interface Mountain3D {
  id: number;
  x: number;
  y: number;
  radius: number;
  peakHeight: number;
  roughness: number;
}

export interface MilitaryFacility3D {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  hasAntenna: boolean;
  hasGenerators: boolean;
  hasPipes: boolean;
  alarmActive: boolean;
}

export interface Vegetation3D {
  id: number;
  type: 'tree' | 'bush' | 'shrub' | 'tall_grass';
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface Rock3D {
  id: number;
  x: number;
  y: number;
  radius: number;
  height: number;
  rotation: number;
}

export interface ExtractionZone {
  x: number;
  y: number;
  radius: number;
  countdown: number; // total mission extraction countdown
  timeInZone: number; // time player needs to stay inside to extract once beacon ready
  requiredStayTime: number; // e.g. 5 seconds
  isActive: boolean;
  isExtracting: boolean;
  hologramAngle: number;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  life: number;
  size: number;
}

export interface SectorMission {
  id: string;
  name: string;
  sectorCode: string;
  difficulty: 'Standard' | 'Hostile' | 'Extreme';
  description: string;
  lootMultiplier: number;
  extractionTimeSec: number;
  theme: 'warehouse' | 'biohazard' | 'military';
  ambientColor: string;
  unlocked: boolean;
}

export interface GameSettings {
  autoAim: boolean;
  haptics: boolean;
  soundVolume: number;
  musicVolume: number;
  screenShake: boolean;
  touchControlsStyle: 'twin-stick' | 'auto-target-button';
  highGraphics: boolean;
  graphicsQuality?: 'low' | 'medium' | 'high' | 'ultra';
  cameraZoom?: 'wide' | 'standard' | 'close';
}
