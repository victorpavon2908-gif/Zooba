import * as THREE from 'three';
import { WeaponId } from '../types';
import { ProceduralTextureManager } from './proceduralTextures';

/**
 * High-Detail Anatomical Tactical Operative 3D Model
 * Replaces primitive box/cylinder placeholder shapes with an anatomically proportioned,
 * multi-layered military combatant:
 * - Ballistic helmet with NVG mount, comms headset & holographic curved visor
 * - Heavy plate carrier vest with MOLLE webbing, front rifle mag pouches, radio & med-kit
 * - Modular tactical backpack with communication whip antenna and gear roll
 * - Detailed arms with shoulder pauldrons, elbow pads, and combat gloves gripping the firearm
 * - Tactical combat pants with ripstop weave, knee pads, and heavy lugged-sole combat boots
 * - Natural skeletal animation for walking, sprinting, aiming, recoil kickback, crouching & combat rolling
 */
export class TacticalCharacterModel {
  public group: THREE.Group = new THREE.Group();

  // Skeletal animation nodes
  private hipsGroup: THREE.Group = new THREE.Group();
  private torsoGroup: THREE.Group = new THREE.Group();
  private headGroup: THREE.Group = new THREE.Group();
  private leftLegGroup: THREE.Group = new THREE.Group();
  private rightLegGroup: THREE.Group = new THREE.Group();
  private leftKneeGroup: THREE.Group = new THREE.Group();
  private rightKneeGroup: THREE.Group = new THREE.Group();
  private leftArmGroup: THREE.Group = new THREE.Group();
  private rightArmGroup: THREE.Group = new THREE.Group();
  private weaponSlot: THREE.Group = new THREE.Group();

  // Weapon parts
  private muzzleFlashMesh: THREE.Mesh;
  private tacticalFlashlight: THREE.SpotLight;

  // Animation states
  private walkPhase: number = 0;
  private recoilAmount: number = 0;

  // Materials Cache
  private matFabricSuit: THREE.MeshStandardMaterial;
  private matArmorPlate: THREE.MeshStandardMaterial;
  private matLeather: THREE.MeshStandardMaterial;
  private matVisor: THREE.MeshPhysicalMaterial;
  private matSkinGlove: THREE.MeshStandardMaterial;
  private matDarkMetal: THREE.MeshStandardMaterial;
  private matGoldBrass: THREE.MeshStandardMaterial;
  private matMuzzleFlash: THREE.MeshBasicMaterial;

