import * as THREE from 'three';
import {
  Player,
  Enemy,
  ExtractionZone,
  Crate,
  HealthStation,
  HealthPickup,
  GlooWall,
  Bullet,
  Particle,
  WeaponId,
  House3D,
  Cave3D,
  Mountain3D,
  MilitaryFacility3D,
  Vegetation3D,
  Rock3D,
  WarStructure,
  Barrel,
} from '../types';
import { getTerrainHeight } from './terrain';
import { ProceduralTextureManager } from './proceduralTextures';
import { TacticalCharacterModel } from './characterModel';
import { RobotModelFactory } from './robotModels';
import { Environment3DFactory } from './environment3d';
import { TacticalVFX3D } from './vfx3d';

/**
 * ThreeWorld:
 * High-Performance 2.5D Mobile Tactical WebGL Engine
 * - Elevated 2.5D isometric perspective with aim-leading and ADS zoom
 * - Zero-allocation object pooling for bullets, casings, sparks, and explosions
 * - Cached static crates and pickups (no per-frame geometry recreation)
 * - Layered depth: foreground atmospheric motes & power lines, gameplay layer, background horizon mountains
 * - Auto-regulating performance scaler: monitors rolling FPS and adjusts shadows/fidelity to maintain 60 FPS
 */
export class ThreeWorld {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  private canvas: HTMLCanvasElement;
  private arenaSize: number;

  // Lights
  private hemiLight: THREE.HemisphereLight;
  private dirLight: THREE.DirectionalLight;
  private playerMuzzleLight: THREE.PointLight;
  private emergencyLights: THREE.PointLight[] = [];

  // Meshes & Object Pools
  private terrainMesh: THREE.Mesh | null = null;
  private playerGroup: THREE.Group = new THREE.Group();
  private tacticalRingMesh: THREE.Mesh;
  private tacticalCharacter!: TacticalCharacterModel;
  private radarDishes: THREE.Mesh[] = [];

  // Foreground Parallax Depth Layer
  private foregroundMotesMesh: THREE.Points | null = null;

  // Enemy 3D Objects map: id -> THREE.Group
  private enemyMeshes: Map<number, THREE.Group> = new Map();

  // Structures & Props 3D Object groups
  private structuresGroup: THREE.Group = new THREE.Group();
  private warStructuresGroup: THREE.Group = new THREE.Group();
  private barrelsGroup: THREE.Group = new THREE.Group();
  private glooWallsGroup: THREE.Group = new THREE.Group();
  private cratesGroup: THREE.Group = new THREE.Group();
  private crateMeshes: Map<number, THREE.Group> = new Map();
  private healthStationsGroup: THREE.Group = new THREE.Group();
  private healthPickupsGroup: THREE.Group = new THREE.Group();
  private pickupMeshes: Map<number, THREE.Group> = new Map();
  private extractionGroup: THREE.Group = new THREE.Group();
  private extractionPadMesh: THREE.Mesh | null = null;
  private extractionBeamMesh: THREE.Mesh | null = null;

  // Pooled Bullets (Zero-Allocation)
  private bulletsGroup: THREE.Group = new THREE.Group();
  private bulletPool: THREE.Mesh[] = [];
  private readonly MAX_POOLED_BULLETS = 65;

  // 3D Tactical VFX
  public vfx: TacticalVFX3D = new TacticalVFX3D();

  // 2.5D Camera state
  public zoomPreset: 'wide' | 'standard' | 'close' = 'wide';
  private camCurrentPos = new THREE.Vector3();
  private camCurrentTarget = new THREE.Vector3();
  private animClock = new THREE.Clock();
  private mountains: Mountain3D[] = [];
  private lastShotTimer = 0;
  private cameraRecoilKick = 0;

  public setCameraZoomPreset(preset: 'wide' | 'standard' | 'close') {
    this.zoomPreset = preset;
  }

  public cycleCameraZoom(): 'wide' | 'standard' | 'close' {
    if (this.zoomPreset === 'wide') this.zoomPreset = 'standard';
    else if (this.zoomPreset === 'standard') this.zoomPreset = 'close';
    else this.zoomPreset = 'wide';
    return this.zoomPreset;
  }

  // Performance Profiling & Adaptive Quality
  private currentQuality: 'low' | 'medium' | 'high' | 'ultra' = 'high';
  private frameCount = 0;
  private frameTimeAccumulator = 0;
  private lastQualityCheckTime = 0;
  private autoQualityEnabled = true;

