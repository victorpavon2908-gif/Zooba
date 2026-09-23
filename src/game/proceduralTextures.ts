import * as THREE from 'three';

/**
 * Procedural PBR Texture Generator for Mobile 3D WebGL
 * Generates high-fidelity diffuse, bump, and roughness textures on lightweight
 * offscreen 2D canvases, providing professional material response without heavy asset downloads.
 */

// Helper to create an offscreen canvas
function createOffscreen(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

export class ProceduralTextureManager {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

  /**
   * Tactical Ripstop Fabric Texture (for military suit, vest, and pouches)
   */
  public static getTacticalFabric(baseColorHex: string = '#1e293b', accentColorHex: string = '#0f172a'): THREE.CanvasTexture {
    const key = `tactical_fabric_${baseColorHex}_${accentColorHex}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const { canvas, ctx } = createOffscreen(256, 256);

    // Base color
    ctx.fillStyle = baseColorHex;
    ctx.fillRect(0, 0, 256, 256);

    // Micro ripstop grid pattern
    ctx.strokeStyle = accentColorHex;
    ctx.lineWidth = 1;
    const step = 8;
    for (let x = 0; x < 256; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    for (let y = 0; y < 256; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }

    // Camo / tactical blotches
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    for (let i = 0; i < 40; i++) {
      const rx = Math.random() * 256;
      const ry = Math.random() * 256;
      const rw = 12 + Math.random() * 24;
      const rh = 8 + Math.random() * 18;
      ctx.beginPath();
      ctx.ellipse(rx, ry, rw, rh, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fabric weave noise
    const imgData = ctx.getImageData(0, 0, 256, 256);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 22;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Brushed Gunmetal Steel with edge scratches and panel seams
   */
  public static getGunmetalArmor(): THREE.CanvasTexture {
    const key = 'gunmetal_armor';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const { canvas, ctx } = createOffscreen(256, 256);

    // Dark titanium steel base
    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(0.5, '#334155');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Brushed metal streaks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 90; i++) {
      const y = Math.random() * 256;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y + (Math.random() - 0.5) * 4);
      ctx.stroke();
    }

    // Panel border seam with bevel
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, 244, 244);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(9, 9, 238, 238);

    // Hex rivets in corners
    const rivets = [[16, 16], [240, 16], [16, 240], [240, 240], [128, 16], [128, 240]];
    for (const [rx, ry] of rivets) {
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(rx, ry, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(rx - 1, ry - 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * High-tech Holographic Hexagonal Visor Texture
   */
  public static getCyberVisorTexture(): THREE.CanvasTexture {
    const key = 'cyber_visor';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const { canvas, ctx } = createOffscreen(256, 128);

    // Deep cyan/blue gradient
    const grad = ctx.createLinearGradient(0, 0, 256, 128);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.5, '#38bdf8');
    grad.addColorStop(1, '#0369a1');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);

    // Honeycomb / Hex grid overlay
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.2;
    const r = 10;
    const h = r * Math.sqrt(3);
    for (let y = 0; y < 140; y += h) {
      for (let x = 0; x < 270; x += r * 3) {
        drawHex(ctx, x, y, r);
        drawHex(ctx, x + r * 1.5, y + h / 2, r);
      }
    }

    // Centered tactical reticle scan line
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(40, 63, 176, 2);
    ctx.fillRect(127, 40, 2, 48);

    function drawHex(c: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = cx + radius * Math.cos(angle);
        const hy = cy + radius * Math.sin(angle);
        if (i === 0) c.moveTo(hx, hy);
        else c.lineTo(hx, hy);
      }
      c.closePath();
      c.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Bump Map for Rough Metal & Scratches
   */
  public static getMetalBumpMap(): THREE.CanvasTexture {
    const key = 'metal_bump';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const { canvas, ctx } = createOffscreen(256, 256);
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);

    // Random scratch cuts
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let i = 0; i < 60; i++) {
      const x1 = Math.random() * 256;
      const y1 = Math.random() * 256;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + (Math.random() - 0.5) * 25, y1 + (Math.random() - 0.5) * 25);
      ctx.stroke();
    }

    ctx.strokeStyle = '#404040';
    for (let i = 0; i < 30; i++) {
      const x1 = Math.random() * 256;
      const y1 = Math.random() * 256;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + (Math.random() - 0.5) * 40, y1 + (Math.random() - 0.5) * 40);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Tactical Leather Texture (Boots, Holsters, Belts)
   */
  public static getTacticalLeather(): THREE.CanvasTexture {
    const key = 'tactical_leather';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const { canvas, ctx } = createOffscreen(256, 256);
    ctx.fillStyle = '#1c1917'; // very dark warm charcoal leather
    ctx.fillRect(0, 0, 256, 256);

    // Creases & pores
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + Math.random() * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Leather stitch border
    ctx.strokeStyle = '#78716c';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(8, 8, 240, 240);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Weathered Concrete with Cracks & Moss Stains
   */
  public static getWeatheredConcrete(): THREE.CanvasTexture {
    const key = 'weathered_concrete';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const { canvas, ctx } = createOffscreen(256, 256);
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, 256, 256);

    // Speckles & aggregates
    const imgData = ctx.getImageData(0, 0, 256, 256);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 45;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    // Cracks
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(55, 70);
    ctx.lineTo(40, 140);
    ctx.lineTo(85, 210);
    ctx.lineTo(70, 256);
    ctx.stroke();

    // Moss / dirt stain
    const mossGrad = ctx.createRadialGradient(200, 200, 10, 200, 200, 70);
    mossGrad.addColorStop(0, 'rgba(21, 128, 61, 0.4)');
    mossGrad.addColorStop(1, 'rgba(21, 128, 61, 0)');
    ctx.fillStyle = mossGrad;
    ctx.fillRect(120, 120, 136, 136);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Industrial Hazard Warning Stripes (Doors, Generator Pads)
   */
  public static getHazardStripes(): THREE.CanvasTexture {
    const key = 'hazard_stripes';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const { canvas, ctx } = createOffscreen(256, 256);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = '#f59e0b'; // caution yellow
    const stripeW = 32;
    for (let x = -256; x < 512; x += stripeW * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeW, 0);
      ctx.lineTo(x + stripeW + 256, 256);
      ctx.lineTo(x + 256, 256);
      ctx.closePath();
      ctx.fill();
    }

    // Weathering grime
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Rocky Cliff & Mountain Strata Texture
   */
  public static getMountainStrata(): THREE.CanvasTexture {
    const key = 'mountain_strata';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const { canvas, ctx } = createOffscreen(256, 256);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 256, 256);

    // Horizontal strata layers
    const layerColors = ['#1e293b', '#475569', '#374151', '#1f2937', '#64748b'];
    for (let y = 0; y < 256; y += 16 + Math.random() * 20) {
      ctx.fillStyle = layerColors[Math.floor(Math.random() * layerColors.length)];
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 256; x += 32) {
        ctx.lineTo(x, y + (Math.random() - 0.5) * 8);
      }
      ctx.lineTo(256, y + 25);
      ctx.lineTo(0, y + 25);
      ctx.closePath();
      ctx.fill();
    }

    // Grain
    const imgData = ctx.getImageData(0, 0, 256, 256);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 35;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Robot Sci-Fi Chassis Armor Texture (Panels, Air Vents & Rivets)
   */
  public static getRobotChassisTexture(colorHex: string = '#ef4444'): THREE.CanvasTexture {
    const key = `robot_chassis_${colorHex}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const { canvas, ctx } = createOffscreen(256, 256);
    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, 256, 256);

    // Beveled armor plates
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 236, 236);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, 232, 232);

    // Cooling air vent grilles
    ctx.fillStyle = '#090d16';
    for (let y = 60; y < 140; y += 12) {
      ctx.fillRect(40, y, 176, 5);
    }

    // Hazard stencil or unit code
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('UNIT-7', 42, 190);

    // Edge wear highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(0, 0, 256, 4);
    ctx.fillRect(0, 0, 4, 256);

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }
}
