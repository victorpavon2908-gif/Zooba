import { Mountain3D, Cave3D, House3D, MilitaryFacility3D, Vegetation3D, Rock3D, Furniture3D } from '../types';

/**
 * Procedural and Structured 3D Terrain & World Geometry
 */

export function getTerrainHeight(x: number, y: number, mountains: Mountain3D[] = []): number {
  // Check if close to mountain peaks
  let mountainElevation = 0;
  for (const m of mountains) {
    const dist = Math.hypot(x - m.x, y - m.y);
    if (dist < m.radius) {
      const norm = 1 - dist / m.radius;
      // Smooth bell curve elevation
      const curve = Math.sin(norm * (Math.PI / 2));
      mountainElevation += curve * curve * m.peakHeight;
    }
  }

  // Base subtle rolling terrain waves
  const baseRoll = Math.sin(x * 0.003) * Math.cos(y * 0.003) * 12 +
                   Math.sin(x * 0.008 + 1.2) * Math.cos(y * 0.007) * 5;

  return baseRoll + mountainElevation;
}

// Generate rich, structured 3D world elements
export function createWorldStructures(arenaSize: number): {
  houses: House3D[];
  caves: Cave3D[];
  mountains: Mountain3D[];
  militaryFacilities: MilitaryFacility3D[];
  vegetation: Vegetation3D[];
  rocks: Rock3D[];
} {
  // 1. Mountains and natural barriers
  const mountains: Mountain3D[] = [
    { id: 1, x: 250, y: 250, radius: 240, peakHeight: 70, roughness: 0.8 },
    { id: 2, x: arenaSize - 300, y: 280, radius: 260, peakHeight: 85, roughness: 0.9 },
    { id: 3, x: 220, y: arenaSize - 350, radius: 220, peakHeight: 65, roughness: 0.7 },
    { id: 4, x: arenaSize - 280, y: arenaSize - 280, radius: 250, peakHeight: 80, roughness: 0.8 },
    { id: 5, x: arenaSize / 2 + 150, y: 320, radius: 180, peakHeight: 50, roughness: 0.6 },
  ];

  // 2. Abandoned Houses with 3D rooms & furniture
  const houses: House3D[] = [
    {
      id: 1,
      name: 'Casa del Vigía (Ruinas)',
      x: 520,
      y: 480,
      width: 140,
      depth: 120,
      height: 48,
      rotation: 0,
      doorX: 520,
      doorY: 540,
      doorWidth: 32,
      doorWall: 'south',
      hasRoof: false, // Partially destroyed / open roof for tactical visibility
      isRuined: true,
      lootCrates: [1, 2],
      furniture: [
        { id: 101, type: 'table', x: 500, y: 460, z: 0, width: 26, depth: 18, height: 14, rotation: 0.2 },
        { id: 102, type: 'chair', x: 485, y: 460, z: 0, width: 10, depth: 10, height: 16, rotation: 0.4 },
        { id: 103, type: 'bed', x: 550, y: 450, z: 0, width: 34, depth: 22, height: 12, rotation: 0 },
        { id: 104, type: 'debris', x: 530, y: 490, z: 0, width: 20, depth: 16, height: 8, rotation: 0.8 },
      ],
    },
    {
      id: 2,
      name: 'Puesto Avanzado Colonial',
      x: arenaSize - 620,
      y: 520,
      width: 160,
      depth: 130,
      height: 52,
      rotation: 0.3,
      doorX: arenaSize - 620,
      doorY: 585,
      doorWidth: 34,
      doorWall: 'south',
      hasRoof: false,
      isRuined: true,
      lootCrates: [3, 4],
      furniture: [
        { id: 201, type: 'wardrobe', x: arenaSize - 660, y: 490, z: 0, width: 28, depth: 16, height: 26, rotation: 0.3 },
        { id: 202, type: 'table', x: arenaSize - 610, y: 510, z: 0, width: 24, depth: 20, height: 14, rotation: -0.1 },
        { id: 203, type: 'chair', x: arenaSize - 595, y: 510, z: 0, width: 10, depth: 10, height: 16, rotation: -0.5 },
        { id: 204, type: 'debris', x: arenaSize - 630, y: 540, z: 0, width: 22, depth: 18, height: 9, rotation: 1.2 },
      ],
    },
    {
      id: 3,
      name: 'Refugio de Mineros Abandonado',
      x: 640,
      y: arenaSize - 620,
      width: 150,
      depth: 110,
      height: 46,
      rotation: -0.2,
      doorX: 640,
      doorY: arenaSize - 565,
      doorWidth: 32,
      doorWall: 'north',
      hasRoof: false,
      isRuined: true,
      lootCrates: [5],
      furniture: [
        { id: 301, type: 'cabinet', x: 610, y: arenaSize - 640, z: 0, width: 24, depth: 14, height: 24, rotation: -0.2 },
        { id: 302, type: 'bed', x: 670, y: arenaSize - 640, z: 0, width: 32, depth: 20, height: 12, rotation: -0.2 },
        { id: 303, type: 'debris', x: 635, y: arenaSize - 610, z: 0, width: 18, depth: 18, height: 7, rotation: 0.5 },
      ],
    },
    {
      id: 4,
      name: 'Armería Secreta en Ruinas',
      x: arenaSize - 580,
      y: arenaSize - 600,
      width: 170,
      depth: 140,
      height: 55,
      rotation: 0,
      doorX: arenaSize - 580,
      doorY: arenaSize - 530,
      doorWidth: 36,
      doorWall: 'south',
      hasRoof: false,
      isRuined: true,
      lootCrates: [6, 7],
      furniture: [
        { id: 401, type: 'desk', x: arenaSize - 610, y: arenaSize - 630, z: 0, width: 30, depth: 18, height: 15, rotation: 0 },
        { id: 402, type: 'cabinet', x: arenaSize - 550, y: arenaSize - 630, z: 0, width: 26, depth: 14, height: 28, rotation: 0 },
        { id: 403, type: 'debris', x: arenaSize - 570, y: arenaSize - 580, z: 0, width: 24, depth: 20, height: 10, rotation: 1.5 },
      ],
    },
  ];

  // 3. Explorable Caves and Caverns
  const caves: Cave3D[] = [
    {
      id: 1,
      name: 'Caverna Subterránea del Eco',
      entranceX: 380,
      entranceY: 360,
      interiorX: 320,
      interiorY: 300,
      radius: 90,
      tunnelLength: 120,
      tunnelAngle: -2.3,
      ambientLightColor: '#06b6d4', // bioluminescent cyan
      hasWater: true,
      stalagmitesCount: 14,
      treasureCrateId: 8,
    },
    {
      id: 2,
      name: 'Cueva de los Túneles Prohibidos',
      entranceX: arenaSize - 440,
      entranceY: arenaSize - 450,
      interiorX: arenaSize - 380,
      interiorY: arenaSize - 390,
      radius: 105,
      tunnelLength: 140,
      tunnelAngle: 0.8,
      ambientLightColor: '#a855f7', // crystalline purple
      hasWater: false,
      stalagmitesCount: 18,
      treasureCrateId: 9,
    },
  ];

  // 4. High-Tech Military Facility & Factory
  const militaryFacilities: MilitaryFacility3D[] = [
    {
      id: 1,
      name: 'Complejo de Enlace Satelital y Fábrica Alfa',
      x: arenaSize / 2,
      y: arenaSize / 2 - 180,
      width: 220,
      depth: 160,
      height: 65,
      hasAntenna: true,
      hasGenerators: true,
      hasPipes: true,
      alarmActive: false,
    },
    {
      id: 2,
      name: 'Búnker de Investigación Nanotecnológica',
      x: arenaSize / 2 + 180,
      y: arenaSize / 2 + 200,
      width: 180,
      depth: 140,
      height: 50,
      hasAntenna: false,
      hasGenerators: true,
      hasPipes: true,
      alarmActive: false,
    },
  ];

  // 5. Stylized Vegetation (Trees, Bushes)
  const vegetation: Vegetation3D[] = [];
  let vegId = 1;
  const vegCoords = [
    // Grove 1
    { x: 420, y: 720 }, { x: 460, y: 760 }, { x: 490, y: 710 }, { x: 440, y: 800 },
    // Grove 2
    { x: arenaSize - 420, y: 750 }, { x: arenaSize - 480, y: 790 }, { x: arenaSize - 390, y: 820 },
    // Grove 3
    { x: 750, y: 380 }, { x: 800, y: 420 }, { x: 840, y: 360 },
    // Grove 4 near center
    { x: arenaSize / 2 - 220, y: arenaSize / 2 - 60 }, { x: arenaSize / 2 - 280, y: arenaSize / 2 },
    // Southern groves
    { x: arenaSize / 2 - 320, y: arenaSize - 450 }, { x: arenaSize / 2 - 260, y: arenaSize - 490 },
    { x: arenaSize / 2 + 350, y: arenaSize - 520 }, { x: arenaSize / 2 + 400, y: arenaSize - 470 },
  ];

  for (const c of vegCoords) {
    vegetation.push({
      id: vegId++,
      type: 'tree',
      x: c.x,
      y: c.y,
      scale: 0.85 + Math.random() * 0.4,
      rotation: Math.random() * Math.PI * 2,
    });
    // Add small shrubs nearby
    vegetation.push({
      id: vegId++,
      type: 'bush',
      x: c.x + (Math.random() - 0.5) * 35,
      y: c.y + (Math.random() - 0.5) * 35,
      scale: 0.6 + Math.random() * 0.5,
      rotation: Math.random() * Math.PI * 2,
    });
  }

  // 6. Jagged 3D Rocks and Boulders
  const rocks: Rock3D[] = [
    { id: 1, x: 320, y: 550, radius: 18, height: 16, rotation: 0.4 },
    { id: 2, x: 350, y: 570, radius: 24, height: 22, rotation: 1.1 },
    { id: 3, x: arenaSize - 360, y: 420, radius: 22, height: 20, rotation: 0.8 },
    { id: 4, x: arenaSize - 400, y: 440, radius: 28, height: 25, rotation: 2.3 },
    { id: 5, x: 560, y: arenaSize - 420, radius: 20, height: 18, rotation: 1.7 },
    { id: 6, x: arenaSize / 2 - 120, y: arenaSize / 2 + 140, radius: 26, height: 24, rotation: 0.5 },
    { id: 7, x: arenaSize / 2 + 260, y: arenaSize / 2 - 90, radius: 22, height: 19, rotation: 2.9 },
  ];

  return { houses, caves, mountains, militaryFacilities, vegetation, rocks };
}
