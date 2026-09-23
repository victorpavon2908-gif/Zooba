import * as THREE from 'three';

/**
 * TacticalVFX3D:
 * Ultra-high-performance 2.5D Mobile Particle & VFX Engine with zero-allocation object pooling.
 * Pre-allocates all meshes upfront so no garbage collection pauses occur during intensive firefights.
 */

interface PooledCasing {
  mesh: THREE.Mesh;
  active: boolean;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  life: number;
  maxLife: number;
}

interface PooledSpark {
  mesh: THREE.Mesh;
  active: boolean;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  isBlood: boolean;
}

interface PooledSmoke {
  mesh: THREE.Mesh;
  active: boolean;
  vx: number;
  vy: number;
  vz: number;
  growth: number;
  life: number;
  maxLife: number;
}

interface PooledExplosion {
  fireball: THREE.Mesh;
  shockwave: THREE.Mesh;
  fireMat: THREE.MeshBasicMaterial;
  shockMat: THREE.MeshBasicMaterial;
  active: boolean;
  progress: number;
}

export class TacticalVFX3D {
  public group: THREE.Group = new THREE.Group();

  // Object Pools
  private casingPool: PooledCasing[] = [];
  private sparkPool: PooledSpark[] = [];
  private smokePool: PooledSmoke[] = [];
  private explosionPool: PooledExplosion[] = [];

  // Capacity Limits
  private readonly MAX_CASINGS = 30;
  private readonly MAX_SPARKS = 70;
  private readonly MAX_SMOKES = 35;
  private readonly MAX_EXPLOSIONS = 6;

  // Shared Geometries
  private casingGeo: THREE.CylinderGeometry;
  private sparkGeo: THREE.BoxGeometry;
  private smokeGeo: THREE.DodecahedronGeometry;
  private fireGeo: THREE.SphereGeometry;
  private ringGeo: THREE.RingGeometry;

  // Shared Materials
  private matBrass: THREE.MeshStandardMaterial;
  private matSpark: THREE.MeshBasicMaterial;
  private matBlood: THREE.MeshBasicMaterial;
  private matSmoke: THREE.MeshStandardMaterial;

  constructor() {
    this.casingGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.4, 6);
    this.casingGeo.rotateX(Math.PI / 2);

    this.sparkGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    this.smokeGeo = new THREE.DodecahedronGeometry(1.5, 0);
    this.fireGeo = new THREE.SphereGeometry(12, 8, 8);
    this.ringGeo = new THREE.RingGeometry(2, 6, 16);
    this.ringGeo.rotateX(-Math.PI / 2);

