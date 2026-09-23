import * as THREE from 'three';
import { Enemy } from '../types';
import { ProceduralTextureManager } from './proceduralTextures';

/**
 * High-Detail Sci-Fi Mechanical Robots & Drones Builder
 * Replaces basic primitive cubes/spheres with multi-segmented robotic war machines:
 * - Scout Drones: Ducted carbon rotors, sensor gimbals, navigation beacons
 * - Combat Drones: Armored aerial gunships with twin rotary blasters & jet exhaust
 * - Bipedal Sentinels: Reverse-joint digitigrade mech legs, hydraulic pistons, heat sinks & mechanical claw
 * - Heavy Juggernauts: Massive armored colossus with Gatling barrels & ammo feed chutes
 * - Titan Boss: Multi-stage war machine with exposed plasma core, missile pod clusters & railgun cannon
 */
export class RobotModelFactory {
  private static matDarkSteel: THREE.MeshStandardMaterial;
  private static matHydraulics: THREE.MeshStandardMaterial;
  private static matCautionYellow: THREE.MeshStandardMaterial;
  private static matTitaniumShield: THREE.MeshStandardMaterial;

  private static initMaterials() {
    if (this.matDarkSteel) return;
    const bumpMap = ProceduralTextureManager.getMetalBumpMap();
    const hazardTex = ProceduralTextureManager.getHazardStripes();

    this.matDarkSteel = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.3,
      bumpMap,
      bumpScale: 0.04,
    });

    this.matHydraulics = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Polished chrome hydraulic cylinder
      metalness: 0.95,
      roughness: 0.15,
    });

    this.matCautionYellow = new THREE.MeshStandardMaterial({
      map: hazardTex,
      roughness: 0.5,
      metalness: 0.4,
    });

    this.matTitaniumShield = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.75,
      roughness: 0.35,
      bumpMap,
      bumpScale: 0.06,
    });
  }

  /**
   * Constructs the appropriate specialized 3D robot model based on enemy configuration
   */
  public static createRobotModel(enemy: Enemy): THREE.Group {
    this.initMaterials();
    const group = new THREE.Group();
    group.name = `robot_${enemy.id}`;

    const chassisColorHex = enemy.chassisColor || enemy.color || '#ef4444';
    const chassisTex = ProceduralTextureManager.getRobotChassisTexture(chassisColorHex);
    const matChassis = new THREE.MeshStandardMaterial({
      color: new THREE.Color(chassisColorHex),
      map: chassisTex,
      metalness: 0.7,
      roughness: 0.35,
    });

    const eyeHex = enemy.eyeColor || (enemy.isBoss ? '#ef4444' : '#06b6d4');
    const matOpticSensor = new THREE.MeshBasicMaterial({ color: new THREE.Color(eyeHex) });

    if (enemy.type === 'scout_drone' || enemy.type === 'drone') {
      this.buildScoutDrone(group, matChassis, matOpticSensor);
    } else if (enemy.type === 'combat_drone') {
      this.buildCombatDrone(group, matChassis, matOpticSensor);
    } else if (enemy.type === 'heavy_bot' || enemy.type === 'heavy') {
      this.buildHeavyJuggernaut(group, matChassis, matOpticSensor);
    } else if (enemy.isBoss || enemy.type === 'titan_boss' || enemy.type === 'boss') {
      this.buildTitanBoss(group, matChassis, matOpticSensor);
    } else {
      // Default: Bipedal Sentinel & Tactical Assault Bot
      this.buildSentinelBot(group, matChassis, matOpticSensor);
    }

    return group;
  }

  /**
   * 1. SCOUT DRONE: Aerodynamic surveillance drone with 4 ducted rotor fans and optical gimbal
   */
  private static buildScoutDrone(
    group: THREE.Group,
    matChassis: THREE.MeshStandardMaterial,
    matOptic: THREE.MeshBasicMaterial
  ) {
    // Central carbon-fiber chassis
    const bodyGeo = new THREE.CylinderGeometry(5.2, 4.4, 3.2, 16);
    const body = new THREE.Mesh(bodyGeo, matChassis);
    body.castShadow = true;
    group.add(body);

    // Top aerodynamic cowl
    const domeGeo = new THREE.SphereGeometry(4.2, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const dome = new THREE.Mesh(domeGeo, this.matDarkSteel);
    dome.position.y = 1.6;
    group.add(dome);

    // Underslung 360° Surveillance Camera Gimbal
    const gimbalArm = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.4), this.matDarkSteel);
    gimbalArm.position.y = -2.2;
    group.add(gimbalArm);

    const gimbalEye = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 8), matOptic);
    gimbalEye.position.set(0, -3.2, 1.4);
    group.add(gimbalEye);

    // 4 Ducted Carbon Rotor Arms
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
      const armGroup = new THREE.Group();
      armGroup.position.set(Math.cos(ang) * 6.5, 0.2, Math.sin(ang) * 6.5);
      armGroup.rotation.y = -ang;

      // Arm strut
      const strut = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.0, 1.4), this.matDarkSteel);
      strut.position.x = -1.8;
      armGroup.add(strut);

      // Ducted Fan Ring
      const duct = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.6, 8, 16), this.matDarkSteel);
      duct.rotation.x = Math.PI / 2;
      armGroup.add(duct);

      // High-speed twin rotor blades
      const rotor = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.2, 1.0), this.matHydraulics);
      rotor.name = `rotor_${i}`;
      rotor.position.y = 0.2;
      armGroup.add(rotor);

      group.add(armGroup);
    }
  }

  /**
   * 2. COMBAT DRONE: Heavy Aerial Gunship with Twin Rotary Blasters & Thruster Flame
   */
  private static buildCombatDrone(
    group: THREE.Group,
    matChassis: THREE.MeshStandardMaterial,
    matOptic: THREE.MeshBasicMaterial
  ) {
    // Angular stealth gunship hull
    const hullGeo = new THREE.BoxGeometry(16, 5.5, 18);
    const hull = new THREE.Mesh(hullGeo, matChassis);
    hull.castShadow = true;
    group.add(hull);

    // Swept side armor wings
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(8, 1.6, 12), this.matTitaniumShield);
    wingL.position.set(-11, 0.2, 0);
    wingL.rotation.z = -0.15;
    group.add(wingL);

    const wingR = new THREE.Mesh(new THREE.BoxGeometry(8, 1.6, 12), this.matTitaniumShield);
    wingR.position.set(11, 0.2, 0);
    wingR.rotation.z = 0.15;
    group.add(wingR);

    // Twin underslung heavy rotary blasters
    for (const xOff of [-8, 8]) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 14, 10), this.matDarkSteel);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(xOff, -3.2, 3);
      pod.castShadow = true;
      group.add(pod);

      // Muzzle tips
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 4, 8), this.matHydraulics);
      tip.rotation.x = Math.PI / 2;
      tip.position.set(xOff, -3.2, 11);
      group.add(tip);
    }

    // Forward targeting radar sensor array
    const radar = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.2, 2.0), matOptic);
    radar.position.set(0, 0.2, 9.4);
    group.add(radar);

    // Rear Jet Thruster with thermal exhaust glow
    const thruster = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.8, 5.0, 12), this.matDarkSteel);
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(0, 0, -10.5);
    group.add(thruster);

    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(2.4, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
    );
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(0, 0, -15);
    group.add(flame);
  }

  /**
   * 3. BIPEDAL SENTINEL: Articulated reverse-joint walker with hydraulic pistons & claw
   */
  private static buildSentinelBot(
    group: THREE.Group,
    matChassis: THREE.MeshStandardMaterial,
    matOptic: THREE.MeshBasicMaterial
  ) {
    // Heavy mechanical pelvis with rotation ring
    const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.8, 3.4, 12), this.matDarkSteel);
    pelvis.position.y = 12;
    group.add(pelvis);

    // Reinforced Chest Carapace with heat sink vents
    const chestGeo = new THREE.BoxGeometry(11.5, 10, 8.5);
    const chest = new THREE.Mesh(chestGeo, matChassis);
    chest.position.set(0, 19, 0);
    chest.castShadow = true;
    group.add(chest);

    // Horizontal glowing visor slit
    const visor = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.8, 1.4), matOptic);
    visor.position.set(0, 21.5, 4.4);
    group.add(visor);

    // Reverse-joint digitigrade mech legs (left & right)
    for (const xOff of [-4.2, 4.2]) {
      const legGroup = new THREE.Group();
      legGroup.position.set(xOff, 12, 0);

      // Upper mechanical thigh (angled backward)
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 8, 3.2), this.matTitaniumShield);
      thigh.position.set(0, -3.5, -1.5);
      thigh.rotation.x = -0.4;
      legGroup.add(thigh);

      // Reverse knee hydraulic piston
      const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 6), this.matHydraulics);
      piston.position.set(0, -6.5, 1.0);
      piston.rotation.x = 0.55;
      legGroup.add(piston);

      // Lower mechanical shin (angled forward)
      const shin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 7.5, 2.8), this.matDarkSteel);
      shin.position.set(0, -8.5, 1.2);
      shin.rotation.x = 0.35;
      legGroup.add(shin);

      // 3-Toe Stabilizer Claw Foot
      const foot = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.4, 6.2), this.matDarkSteel);
      foot.position.set(0, -11.5, 2.0);
      foot.castShadow = true;
      legGroup.add(foot);

      group.add(legGroup);
    }

    // Right Arm: Multi-Barrel Autocannon
    const cannonArm = new THREE.Group();
    cannonArm.position.set(7.5, 19, 2);
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 8), this.matDarkSteel);
    cannonArm.add(shoulder);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 14, 8), this.matDarkSteel);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, -2, 8);
    cannonArm.add(barrel);
    group.add(cannonArm);

    // Left Arm: 3-Prong Industrial Hydraulic Claw
    const clawArm = new THREE.Group();
    clawArm.position.set(-7.5, 19, 2);
    const clawShoulder = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 8), this.matDarkSteel);
    clawArm.add(clawShoulder);

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 8), this.matTitaniumShield);
    forearm.position.set(0, -2, 4);
    clawArm.add(forearm);

    // 3 claw prongs
    for (let p = 0; p < 3; p++) {
      const prongAng = (p / 3) * Math.PI * 2;
      const prong = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.5, 6), this.matHydraulics);
      prong.rotation.x = Math.PI / 2;
      prong.position.set(Math.cos(prongAng) * 1.6, -2 + Math.sin(prongAng) * 1.6, 9.5);
      clawArm.add(prong);
    }
    group.add(clawArm);
  }

  /**
   * 4. HEAVY JUGGERNAUT: Massive Armored Colossus with Dual Revolving Gatling Barrels
   */
  private static buildHeavyJuggernaut(
    group: THREE.Group,
    matChassis: THREE.MeshStandardMaterial,
    matOptic: THREE.MeshBasicMaterial
  ) {
    group.scale.setScalar(1.5);

    // Heavy reinforced torso block
    const torsoGeo = new THREE.BoxGeometry(16, 16, 12);
    const torso = new THREE.Mesh(torsoGeo, matChassis);
    torso.position.y = 18;
    torso.castShadow = true;
    group.add(torso);

    // Heavy Sloped Front Blast Shield (Ballistic Armor Plate)
    const blastShield = new THREE.Mesh(new THREE.BoxGeometry(18, 14, 2.5), this.matTitaniumShield);
    blastShield.position.set(0, 17, 7.2);
    blastShield.rotation.x = -0.15;
    group.add(blastShield);

    // Armored Sensor Visor (Dual glowing red scanner eyes)
    const eyeBar = new THREE.Mesh(new THREE.BoxGeometry(8.5, 2.2, 1.6), matOptic);
    eyeBar.position.set(0, 26, 3.6);
    group.add(eyeBar);

    // Dual Rear Exhaust Smoke Stacks
    for (const xOff of [-4.5, 4.5]) {
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 12, 10), this.matDarkSteel);
      exhaust.position.set(xOff, 28, -5);
      exhaust.rotation.x = -0.2;
      group.add(exhaust);
    }

    // Heavy Gatling Rotary Minigun Arm (Right side)
    const gatlingGroup = new THREE.Group();
    gatlingGroup.position.set(12.5, 17, 6);

    const minigunBody = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.2, 10, 12), this.matDarkSteel);
    minigunBody.rotation.x = Math.PI / 2;
    gatlingGroup.add(minigunBody);

    // 6 Rotating Gatling Barrels
    for (let b = 0; b < 6; b++) {
      const ang = (b / 6) * Math.PI * 2;
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 18, 8), this.matHydraulics);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(Math.cos(ang) * 2.2, Math.sin(ang) * 2.2, 12);
      gatlingGroup.add(barrel);
    }

    // Flexible Ammo Feed Chute Belt
    const ammoBelt = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.8, 14), this.matCautionYellow);
    ammoBelt.position.set(-3.5, 0, -6);
    gatlingGroup.add(ammoBelt);

    group.add(gatlingGroup);
  }

  /**
   * 5. TITAN BOSS: Giant Multi-Tiered War Behemoth with Plasma Core & Missile Battery
   */
  private static buildTitanBoss(
    group: THREE.Group,
    matChassis: THREE.MeshStandardMaterial,
    matOptic: THREE.MeshBasicMaterial
  ) {
    group.scale.setScalar(2.6);

    // Central Heavy Core Reactor Housing
    const coreHullGeo = new THREE.DodecahedronGeometry(13, 1);
    const coreHull = new THREE.Mesh(coreHullGeo, matChassis);
    coreHull.position.y = 28;
    coreHull.castShadow = true;
    group.add(coreHull);

    // Glowing Anti-Matter Plasma Reactor Core in the center
    const reactorCore = new THREE.Mesh(
      new THREE.SphereGeometry(6.5, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    reactorCore.position.set(0, 28, 6.5);
    group.add(reactorCore);

    // Left Shoulder: 8-Cell Missile Pod Battery
    const missilePod = new THREE.Mesh(new THREE.BoxGeometry(12, 12, 16), this.matDarkSteel);
    missilePod.position.set(-16, 36, 2);
    missilePod.castShadow = true;
    group.add(missilePod);

    // Visible Warhead Tips in missile pod
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const warhead = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.5, 8), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
        warhead.rotation.x = Math.PI / 2;
        warhead.position.set(-19 + c * 2.6, 34 + r * 3.2, 10.5);
        group.add(warhead);
      }
    }

    // Right Shoulder: Heavy Railgun Cannon
    const railgunMount = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 14), this.matTitaniumShield);
    railgunMount.position.set(16, 35, 2);
    group.add(railgunMount);

    const railBarrel = new THREE.Mesh(new THREE.BoxGeometry(4.5, 4.5, 34), this.matDarkSteel);
    railBarrel.position.set(16, 35, 20);
    group.add(railBarrel);

    // Cyan magnetic acceleration coils around railgun
    for (let i = 0; i < 4; i++) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.6, 8, 16), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
      coil.position.set(16, 35, 10 + i * 6.5);
      group.add(coil);
    }

    // Quad Reinforced Hydraulic Stomp Struts (Heavy Tripod/Quad Base)
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
      const legGroup = new THREE.Group();
      legGroup.position.set(Math.cos(ang) * 14, 16, Math.sin(ang) * 14);

      const upperStrut = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.5, 16, 8), this.matTitaniumShield);
      upperStrut.position.y = -8;
      upperStrut.castShadow = true;
      legGroup.add(upperStrut);

      const footPad = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 3, 10), this.matDarkSteel);
      footPad.position.y = -16;
      footPad.castShadow = true;
      legGroup.add(footPad);

      group.add(legGroup);
    }
  }
}