  // Materials Cache for mobile performance
  private materials = {
    concreteWall: new THREE.MeshStandardMaterial({
      color: 0x64748b,
      map: ProceduralTextureManager.getWeatheredConcrete(),
      bumpMap: ProceduralTextureManager.getMetalBumpMap(),
      bumpScale: 0.03,
      roughness: 0.78,
      metalness: 0.2,
    }),
    metalRust: new THREE.MeshStandardMaterial({
      color: 0x78350f,
      bumpMap: ProceduralTextureManager.getMetalBumpMap(),
      bumpScale: 0.06,
      roughness: 0.65,
      metalness: 0.55,
    }),
    metalMilitary: new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      map: ProceduralTextureManager.getGunmetalArmor(),
      bumpMap: ProceduralTextureManager.getMetalBumpMap(),
      bumpScale: 0.04,
      roughness: 0.35,
      metalness: 0.75,
    }),
    foliage: new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.8,
      metalness: 0.05,
      flatShading: true,
    }),
    treeTrunk: new THREE.MeshStandardMaterial({
      color: 0x3e2723,
      roughness: 0.9,
    }),
    glooWall: new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6,
      thickness: 1.2,
      transparent: true,
      opacity: 0.88,
    }),
    tacticalRingGreen: new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    }),
    tacticalRingRed: new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    }),
    bulletTracer: new THREE.MeshBasicMaterial({
      color: 0xfef08a,
    }),
  };

  constructor(canvas: HTMLCanvasElement, arenaSize: number) {
    this.canvas = canvas;
    this.arenaSize = arenaSize;

    // 1. Scene setup with cinematic atmospheric depth
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1118);
    this.scene.fog = new THREE.FogExp2(0x0a1118, 0.00065);

    // 2. Camera: 2.5D Isometric Tactical Perspective with 56° FOV
    const aspect = canvas.clientWidth / (canvas.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(56, aspect, 1, 4500);

    // 3. Renderer with mobile optimizations
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // 4. Lighting: Hemisphere ambient + Directional sunlight
    this.hemiLight = new THREE.HemisphereLight(0x94a3b8, 0x1e293b, 1.45);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff7ed, 1.9);
    this.dirLight.position.set(250, 520, 280);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 1600;
    const shadowD = 580;
    this.dirLight.shadow.camera.left = -shadowD;
    this.dirLight.shadow.camera.right = shadowD;
    this.dirLight.shadow.camera.top = shadowD;
    this.dirLight.shadow.camera.bottom = -shadowD;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    // Muzzle flash point light
    this.playerMuzzleLight = new THREE.PointLight(0xf59e0b, 0, 95);
    this.scene.add(this.playerMuzzleLight);

    // 5. Tactical Ground Ring (Under Player)
    const ringGeo = new THREE.RingGeometry(18, 24, 32);
    this.tacticalRingMesh = new THREE.Mesh(ringGeo, this.materials.tacticalRingGreen);
    this.tacticalRingMesh.rotation.x = -Math.PI / 2;
    this.scene.add(this.tacticalRingMesh);

    // 6. Build Player Character
    this.buildPlayerCharacter();

    // 7. Add Groups to Scene
    this.scene.add(
      this.structuresGroup,
      this.warStructuresGroup,
      this.barrelsGroup,
      this.glooWallsGroup,
      this.cratesGroup,
      this.healthStationsGroup,
      this.healthPickupsGroup,
      this.extractionGroup,
      this.bulletsGroup,
      this.vfx.group
    );

    // 8. Pre-allocate Bullet Mesh Pool for zero garbage collection
    this.initBulletPool();

    // 9. Foreground Parallax Atmospheric Motes
    this.initForegroundParallax();
  }

  /**
   * Pre-allocates pooled bullet tracer meshes
   */
  private initBulletPool() {
    const geo = new THREE.SphereGeometry(1.6, 6, 6);
    for (let i = 0; i < this.MAX_POOLED_BULLETS; i++) {
      const mesh = new THREE.Mesh(geo, this.materials.bulletTracer);
      mesh.visible = false;
      this.bulletsGroup.add(mesh);
      this.bulletPool.push(mesh);
    }
  }

  /**
   * Builds subtle atmospheric dust/ember motes floating in front of the 2.5D camera
   */
  private initForegroundParallax() {
    const count = 40;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 250;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 150;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 1.8,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });

    this.foregroundMotesMesh = new THREE.Points(geo, mat);
    this.scene.add(this.foregroundMotesMesh);
  }

  /**
   * Configures graphics quality preset with instant hardware scaling
   */
  public setGraphicsQuality(quality: 'low' | 'medium' | 'high' | 'ultra') {
    this.currentQuality = quality;

    if (quality === 'low') {
      this.renderer.shadowMap.enabled = false;
      this.dirLight.castShadow = false;
      this.renderer.setPixelRatio(1.0);
    } else if (quality === 'medium') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.BasicShadowMap;
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.width = 512;
      this.dirLight.shadow.mapSize.height = 512;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    } else if (quality === 'high') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.width = 1024;
      this.dirLight.shadow.mapSize.height = 1024;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    } else {
      // Ultra
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.width = 1024;
      this.dirLight.shadow.mapSize.height = 1024;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
    }
  }

  /**
   * Builds the anatomical tactical operative
   */
  private buildPlayerCharacter() {
    this.tacticalCharacter = new TacticalCharacterModel();
    this.playerGroup.add(this.tacticalCharacter.group);
    this.scene.add(this.playerGroup);
  }

  /**
   * Updates weapon mesh on the player model
   */
  public updateWeaponModel(weaponId: WeaponId) {
    if (this.tacticalCharacter) {
      this.tacticalCharacter.updateWeapon(weaponId);
    }
  }

  /**
   * Initializes static structures, houses, caves, military outposts, terrain
   */
  public initWorld(
    mountains: Mountain3D[],
    houses: House3D[],
    caves: Cave3D[],
    facilities: MilitaryFacility3D[],
    vegetation: Vegetation3D[],
    rocks: Rock3D[],
    warStructures?: WarStructure[],
    barrels?: Barrel[]
  ) {
    this.mountains = mountains;
    this.buildTerrain(mountains);
    this.buildHouses(houses);
    this.buildCaves(caves);
    this.buildMilitaryFacilities(facilities);
    this.buildVegetation(vegetation, mountains);
    this.buildRocks(rocks, mountains);

    if (warStructures && warStructures.length > 0) {
      this.buildWarStructures(warStructures);
    }
    if (barrels && barrels.length > 0) {
      this.buildBarrels(barrels);
    }

    this.buildTacticalProps();
  }

  /**
   * Projects 3D world position to 2D screen coordinates
   */
  public toScreenXY(worldX: number, worldY: number, heightAboveGround: number = 18): { x: number; y: number; inFront: boolean } {
    const groundH = getTerrainHeight(worldX, worldY, this.mountains);
    const vec = new THREE.Vector3(worldX, groundH + heightAboveGround, worldY);
    vec.project(this.camera);
    const inFront = vec.z < 1;
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    const screenX = (vec.x * 0.5 + 0.5) * width;
    const screenY = (-vec.y * 0.5 + 0.5) * height;
    return { x: screenX, y: screenY, inFront };
  }

  /**
   * Builds the 3D Terrain Plane with heights, hills, and vertex colors
   */
  private buildTerrain(mountains: Mountain3D[]) {
    const segments = 100;
    const geo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const worldX = pos.getX(i) + this.arenaSize / 2;
      const worldZ = pos.getZ(i) + this.arenaSize / 2;
      const h = getTerrainHeight(worldX, worldZ, mountains);
      pos.setY(i, h);

      if (h > 45) {
        colors[i * 3] = 0.5;
        colors[i * 3 + 1] = 0.55;
        colors[i * 3 + 2] = 0.62;
      } else if (h > 20) {
        colors[i * 3] = 0.28;
        colors[i * 3 + 1] = 0.35;
        colors[i * 3 + 2] = 0.42;
      } else {
        colors[i * 3] = 0.12;
        colors[i * 3 + 1] = 0.18;
        colors[i * 3 + 2] = 0.24;
      }
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.12,
      flatShading: true,
    });

    this.terrainMesh = new THREE.Mesh(geo, terrainMat);
    this.terrainMesh.position.set(this.arenaSize / 2, 0, this.arenaSize / 2);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);
  }

  /**
   * Builds real 3D Abandoned Houses with tactical cutaway walls, windows, and interior cover
   */
  private buildHouses(houses: House3D[]) {
    for (const h of houses) {
      const houseGroup = new THREE.Group();
      houseGroup.position.set(h.x, getTerrainHeight(h.x, h.y, this.mountains), h.y);
      houseGroup.rotation.y = h.rotation;

      const halfW = h.width / 2;
      const halfD = h.depth / 2;
      const wallThickness = 3;
      // Proportional tactical walls: North wall ~18, South parapet ~10 so interior is clearly visible in 2.5D
      const wallH = 18;
      const southParapetH = 10;

      // Floor slab with weathered concrete
      const floorGeo = new THREE.BoxGeometry(h.width, 1.5, h.depth);
      const floorMat = new THREE.MeshStandardMaterial({ color: 0x273549, roughness: 0.85 });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.y = 0.75;
      floorMesh.receiveShadow = true;
      houseGroup.add(floorMesh);

      // North Wall with window cutout
      const windowW = 12;
      const northSideW = (h.width - windowW) / 2;
      const northL = new THREE.Mesh(new THREE.BoxGeometry(northSideW, wallH, wallThickness), this.materials.concreteWall);
      northL.position.set(-halfW + northSideW / 2, wallH / 2, -halfD);
      northL.castShadow = true;
      northL.receiveShadow = true;
      const northR = new THREE.Mesh(new THREE.BoxGeometry(northSideW, wallH, wallThickness), this.materials.concreteWall);
      northR.position.set(halfW - northSideW / 2, wallH / 2, -halfD);
      northR.castShadow = true;
      northR.receiveShadow = true;
      // Sill under window
      const northSill = new THREE.Mesh(new THREE.BoxGeometry(windowW, 6, wallThickness), this.materials.concreteWall);
      northSill.position.set(0, 3, -halfD);
      northSill.castShadow = true;
      northSill.receiveShadow = true;
      houseGroup.add(northL, northR, northSill);

      // East Wall
      const eastWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallH, h.depth), this.materials.concreteWall);
      eastWall.position.set(halfW, wallH / 2, 0);
      eastWall.castShadow = true;
      eastWall.receiveShadow = true;
      houseGroup.add(eastWall);

      // West Wall
      const westWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallH, h.depth), this.materials.concreteWall);
      westWall.position.set(-halfW, wallH / 2, 0);
      westWall.castShadow = true;
      westWall.receiveShadow = true;
      houseGroup.add(westWall);

      // South Wall with doorway (low cutaway parapet so interior action is 100% visible)
      const doorW = h.doorWidth || 16;
      const sideW = (h.width - doorW) / 2;
      const southL = new THREE.Mesh(new THREE.BoxGeometry(sideW, southParapetH, wallThickness), this.materials.concreteWall);
      southL.position.set(-halfW + sideW / 2, southParapetH / 2, halfD);
      southL.castShadow = true;
      southL.receiveShadow = true;
      houseGroup.add(southL);

      const southR = new THREE.Mesh(new THREE.BoxGeometry(sideW, southParapetH, wallThickness), this.materials.concreteWall);
      southR.position.set(halfW - sideW / 2, southParapetH / 2, halfD);
      southR.castShadow = true;
      southR.receiveShadow = true;
      houseGroup.add(southR);

      // Interior tactical supply pallet
      const intProp = Environment3DFactory.createSupplyPallet();
      intProp.scale.set(0.65, 0.65, 0.65);
      intProp.position.set(0, 1.5, 0);
      houseGroup.add(intProp);

      this.structuresGroup.add(houseGroup);
    }
  }

  /**
   * Builds 3D Cave Entrances & Glowing Bio-Crystals
   */
  private buildCaves(caves: Cave3D[]) {
    for (const c of caves) {
      const caveGroup = new THREE.Group();
      const h = getTerrainHeight(c.entranceX, c.entranceY, this.mountains);
      caveGroup.position.set(c.entranceX, h, c.entranceY);

      const archGeo = new THREE.TorusGeometry(c.radius, 12, 10, 16, Math.PI);
      const arch = new THREE.Mesh(archGeo, this.materials.concreteWall);
      arch.position.y = 8;
      arch.castShadow = true;
      caveGroup.add(arch);

      const crystalMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      for (let i = 0; i < 4; i++) {
        const cMesh = new THREE.Mesh(new THREE.ConeGeometry(2.5, 9, 5), crystalMat);
        const ang = (i / 4) * Math.PI - Math.PI / 2;
        cMesh.position.set(Math.cos(ang) * (c.radius - 8), 4, Math.sin(ang) * 12);
        cMesh.rotation.z = (Math.random() - 0.5) * 0.4;
        caveGroup.add(cMesh);
      }

      this.structuresGroup.add(caveGroup);
    }
  }

  /**
   * Builds High-Tech Military Installations, Generators & Radar Towers
   */
  private buildMilitaryFacilities(facilities: MilitaryFacility3D[]) {
    for (const fac of facilities) {
      const facGroup = new THREE.Group();
      const h = getTerrainHeight(fac.x, fac.y, this.mountains);
      facGroup.position.set(fac.x, h, fac.y);

      const bunker = new THREE.Mesh(
        new THREE.BoxGeometry(fac.width, fac.height, fac.depth),
        this.materials.metalMilitary
      );
      bunker.position.y = fac.height / 2;
      bunker.castShadow = true;
      bunker.receiveShadow = true;
      facGroup.add(bunker);

      if (fac.hasAntenna) {
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 35, 8), this.materials.metalRust);
        mast.position.set(0, fac.height + 17.5, 0);
        mast.castShadow = true;
        facGroup.add(mast);

        const dish = new THREE.Mesh(new THREE.SphereGeometry(18, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), this.materials.metalMilitary);
        dish.position.set(0, fac.height + 35, 0);
        dish.rotation.x = Math.PI * 0.3;
        dish.castShadow = true;
        facGroup.add(dish);
        this.radarDishes.push(dish);
      }

      const emergLight = new THREE.PointLight(0xef4444, 2.5, 120);
      emergLight.position.set(0, fac.height + 5, 0);
      facGroup.add(emergLight);
      this.emergencyLights.push(emergLight);

      this.structuresGroup.add(facGroup);
    }
  }

  /**
   * Builds War Structures: Abandoned Military Vehicles, Sandbag Bunkers, Wall Breaches
   */
  private buildWarStructures(structures: WarStructure[]) {
    this.warStructuresGroup.clear();
    for (const s of structures) {
      const gh = getTerrainHeight(s.x, s.y, this.mountains);
      let meshGroup: THREE.Group | null = null;

      if (s.type === 'military_truck') {
        meshGroup = Environment3DFactory.createAbandonedVehicle(s.rotation || 0);
        meshGroup.position.set(s.x, gh, s.y);
      } else if (s.type === 'sandbag_bunker') {
        meshGroup = Environment3DFactory.createSandbagBunker(s.w || 36, s.h || 24, 12);
        meshGroup.position.set(s.x, gh, s.y);
        meshGroup.rotation.y = s.rotation || 0;
      } else if (s.type === 'broken_wall' || s.type === 'ruined_house') {
        meshGroup = Environment3DFactory.createRuinedWallBreach(s.w || 32, 16);
        meshGroup.position.set(s.x, gh, s.y);
        meshGroup.rotation.y = s.rotation || 0;
      }

      if (meshGroup) {
        this.warStructuresGroup.add(meshGroup);
      }
    }
  }

  /**
   * Builds Explosive & Toxic Barrels throughout the world
   */
  private buildBarrels(barrels: Barrel[]) {
    this.barrelsGroup.clear();
    for (const b of barrels) {
      const gh = getTerrainHeight(b.x, b.y, this.mountains);
      const bGroup = Environment3DFactory.createBarrel(b.type);
      bGroup.position.set(b.x, gh, b.y);
      this.barrelsGroup.add(bGroup);
    }
  }

  /**
   * Spawns extra tactical scenery: Roads, Jersey Barriers, Pallets, Watchtowers, Containers & Lighting
   */
  private buildTacticalProps() {
    // 1. Tactical Asphalt Road Network connecting sectors
    const roadConfigs = [
      // North-South Central Highway
      { x: 1200, z: 900, rot: 0, length: 120, width: 34 },
      { x: 1200, z: 1200, rot: 0, length: 120, width: 34 },
      { x: 1200, z: 1500, rot: 0, length: 120, width: 34 },
      // East-West Supply Road
      { x: 900, z: 1200, rot: Math.PI / 2, length: 120, width: 30 },
      { x: 1500, z: 1200, rot: Math.PI / 2, length: 120, width: 30 },
      // Outpost Connection Road
      { x: 600, z: 750, rot: Math.PI * 0.25, length: 100, width: 26 },
      { x: 1800, z: 1600, rot: -Math.PI * 0.25, length: 100, width: 26 },
    ];

    for (const rc of roadConfigs) {
      const gh = getTerrainHeight(rc.x, rc.z, this.mountains);
      const road = Environment3DFactory.createRoadSegment(rc.width, rc.length, true);
      road.position.set(rc.x, gh + 0.15, rc.z);
      road.rotation.y = rc.rot;
      this.structuresGroup.add(road);
    }

    // 2. Concrete Jersey Highway Barriers along road lanes (Authentic waist-high cover)
    const barrierSpawns = [
      [1180, 850, 0],
      [1220, 850, 0],
      [1180, 1150, 0],
      [1220, 1150, 0],
      [950, 1180, Math.PI / 2],
      [950, 1220, Math.PI / 2],
      [1450, 1180, Math.PI / 2],
      [1450, 1220, Math.PI / 2],
      [680, 520, 0.4],
      [2150, 800, -0.3],
    ];
    for (const [bx, bz, brot] of barrierSpawns) {
      const gh = getTerrainHeight(bx, bz, this.mountains);
      const barrier = Environment3DFactory.createJerseyBarrier(22);
      barrier.position.set(bx, gh, bz);
      barrier.rotation.y = brot;
      this.structuresGroup.add(barrier);
    }

    // 3. Supply Pallet Stacks around supply yards & ruins
    const palletSpawns = [
      [540, 790, 0.1],
      [780, 1460, 0.4],
      [2160, 1630, -0.2],
      [1350, 950, 0.6],
      [1050, 1400, 0],
      [1650, 1300, 0.5],
    ];
    for (const [px, pz, prot] of palletSpawns) {
      const gh = getTerrainHeight(px, pz, this.mountains);
      const pallet = Environment3DFactory.createSupplyPallet();
      pallet.position.set(px, gh, pz);
      pallet.rotation.y = prot;
      this.structuresGroup.add(pallet);
    }

    // 4. Industrial Street Lamps / Floodlight Poles at intersections
    const lampSpawns = [
      [1175, 920],
      [1225, 1180],
      [920, 1175],
      [1480, 1225],
      [620, 480],
      [2180, 720],
    ];
    for (const [lx, lz] of lampSpawns) {
      const gh = getTerrainHeight(lx, lz, this.mountains);
      const lamp = Environment3DFactory.createIndustrialLightPole();
      lamp.position.set(lx, gh, lz);
      this.structuresGroup.add(lamp);
    }

    // 5. Military Warning & Checkpoint Signs
    const signSpawns = [
      [1200, 780, 0],
      [1200, 1620, Math.PI],
      [780, 1200, -Math.PI / 2],
      [1620, 1200, Math.PI / 2],
    ];
    for (const [sx, sz, srot] of signSpawns) {
      const gh = getTerrainHeight(sx, sz, this.mountains);
      const sign = Environment3DFactory.createWarningSign();
      sign.position.set(sx, gh, sz);
      sign.rotation.y = srot;
      this.structuresGroup.add(sign);
    }

    // 6. Industrial Watchtowers at vantage points
    const towerCoords = [
      [650, 450],
      [1450, 1100],
      [2200, 750],
      [1800, 2100],
    ];
    for (const [tx, tz] of towerCoords) {
      const gh = getTerrainHeight(tx, tz, this.mountains);
      const tower = Environment3DFactory.createWatchtower();
      tower.position.set(tx, gh, tz);
      this.structuresGroup.add(tower);
    }

    // 7. Shipping Containers in supply yards
    const containerColors = [0x1e3a5f, 0x15803d, 0xb91c1c, 0xd97706];
    const containerSpawns = [
      [500, 750, 0],
      [530, 750, 0],
      [800, 1400, Math.PI / 2],
      [800, 1435, Math.PI / 2],
      [2100, 1600, 0.4],
      [2135, 1600, 0.4],
    ];
    for (let i = 0; i < containerSpawns.length; i++) {
      const [cx, cz, crot] = containerSpawns[i];
      const gh = getTerrainHeight(cx, cz, this.mountains);
      const cColor = containerColors[i % containerColors.length];
      const container = Environment3DFactory.createShippingContainer(cColor, 46, 20, 18);
      container.position.set(cx, gh, cz);
      container.rotation.y = crot;
      this.structuresGroup.add(container);
    }

    // 8. Clustered grass tufts
    for (let g = 0; g < 40; g++) {
      const gx = 300 + (g * 63) % (this.arenaSize - 600);
      const gz = 300 + (g * 79) % (this.arenaSize - 600);
      const gh = getTerrainHeight(gx, gz, this.mountains);
      const grass = Environment3DFactory.createGrassClump();
      grass.position.set(gx, gh, gz);
      this.structuresGroup.add(grass);
    }
  }

  /**
   * Builds 3D Trees & Bushes
   */
  private buildVegetation(vegetation: Vegetation3D[], mountains: Mountain3D[]) {
    for (const veg of vegetation) {
      const groundH = getTerrainHeight(veg.x, veg.y, mountains);
      const group = new THREE.Group();
      group.position.set(veg.x, groundH, veg.y);
      group.scale.setScalar(veg.scale);
      group.rotation.y = veg.rotation;

      if (veg.type === 'tree') {
        const trunkGeo = new THREE.CylinderGeometry(1.8, 2.8, 18, 7);
        const trunk = new THREE.Mesh(trunkGeo, this.materials.treeTrunk);
        trunk.position.y = 9;
        trunk.castShadow = true;
        group.add(trunk);

        const tier1 = new THREE.Mesh(new THREE.ConeGeometry(12, 16, 7), this.materials.foliage);
        tier1.position.y = 20;
        tier1.castShadow = true;
        group.add(tier1);

        const tier2 = new THREE.Mesh(new THREE.ConeGeometry(9, 14, 7), this.materials.foliage);
        tier2.position.y = 28;
        tier2.castShadow = true;
        group.add(tier2);
      } else {
        const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(6, 1), this.materials.foliage);
        bush.position.y = 4;
        bush.scale.set(1.2, 0.8, 1.2);
        bush.castShadow = true;
        group.add(bush);
      }

      this.structuresGroup.add(group);
    }
  }

  /**
   * Builds 3D Jagged Rocks & Boulders
   */
  private buildRocks(rocks: Rock3D[], mountains: Mountain3D[]) {
    for (const r of rocks) {
      const groundH = getTerrainHeight(r.x, r.y, mountains);
      const rockGeo = new THREE.DodecahedronGeometry(r.radius, 1);
      const rockMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true,
      });
      const rockMesh = new THREE.Mesh(rockGeo, rockMat);
      rockMesh.position.set(r.x, groundH + r.radius * 0.7, r.y);
      rockMesh.rotation.set(r.rotation, r.rotation * 0.7, r.rotation * 1.3);
      rockMesh.scale.set(1.1, 0.75, 1.2);
      rockMesh.castShadow = true;
      rockMesh.receiveShadow = true;
      this.structuresGroup.add(rockMesh);
    }
  }

  /**
   * Main Render Loop with Pure 2.5D Mobile Tactical Camera & Zero-Allocation Updates
   */
  public render(
    dt: number,
    player: Player,
    enemies: Enemy[],
    extraction: ExtractionZone,
    crates: Crate[],
    healthStations: HealthStation[],
    healthPickups: HealthPickup[],
    glooWalls: GlooWall[],
    bullets: Bullet[],
    particles: Particle[],
    mountains: Mountain3D[],
    screenShake: number = 0
  ) {
    const time = this.animClock.getElapsedTime();

    // 0. Auto-Regulating Performance Profiler
    this.frameCount++;
    this.frameTimeAccumulator += dt;
    if (this.timeQualityCheck(time)) {
      this.evaluatePerformanceQuality();
    }

    // 1. Update Player 3D Character
    const groundH = getTerrainHeight(player.x, player.y, mountains);
    this.playerGroup.position.set(player.x, groundH, player.y);
    this.playerGroup.rotation.y = -player.angle + Math.PI / 2;

    if (this.tacticalCharacter) {
      this.tacticalCharacter.animate(
        dt,
        player.vx,
        player.vy,
        player.isRolling,
        !!player.isCrouching,
        player.shotTimer > 0,
        0,
        player.isReloading,
        player.damageFlash
      );

      // Weapon fire feedback: Muzzle flash, recoil & shell casings
      if (player.shotTimer > 0) {
        this.tacticalCharacter.triggerMuzzleFlash();
        this.cameraRecoilKick = 2.5;

        if (this.lastShotTimer === 0) {
          this.playerMuzzleLight.intensity = 3.5;
          this.playerMuzzleLight.position.set(
            player.x + Math.cos(player.angle) * 16,
            groundH + 16,
            player.y + Math.sin(player.angle) * 16
          );

          // Eject physical brass shell casing in 3D
          this.vfx.spawnShellCasing(player.x, groundH + 14, player.y, player.angle);
        }
      } else {
        this.playerMuzzleLight.intensity = Math.max(0, this.playerMuzzleLight.intensity - dt * 25);
        this.cameraRecoilKick = Math.max(0, this.cameraRecoilKick - dt * 15);
      }
      this.lastShotTimer = player.shotTimer;

      this.updateWeaponModel(player.currentWeapon);
    }

    // 2. Update Tactical Ground Circle (Green >= 50% HP, Red < 50% HP)
    this.tacticalRingMesh.position.set(player.x, groundH + 0.8, player.y);
    const hpRatio = player.health / player.maxHealth;
    this.tacticalRingMesh.material = hpRatio >= 0.5 ? this.materials.tacticalRingGreen : this.materials.tacticalRingRed;
    this.tacticalRingMesh.rotation.z = time * 1.5;
    const pulseScale = 1.0 + Math.sin(time * 6) * 0.08;
    this.tacticalRingMesh.scale.set(pulseScale, pulseScale, 1);

    // 3. 2.5D Mobile Tactical Camera (Elevated, significantly zoomed-out isometric perspective)
    // Zoom Presets: 'wide' (Default - broad tactical battlefield overview), 'standard', 'close'
    const zoomFactors: Record<string, { elevation: number; distZ: number; fov: number; lead: number }> = {
      wide: { elevation: 350, distZ: 260, fov: 56, lead: 42 },
      standard: { elevation: 300, distZ: 220, fov: 53, lead: 38 },
      close: { elevation: 250, distZ: 180, fov: 49, lead: 32 },
    };
    const currentPreset = zoomFactors[this.zoomPreset] || zoomFactors.wide;

    const isAiming = player.isAimingMode;
    const adsElevationBonus = isAiming ? -35 : 0;
    const adsDistBonus = isAiming ? -25 : 0;
    const adsFovBonus = isAiming ? -5 : 0;

    const targetFov = currentPreset.fov + adsFovBonus;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, dt * 6.5);
      this.camera.updateProjectionMatrix();
    }

    // Lead camera smoothly towards aiming/movement direction for superior tactical anticipation
    const leadDist = isAiming ? currentPreset.lead * 1.35 : currentPreset.lead;
    const leadX = Math.cos(player.angle) * leadDist;
    const leadZ = Math.sin(player.angle) * leadDist;

    // Camera recoil kickback + screen shake
    const recoilZ = this.cameraRecoilKick * 0.7;
    const shakeX = (Math.random() - 0.5) * screenShake * 1.8;
    const shakeY = (Math.random() - 0.5) * screenShake * 1.8;

    // Elevated 2.5D isometric position (Looking down from South to North at ~53° pitch)
    const camElevation = currentPreset.elevation + adsElevationBonus;
    const camDistZ = currentPreset.distZ + adsDistBonus + recoilZ;

    const targetX = THREE.MathUtils.clamp(player.x + leadX, 90, this.arenaSize - 90);
    const targetZ = THREE.MathUtils.clamp(player.y + leadZ, 90, this.arenaSize - 90);

    const desiredCamX = targetX + shakeX;
    const desiredCamY = Math.max(groundH + 75, groundH + camElevation + shakeY);
    const desiredCamZ = targetZ + camDistZ;

    this.camCurrentPos.lerp(new THREE.Vector3(desiredCamX, desiredCamY, desiredCamZ), dt * 8.0);
    this.camera.position.copy(this.camCurrentPos);

    const lookTarget = new THREE.Vector3(targetX, groundH + 10, targetZ);
    this.camCurrentTarget.lerp(lookTarget, dt * 9.0);
    this.camera.lookAt(this.camCurrentTarget);

    // Directional light tracks player with smooth broad coverage
    this.dirLight.position.set(player.x + 180, groundH + 480, player.y + 240);
    this.dirLight.target.position.set(player.x, groundH, player.y);
    this.dirLight.target.updateMatrixWorld();

    // 4. Update Foreground Parallax Atmosphere
    if (this.foregroundMotesMesh) {
      this.foregroundMotesMesh.position.set(this.camera.position.x, this.camera.position.y - 10, this.camera.position.z - 60);
      this.foregroundMotesMesh.rotation.y = time * 0.05;
    }

    // 5. Update Enemies 3D with Hit Flashes & Distinct Silhouettes
    const aliveEnemyIds = new Set(enemies.filter((e) => e.state !== 'dead').map((e) => e.id));
    this.enemyMeshes.forEach((mesh, id) => {
      if (!aliveEnemyIds.has(id)) {
        this.scene.remove(mesh);
        this.enemyMeshes.delete(id);
      }
    });

    for (const enemy of enemies) {
      if (enemy.state === 'dead') continue;
      let eMesh = this.enemyMeshes.get(enemy.id);
      if (!eMesh) {
        eMesh = RobotModelFactory.createRobotModel(enemy);
        this.scene.add(eMesh);
        this.enemyMeshes.set(enemy.id, eMesh);
      }

      const eGroundH = getTerrainHeight(enemy.x, enemy.y, mountains);
      const isAerial = enemy.type === 'scout_drone' || enemy.type === 'combat_drone' || enemy.type === 'drone';
      const hoverY = isAerial ? eGroundH + 20 + Math.sin(time * 3 + enemy.id) * 2.5 : eGroundH;

      eMesh.position.set(enemy.x, hoverY, enemy.y);
      eMesh.rotation.y = -enemy.angle + Math.PI / 2;

      // Hit damage flash effect
      if (enemy.damageFlash && enemy.damageFlash > 0) {
        eMesh.scale.set(1.15, 1.15, 1.15);
      } else {
        eMesh.scale.set(1, 1, 1);
      }
    }

    // 6. Update Gloo Walls 3D
    this.glooWallsGroup.clear();
    for (const gw of glooWalls) {
      const gwGroundH = getTerrainHeight(gw.x, gw.y, mountains);
      const gwGeo = new THREE.BoxGeometry(gw.width, 24, 6);
      const gwMesh = new THREE.Mesh(gwGeo, this.materials.glooWall);
      gwMesh.position.set(gw.x, gwGroundH + 12, gw.y);
      gwMesh.rotation.y = gw.angle;
      gwMesh.castShadow = true;
      gwMesh.receiveShadow = true;
      this.glooWallsGroup.add(gwMesh);
    }

    // 7. Update 3D In-World Supply Crates (Cached, No Geometry Recreation)
    this.updateCachedCrates(crates, mountains, time);

    // 8. Update 3D In-World Health Pickups (Cached)
    this.updateCachedPickups(healthPickups, mountains, time);

    // 9. Update Extraction Zone 3D
    this.updateExtractionZone(extraction, mountains);

    // 10. Update Bullets 3D (Using pre-allocated pool)
    this.updatePooledBullets(bullets, mountains);

    // 11. Update 3D Tactical VFX (Casings, sparks, smoke, explosions)
    this.vfx.update(dt, (x, z) => getTerrainHeight(x, z, this.mountains));

    // 12. Rotate Emergency Warning Lights & Military Radar Dishes
    for (const el of this.emergencyLights) {
      el.intensity = 1.5 + Math.sin(time * 5) * 1.5;
    }
    for (const rd of this.radarDishes) {
      rd.rotation.y = time * 0.45;
    }

    // 13. Render 2.5D Scene
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Cached Crates: only creates 3D meshes once per crate ID
   */
  private updateCachedCrates(crates: Crate[], mountains: Mountain3D[], time: number) {
    const activeIds = new Set<number>();

    for (const crate of crates) {
      activeIds.add(crate.id);
      let cGroup = this.crateMeshes.get(crate.id);

      if (!cGroup) {
        const crateGroundH = getTerrainHeight(crate.x, crate.y, mountains);
        cGroup = new THREE.Group();
        cGroup.position.set(crate.x, crateGroundH, crate.y);

        const cColor = crate.type === 'military' ? 0x059669 : crate.type === 'safe' ? 0x0284c7 : 0xd97706;
        const bodyMat = new THREE.MeshStandardMaterial({
          color: cColor,
          roughness: 0.5,
          metalness: 0.6,
        });
        const crateBody = new THREE.Mesh(new THREE.BoxGeometry(crate.width, 16, crate.height), bodyMat);
        crateBody.position.y = 8;
        crateBody.castShadow = true;
        cGroup.add(crateBody);

        const bumperMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.8 });
        const rim = new THREE.Mesh(new THREE.BoxGeometry(crate.width + 1.2, 3, crate.height + 1.2), bumperMat);
        rim.position.y = 15;
        cGroup.add(rim);

        // Holographic beacon
        const beaconGeo = new THREE.CylinderGeometry(0.8, 1.6, 110, 8);
        const beaconMat = new THREE.MeshBasicMaterial({
          color: cColor,
          transparent: true,
          opacity: 0.35,
          blending: THREE.AdditiveBlending,
        });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.name = 'beacon';
        beacon.position.y = 65;
        cGroup.add(beacon);

        this.cratesGroup.add(cGroup);
        this.crateMeshes.set(crate.id, cGroup);
      }

      // If opened, hide beacon and dim
      cGroup.visible = !crate.isOpened;
    }

    // Cleanup obsolete crates
    this.crateMeshes.forEach((group, id) => {
      if (!activeIds.has(id)) {
        this.cratesGroup.remove(group);
        this.crateMeshes.delete(id);
      }
    });
  }

  /**
   * Cached Pickups: only creates 3D meshes once per pickup ID
   */
  private updateCachedPickups(healthPickups: HealthPickup[], mountains: Mountain3D[], time: number) {
    const activeIds = new Set<number>();

    for (const hp of healthPickups) {
      activeIds.add(hp.id);
      let pGroup = this.pickupMeshes.get(hp.id);

      if (!pGroup) {
        pGroup = Environment3DFactory.createLootItemMesh(hp.type);
        this.healthPickupsGroup.add(pGroup);
        this.pickupMeshes.set(hp.id, pGroup);
      }

      if (hp.collected) {
        pGroup.visible = false;
      } else {
        pGroup.visible = true;
        const hpGroundH = getTerrainHeight(hp.x, hp.y, mountains);
        pGroup.position.set(hp.x, hpGroundH + 4 + Math.sin(time * 4 + hp.id) * 1.5, hp.y);
        pGroup.rotation.y = time * 1.8;
      }
    }

    this.pickupMeshes.forEach((group, id) => {
      if (!activeIds.has(id)) {
        this.healthPickupsGroup.remove(group);
        this.pickupMeshes.delete(id);
      }
    });
  }

  /**
   * Updates extraction pad & beam without per-frame geometry recreation
   */
  private updateExtractionZone(extraction: ExtractionZone, mountains: Mountain3D[]) {
    const extGroundH = getTerrainHeight(extraction.x, extraction.y, mountains);

    if (!this.extractionPadMesh) {
      const padGeo = new THREE.CylinderGeometry(extraction.radius, extraction.radius, 2, 24);
      const padMat = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        emissive: 0x0f172a,
        emissiveIntensity: 0.4,
      });
      this.extractionPadMesh = new THREE.Mesh(padGeo, padMat);
      this.extractionGroup.add(this.extractionPadMesh);

      const beamGeo = new THREE.CylinderGeometry(4, 4, 320, 12);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.6 });
      this.extractionBeamMesh = new THREE.Mesh(beamGeo, beamMat);
      this.extractionGroup.add(this.extractionBeamMesh);
    }

    this.extractionPadMesh.position.set(extraction.x, extGroundH + 1, extraction.y);
    const padMat = this.extractionPadMesh.material as THREE.MeshStandardMaterial;
    if (padMat) {
      padMat.color.setHex(extraction.isActive ? 0x10b981 : 0x64748b);
      padMat.emissive.setHex(extraction.isActive ? 0x059669 : 0x0f172a);
    }

    if (this.extractionBeamMesh) {
      this.extractionBeamMesh.visible = extraction.isActive;
      this.extractionBeamMesh.position.set(extraction.x, extGroundH + 160, extraction.y);
    }
  }

  /**
   * Updates pooled bullets with zero garbage collection allocations
   */
  private updatePooledBullets(bullets: Bullet[], mountains: Mountain3D[]) {
    const totalBullets = Math.min(bullets.length, this.MAX_POOLED_BULLETS);

    for (let i = 0; i < this.MAX_POOLED_BULLETS; i++) {
      const mesh = this.bulletPool[i];
      if (i < totalBullets) {
        const b = bullets[i];
        const bGroundH = getTerrainHeight(b.x, b.y, mountains) + 16;
        mesh.visible = true;
        mesh.position.set(b.x, bGroundH, b.y);
      } else {
        mesh.visible = false;
      }
    }
  }

  /**
   * Evaluates rolling performance to auto-adjust graphics on weaker hardware
   */
  private timeQualityCheck(time: number): boolean {
    if (time - this.lastQualityCheckTime > 2.5) {
      this.lastQualityCheckTime = time;
      return true;
    }
    return false;
  }

  private evaluatePerformanceQuality() {
    if (!this.autoQualityEnabled || this.frameCount < 30) return;
    const avgFps = this.frameCount / Math.max(0.1, this.frameTimeAccumulator);
    this.frameCount = 0;
    this.frameTimeAccumulator = 0;

    // If FPS drops below 40 FPS, automatically downscale to preserve fluid 60 FPS
    if (avgFps < 40) {
      if (this.currentQuality === 'ultra') {
        this.setGraphicsQuality('high');
      } else if (this.currentQuality === 'high') {
        this.setGraphicsQuality('medium');
      } else if (this.currentQuality === 'medium') {
        this.setGraphicsQuality('low');
      }
    }
  }

  /**
   * Resizes viewport maintaining correct aspect ratio
   */
  public resize(width: number, height: number) {
    this.camera.aspect = width / (height || 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }
}