    this.matBrass = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.85,
    });

    this.matSpark = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });

    this.matBlood = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.9,
    });

    this.matSmoke = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      transparent: true,
      opacity: 0.45,
      roughness: 0.9,
    });

    this.initPools();
  }

  /**
   * Pre-instantiates all objects into memory once
   */
  private initPools() {
    // 1. Casings Pool
    for (let i = 0; i < this.MAX_CASINGS; i++) {
      const mesh = new THREE.Mesh(this.casingGeo, this.matBrass);
      mesh.visible = false;
      this.group.add(mesh);
      this.casingPool.push({
        mesh,
        active: false,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        life: 0,
        maxLife: 1.8,
      });
    }

    // 2. Sparks Pool
    for (let i = 0; i < this.MAX_SPARKS; i++) {
      const mesh = new THREE.Mesh(this.sparkGeo, this.matSpark);
      mesh.visible = false;
      this.group.add(mesh);
      this.sparkPool.push({
        mesh,
        active: false,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.4,
        isBlood: false,
      });
    }

    // 3. Smoke Pool
    for (let i = 0; i < this.MAX_SMOKES; i++) {
      const mat = this.matSmoke.clone();
      const mesh = new THREE.Mesh(this.smokeGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.smokePool.push({
        mesh,
        active: false,
        vx: 0,
        vy: 0,
        vz: 0,
        growth: 4,
        life: 0,
        maxLife: 0.6,
      });
    }

    // 4. Explosion Pool
    for (let i = 0; i < this.MAX_EXPLOSIONS; i++) {
      const fireMat = new THREE.MeshBasicMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      });
      const shockMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });

      const fireball = new THREE.Mesh(this.fireGeo, fireMat);
      const shockwave = new THREE.Mesh(this.ringGeo, shockMat);
      fireball.visible = false;
      shockwave.visible = false;
      this.group.add(fireball, shockwave);

      this.explosionPool.push({
        fireball,
        shockwave,
        fireMat,
        shockMat,
        active: false,
        progress: 0,
      });
    }
  }

  /**
   * Spawns an authentic ejected brass shell casing without creating new objects
   */
  public spawnShellCasing(x: number, y: number, z: number, playerAngle: number) {
    const casing = this.casingPool.find((c) => !c.active) || this.casingPool[0];
    casing.active = true;
    casing.mesh.visible = true;
    casing.mesh.position.set(x, y, z);

    const ejectAngle = playerAngle + Math.PI / 2 + (Math.random() - 0.5) * 0.35;
    const speed = 24 + Math.random() * 18;

    casing.vx = Math.cos(ejectAngle) * speed;
    casing.vy = 16 + Math.random() * 12;
    casing.vz = Math.sin(ejectAngle) * speed;
    casing.rx = (Math.random() - 0.5) * 16;
    casing.ry = (Math.random() - 0.5) * 16;
    casing.life = 0;
    casing.maxLife = 1.6 + Math.random() * 0.4;
  }

  /**
   * Spawns impact sparks or blood splatters using pre-allocated pool
   */
  public spawnImpactSparks(x: number, y: number, z: number, count: number = 6, isBlood: boolean = false) {
    let spawned = 0;
    for (const spark of this.sparkPool) {
      if (!spark.active) {
        spark.active = true;
        spark.mesh.visible = true;
        spark.mesh.material = isBlood ? this.matBlood : this.matSpark;
        spark.mesh.position.set(x, y, z);
        spark.isBlood = isBlood;

        const ang = Math.random() * Math.PI * 2;
        const elev = (Math.random() - 0.2) * Math.PI;
        const spd = 25 + Math.random() * 35;

        spark.vx = Math.cos(ang) * Math.cos(elev) * spd;
        spark.vy = Math.sin(elev) * spd + 8;
        spark.vz = Math.sin(ang) * Math.cos(elev) * spd;
        spark.life = 0;
        spark.maxLife = 0.3 + Math.random() * 0.2;

        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  /**
   * Spawns ground/wall dust puffs from pre-allocated pool
   */
  public spawnDustPuff(x: number, y: number, z: number, count: number = 3) {
    let spawned = 0;
    for (const smoke of this.smokePool) {
      if (!smoke.active) {
        smoke.active = true;
        smoke.mesh.visible = true;
        smoke.mesh.position.set(x + (Math.random() - 0.5) * 2, y, z + (Math.random() - 0.5) * 2);
        smoke.mesh.scale.set(1, 1, 1);

        smoke.vx = (Math.random() - 0.5) * 10;
        smoke.vy = 6 + Math.random() * 10;
        smoke.vz = (Math.random() - 0.5) * 10;
        smoke.growth = 3.5 + Math.random() * 2.5;
        smoke.life = 0;
        smoke.maxLife = 0.55 + Math.random() * 0.25;

        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  /**
   * Spawns high-impact explosion fireball and shockwave ring from pre-allocated pool
   */
  public spawnExplosion(x: number, y: number, z: number) {
    const exp = this.explosionPool.find((e) => !e.active) || this.explosionPool[0];
    exp.active = true;
    exp.progress = 0;
    exp.fireball.visible = true;
    exp.shockwave.visible = true;
    exp.fireball.position.set(x, y + 5, z);
    exp.shockwave.position.set(x, y + 0.8, z);
    exp.fireball.scale.set(1, 1, 1);
    exp.shockwave.scale.set(1, 1, 1);
    exp.fireMat.opacity = 0.95;
    exp.shockMat.opacity = 0.85;

    // Small burst of sparks & dust
    this.spawnImpactSparks(x, y + 5, z, 10, false);
    this.spawnDustPuff(x, y + 3, z, 6);
  }

  /**
   * Per-frame physics and lifetime update for active pooled items
   */
  public update(dt: number, groundHAt: (x: number, z: number) => number) {
    // 1. Update Casings
    for (const c of this.casingPool) {
      if (!c.active) continue;
      c.life += dt;
      c.vy -= 75 * dt;
      c.mesh.position.x += c.vx * dt;
      c.mesh.position.y += c.vy * dt;
      c.mesh.position.z += c.vz * dt;
      c.mesh.rotation.x += c.rx * dt;
      c.mesh.rotation.y += c.ry * dt;

      const gh = groundHAt(c.mesh.position.x, c.mesh.position.z) + 0.4;
      if (c.mesh.position.y <= gh) {
        c.mesh.position.y = gh;
        c.vy = -c.vy * 0.35;
        c.vx *= 0.65;
        c.vz *= 0.65;
      }

      if (c.life >= c.maxLife) {
        c.active = false;
        c.mesh.visible = false;
      }
    }

    // 2. Update Sparks
    for (const s of this.sparkPool) {
      if (!s.active) continue;
      s.life += dt;
      s.vy -= 85 * dt;
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += s.vy * dt;
      s.mesh.position.z += s.vz * dt;

      const frac = 1 - s.life / s.maxLife;
      s.mesh.scale.setScalar(Math.max(0.01, frac));

      if (s.life >= s.maxLife) {
        s.active = false;
        s.mesh.visible = false;
      }
    }

    // 3. Update Smokes
    for (const sm of this.smokePool) {
      if (!sm.active) continue;
      sm.life += dt;
      sm.mesh.position.x += sm.vx * dt;
      sm.mesh.position.y += sm.vy * dt;
      sm.mesh.position.z += sm.vz * dt;

      const progress = sm.life / sm.maxLife;
      const s = 1 + progress * sm.growth;
      sm.mesh.scale.set(s, s, s);

      const mat = sm.mesh.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.opacity = Math.max(0, 0.45 * (1 - progress));
      }

      if (sm.life >= sm.maxLife) {
        sm.active = false;
        sm.mesh.visible = false;
      }
    }

    // 4. Update Explosions
    for (const exp of this.explosionPool) {
      if (!exp.active) continue;
      exp.progress += dt * 2.8;
      const s = 1 + exp.progress * 4.5;
      exp.fireball.scale.set(s, s, s);
      exp.shockwave.scale.set(s * 2.2, s * 2.2, s * 2.2);

      exp.fireMat.opacity = Math.max(0, 0.95 - exp.progress * 2.2);
      exp.shockMat.opacity = Math.max(0, 0.85 - exp.progress * 2.0);

      if (exp.progress >= 0.45) {
        exp.active = false;
        exp.fireball.visible = false;
        exp.shockwave.visible = false;
      }
    }
  }

  /**
   * Resets all particles
   */
  public clear() {
    for (const c of this.casingPool) {
      c.active = false;
      c.mesh.visible = false;
    }
    for (const s of this.sparkPool) {
      s.active = false;
      s.mesh.visible = false;
    }
    for (const sm of this.smokePool) {
      sm.active = false;
      sm.mesh.visible = false;
    }
    for (const exp of this.explosionPool) {
      exp.active = false;
      exp.fireball.visible = false;
      exp.shockwave.visible = false;
    }
  }
}
