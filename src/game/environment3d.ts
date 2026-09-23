import * as THREE from 'three';
import { ProceduralTextureManager } from './proceduralTextures';
import { WarStructure, Barrel, House3D } from '../types';

/**
 * Environment3DFactory:
 * Generates realistic military tactical environment props, vehicles, ruined structures,
 * shipping containers, sandbag fortifications, barrels, watchtowers, and ground debris.
 */
export class Environment3DFactory {
  // Shared PBR Materials Cache for mobile performance
  private static materials = {
    corrugatedMetal: new THREE.MeshStandardMaterial({
      color: 0x1e3a5f,
      map: ProceduralTextureManager.getGunmetalArmor(),
      bumpMap: ProceduralTextureManager.getMetalBumpMap(),
      bumpScale: 0.05,
      roughness: 0.45,
      metalness: 0.7,
    }),
    oliveDrabMetal: new THREE.MeshStandardMaterial({
      color: 0x2e3b2b,
      map: ProceduralTextureManager.getGunmetalArmor(),
      bumpMap: ProceduralTextureManager.getMetalBumpMap(),
      bumpScale: 0.04,
      roughness: 0.5,
      metalness: 0.65,
    }),
    rustedSteel: new THREE.MeshStandardMaterial({
      color: 0x5c2c16,
      bumpMap: ProceduralTextureManager.getMetalBumpMap(),
      bumpScale: 0.07,
      roughness: 0.8,
      metalness: 0.4,
    }),
    weatheredConcrete: new THREE.MeshStandardMaterial({
      color: 0x64748b,
      map: ProceduralTextureManager.getWeatheredConcrete(),
      bumpMap: ProceduralTextureManager.getMetalBumpMap(),
      bumpScale: 0.03,
      roughness: 0.85,
      metalness: 0.15,
    }),
    brokenBrick: new THREE.MeshStandardMaterial({
      color: 0x7c2d12,
      map: ProceduralTextureManager.getMountainStrata(),
      roughness: 0.9,
      metalness: 0.05,
    }),
    sandbagBurlap: new THREE.MeshStandardMaterial({
      color: 0xa88455,
      map: ProceduralTextureManager.getTacticalFabric('#a88455', '#785533'),
      roughness: 0.95,
      metalness: 0.02,
    }),
    tireRubber: new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.9,
      metalness: 0.05,
    }),
    chassisDark: new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.8,
    }),
    barrelExplosiveRed: new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      bumpMap: ProceduralTextureManager.getMetalBumpMap(),
      bumpScale: 0.04,
      roughness: 0.4,
      metalness: 0.6,
    }),
    barrelToxicGreen: new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      emissive: 0x15803d,
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.5,
    }),
    hazardStripes: new THREE.MeshStandardMaterial({
      map: ProceduralTextureManager.getHazardStripes(),
      roughness: 0.4,
      metalness: 0.3,
    }),
    darkGlass: new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.5,
      transparent: true,
      opacity: 0.8,
    }),
    grassTuft: new THREE.MeshStandardMaterial({
      color: 0x166534,
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.DoubleSide,
    }),
    woodPlank: new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.85,
      metalness: 0.05,
    }),
    rebarSteel: new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.5,
      metalness: 0.85,
    }),
  };

  /**
   * Builds an abandoned, battle-damaged Military Armored Transport / Humvee
   */
  public static createAbandonedVehicle(rotation: number = 0): THREE.Group {
    const group = new THREE.Group();
    group.rotation.y = rotation;

    // 1. Lower chassis frame
    const chassisGeo = new THREE.BoxGeometry(22, 5, 42);
    const chassis = new THREE.Mesh(chassisGeo, this.materials.chassisDark);
    chassis.position.y = 8;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    group.add(chassis);

    // 2. Main armored cabin body (angled hood + cab)
    const cabGeo = new THREE.BoxGeometry(20, 11, 26);
    const cab = new THREE.Mesh(cabGeo, this.materials.oliveDrabMetal);
    cab.position.set(0, 15, -2);
    cab.castShadow = true;
    group.add(cab);

    // Front engine hood (sloped down)
    const hoodGeo = new THREE.BoxGeometry(19, 7, 16);
    const hood = new THREE.Mesh(hoodGeo, this.materials.oliveDrabMetal);
    hood.position.set(0, 12, 16);
    hood.castShadow = true;
    group.add(hood);

    // Front steel bull-bar / ram bumper
    const bumperGeo = new THREE.BoxGeometry(24, 6, 3);
    const bumper = new THREE.Mesh(bumperGeo, this.materials.rustedSteel);
    bumper.position.set(0, 8, 25);
    bumper.castShadow = true;
    group.add(bumper);

    // Radiator protective grille
    const grilleGeo = new THREE.BoxGeometry(14, 5, 1);
    const grille = new THREE.Mesh(grilleGeo, this.materials.hazardStripes);
    grille.position.set(0, 12, 24.5);
    group.add(grille);

    // Armored Windshield slits (dark glass)
    const glassL = new THREE.Mesh(new THREE.BoxGeometry(7.5, 3.5, 0.8), this.materials.darkGlass);
    glassL.position.set(-4.5, 17, 10.8);
    glassL.rotation.x = -Math.PI * 0.1;
    group.add(glassL);

    const glassR = new THREE.Mesh(new THREE.BoxGeometry(7.5, 3.5, 0.8), this.materials.darkGlass);
    glassR.position.set(4.5, 17, 10.8);
    glassR.rotation.x = -Math.PI * 0.1;
    group.add(glassR);

    // 3. Roof Gunner Ring / Hatch & Mounted Heavy Machine Gun
    const hatchRing = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 2, 12), this.materials.rustedSteel);
    hatchRing.position.set(0, 21.5, -4);
    group.add(hatchRing);

    // Heavy MG receiver & long barrel pointing out
    const mgBody = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 9), this.materials.chassisDark);
    mgBody.position.set(0, 23.5, -3);
    mgBody.rotation.x = -Math.PI * 0.05;
    const mgBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 12, 8), this.materials.chassisDark);
    mgBarrel.rotation.x = Math.PI / 2;
    mgBarrel.position.set(0, 23.5, 5);
    group.add(mgBody, mgBarrel);

    // Ammo can mounted to side of gun
    const ammoCan = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.2, 4), this.materials.oliveDrabMetal);
    ammoCan.position.set(-2.5, 23.5, -3);
    group.add(ammoCan);

    // 4. Heavy Off-Road Treaded Tires (4 wheels)
    const wheelGeo = new THREE.CylinderGeometry(5.2, 5.2, 4.8, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(2.8, 2.8, 5.0, 10);
    rimGeo.rotateZ(Math.PI / 2);

    const wheelOffsets = [
      [-11, 5.2, 14], // Front Left
      [11, 5.2, 14],  // Front Right
      [-11, 5.2, -14], // Rear Left
      [11, 5.2, -14],  // Rear Right
    ];

    for (let i = 0; i < wheelOffsets.length; i++) {
      const [wx, wy, wz] = wheelOffsets[i];
      const tire = new THREE.Mesh(wheelGeo, this.materials.tireRubber);
      tire.position.set(wx, wy, wz);
      tire.castShadow = true;
      group.add(tire);

      const rim = new THREE.Mesh(rimGeo, this.materials.rustedSteel);
      rim.position.set(wx, wy, wz);
      group.add(rim);
    }

    // Exhaust pipe
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 14, 8), this.materials.rustedSteel);
    exhaust.position.set(-10.5, 17, -15);
    group.add(exhaust);

    // Rear cargo tailgate
    const tailgate = new THREE.Mesh(new THREE.BoxGeometry(18, 8, 2), this.materials.oliveDrabMetal);
    tailgate.position.set(0, 12, -15);
    group.add(tailgate);

    return group;
  }

  /**
   * Builds a stack of Military Shipping Containers (20ft / 40ft) with corrugated ridges & hazard markings
   */
  public static createShippingContainer(color: number = 0x1e3a5f, length: number = 55, width: number = 24, height: number = 22): THREE.Group {
    const group = new THREE.Group();

    const containerMat = new THREE.MeshStandardMaterial({
      color: color,
      bumpMap: ProceduralTextureManager.getMetalBumpMap(),
      bumpScale: 0.05,
      roughness: 0.55,
      metalness: 0.6,
    });

    // Main box
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), containerMat);
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Corner vertical support pillars
    const pillarGeo = new THREE.BoxGeometry(2.5, height, 2.5);
    const cornerPositions = [
      [-width / 2 + 1, height / 2, -length / 2 + 1],
      [width / 2 - 1, height / 2, -length / 2 + 1],
      [-width / 2 + 1, height / 2, length / 2 - 1],
      [width / 2 - 1, height / 2, length / 2 - 1],
    ];
    for (const [px, py, pz] of cornerPositions) {
      const pillar = new THREE.Mesh(pillarGeo, this.materials.rustedSteel);
      pillar.position.set(px, py, pz);
      pillar.castShadow = true;
      group.add(pillar);
    }

    // Door locking bars on front side
    const barGeo = new THREE.CylinderGeometry(0.5, 0.5, height * 0.85, 6);
    const bar1 = new THREE.Mesh(barGeo, this.materials.rustedSteel);
    bar1.position.set(-3, height / 2, length / 2 + 0.6);
    const bar2 = new THREE.Mesh(barGeo, this.materials.rustedSteel);
    bar2.position.set(3, height / 2, length / 2 + 0.6);
    group.add(bar1, bar2);

    // Hazard stripe decal banner across door
    const stripeBanner = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.7, 4), this.materials.hazardStripes);
    stripeBanner.position.set(0, height * 0.55, length / 2 + 0.8);
    group.add(stripeBanner);

    return group;
  }

  /**
   * Builds an authentic Fortified Sandbag Bunker with interlocking stacked bags
   */
  public static createSandbagBunker(width: number = 40, depth: number = 28, height: number = 14): THREE.Group {
    const group = new THREE.Group();

    // Curved or U-shaped sandbag walls
    const bagGeo = new THREE.BoxGeometry(8, 3.2, 4);
    const rows = 4;

    // Front Wall
    for (let r = 0; r < rows; r++) {
      const y = r * 3.0 + 1.6;
      const count = Math.floor(width / 7.5);
      const xOffset = (r % 2 === 0) ? 0 : 3.8;
      for (let c = 0; c < count; c++) {
        // Leave a center firing slit on top row
        if (r === rows - 1 && Math.abs(c - count / 2) < 1.2) continue;

        const bag = new THREE.Mesh(bagGeo, this.materials.sandbagBurlap);
        bag.position.set(-width / 2 + c * 7.5 + xOffset, y, depth / 2);
        bag.rotation.y = (Math.random() - 0.5) * 0.1;
        bag.castShadow = true;
        bag.receiveShadow = true;
        group.add(bag);
      }
    }

    // Left Wing Wall
    for (let r = 0; r < rows; r++) {
      const y = r * 3.0 + 1.6;
      const count = Math.floor(depth / 7.5);
      for (let c = 0; c < count; c++) {
        const bag = new THREE.Mesh(bagGeo, this.materials.sandbagBurlap);
        bag.rotation.y = Math.PI / 2 + (Math.random() - 0.5) * 0.1;
        bag.position.set(-width / 2, y, depth / 2 - c * 7.5);
        bag.castShadow = true;
        group.add(bag);
      }
    }

    // Right Wing Wall
    for (let r = 0; r < rows; r++) {
      const y = r * 3.0 + 1.6;
      const count = Math.floor(depth / 7.5);
      for (let c = 0; c < count; c++) {
        const bag = new THREE.Mesh(bagGeo, this.materials.sandbagBurlap);
        bag.rotation.y = Math.PI / 2 + (Math.random() - 0.5) * 0.1;
        bag.position.set(width / 2, y, depth / 2 - c * 7.5);
        bag.castShadow = true;
        group.add(bag);
      }
    }

    // Ammo box resting inside bunker
    const ammoBox = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 4), this.materials.oliveDrabMetal);
    ammoBox.position.set(-8, 2, 0);
    ammoBox.castShadow = true;
    group.add(ammoBox);

    return group;
  }

  /**
   * Builds detailed 3D Explosive or Toxic Barrels with ribbed metal rings and decals
   */
  public static createBarrel(type: 'explosive' | 'toxic' | 'metal'): THREE.Group {
    const group = new THREE.Group();

    const mat =
      type === 'explosive'
        ? this.materials.barrelExplosiveRed
        : type === 'toxic'
        ? this.materials.barrelToxicGreen
        : this.materials.corrugatedMetal;

    // Main barrel cylinder
    const barrelGeo = new THREE.CylinderGeometry(4.5, 4.5, 14, 14);
    const drum = new THREE.Mesh(barrelGeo, mat);
    drum.position.y = 7;
    drum.castShadow = true;
    drum.receiveShadow = true;
    group.add(drum);

    // Reinforcing steel hoops (top, middle, bottom)
    const hoopGeo = new THREE.TorusGeometry(4.6, 0.45, 6, 14);
    hoopGeo.rotateX(Math.PI / 2);

    const hoopTop = new THREE.Mesh(hoopGeo, this.materials.rustedSteel);
    hoopTop.position.y = 11.5;
    const hoopMid = new THREE.Mesh(hoopGeo, this.materials.rustedSteel);
    hoopMid.position.y = 7;
    const hoopBot = new THREE.Mesh(hoopGeo, this.materials.rustedSteel);
    hoopBot.position.y = 2.5;
    group.add(hoopTop, hoopMid, hoopBot);

    // Hazard symbol band
    if (type === 'explosive' || type === 'toxic') {
      const bandGeo = new THREE.CylinderGeometry(4.55, 4.55, 3.2, 14, 1, true);
      const band = new THREE.Mesh(bandGeo, this.materials.hazardStripes);
      band.position.y = 7;
      group.add(band);
    }

    return group;
  }

  /**
   * Builds an Elevated Industrial Steel Watchtower with ladder and observation platform
   */
  public static createWatchtower(): THREE.Group {
    const group = new THREE.Group();
    const towerH = 45;
    const baseW = 22;
    const topW = 18;

    // 4 Corner structural legs (angled steel beams)
    const legGeo = new THREE.CylinderGeometry(1.2, 1.6, towerH, 6);
    const angles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];

    for (const ang of angles) {
      const leg = new THREE.Mesh(legGeo, this.materials.rustedSteel);
      const rad = baseW * 0.65;
      leg.position.set(Math.cos(ang) * rad, towerH / 2, Math.sin(ang) * rad);
      leg.castShadow = true;
      group.add(leg);
    }

    // Cross-bracing struts at 1/3 and 2/3 height
    const strutGeo = new THREE.BoxGeometry(baseW * 1.3, 1.2, 1.2);
    for (const hFrac of [0.33, 0.66]) {
      const strut1 = new THREE.Mesh(strutGeo, this.materials.rebarSteel);
      strut1.position.y = towerH * hFrac;
      const strut2 = new THREE.Mesh(strutGeo, this.materials.rebarSteel);
      strut2.position.y = towerH * hFrac;
      strut2.rotation.y = Math.PI / 2;
      group.add(strut1, strut2);
    }

    // Elevated wooden watchtower deck
    const deckGeo = new THREE.BoxGeometry(topW, 2.5, topW);
    const deck = new THREE.Mesh(deckGeo, this.materials.woodPlank);
    deck.position.y = towerH;
    deck.castShadow = true;
    deck.receiveShadow = true;
    group.add(deck);

    // Protective guard railings
    const railH = 5.5;
    const railGeoX = new THREE.BoxGeometry(topW, 1.2, 1.2);
    const railGeoZ = new THREE.BoxGeometry(1.2, 1.2, topW);

    const railN = new THREE.Mesh(railGeoX, this.materials.rebarSteel);
    railN.position.set(0, towerH + railH, -topW / 2);
    const railS = new THREE.Mesh(railGeoX, this.materials.rebarSteel);
    railS.position.set(0, towerH + railH, topW / 2);
    const railW = new THREE.Mesh(railGeoZ, this.materials.rebarSteel);
    railW.position.set(-topW / 2, towerH + railH, 0);
    const railE = new THREE.Mesh(railGeoZ, this.materials.rebarSteel);
    railE.position.set(topW / 2, towerH + railH, 0);
    group.add(railN, railS, railW, railE);

    // Rotating searchlight fixture on corner
    const spotlightFixture = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.5, 5), this.materials.corrugatedMetal);
    spotlightFixture.position.set(topW / 2 - 3, towerH + 4, topW / 2 - 3);
    const spotLens = new THREE.Mesh(new THREE.CircleGeometry(1.5, 10), new THREE.MeshBasicMaterial({ color: 0xfde047 }));
    spotLens.position.set(0, 0, 2.6);
    spotlightFixture.add(spotLens);
    group.add(spotlightFixture);

    return group;
  }

  /**
   * Builds Ruined Wall Breaches with jagged concrete edges, exposed twisted rebar and rubble piles
   */
  public static createRuinedWallBreach(w: number = 36, h: number = 20): THREE.Group {
    const group = new THREE.Group();

    // Left standing wall section
    const leftW = w * 0.4;
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(leftW, h, 4), this.materials.weatheredConcrete);
    wallL.position.set(-w / 2 + leftW / 2, h / 2, 0);
    wallL.castShadow = true;
    wallL.receiveShadow = true;
    group.add(wallL);

    // Right standing wall section
    const rightW = w * 0.35;
    const wallR = new THREE.Mesh(new THREE.BoxGeometry(rightW, h * 0.7, 4), this.materials.weatheredConcrete);
    wallR.position.set(w / 2 - rightW / 2, (h * 0.7) / 2, 0);
    wallR.castShadow = true;
    wallR.receiveShadow = true;
    group.add(wallR);

    // Exposed bent steel rebar rods extending from the breach
    const rebarGeo = new THREE.CylinderGeometry(0.35, 0.35, 8, 5);
    for (let i = 0; i < 3; i++) {
      const rebar = new THREE.Mesh(rebarGeo, this.materials.rebarSteel);
      rebar.position.set(-w / 2 + leftW + 2, 6 + i * 4, 0);
      rebar.rotation.z = Math.PI * 0.35 + (i - 1) * 0.2;
      group.add(rebar);
    }

    // Concrete rubble chunks on floor
    for (let r = 0; r < 5; r++) {
      const chunkGeo = new THREE.DodecahedronGeometry(2.5 + Math.random() * 2, 0);
      const chunk = new THREE.Mesh(chunkGeo, this.materials.brokenBrick);
      chunk.position.set((Math.random() - 0.5) * (w * 0.6), 1.5, (Math.random() - 0.5) * 8);
      chunk.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      chunk.castShadow = true;
      group.add(chunk);
    }

    return group;
  }

  /**
   * Builds dense 3D grass tufts & ground foliage clusters
   */
  public static createGrassClump(): THREE.Group {
    const group = new THREE.Group();
    const bladeGeo = new THREE.ConeGeometry(0.7, 5.5, 3);
    bladeGeo.translate(0, 2.75, 0);

    const bladeCount = 6;
    for (let b = 0; b < bladeCount; b++) {
      const blade = new THREE.Mesh(bladeGeo, this.materials.grassTuft);
      const ang = (b / bladeCount) * Math.PI * 2 + Math.random() * 0.3;
      blade.position.set(Math.cos(ang) * 1.8, 0, Math.sin(ang) * 1.8);
      blade.rotation.set((Math.random() - 0.5) * 0.35, Math.random() * Math.PI, (Math.random() - 0.5) * 0.35);
      group.add(blade);
    }

    return group;
  }

  /**
   * Builds 3D Ground Loot Pickups: Ammo boxes, medkits, shield canisters
   */
  public static createLootItemMesh(type: string): THREE.Group {
    const group = new THREE.Group();

    if (type === 'medkit' || type === 'medical') {
      // First Aid Medical Case (White case with embossed red cross)
      const caseMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.2 });
      const redCrossMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

      const box = new THREE.Mesh(new THREE.BoxGeometry(6, 4.5, 3), caseMat);
      box.castShadow = true;
      group.add(box);

      const crossH = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.2, 0.2), redCrossMat);
      crossH.position.z = 1.6;
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.5, 0.2), redCrossMat);
      crossV.position.z = 1.6;
      group.add(crossH, crossV);

      // Handle
      const handle = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.8, 0.8), this.materials.chassisDark);
      handle.position.y = 2.6;
      group.add(handle);
    } else if (type === 'nanite_core' || type === 'armor' || type === 'shield') {
      // Glowing Cyan Shield Booster Canister
      const canGeo = new THREE.CylinderGeometry(2.2, 2.2, 6.5, 10);
      const canMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.8,
      });
      const canister = new THREE.Mesh(canGeo, canMat);
      canister.castShadow = true;
      group.add(canister);

      const ringTop = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 1.2, 10), this.materials.corrugatedMetal);
      ringTop.position.y = 3.2;
      const ringBot = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 1.2, 10), this.materials.corrugatedMetal);
      ringBot.position.y = -3.2;
      group.add(ringTop, ringBot);
    } else {
      // Military Ammo Box (Olive Drab metal case with yellow stencil)
      const ammoBox = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.8, 3.2), this.materials.oliveDrabMetal);
      ammoBox.castShadow = true;
      group.add(ammoBox);

      const latch = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 0.4), this.materials.rustedSteel);
      latch.position.set(0, 0.5, 1.8);
      group.add(latch);
    }

    return group;
  }

  /**
   * Asphalt Road Segment with painted lane markings
   */
  public static createRoadSegment(width: number = 32, length: number = 90, hasDashedLine: boolean = true): THREE.Group {
    const group = new THREE.Group();

    // Road asphalt bed
    const asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.95,
      metalness: 0.05,
    });
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(width, length), asphaltMat);
    bed.rotation.x = -Math.PI / 2;
    bed.receiveShadow = true;
    group.add(bed);

    // Curbs / road shoulders
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    const curbGeo = new THREE.BoxGeometry(1.5, 0.8, length);
    const curbL = new THREE.Mesh(curbGeo, curbMat);
    curbL.position.set(-width / 2 + 0.75, 0.4, 0);
    curbL.receiveShadow = true;
    const curbR = new THREE.Mesh(curbGeo, curbMat);
    curbR.position.set(width / 2 - 0.75, 0.4, 0);
    curbR.receiveShadow = true;
    group.add(curbL, curbR);

    // White painted dashed lane markings
    if (hasDashedLine) {
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });
      const dashCount = Math.floor(length / 18);
      for (let i = 0; i < dashCount; i++) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 8), lineMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(0, 0.08, -length / 2 + 9 + i * 18);
        group.add(dash);
      }
    }

    return group;
  }

  /**
   * Heavy Concrete Jersey Highway Barrier with hazard stripes for waist-height tactical cover
   */
  public static createJerseyBarrier(length: number = 24): THREE.Group {
    const group = new THREE.Group();

    const barrierMat = this.materials.weatheredConcrete;
    const bodyGeo = new THREE.BoxGeometry(length, 7, 5);
    const body = new THREE.Mesh(bodyGeo, barrierMat);
    body.position.y = 3.5;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const topGeo = new THREE.BoxGeometry(length, 3, 2.5);
    const top = new THREE.Mesh(topGeo, barrierMat);
    top.position.y = 8;
    top.castShadow = true;
    group.add(top);

    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(length * 0.75, 2), this.materials.hazardStripes);
    stripe.position.set(0, 5, 2.55);
    group.add(stripe);

    return group;
  }

  /**
   * Supply Pallet Stack with wooden base and stacked crates
   */
  public static createSupplyPallet(): THREE.Group {
    const group = new THREE.Group();

    const pallet = new THREE.Mesh(new THREE.BoxGeometry(16, 1.8, 16), this.materials.woodPlank);
    pallet.position.y = 0.9;
    pallet.castShadow = true;
    group.add(pallet);

    const box1 = new THREE.Mesh(new THREE.BoxGeometry(7, 5.5, 7), this.materials.oliveDrabMetal);
    box1.position.set(-3.5, 4.6, -3.5);
    box1.castShadow = true;
    const box2 = new THREE.Mesh(new THREE.BoxGeometry(6.5, 5.5, 7), this.materials.corrugatedMetal);
    box2.position.set(3.5, 4.6, -3.5);
    box2.castShadow = true;
    const box3 = new THREE.Mesh(new THREE.BoxGeometry(13, 5, 6.5), this.materials.oliveDrabMetal);
    box3.position.set(0, 4.4, 3.5);
    box3.castShadow = true;
    const topBox = new THREE.Mesh(new THREE.BoxGeometry(7.5, 4.5, 7.5), this.materials.chassisDark);
    topBox.position.set(-1, 9.6, 0);
    topBox.rotation.y = 0.25;
    topBox.castShadow = true;

    group.add(box1, box2, box3, topBox);
    return group;
  }

  /**
   * Tactical Floodlight Pole with downward industrial lamp
   */
  public static createIndustrialLightPole(): THREE.Group {
    const group = new THREE.Group();

    const poleGeo = new THREE.CylinderGeometry(1.0, 1.4, 28, 8);
    const pole = new THREE.Mesh(poleGeo, this.materials.chassisDark);
    pole.position.y = 14;
    pole.castShadow = true;
    group.add(pole);

    const armGeo = new THREE.BoxGeometry(1, 1, 7);
    const arm = new THREE.Mesh(armGeo, this.materials.chassisDark);
    arm.position.set(0, 27, 3);
    group.add(arm);

    const lampGeo = new THREE.BoxGeometry(3.5, 1.8, 4.5);
    const lamp = new THREE.Mesh(lampGeo, this.materials.rustedSteel);
    lamp.position.set(0, 26, 6);
    const bulb = new THREE.Mesh(new THREE.PlaneGeometry(3, 4), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    bulb.rotation.x = Math.PI / 2;
    bulb.position.set(0, 25, 6);
    group.add(lamp, bulb);

    return group;
  }

  /**
   * Military Sector Warning Sign
   */
  public static createWarningSign(label: string = 'RESTRICTED'): THREE.Group {
    const group = new THREE.Group();

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 13, 6), this.materials.rebarSteel);
    post.position.y = 6.5;
    post.castShadow = true;
    group.add(post);

    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(9, 5.5, 0.5), this.materials.hazardStripes);
    signBoard.position.set(0, 11, 0);
    signBoard.castShadow = true;
    group.add(signBoard);

    return group;
  }
}