  constructor() {
    // 1. Initialize PBR Materials with Procedural Maps
    const fabricTex = ProceduralTextureManager.getTacticalFabric('#1e293b', '#0f172a');
    const armorTex = ProceduralTextureManager.getGunmetalArmor();
    const leatherTex = ProceduralTextureManager.getTacticalLeather();
    const visorTex = ProceduralTextureManager.getCyberVisorTexture();
    const bumpMetal = ProceduralTextureManager.getMetalBumpMap();

    this.matFabricSuit = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      map: fabricTex,
      roughness: 0.85,
      metalness: 0.1,
    });

    this.matArmorPlate = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Cyan/tactical blue ceramic composite
      map: armorTex,
      bumpMap: bumpMetal,
      bumpScale: 0.05,
      roughness: 0.35,
      metalness: 0.65,
    });

    this.matLeather = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      map: leatherTex,
      roughness: 0.7,
      metalness: 0.2,
    });

    this.matVisor = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      map: visorTex,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
      roughness: 0.1,
      metalness: 0.3,
      transmission: 0.4,
      transparent: true,
      opacity: 0.92,
    });

    this.matSkinGlove = new THREE.MeshStandardMaterial({
      color: 0x334155, // Charcoal tactical gloves
      roughness: 0.75,
      metalness: 0.15,
    });

    this.matDarkMetal = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.8,
      bumpMap: bumpMetal,
      bumpScale: 0.03,
    });

    this.matGoldBrass = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.85,
    });

    this.matMuzzleFlash = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });

    // 2. Build the Anatomical Hierarchical Rig
    this.buildRig();

    // 3. Create Muzzle Flash & Tactical Light
    const flashGeo = new THREE.DodecahedronGeometry(3.5, 0);
    this.muzzleFlashMesh = new THREE.Mesh(flashGeo, this.matMuzzleFlash);
    this.muzzleFlashMesh.position.set(0, 0, 16);
    this.weaponSlot.add(this.muzzleFlashMesh);

    this.tacticalFlashlight = new THREE.SpotLight(0xffffff, 0, 180, Math.PI * 0.22, 0.4, 1.2);
    this.tacticalFlashlight.position.set(2, 0, 10);
    this.tacticalFlashlight.target.position.set(2, 0, 50);
    this.weaponSlot.add(this.tacticalFlashlight);
    this.weaponSlot.add(this.tacticalFlashlight.target);
  }

  /**
   * Constructs the full articulated body parts hierarchy
   */
  private buildRig() {
    this.group.name = 'tactical_operative';

    // Pelvis / Hips root
    this.hipsGroup.position.set(0, 14, 0);
    this.group.add(this.hipsGroup);

    // Tactical combat belt with metal buckle
    const beltGeo = new THREE.CylinderGeometry(5.2, 5.0, 2.6, 16);
    const belt = new THREE.Mesh(beltGeo, this.matLeather);
    belt.castShadow = true;
    this.hipsGroup.add(belt);

    const buckleGeo = new THREE.BoxGeometry(2.4, 2.2, 0.8);
    const buckle = new THREE.Mesh(buckleGeo, this.matDarkMetal);
    buckle.position.set(0, 0, 4.8);
    this.hipsGroup.add(buckle);

    // Side utility pouches & sidearm holster on belt
    const pouchL = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 3.4), this.matLeather);
    pouchL.position.set(-5.0, -0.4, 0.8);
    pouchL.rotation.y = Math.PI * 0.15;
    this.hipsGroup.add(pouchL);

    const holsterR = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.8, 3.0), this.matLeather);
    holsterR.position.set(5.1, -1.2, 0.4);
    holsterR.rotation.y = -Math.PI * 0.1;
    this.hipsGroup.add(holsterR);

    // Sidearm pistol handle in holster
    const sidearmHandle = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 1.6), this.matDarkMetal);
    sidearmHandle.position.set(5.2, 1.4, 0.4);
    sidearmHandle.rotation.x = -Math.PI * 0.15;
    this.hipsGroup.add(sidearmHandle);

    // BUILD LEGS
    this.buildLeg(this.leftLegGroup, this.leftKneeGroup, -3.4);
    this.buildLeg(this.rightLegGroup, this.rightKneeGroup, 3.4);
    this.hipsGroup.add(this.leftLegGroup);
    this.hipsGroup.add(this.rightLegGroup);

    // BUILD TORSO
    this.torsoGroup.position.set(0, 1.4, 0);
    this.hipsGroup.add(this.torsoGroup);
    this.buildTorso();

    // BUILD HEAD & HELMET
    this.headGroup.position.set(0, 13.6, 0);
    this.torsoGroup.add(this.headGroup);
    this.buildHead();

    // BUILD ARMS
    this.buildArms();
  }

  /**
   * Constructs an articulated leg: Thigh -> Knee Joint + Armor Pad -> Shin -> Tactical Combat Boot with Lugs
   */
  private buildLeg(legGroup: THREE.Group, kneeGroup: THREE.Group, xOffset: number) {
    legGroup.position.set(xOffset, -1.2, 0);

    // Thigh with anatomical tapered shape
    const thighGeo = new THREE.CylinderGeometry(2.5, 2.1, 7.5, 12);
    const thigh = new THREE.Mesh(thighGeo, this.matFabricSuit);
    thigh.position.y = -3.75;
    thigh.castShadow = true;
    legGroup.add(thigh);

    // Cargo pocket on outer thigh
    const cargoPocket = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.5, 3.2), this.matFabricSuit);
    cargoPocket.position.set(xOffset > 0 ? 2.2 : -2.2, -3.5, 0.2);
    legGroup.add(cargoPocket);

    // Knee Joint
    kneeGroup.position.set(0, -7.5, 0);
    legGroup.add(kneeGroup);

    // Reinforced Knee Armor Pad
    const padCap = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.6, 1.8), this.matArmorPlate);
    padCap.position.set(0, 0, 1.8);
    padCap.castShadow = true;
    kneeGroup.add(padCap);

    // Elastic dual straps behind knee
    const strapTop = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.6, 12), this.matLeather);
    strapTop.position.set(0, 1.1, 0);
    kneeGroup.add(strapTop);

    // Shin / Calf
    const shinGeo = new THREE.CylinderGeometry(2.0, 1.8, 7.0, 12);
    const shin = new THREE.Mesh(shinGeo, this.matFabricSuit);
    shin.position.y = -3.5;
    shin.castShadow = true;
    kneeGroup.add(shin);

    // Combat Boot Shaft
    const bootShaft = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.2, 4.0, 12), this.matLeather);
    bootShaft.position.y = -5.5;
    bootShaft.castShadow = true;
    kneeGroup.add(bootShaft);

    // Tactical Combat Boot Foot (lugged sole + reinforced toe cap)
    const footGroup = new THREE.Group();
    footGroup.position.set(0, -7.5, 1.2);

    // Upper leather foot
    const footUpper = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.4, 5.8), this.matLeather);
    footUpper.position.set(0, 1.2, 0.4);
    footUpper.castShadow = true;
    footGroup.add(footUpper);

    // Heavy rubber lugged sole
    const soleGeo = new THREE.BoxGeometry(3.6, 1.0, 6.2);
    const soleMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.95 });
    const sole = new THREE.Mesh(soleGeo, soleMat);
    sole.position.set(0, 0.2, 0.4);
    sole.receiveShadow = true;
    footGroup.add(sole);

    // Steel toe cap bumper
    const toeBumper = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 1.4), this.matDarkMetal);
    toeBumper.position.set(0, 0.8, 3.2);
    footGroup.add(toeBumper);

    kneeGroup.add(footGroup);
  }

  /**
   * Constructs detailed Tactical Torso with Plate Carrier Vest, MOLLE pouches, radio, and backpack
   */
  private buildTorso() {
    // Under-suit inner torso (waist to chest)
    const innerTorsoGeo = new THREE.CylinderGeometry(4.8, 4.2, 11, 14);
    const innerTorso = new THREE.Mesh(innerTorsoGeo, this.matFabricSuit);
    innerTorso.position.y = 5.5;
    innerTorso.castShadow = true;
    this.torsoGroup.add(innerTorso);

    // Heavy Ballistic Plate Carrier Vest (Front Plate)
    const frontPlateGeo = new THREE.BoxGeometry(9.4, 8.8, 3.2);
    const frontPlate = new THREE.Mesh(frontPlateGeo, this.matArmorPlate);
    frontPlate.position.set(0, 6.2, 2.6);
    frontPlate.castShadow = true;
    this.torsoGroup.add(frontPlate);

    // Back Ballistic Armor Plate
    const backPlateGeo = new THREE.BoxGeometry(9.4, 8.8, 2.8);
    const backPlate = new THREE.Mesh(backPlateGeo, this.matArmorPlate);
    backPlate.position.set(0, 6.2, -2.4);
    backPlate.castShadow = true;
    this.torsoGroup.add(backPlate);

    // Shoulder straps connecting front & back plates
    const strapL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 6.2), this.matLeather);
    strapL.position.set(-3.2, 10.6, 0.2);
    this.torsoGroup.add(strapL);

    const strapR = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 6.2), this.matLeather);
    strapR.position.set(3.2, 10.6, 0.2);
    this.torsoGroup.add(strapR);

    // 3x Front Rifle Ammo Magazine Pouches (MOLLE system)
    for (let i = -1; i <= 1; i++) {
      const magPouch = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.8, 1.8), this.matFabricSuit);
      magPouch.position.set(i * 2.6, 4.4, 4.4);
      magPouch.castShadow = true;
      this.torsoGroup.add(magPouch);

      // Visible magazine top with brass bullet tip
      const magTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 1.4), this.matDarkMetal);
      magTop.position.set(i * 2.6, 6.6, 4.4);
      this.torsoGroup.add(magTop);

      const brassTip = new THREE.Mesh(new THREE.SphereGeometry(0.45, 6, 6), this.matGoldBrass);
      brassTip.position.set(i * 2.6, 7.3, 4.4);
      this.torsoGroup.add(brassTip);
    }

    // Chest Tactical Comm Radio Unit with coiled wire
    const radioUnit = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 1.6), this.matDarkMetal);
    radioUnit.position.set(-3.2, 8.2, 4.2);
    radioUnit.rotation.z = -0.1;
    this.torsoGroup.add(radioUnit);

    const radioAntenna = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4.5), this.matDarkMetal);
    radioAntenna.position.set(-3.2, 11.2, 4.2);
    this.torsoGroup.add(radioAntenna);

    // Medical First-Aid Pouch with Red Cross emblem
    const medPouch = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.8, 1.6), new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 }));
    medPouch.position.set(3.2, 8.2, 4.2);
    this.torsoGroup.add(medPouch);

    const crossH = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    crossH.position.set(3.2, 8.2, 5.1);
    this.torsoGroup.add(crossH);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    crossV.position.set(3.2, 8.2, 5.1);
    this.torsoGroup.add(crossV);

    // Tactical Assault Backpack mounted on the back
    const packMain = new THREE.Mesh(new THREE.BoxGeometry(8.2, 10.5, 4.8), this.matFabricSuit);
    packMain.position.set(0, 5.8, -5.2);
    packMain.castShadow = true;
    this.torsoGroup.add(packMain);

    // Backpack sleeping roll / survival shelter on top
    const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 8.6, 12), this.matLeather);
    bedroll.rotation.z = Math.PI / 2;
    bedroll.position.set(0, 11.5, -5.2);
    bedroll.castShadow = true;
    this.torsoGroup.add(bedroll);

    // Long tactical communication antenna whip
    const commWhip = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.1, 16), this.matDarkMetal);
    commWhip.position.set(3.6, 14.5, -5.6);
    commWhip.rotation.z = -0.15;
    this.torsoGroup.add(commWhip);
  }

  /**
   * Constructs detailed Military Combat Helmet with Comms, NVG mount & Cyber Visor
   */
  private buildHead() {
    // Neck collar
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.5, 3.2, 12), this.matFabricSuit);
    neck.position.y = -1.2;
    neck.castShadow = true;
    this.headGroup.add(neck);

    // Ballistic Helmet Dome (aerodynamic curve)
    const helmetDomeGeo = new THREE.SphereGeometry(4.4, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.75);
    const helmet = new THREE.Mesh(helmetDomeGeo, this.matArmorPlate);
    helmet.position.set(0, 1.4, 0);
    helmet.castShadow = true;
    this.headGroup.add(helmet);

    // Lower helmet ballistic jaw / chin protector
    const chinGeo = new THREE.BoxGeometry(4.8, 2.6, 3.6);
    const chinGuard = new THREE.Mesh(chinGeo, this.matArmorPlate);
    chinGuard.position.set(0, 0.2, 1.4);
    this.headGroup.add(chinGuard);

    // Tactical Comms Headset Earpieces (Over-Ear)
    const earpieceGeo = new THREE.CylinderGeometry(1.6, 1.6, 1.2, 12);
    const earpieceL = new THREE.Mesh(earpieceGeo, this.matDarkMetal);
    earpieceL.rotation.z = Math.PI / 2;
    earpieceL.position.set(-4.5, 1.2, 0.2);
    this.headGroup.add(earpieceL);

    const earpieceR = new THREE.Mesh(earpieceGeo, this.matDarkMetal);
    earpieceR.rotation.z = Math.PI / 2;
    earpieceR.position.set(4.5, 1.2, 0.2);
    this.headGroup.add(earpieceR);

    // Boom Microphone curving toward mouth
    const boomArm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.8), this.matDarkMetal);
    boomArm.position.set(-3.6, 0.3, 2.4);
    boomArm.rotation.x = Math.PI * 0.35;
    boomArm.rotation.y = -Math.PI * 0.2;
    this.headGroup.add(boomArm);

    const micTip = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), this.matDarkMetal);
    micTip.position.set(-2.4, -0.6, 3.8);
    this.headGroup.add(micTip);

    // Holographic Curved Visor Lens (Cyan Cyber Refraction)
    const visorGeo = new THREE.CylinderGeometry(4.1, 4.1, 2.2, 16, 1, true, -Math.PI * 0.35, Math.PI * 0.7);
    const visor = new THREE.Mesh(visorGeo, this.matVisor);
    visor.position.set(0, 1.4, 0.8);
    this.headGroup.add(visor);

    // Forehead NVG (Night-Vision-Goggles) Shroud Mount
    const nvgMount = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 1.2), this.matDarkMetal);
    nvgMount.position.set(0, 3.4, 4.2);
    this.headGroup.add(nvgMount);

    // Dual Optical Sensor Lenses
    const lensL = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 8), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
    lensL.rotation.x = Math.PI / 2;
    lensL.position.set(-0.7, 3.4, 4.8);
    this.headGroup.add(lensL);

    const lensR = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 8), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
    lensR.rotation.x = Math.PI / 2;
    lensR.position.set(0.7, 3.4, 4.8);
    this.headGroup.add(lensR);
  }

  /**
   * Constructs articulated Arms with Shoulder Pauldrons, Elbow Pads & Gloved Hands
   */
  private buildArms() {
    // Left Arm Hierarchy (Supporting Weapon Barrel)
    this.leftArmGroup.position.set(-5.6, 9.6, 0);
    this.torsoGroup.add(this.leftArmGroup);

    // Shoulder Pauldron Guard (Heavy Ballistic Armor)
    const pauldronGeo = new THREE.SphereGeometry(2.4, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const pauldronL = new THREE.Mesh(pauldronGeo, this.matArmorPlate);
    pauldronL.position.set(-0.6, 0.2, 0);
    pauldronL.rotation.z = Math.PI * 0.45;
    pauldronL.castShadow = true;
    this.leftArmGroup.add(pauldronL);

    // Upper arm (bicep)
    const bicepGeo = new THREE.CylinderGeometry(1.8, 1.5, 6.4, 10);
    const bicepL = new THREE.Mesh(bicepGeo, this.matFabricSuit);
    bicepL.position.set(0, -3.2, 0);
    bicepL.castShadow = true;
    this.leftArmGroup.add(bicepL);

    // Elbow Guard
    const elbowL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 1.6), this.matArmorPlate);
    elbowL.position.set(0, -6.4, -0.6);
    this.leftArmGroup.add(elbowL);

    // Forearm angled forward to grip the weapon
    const forearmGeo = new THREE.CylinderGeometry(1.5, 1.3, 6.0, 10);
    const forearmL = new THREE.Mesh(forearmGeo, this.matFabricSuit);
    forearmL.position.set(1.4, -8.6, 3.0);
    forearmL.rotation.x = Math.PI * 0.45;
    forearmL.rotation.y = -Math.PI * 0.15;
    forearmL.castShadow = true;
    this.leftArmGroup.add(forearmL);

    // Tactical Gloved Hand (Supporting front handguard)
    const gloveL = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 2.0), this.matSkinGlove);
    gloveL.position.set(2.4, -10.2, 5.2);
    gloveL.castShadow = true;
    this.leftArmGroup.add(gloveL);

    // Right Arm Hierarchy (Primary Trigger Hand)
    this.rightArmGroup.position.set(5.6, 9.6, 0);
    this.torsoGroup.add(this.rightArmGroup);

    const pauldronR = new THREE.Mesh(pauldronGeo, this.matArmorPlate);
    pauldronR.position.set(0.6, 0.2, 0);
    pauldronR.rotation.z = -Math.PI * 0.45;
    pauldronR.castShadow = true;
    this.rightArmGroup.add(pauldronR);

    const bicepR = new THREE.Mesh(bicepGeo, this.matFabricSuit);
    bicepR.position.set(0, -3.2, 0);
    bicepR.castShadow = true;
    this.rightArmGroup.add(bicepR);

    const elbowR = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 1.6), this.matArmorPlate);
    elbowR.position.set(0, -6.4, -0.6);
    this.rightArmGroup.add(elbowR);

    const forearmR = new THREE.Mesh(forearmGeo, this.matFabricSuit);
    forearmR.position.set(-1.2, -8.6, 3.0);
    forearmR.rotation.x = Math.PI * 0.45;
    forearmR.rotation.y = Math.PI * 0.15;
    forearmR.castShadow = true;
    this.rightArmGroup.add(forearmR);

    const gloveR = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 2.0), this.matSkinGlove);
    gloveR.position.set(-2.0, -10.2, 5.2);
    gloveR.castShadow = true;
    this.rightArmGroup.add(gloveR);

    // WEAPON MOUNT ANCHORED BETWEEN HANDS
    this.weaponSlot.position.set(0, -10.0, 6.2);
    this.torsoGroup.add(this.weaponSlot);
  }

  /**
   * Replaces or updates the equipped 3D Weapon Model with realistic mechanical components:
   * receiver, barrel, picatinny rails, optics, curved magazine, muzzle brake & tactical flashlight.
   */
  public updateWeapon(weaponId: WeaponId) {
    // Preserve muzzle flash and light
    const flash = this.muzzleFlashMesh;
    const light = this.tacticalFlashlight;
    const lightTarget = this.tacticalFlashlight.target;
    this.weaponSlot.clear();
    this.weaponSlot.add(flash);
    this.weaponSlot.add(light);
    this.weaponSlot.add(lightTarget);

    const gunMat = this.matDarkMetal;
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.65 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.9 });
    const opticLensMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const sniperLensMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const sniperChassisMat = new THREE.MeshStandardMaterial({ color: 0x1e3a2b, roughness: 0.75, metalness: 0.25 }); // Olive drab military sniper chassis

    if (weaponId === 'katana') {
      // 1. High-frequency Cyber Katana with scabbard & polished blade
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 6.0, 8), this.matLeather);
      hilt.rotation.x = Math.PI * 0.45;
      hilt.position.set(0, 0, -2);
      this.weaponSlot.add(hilt);

      const pommel = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.8, 8), this.matGoldBrass);
      pommel.rotation.x = Math.PI * 0.45;
      pommel.position.set(0, 0, -5.2);
      this.weaponSlot.add(pommel);

      const tsubaGuard = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.5, 12), this.matGoldBrass);
      tsubaGuard.rotation.x = Math.PI * 0.45;
      tsubaGuard.position.set(0, 0, 1.2);
      this.weaponSlot.add(tsubaGuard);

      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.35, 26, 1.5), chromeMat);
      blade.rotation.x = Math.PI * 0.45;
      blade.position.set(0, 0, 14.5);
      this.weaponSlot.add(blade);

      flash.position.set(0, 0, 28);
      return;
    }

    if (weaponId === 'ak47') {
      // 2. AK47 DRACO: Stamped Receiver, Wooden Stock/Handguard, Curved Banana Mag, Gas Tube
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.4, 13.0), gunMat);
      receiver.castShadow = true;
      this.weaponSlot.add(receiver);

      // Gas block tube on top
      const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 11.0, 8), gunMat);
      gasTube.rotation.x = Math.PI / 2;
      gasTube.position.set(0, 2.0, 4.5);
      this.weaponSlot.add(gasTube);

      // Wood Buttstock
      const stock = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.6, 9.5), woodMat);
      stock.position.set(0, -0.6, -11.0);
      this.weaponSlot.add(stock);

      // Wood Lower & Upper Handguard
      const handguard = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.8, 7.5), woodMat);
      handguard.position.set(0, 0.4, 7.0);
      this.weaponSlot.add(handguard);

      // Barrel & Slant Compensator
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 15.0, 8), gunMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.3, 14.0);
      this.weaponSlot.add(barrel);

      // Distinct curved banana magazine
      const mag = new THREE.Mesh(new THREE.BoxGeometry(1.5, 7.5, 3.8), gunMat);
      mag.position.set(0, -4.8, 1.8);
      mag.rotation.x = 0.28;
      this.weaponSlot.add(mag);

      // Pistol grip
      const grip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.8, 2.0), woodMat);
      grip.position.set(0, -3.2, -3.5);
      grip.rotation.x = -0.3;
      this.weaponSlot.add(grip);

      flash.position.set(0, 0.3, 22.0);
      light.position.set(1.5, -0.5, 10);
      lightTarget.position.set(1.5, -0.5, 60);
      return;
    }

    if (weaponId === 'mp40') {
      // 3. MP40 COBRA: Tubular Receiver, Underfolding Wire Stock, Straight Long Vertical Mag
      const receiver = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 12.0, 10), gunMat);
      receiver.rotation.x = Math.PI / 2;
      receiver.position.set(0, 0.2, 0);
      this.weaponSlot.add(receiver);

      // Underfolded wire stock
      const wireStock = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 9.0), gunMat);
      wireStock.position.set(0, -1.2, -8.0);
      this.weaponSlot.add(wireStock);

      // Slim Barrel with muzzle nut
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 9.0, 8), gunMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.2, 10.5);
      this.weaponSlot.add(barrel);

      // Long vertical 32-round stick mag
      const verticalMag = new THREE.Mesh(new THREE.BoxGeometry(1.1, 9.2, 2.0), gunMat);
      verticalMag.position.set(0, -5.6, 1.5);
      this.weaponSlot.add(verticalMag);

      // Pistol grip
      const grip = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.6, 1.8), this.matLeather);
      grip.position.set(0, -3.0, -3.2);
      grip.rotation.x = -0.28;
      this.weaponSlot.add(grip);

      flash.position.set(0, 0.2, 15.5);
      light.position.set(1.4, -0.5, 7);
      lightTarget.position.set(1.4, -0.5, 45);
      return;
    }

    if (weaponId === 'm1014' || weaponId === 'shotgun') {
      // 4. M1014 APOCALIPSIS: Tactical Semi-Auto Shotgun, Twin Barrels, Pump Forend, Full Stock
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.8, 12.0), gunMat);
      receiver.position.set(0, 0, 0);
      this.weaponSlot.add(receiver);

      // Full Tactical Polymer Stock
      const stock = new THREE.Mesh(new THREE.BoxGeometry(2.0, 4.0, 9.5), gunMat);
      stock.position.set(0, -0.4, -10.5);
      this.weaponSlot.add(stock);

      // Heavy 12ga Barrel
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 13.0, 8), gunMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.6, 12.5);
      this.weaponSlot.add(barrel);

      // Magazine tube underneath
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 12.0, 8), gunMat);
      tube.rotation.x = Math.PI / 2;
      tube.position.set(0, -0.7, 12.0);
      this.weaponSlot.add(tube);

      // Ribbed pump foregrip
      const pump = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 5.5), this.matLeather);
      pump.position.set(0, -0.7, 10.0);
      this.weaponSlot.add(pump);

      // Pistol grip
      const grip = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.8, 2.0), this.matLeather);
      grip.position.set(0, -3.2, -3.2);
      grip.rotation.x = -0.32;
      this.weaponSlot.add(grip);

      flash.position.set(0, 0.6, 19.5);
      light.position.set(1.6, -0.5, 9);
      lightTarget.position.set(1.6, -0.5, 50);
      return;
    }

    if (weaponId === 'awm') {
      // 5. AWM SNIPER: Precision Sniper Chassis, Long Fluted Barrel, Bipod, Sniper Scope
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.6, 16.0), sniperChassisMat);
      chassis.position.set(0, 0, -2.0);
      this.weaponSlot.add(chassis);

      // Thumbhole Sniper Stock with Cheek Riser
      const stock = new THREE.Mesh(new THREE.BoxGeometry(2.0, 4.5, 11.0), sniperChassisMat);
      stock.position.set(0, -0.2, -14.5);
      this.weaponSlot.add(stock);

      // Long Match-Grade Fluted Barrel
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 23.0, 8), gunMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.5, 17.5);
      this.weaponSlot.add(barrel);

      // Double-Baffle Muzzle Brake
      const brake = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 3.0), gunMat);
      brake.position.set(0, 0.5, 29.5);
      this.weaponSlot.add(brake);

      // High-Magnification Sniper Scope
      const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.2, 10.0, 10), gunMat);
      scopeBody.rotation.x = Math.PI / 2;
      scopeBody.position.set(0, 3.8, -1.0);
      this.weaponSlot.add(scopeBody);

      // Objective Lens (Emerald Green Anti-Reflective Coating)
      const objectiveLens = new THREE.Mesh(new THREE.CircleGeometry(1.3, 10), sniperLensMat);
      objectiveLens.position.set(0, 3.8, 4.1);
      this.weaponSlot.add(objectiveLens);

      // Eyepiece Lens
      const eyeLens = new THREE.Mesh(new THREE.CircleGeometry(1.1, 10), opticLensMat);
      eyeLens.rotation.y = Math.PI;
      eyeLens.position.set(0, 3.8, -6.1);
      this.weaponSlot.add(eyeLens);

      // Bipod folded forward under barrel
      const bipodL = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6.0, 6), gunMat);
      bipodL.rotation.x = Math.PI / 2;
      bipodL.position.set(-1.0, -1.6, 13.0);
      const bipodR = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6.0, 6), gunMat);
      bipodR.rotation.x = Math.PI / 2;
      bipodR.position.set(1.0, -1.6, 13.0);
      this.weaponSlot.add(bipodL, bipodR);

      // Detachable Box Magazine
      const mag = new THREE.Mesh(new THREE.BoxGeometry(1.8, 5.0, 3.8), gunMat);
      mag.position.set(0, -4.0, -2.0);
      this.weaponSlot.add(mag);

      flash.position.set(0, 0.5, 31.5);
      light.position.set(1.6, 0, 12);
      lightTarget.position.set(1.6, 0, 85);
      return;
    }

    if (weaponId === 'vector' || weaponId === 'smg') {
      // 6. KRISS VECTOR: Super-V Recoil System Housing, Angled Magwell, Picatinny Rail
      const superVBody = new THREE.Mesh(new THREE.BoxGeometry(2.5, 5.5, 11.0), gunMat);
      superVBody.position.set(0, -1.0, 0);
      this.weaponSlot.add(superVBody);

      // Top Full Picatinny Rail
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 12.0), gunMat);
      rail.position.set(0, 2.1, 0);
      this.weaponSlot.add(rail);

      // Short Compensated Barrel
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 6.5, 8), gunMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.8, 8.5);
      this.weaponSlot.add(barrel);

      // Extended Stick Magazine entering at angle in front of grip
      const extMag = new THREE.Mesh(new THREE.BoxGeometry(1.3, 8.0, 2.0), gunMat);
      extMag.position.set(0, -6.0, 2.5);
      extMag.rotation.x = -0.15;
      this.weaponSlot.add(extMag);

      // Skeleton stock
      const skelStock = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.8, 8.0), gunMat);
      skelStock.position.set(0, 0.5, -9.0);
      this.weaponSlot.add(skelStock);

      flash.position.set(0, 0.8, 12.5);
      light.position.set(1.5, -0.5, 7);
      lightTarget.position.set(1.5, -0.5, 45);
      return;
    }

    if (weaponId === 'm4' || weaponId === 'rifle') {
      // 7. M4A1 CARBINE: Upper/Lower Receiver, Quad-Rail, Holographic Sight, Buffer-Tube Stock
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.6, 12.5), gunMat);
      receiver.position.set(0, 0, 0);
      this.weaponSlot.add(receiver);

      // Telescopic Crane Stock on Buffer Tube
      const bufferTube = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 7.0, 8), gunMat);
      bufferTube.rotation.x = Math.PI / 2;
      bufferTube.position.set(0, 0.4, -9.0);
      const stockPad = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.8, 4.0), gunMat);
      stockPad.position.set(0, -0.2, -11.5);
      this.weaponSlot.add(bufferTube, stockPad);

      // Quad-Rail Handguard
      const handguard = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.4, 7.0), gunMat);
      handguard.position.set(0, 0.3, 9.5);
      this.weaponSlot.add(handguard);

      // Barrel & Birdcage Flash Hider
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 12.0, 8), gunMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.3, 15.0);
      this.weaponSlot.add(barrel);

      // EOTech Style Holographic Sight
      const holoFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 3.4), gunMat);
      holoFrame.position.set(0, 3.2, 0.5);
      this.weaponSlot.add(holoFrame);

      const reticle = new THREE.Mesh(new THREE.CircleGeometry(0.8, 8), opticLensMat);
      reticle.position.set(0, 3.2, 2.3);
      this.weaponSlot.add(reticle);

      // Curved STANAG 30-round mag
      const stanagMag = new THREE.Mesh(new THREE.BoxGeometry(1.5, 6.8, 3.6), gunMat);
      stanagMag.position.set(0, -4.4, 1.2);
      stanagMag.rotation.x = 0.15;
      this.weaponSlot.add(stanagMag);

      // Pistol grip
      const grip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.8, 2.0), this.matLeather);
      grip.position.set(0, -3.2, -3.4);
      grip.rotation.x = -0.32;
      this.weaponSlot.add(grip);

      flash.position.set(0, 0.3, 21.5);
      light.position.set(1.6, -0.5, 9);
      lightTarget.position.set(1.6, -0.5, 60);
      return;
    }

    if (weaponId === 'plasma') {
      // 8. ION PLASMA CARBINE: Energy coils, heat sinks
      const plasmaCoilMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const mainChassis = new THREE.Mesh(new THREE.BoxGeometry(2.8, 4.0, 13.0), gunMat);
      this.weaponSlot.add(mainChassis);

      for (let c = 0; c < 3; c++) {
        const coil = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.4, 6, 12), plasmaCoilMat);
        coil.position.set(0, 0.2, 3.0 + c * 3.5);
        this.weaponSlot.add(coil);
      }

      flash.position.set(0, 0.2, 16.0);
      light.position.set(1.6, -0.5, 8);
      lightTarget.position.set(1.6, -0.5, 55);
      return;
    }

    // 9. TACTICAL 9MM SIDEARM (Pistol)
    const slide = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.3, 7.2), gunMat);
    slide.position.set(0, 0, 0);
    this.weaponSlot.add(slide);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 5.0, 8), gunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.2, 4.5);
    this.weaponSlot.add(barrel);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.6, 2.2), this.matLeather);
    grip.position.set(0, -2.6, -1.8);
    grip.rotation.x = -0.28;
    this.weaponSlot.add(grip);

    flash.position.set(0, 0.2, 7.5);
    light.position.set(1.4, -0.5, 5);
    lightTarget.position.set(1.4, -0.5, 40);
  }

  /**
   * Fires a visual muzzle flash burst and tactical light pulse
   */
  public triggerMuzzleFlash() {
    this.matMuzzleFlash.opacity = 1.0;
    this.tacticalFlashlight.intensity = 3.5;
    this.recoilAmount = 0.35;
  }

  /**
   * Per-frame skeletal animation update:
   * Handles natural running stride, hip bob, spine twist, weapon aiming, crouching & roll
   */
  public animate(
    dt: number,
    vx: number,
    vy: number,
    isRolling: boolean,
    isCrouching: boolean,
    isShooting: boolean,
    aimPitch: number = 0,
    isReloading: boolean = false,
    damageFlash: number = 0
  ) {
    const speed = Math.hypot(vx, vy);
    const isMoving = speed > 15;

    // Damage flash material feedback (red tint when shot)
    if (damageFlash > 0.05) {
      this.matArmorPlate.color.setHex(0xef4444);
      this.matVisor.emissive.setHex(0xef4444);
    } else {
      this.matArmorPlate.color.setHex(0x0284c7);
      this.matVisor.emissive.setHex(0x0284c7);
    }

    // Advance walking gait phase
    if (isMoving) {
      this.walkPhase += dt * (speed * 0.052);
    } else {
      // Settle smoothly to idle stance
      this.walkPhase *= 0.85;
    }

    // 1. COMBAT ROLL ANIMATION (360° forward tuck & roll)
    if (isRolling) {
      this.hipsGroup.position.y = 8;
      this.group.rotation.x += dt * 18;
      this.torsoGroup.rotation.x = 0.6;
      this.leftLegGroup.rotation.x = 1.4;
      this.rightLegGroup.rotation.x = 1.4;
      return;
    } else {
      this.group.rotation.x = 0;
    }

    // 2. CROUCH POSTURE
    const targetHipY = isCrouching ? 8.5 : 14.0 + (isMoving ? Math.abs(Math.sin(this.walkPhase * 2)) * 0.8 : 0);
    this.hipsGroup.position.y = THREE.MathUtils.lerp(this.hipsGroup.position.y, targetHipY, dt * 10);

    // 3. LEG SWING & FOOT STRIKE GAIT
    const stride = isMoving ? Math.sin(this.walkPhase) * 0.65 : 0;
    this.leftLegGroup.rotation.x = stride;
    this.rightLegGroup.rotation.x = -stride;

    // Knee bending (backward bend on trailing leg)
    this.leftKneeGroup.rotation.x = Math.max(0, -stride * 0.8);
    this.rightKneeGroup.rotation.x = Math.max(0, stride * 0.8);

    // 4. TORSO COUNTER-TWIST & BREATHING
    const twist = isMoving ? Math.sin(this.walkPhase) * 0.12 : 0;
    this.torsoGroup.rotation.y = -twist;
    this.torsoGroup.rotation.x = isMoving ? 0.15 : (isCrouching ? 0.35 : 0.05);

    // 5. WEAPON RECOIL RECOVERY & AIM PITCH / RELOAD
    this.recoilAmount = Math.max(0, this.recoilAmount - dt * 4.5);

    if (isReloading) {
      // Lower weapon and tilt down during reload
      this.weaponSlot.position.z = 4.0;
      this.weaponSlot.position.y = -12.0;
      this.weaponSlot.rotation.x = 0.55;
      this.leftArmGroup.rotation.x = 0.6;
    } else {
      this.weaponSlot.position.y = -10.0;
      this.weaponSlot.position.z = 6.2 - this.recoilAmount * 3.0;
      this.weaponSlot.rotation.x = -this.recoilAmount * 0.4 + aimPitch;
      this.leftArmGroup.rotation.x = 0;
    }

    // Fade muzzle flash & light
    this.matMuzzleFlash.opacity = Math.max(0, this.matMuzzleFlash.opacity - dt * 12);
    this.tacticalFlashlight.intensity = Math.max(0, this.tacticalFlashlight.intensity - dt * 25);
  }
}
