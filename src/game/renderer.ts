/**
 * High-Performance Isometric 2.5D Canvas Renderer for Bounty Run 2D.
 * Features dynamic lighting, crisp pixel-adjusted lines, 360-degree weapon aiming,
 * particle effects, and authentic warehouse extraction aesthetics.
 */

import { Player, Enemy, Bullet, Particle, FloorDecal, Crate, Barrel, Wall, ExtractionZone, FloatingText, Grenade, HealthStation, HealthPickup, GlooWall, WarStructure } from '../types';

export class IsometricRenderer {
  // Isometric scale factors with dynamic adaptive calculation
  public static ZOOM = 1.35;
  public static ISO_COS = 0.866025 * 1.35; // cos(30°) * zoom
  public static ISO_SIN = 0.5 * 1.35;      // sin(30°) * zoom
  private static lastW = 0;
  private static lastH = 0;

  /**
   * Adapts camera zoom to phone / tablet / wide aspect ratio so field of view
   * is balanced, neither zoomed in too close on small screens nor too miniature on large tablets.
   */
  public static updateAdaptiveCamera(canvasW: number, canvasH: number): number {
    if (canvasW === this.lastW && canvasH === this.lastH) {
      return this.ZOOM;
    }
    this.lastW = canvasW;
    this.lastH = canvasH;

    const minDim = Math.min(canvasW, canvasH);
    const maxDim = Math.max(canvasW, canvasH);
    const aspect = maxDim / Math.max(1, minDim);

    let zoom = 1.32;
    // Small phone screen (e.g. height < 380 in landscape)
    if (minDim < 370) {
      zoom = 1.15; // Pull back slightly for wider tactical peripheral vision
    } else if (minDim < 430) {
      zoom = 1.25; // Standard modern phone (e.g. 390x844)
    } else if (minDim >= 700) {
      // Tablets (iPad 768x1024, iPad Pro 1024x1366, 16:10 Android tablets)
      // On tablets, minDim is 700+, we scale comfortably so heroes and enemies aren't tiny dots
      zoom = Math.min(1.52, 1.32 + ((minDim - 430) / 600) * 0.22);
    } else {
      // Large phones / small tablets
      zoom = 1.25 + ((minDim - 430) / 270) * 0.08;
    }

    // Aspect ratio compensator: if ultra-wide (>= 2.1:1, e.g. 20:9 or 21:9), height is tighter
    if (aspect > 2.05 && minDim < 460) {
      zoom *= 0.96;
    }

    this.ZOOM = zoom;
    this.ISO_COS = 0.866025 * zoom;
    this.ISO_SIN = 0.5 * zoom;
    return zoom;
  }

  public static toScreen(
    worldX: number,
    worldY: number,
    camX: number,
    camY: number,
    canvasW: number,
    canvasH: number
  ): { x: number; y: number } {
    this.updateAdaptiveCamera(canvasW, canvasH);
    const dx = worldX - camX;
    const dy = worldY - camY;
    return {
      x: (dx - dy) * IsometricRenderer.ISO_COS + canvasW / 2,
      y: (dx + dy) * IsometricRenderer.ISO_SIN + canvasH / 2,
    };
  }

  public static toWorld(
    screenX: number,
    screenY: number,
    camX: number,
    camY: number,
    canvasW: number,
    canvasH: number
  ): { x: number; y: number } {
    this.updateAdaptiveCamera(canvasW, canvasH);
    const sx = screenX - canvasW / 2;
    const sy = screenY - canvasH / 2;
    const isoFactor = sx / IsometricRenderer.ISO_COS;
    const yFactor = sy / IsometricRenderer.ISO_SIN;
    return {
      x: (isoFactor + yFactor) * 0.5 + camX,
      y: (yFactor - isoFactor) * 0.5 + camY,
    };
  }

  /**
   * Main render method
   */
  public static render(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    camX: number,
    camY: number,
    player: Player,
    enemies: Enemy[],
    bullets: Bullet[],
    grenades: Grenade[] = [],
    particles: Particle[],
    decals: FloorDecal[],
    crates: Crate[],
    barrels: Barrel[],
    walls: Wall[],
    extraction: ExtractionZone,
    floatingTexts: FloatingText[],
    arenaSize: number,
    theme: 'warehouse' | 'biohazard' | 'military',
    highGraphics: boolean,
    healthStations: HealthStation[] = [],
    healthPickups: HealthPickup[] = [],
    glooWalls: GlooWall[] = [],
    warStructures: WarStructure[] = []
  ) {
    const dpr = window.devicePixelRatio || 1;
    // Calculate logical screen size in CSS pixels for pixel-perfect viewport centering
    const w = canvas.clientWidth || (canvas.width / dpr);
    const h = canvas.clientHeight || (canvas.height / dpr);

    this.updateAdaptiveCamera(w, h);

    ctx.save();
    // Configure crisp DPI scaling
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear background using logical viewport dimensions
    ctx.fillStyle = theme === 'biohazard' ? '#07120d' : theme === 'military' ? '#120b0e' : '#0a0f16';
    ctx.fillRect(0, 0, w, h);

    // 1. Draw Floor Grid & Decals
    this.drawFloor(ctx, camX, camY, w, h, arenaSize, theme);
    this.drawDecals(ctx, decals, camX, camY, w, h);

    // 2. Draw Extraction Pad (base floor layer)
    this.drawExtractionPad(ctx, extraction, camX, camY, w, h);

    // 3. Render all physical entities in depth-sorted order (worldX + worldY determines Z in 2:1 isometric)
    interface RenderItem {
      depth: number;
      draw: () => void;
    }

    const renderQueue: RenderItem[] = [];

    // Health Stations (rendered with base platform)
    healthStations.forEach((hs) => {
      const depth = hs.x + hs.y;
      renderQueue.push({
        depth,
        draw: () => this.drawHealthStation(ctx, hs, camX, camY, w, h),
      });
    });

    // Health Pickups (floating nanite cores and medkits)
    healthPickups.forEach((hp) => {
      if (hp.collected) return;
      const depth = hp.x + hp.y;
      renderQueue.push({
        depth,
        draw: () => this.drawHealthPickup(ctx, hp, camX, camY, w, h),
      });
    });

    // 3D WAR WORLD: ruined houses, bunkers, trucks, rubble and broken walls
    warStructures.forEach((structure) => {
      if (structure.type === 'room_floor') return;
      const depth = structure.x + structure.y + structure.w * 0.5 + structure.h * 0.5;
      renderQueue.push({ depth, draw: () => this.drawWarStructure(ctx, structure, camX, camY, w, h, theme) });
    });

    // Deployable Gloo Walls
    glooWalls.forEach((gloo) => {
      const depth = gloo.x + gloo.y;
      renderQueue.push({ depth, draw: () => this.drawGlooWall(ctx, gloo, camX, camY, w, h) });
    });

    // Walls
    walls.forEach((wall) => {
      // Depth of wall is near its front corner
      const depth = wall.x + wall.w * 0.5 + wall.y + wall.h * 0.5;
      renderQueue.push({
        depth,
        draw: () => this.drawWall(ctx, wall, camX, camY, w, h, theme),
      });
    });

    // Crates
    crates.forEach((crate) => {
      const depth = crate.x + crate.y;
      renderQueue.push({
        depth,
        draw: () => this.drawCrate(ctx, crate, camX, camY, w, h),
      });
    });

    // Barrels
    barrels.forEach((barrel) => {
      const depth = barrel.x + barrel.y;
      renderQueue.push({
        depth,
        draw: () => this.drawBarrel(ctx, barrel, camX, camY, w, h),
      });
    });

    // Enemies (Pro Combat Robots)
    enemies.forEach((enemy) => {
      if (enemy.state === 'dead') return;
      const depth = enemy.x + enemy.y;
      renderQueue.push({
        depth,
        draw: () => this.drawEnemy(ctx, enemy, camX, camY, w, h),
      });
    });

    // Grenades in mid-air (depth-sorted by planar ground shadow)
    grenades.forEach((grenade) => {
      const depth = grenade.x + grenade.y;
      renderQueue.push({
        depth,
        draw: () => this.drawGrenade(ctx, grenade, camX, camY, w, h),
      });
    });

    // Player
    const playerDepth = player.x + player.y;
    renderQueue.push({
      depth: playerDepth,
      draw: () => this.drawPlayer(ctx, player, camX, camY, w, h),
    });

    // Sort back-to-front
    renderQueue.sort((a, b) => a.depth - b.depth);
    renderQueue.forEach((item) => item.draw());

    // 4. Draw Targeted Lock-on Reticle & Laser Guide Beam on currently targeted robot
    if (player.aimLockedTargetId !== null) {
      const targetedEnemy = enemies.find((e) => e.id === player.aimLockedTargetId && e.state !== 'dead');
      if (targetedEnemy) {
        this.drawLaserSightBeam(ctx, player, targetedEnemy, camX, camY, w, h);
        this.drawTargetLockOnReticle(ctx, targetedEnemy, camX, camY, w, h);
      }
    }

    // 5. Draw Bullets & Particle Effects
    this.drawBullets(ctx, bullets, camX, camY, w, h);
    this.drawParticles(ctx, particles, camX, camY, w, h);

    // 6. Draw Extraction Hologram and Light Beams (in front of characters)
    this.drawExtractionHologram(ctx, extraction, camX, camY, w, h);

    // 7. Atmospheric Lighting & Vignette
    if (highGraphics) {
      this.drawLightingOverlay(ctx, w, h, camX, camY, player, barrels, extraction, theme);
    }

    // 8. Floating Combat / Loot Texts
    this.drawFloatingTexts(ctx, floatingTexts, camX, camY, w, h);

    ctx.restore();
  }

  private static drawFloor(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    w: number,
    h: number,
    arenaSize: number,
    theme: 'warehouse' | 'biohazard' | 'military'
  ) {
    const tileSize = 60;
    const startTileX = -120;
    const endTileX = arenaSize + 120;
    const startTileY = -120;
    const endTileY = arenaSize + 120;

    ctx.lineWidth = 1;

    for (let x = startTileX; x < endTileX; x += tileSize) {
      for (let y = startTileY; y < endTileY; y += tileSize) {
        const p1 = this.toScreen(x, y, camX, camY, w, h);
        const p2 = this.toScreen(x + tileSize, y, camX, camY, w, h);
        const p3 = this.toScreen(x + tileSize, y + tileSize, camX, camY, w, h);
        const p4 = this.toScreen(x, y + tileSize, camX, camY, w, h);

        // Quick culling
        if (
          Math.max(p1.x, p2.x, p3.x, p4.x) < -50 ||
          Math.min(p1.x, p2.x, p3.x, p4.x) > w + 50 ||
          Math.max(p1.y, p2.y, p3.y, p4.y) < -50 ||
          Math.min(p1.y, p2.y, p3.y, p4.y) > h + 50
        ) {
          continue;
        }

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();

        // Floor tile colors for subterranean bunker
        const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        if (theme === 'biohazard') {
          ctx.fillStyle = hash > 0.85 ? '#0e2319' : hash > 0.4 ? '#091c13' : '#071810';
        } else if (theme === 'military') {
          ctx.fillStyle = hash > 0.85 ? '#24141c' : hash > 0.4 ? '#180d13' : '#13090f';
        } else {
          // Subterranean bunker bedrock & industrial reinforced slab
          ctx.fillStyle = hash > 0.85 ? '#1b2636' : hash > 0.4 ? '#111923' : '#0a1017';
        }
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.stroke();

        // 1. Rejillas de ventilación y drenaje subterráneo en intersecciones periódicas
        if ((x + y) % 360 === 0 && hash > 0.3) {
          ctx.save();
          ctx.beginPath();
          const cx = (p1.x + p3.x) * 0.5;
          const cy = (p1.y + p3.y) * 0.5;
          ctx.ellipse(cx, cy, 18, 9, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(5, 8, 12, 0.75)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Ranuras de ventilación metálicas
          for (let s = -8; s <= 8; s += 4) {
            ctx.beginPath();
            ctx.moveTo(cx + s, cy - 4);
            ctx.lineTo(cx + s, cy + 4);
            ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.lineWidth = 1.4;
            ctx.stroke();
          }
          ctx.restore();
        }

        // 2. Franjas de advertencia táctica (Hazard Stripes) en umbrales de pasillos y escondites
        const isCorridorThreshold = (y === 960 || y === 2040 || x === 1560) && (x % 120 < 60);
        if (isCorridorThreshold || ((x === 0 || x === arenaSize - tileSize || y === 0 || y === arenaSize - tileSize) && hash > 0.5)) {
          ctx.fillStyle = 'rgba(234, 179, 8, 0.12)';
          ctx.fill();
        }
      }
    }
  }

  private static drawDecals(
    ctx: CanvasRenderingContext2D,
    decals: FloorDecal[],
    camX: number,
    camY: number,
    w: number,
    h: number
  ) {
    decals.forEach((decal) => {
      const pos = this.toScreen(decal.x, decal.y, camX, camY, w, h);
      ctx.save();
      ctx.globalAlpha = decal.alpha;
      ctx.fillStyle = decal.color;
      ctx.beginPath();
      // Draw squashed isometric circle
      ctx.ellipse(pos.x, pos.y, decal.size, decal.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private static drawGlooWall(ctx: CanvasRenderingContext2D, gloo: GlooWall, camX: number, camY: number, w: number, h: number) {
    const p = this.toScreen(gloo.x, gloo.y, camX, camY, w, h);
    const pulse = 0.7 + Math.sin(gloo.pulsePhase) * 0.15;
    const wallW = Math.max(60, gloo.width * 1.25);
    const wallH = Math.max(42, gloo.height || 60);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(gloo.angle * 0.35);
    ctx.shadowColor = 'rgba(34,211,238,0.9)'; ctx.shadowBlur = 18;
    ctx.fillStyle = `rgba(56,189,248,${0.24 * pulse})`;
    ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-wallW*0.5,8); ctx.lineTo(-wallW*0.38,-wallH); ctx.lineTo(-wallW*0.12,-wallH-12);
    ctx.lineTo(wallW*0.12,-wallH-5); ctx.lineTo(wallW*0.38,-wallH-14); ctx.lineTo(wallW*0.5,8); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(207,250,254,0.75)'; ctx.lineWidth = 1;
    for (let x=-wallW*0.35; x<=wallW*0.35; x+=wallW*0.18) { ctx.beginPath(); ctx.moveTo(x,-wallH+8); ctx.lineTo(x*0.92,0); ctx.stroke(); }
    const hp=Math.max(0,Math.min(1,gloo.health/Math.max(1,gloo.maxHealth)));
    ctx.fillStyle='rgba(2,6,23,0.8)'; ctx.fillRect(-wallW*0.5,16,wallW,5);
    ctx.fillStyle='#22d3ee'; ctx.fillRect(-wallW*0.5,16,wallW*hp,5);
    ctx.restore();
  }

  private static drawWarStructure(ctx: CanvasRenderingContext2D, structure: WarStructure, camX: number, camY: number, w: number, h: number, theme: string) {
    const b0=this.toScreen(structure.x,structure.y,camX,camY,w,h), b1=this.toScreen(structure.x+structure.w,structure.y,camX,camY,w,h), b2=this.toScreen(structure.x+structure.w,structure.y+structure.h,camX,camY,w,h), b3=this.toScreen(structure.x,structure.y+structure.h,camX,camY,w,h);
    const height=Math.max(8,structure.height3D||18), t0={x:b0.x,y:b0.y-height}, t1={x:b1.x,y:b1.y-height}, t2={x:b2.x,y:b2.y-height}, t3={x:b3.x,y:b3.y-height};
    ctx.save();
    let front='#3f4752',side='#202733',roof='#59636e';
    if(structure.type==='ruined_house'){front='#6b6255';side='#38332e';roof='#817767';}
    if(structure.type==='military_truck'){front='#46534b';side='#28332e';roof='#65746a';}
    if(structure.type==='sandbag_bunker'){front='#8a795e';side='#514834';roof='#a28d6e';}
    if(structure.type==='rubble_pile'){front='#77736d';side='#4d4a46';roof='#96918a';}
    if(structure.type==='barbed_wire'){front='#4b5563';side='#1f2937';roof='#64748b';}
    ctx.shadowColor='rgba(0,0,0,0.6)';ctx.shadowBlur=12;ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse((b0.x+b2.x)/2,(b0.y+b2.y)/2+10,Math.max(30,Math.abs(b1.x-b0.x)*0.45),Math.max(12,Math.abs(b3.y-b0.y)*0.35),0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.beginPath();ctx.moveTo(b1.x,b1.y);ctx.lineTo(b2.x,b2.y);ctx.lineTo(t2.x,t2.y);ctx.lineTo(t1.x,t1.y);ctx.closePath();ctx.fillStyle=side;ctx.fill();ctx.strokeStyle='rgba(255,255,255,0.16)';ctx.stroke();
    ctx.beginPath();ctx.moveTo(b3.x,b3.y);ctx.lineTo(b2.x,b2.y);ctx.lineTo(t2.x,t2.y);ctx.lineTo(t3.x,t3.y);ctx.closePath();ctx.fillStyle=front;ctx.fill();ctx.strokeStyle='rgba(0,0,0,0.45)';ctx.stroke();
    ctx.beginPath();ctx.moveTo(t0.x,t0.y);ctx.lineTo(t1.x,t1.y);ctx.lineTo(t2.x,t2.y);ctx.lineTo(t3.x,t3.y);ctx.closePath();ctx.fillStyle=roof;ctx.fill();ctx.strokeStyle='rgba(255,255,255,0.18)';ctx.stroke();
    if(structure.type==='ruined_house'){
      const mx=(t3.x+t2.x)/2,my=(t3.y+t2.y)/2;ctx.fillStyle='rgba(10,10,10,0.72)';ctx.fillRect(mx-34,my-10,68,26);ctx.strokeStyle='rgba(234,179,8,0.75)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(t3.x,t3.y);ctx.lineTo(t2.x,t2.y);ctx.stroke();ctx.strokeStyle='rgba(239,68,68,0.65)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(mx-18,my-8);ctx.lineTo(mx+6,my+10);ctx.moveTo(mx+18,my-8);ctx.lineTo(mx-5,my+10);ctx.stroke();
    }
    if(structure.type==='military_truck'){ctx.fillStyle='rgba(15,23,42,0.85)';ctx.beginPath();ctx.ellipse((b3.x+b2.x)/2,(b3.y+b2.y)/2-8,24,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111827';ctx.beginPath();ctx.arc(b3.x+18,b3.y+3,10,0,Math.PI*2);ctx.arc(b2.x-18,b2.y+3,10,0,Math.PI*2);ctx.fill();}
    if(structure.label){const lx=(t3.x+t2.x)/2,ly=(t3.y+t2.y)/2-height*0.12;ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillStyle='rgba(226,232,240,0.78)';ctx.fillText(structure.label,lx,ly);}
    ctx.restore();
  }

  private static drawWall(
    ctx: CanvasRenderingContext2D,
    wall: Wall,
    camX: number,
    camY: number,
    w: number,
    h: number,
    theme: string
  ) {
    const wallH = wall.height3D || 55;

    // Corner points in world coords
    const x0 = wall.x;
    const y0 = wall.y;
    const x1 = wall.x + wall.w;
    const y1 = wall.y + wall.h;

    // Base floor corners
    const b0 = this.toScreen(x0, y0, camX, camY, w, h);
    const b1 = this.toScreen(x1, y0, camX, camY, w, h);
    const b2 = this.toScreen(x1, y1, camX, camY, w, h);
    const b3 = this.toScreen(x0, y1, camX, camY, w, h);

    // Top elevated corners (y - wallH)
    const t0 = { x: b0.x, y: b0.y - wallH };
    const t1 = { x: b1.x, y: b1.y - wallH };
    const t2 = { x: b2.x, y: b2.y - wallH };
    const t3 = { x: b3.x, y: b3.y - wallH };

    // 1. High-Quality Contact Drop Shadow on Floor
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(b3.x, b3.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(b2.x + 14, b2.y + 10);
    ctx.lineTo(b3.x - 10, b3.y + 10);
    ctx.closePath();
    const shadowGrad = ctx.createLinearGradient(b3.x, b3.y, b3.x, b3.y + 12);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = shadowGrad;
    ctx.fill();
    ctx.restore();

    // 2. Right Facing Wall (b1, b2, t2, t1) - Metallic Dark Panel
    ctx.beginPath();
    ctx.moveTo(b1.x, b1.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(t1.x, t1.y);
    ctx.closePath();
    const rightGrad = ctx.createLinearGradient(b1.x, b1.y, t2.x, t2.y);
    if (theme === 'biohazard') {
      rightGrad.addColorStop(0, '#0a1d13');
      rightGrad.addColorStop(1, '#133522');
    } else {
      rightGrad.addColorStop(0, '#0f172a');
      rightGrad.addColorStop(1, '#1e293b');
    }
    ctx.fillStyle = rightGrad;
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 3. Front Facing Wall (b3, b2, t2, t3) - High-Fidelity Armor Plating
    ctx.beginPath();
    ctx.moveTo(b3.x, b3.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(t3.x, t3.y);
    ctx.closePath();
    const frontGrad = ctx.createLinearGradient(b3.x, b3.y, t3.x, t3.y);
    if (theme === 'biohazard') {
      frontGrad.addColorStop(0, '#0f291b');
      frontGrad.addColorStop(0.5, '#19422b');
      frontGrad.addColorStop(1, '#245a3c');
    } else {
      frontGrad.addColorStop(0, '#141d27');
      frontGrad.addColorStop(0.5, '#1e2c3b');
      frontGrad.addColorStop(1, '#2d3f54');
    }
    ctx.fillStyle = frontGrad;
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // 4. Modular Wall Struts, I-Beams & Rivets
    const wallLen = Math.hypot(b2.x - b3.x, b2.y - b3.y);
    if (wallLen > 45) {
      const numRibs = Math.floor(wallLen / 42);
      for (let i = 1; i <= numRibs; i++) {
        const factor = i / (numRibs + 1);
        const bx = b3.x + (b2.x - b3.x) * factor;
        const by = b3.y + (b2.y - b3.y) * factor;
        const tx = t3.x + (t2.x - t3.x) * factor;
        const ty = t3.y + (t2.y - t3.y) * factor;

        // Structural Pillar Column
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        // Rivet Screws on Pillar
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(bx + (tx - bx) * 0.2, by + (ty - by) * 0.2, 1.3, 0, Math.PI * 2);
        ctx.arc(bx + (tx - bx) * 0.5, by + (ty - by) * 0.5, 1.3, 0, Math.PI * 2);
        ctx.arc(bx + (tx - bx) * 0.8, by + (ty - by) * 0.8, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. Glowing Cybernetic Conduit Line running horizontally along wall
    const conduitOffset = 0.45;
    const cLeftX = b3.x + (t3.x - b3.x) * conduitOffset;
    const cLeftY = b3.y + (t3.y - b3.y) * conduitOffset;
    const cRightX = b2.x + (t2.x - b2.x) * conduitOffset;
    const cRightY = b2.y + (t2.y - b2.y) * conduitOffset;

    ctx.save();
    ctx.strokeStyle = theme === 'biohazard' ? '#22c55e' : '#38bdf8';
    ctx.shadowColor = theme === 'biohazard' ? '#22c55e' : '#0284c7';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cLeftX, cLeftY);
    ctx.lineTo(cRightX, cRightY);
    ctx.stroke();
    ctx.restore();

    // 6. Top Roof Face with Hazard Stripes and Metallic Bevel
    ctx.beginPath();
    ctx.moveTo(t0.x, t0.y);
    ctx.lineTo(t1.x, t1.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(t3.x, t3.y);
    ctx.closePath();
    ctx.fillStyle = theme === 'biohazard' ? '#1b4d32' : '#33475b';
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Hazard Chevron Warning Edge along top parapet
    ctx.save();
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.7)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(t3.x, t3.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.stroke();
    ctx.restore();

    // 3D Top Bevel Specular Rim Light
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(t3.x, t3.y - 1);
    ctx.lineTo(t2.x, t2.y - 1);
    ctx.lineTo(t1.x, t1.y - 1);
    ctx.stroke();

    // Neon Industrial Hologram Sign on designated sectors
    if (wall.label) {
      const midX = (t3.x + t2.x) * 0.5;
      const midY = (t3.y + t2.y) * 0.5 + 24;

      ctx.save();
      // Holographic Sign backing plate
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.beginPath();
      ctx.roundRect(midX - 70, midY - 11, 140, 20, 3);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = 'bold 11px "Chakra Petch", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 10;
      ctx.fillText(`⯈ ${wall.label}`, midX, midY + 3);
      ctx.restore();
    }
  }

  private static drawWoodenCrate(
    ctx: CanvasRenderingContext2D,
    crate: Crate,
    b0: { x: number; y: number },
    b1: { x: number; y: number },
    b2: { x: number; y: number },
    b3: { x: number; y: number },
    t0: { x: number; y: number },
    t1: { x: number; y: number },
    t2: { x: number; y: number },
    t3: { x: number; y: number }
  ) {
    // -------------------------------------------------------------------------
    // CAJA DE MADERA 3D REALISTA - BÚNKER SUBTERRÁNEO
    // -------------------------------------------------------------------------

    // 1. Cara Lateral Derecha (madera más oscura por iluminación)
    ctx.beginPath();
    ctx.moveTo(b1.x, b1.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(t1.x, t1.y);
    ctx.closePath();
    const rightGrad = ctx.createLinearGradient(b1.x, b1.y, t2.x, t2.y);
    rightGrad.addColorStop(0, '#5f280c');
    rightGrad.addColorStop(0.5, '#78350f');
    rightGrad.addColorStop(1, '#92400e');
    ctx.fillStyle = rightGrad;
    ctx.fill();
    ctx.strokeStyle = '#381604';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Tablones horizontales de madera en cara derecha
    for (let i = 1; i < 4; i++) {
      const f = i / 4;
      const px0 = b1.x + (t1.x - b1.x) * f;
      const py0 = b1.y + (t1.y - b1.y) * f;
      const px1 = b2.x + (t2.x - b2.x) * f;
      const py1 = b2.y + (t2.y - b2.y) * f;
      ctx.beginPath();
      ctx.moveTo(px0, py0);
      ctx.lineTo(px1, py1);
      ctx.strokeStyle = 'rgba(40, 16, 2, 0.75)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    // Refuerzo diagonal de listón de madera cara derecha
    ctx.beginPath();
    ctx.moveTo(b1.x, b1.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(b1.x, b1.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.6)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 2. Cara Frontal Izquierda (madera iluminada)
    ctx.beginPath();
    ctx.moveTo(b3.x, b3.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(t3.x, t3.y);
    ctx.closePath();
    const frontGrad = ctx.createLinearGradient(b3.x, b3.y, t3.x, t3.y);
    frontGrad.addColorStop(0, '#78350f');
    frontGrad.addColorStop(0.5, '#92400e');
    frontGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = frontGrad;
    ctx.fill();
    ctx.strokeStyle = '#381604';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Tablones horizontales cara frontal
    for (let i = 1; i < 4; i++) {
      const f = i / 4;
      const px0 = b3.x + (t3.x - b3.x) * f;
      const py0 = b3.y + (t3.y - b3.y) * f;
      const px1 = b2.x + (t2.x - b2.x) * f;
      const py1 = b2.y + (t2.y - b2.y) * f;
      ctx.beginPath();
      ctx.moveTo(px0, py0);
      ctx.lineTo(px1, py1);
      ctx.strokeStyle = 'rgba(40, 16, 2, 0.75)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    // Refuerzo en 'X' de vigas de madera cara frontal
    ctx.beginPath();
    ctx.moveTo(b3.x, b3.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.moveTo(b2.x, b2.y);
    ctx.lineTo(t3.x, t3.y);
    ctx.strokeStyle = '#381604';
    ctx.lineWidth = 3.6;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(b3.x, b3.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.moveTo(b2.x, b2.y);
    ctx.lineTo(t3.x, t3.y);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 3. Tapa Superior de Madera 3D
    ctx.beginPath();
    ctx.moveTo(t0.x, t0.y);
    ctx.lineTo(t1.x, t1.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(t3.x, t3.y);
    ctx.closePath();
    const topGrad = ctx.createLinearGradient(t0.x, t0.y, t2.x, t2.y);
    topGrad.addColorStop(0, '#92400e');
    topGrad.addColorStop(0.5, '#b45309');
    topGrad.addColorStop(1, '#d97706');
    ctx.fillStyle = topGrad;
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Vetas y juntas de madera en la tapa superior
    for (let i = 1; i <= 3; i++) {
      const f = i / 4;
      const pTopX = t0.x + (t1.x - t0.x) * f;
      const pTopY = t0.y + (t1.y - t0.y) * f;
      const pBotX = t3.x + (t2.x - t3.x) * f;
      const pBotY = t3.y + (t2.y - t3.y) * f;
      ctx.beginPath();
      ctx.moveTo(pTopX, pTopY);
      ctx.lineTo(pBotX, pBotY);
      ctx.strokeStyle = 'rgba(56, 22, 4, 0.65)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // 4. Esquineros de Hierro Forjado y Remaches de Acero
    const cornerPoints = [t0, t1, t2, t3, b2];
    cornerPoints.forEach((pt) => {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.1, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Estarcido militar en la madera: 'BÚNKER'
    ctx.save();
    ctx.fillStyle = 'rgba(40, 16, 2, 0.85)';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MADERA -2', (b3.x + b2.x) * 0.5, (b3.y + t3.y) * 0.5 + 3);
    ctx.restore();

    // Estado abierto: tapa entreabierta con luz de botín
    if (crate.isOpened) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse((t0.x + t2.x) * 0.5, (t0.y + t2.y) * 0.5, 10, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.stroke();
      ctx.restore();
    }
  }

  private static drawCrate(
    ctx: CanvasRenderingContext2D,
    crate: Crate,
    camX: number,
    camY: number,
    w: number,
    h: number
  ) {
    const size = crate.width;
    const height3D = 30;

    const b0 = this.toScreen(crate.x - size / 2, crate.y - size / 2, camX, camY, w, h);
    const b1 = this.toScreen(crate.x + size / 2, crate.y - size / 2, camX, camY, w, h);
    const b2 = this.toScreen(crate.x + size / 2, crate.y + size / 2, camX, camY, w, h);
    const b3 = this.toScreen(crate.x - size / 2, crate.y + size / 2, camX, camY, w, h);

    const t0 = { x: b0.x, y: b0.y - height3D };
    const t1 = { x: b1.x, y: b1.y - height3D };
    const t2 = { x: b2.x, y: b2.y - height3D };
    const t3 = { x: b3.x, y: b3.y - height3D };

    // Sombra de contacto profunda en suelo subterráneo
    ctx.beginPath();
    ctx.ellipse(b2.x, b2.y + 4, size * 0.75, size * 0.38, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fill();

    // Si es caja de madera, renderizar la versión 3D artesanal de madera
    if (crate.type === 'wood') {
      this.drawWoodenCrate(ctx, crate, b0, b1, b2, b3, t0, t1, t2, t3);
    } else {
      // Cajas militares, médicas y bóvedas blindadas de alta tecnología
      const isMilitary = crate.type === 'military';
      const isSafe = crate.type === 'safe';
      const isMedical = crate.type === 'medical';

      const faceColor = isSafe ? '#334155' : isMilitary ? '#14532d' : '#065f46';
      const sideColor = isSafe ? '#1e293b' : isMilitary ? '#052e16' : '#022c22';
      const topColor = isSafe ? '#475569' : isMilitary ? '#166534' : '#047857';

      // Right Face
      ctx.beginPath();
      ctx.moveTo(b1.x, b1.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(t1.x, t1.y);
      ctx.closePath();
      ctx.fillStyle = sideColor;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Front Face
      ctx.beginPath();
      ctx.moveTo(b3.x, b3.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(t3.x, t3.y);
      ctx.closePath();
      ctx.fillStyle = faceColor;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Top Face
      ctx.beginPath();
      ctx.moveTo(t0.x, t0.y);
      ctx.lineTo(t1.x, t1.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(t3.x, t3.y);
      ctx.closePath();
      ctx.fillStyle = topColor;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Esquineros metálicos
      ctx.fillStyle = isSafe ? '#94a3b8' : '#0f172a';
      ctx.fillRect(t3.x - 2, t3.y, 4, 7);
      ctx.fillRect(t2.x - 2, t2.y, 4, 7);
    }

    // Holograma flotante para cajas sin saquear
    if (!crate.isOpened) {
      const isWood = crate.type === 'wood';
      const isMedical = crate.type === 'medical';
      const isMilitary = crate.type === 'military';
      const isSafe = crate.type === 'safe';

      const iconY = t0.y - 12 + Math.sin(Date.now() * 0.005 + crate.id) * 3;
      ctx.save();
      const glowColor = isWood ? '#f59e0b' : isMedical ? '#22c55e' : isMilitary ? '#38bdf8' : '#a855f7';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 8;
      ctx.fillStyle = glowColor;
      ctx.font = 'bold 10px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      const label = isWood ? '📦 CAJA MADERA' : isMedical ? '✚ BOTIQUÍN' : isSafe ? '🔒 BÓVEDA' : '✦ ARMAS';
      ctx.fillText(label, (t0.x + t2.x) * 0.5, iconY);
      ctx.restore();
    }
  }

  private static drawBarrel(
    ctx: CanvasRenderingContext2D,
    barrel: Barrel,
    camX: number,
    camY: number,
    w: number,
    h: number
  ) {
    const pos = this.toScreen(barrel.x, barrel.y, camX, camY, w, h);
    const radius = barrel.radius;
    const height = 30;

    // Contact drop shadow
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 3, radius * 1.15, radius * 0.58, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();

    const isToxic = barrel.type === 'toxic';
    const isExplosive = barrel.type === 'explosive';
    const bodyColor = isToxic ? '#14532d' : isExplosive ? '#991b1b' : '#334155';
    const highlightColor = isToxic ? '#22c55e' : isExplosive ? '#ef4444' : '#64748b';

    // Barrel cylinder body
    ctx.beginPath();
    ctx.moveTo(pos.x - radius, pos.y);
    ctx.lineTo(pos.x - radius, pos.y - height);
    ctx.ellipse(pos.x, pos.y - height, radius, radius * 0.5, 0, Math.PI, 0, false);
    ctx.lineTo(pos.x + radius, pos.y);
    ctx.ellipse(pos.x, pos.y, radius, radius * 0.5, 0, 0, Math.PI, false);
    ctx.closePath();

    const grad = ctx.createLinearGradient(pos.x - radius, pos.y, pos.x + radius, pos.y);
    grad.addColorStop(0, 'rgba(0,0,0,0.5)');
    grad.addColorStop(0.25, bodyColor);
    grad.addColorStop(0.65, highlightColor);
    grad.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Heavy Industrial Compression Ribs
    [0.28, 0.68].forEach((offset) => {
      const rimY = pos.y - height * offset;
      ctx.beginPath();
      ctx.ellipse(pos.x, rimY, radius * 0.98, radius * 0.48, 0, 0, Math.PI);
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(pos.x, rimY - 0.8, radius * 0.96, radius * 0.46, 0, 0, Math.PI);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Barrel top lid with recessed seal
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y - height, radius, radius * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = isToxic ? '#166534' : isExplosive ? '#7f1d1d' : '#1e293b';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.stroke();

    // Metal screw bung cap on lid
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(pos.x - radius * 0.35, pos.y - height - 1, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Center Warning Label & Glowing Indicator
    if (isToxic) {
      // Bioluminescent Liquid Sight Window
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(pos.x - 6, pos.y - height * 0.65, 12, 10, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fill();
      ctx.strokeStyle = '#22c55e';
      ctx.stroke();

      // Glowing bubbling toxic fluid
      ctx.fillStyle = '#4ade80';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 10;
      ctx.fillRect(pos.x - 4, pos.y - height * 0.55, 8, 6);
      ctx.restore();
    } else if (isExplosive) {
      // Danger Hazard Diamond
      ctx.save();
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('☢', pos.x, pos.y - height * 0.35);
      ctx.restore();
    }
  }

  // =========================================================================
  // ESTACIONES DE VIDA (Holographic Medical Recharging Stations)
  // =========================================================================
  private static drawHealthStation(
    ctx: CanvasRenderingContext2D,
    hs: HealthStation,
    camX: number,
    camY: number,
    w: number,
    h: number
  ) {
    const pos = this.toScreen(hs.x, hs.y, camX, camY, w, h);
    const radius = hs.radius;
    const animPhase = (Date.now() * 0.003) % (Math.PI * 2);

    ctx.save();

    // 1. Isometric Medical Floor Pad
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, radius, radius * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fill();
    ctx.strokeStyle = '#065f46';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pulsing Outer Energy Perimeter Ring
    const ringPulse = 1 + Math.sin(animPhase * 2) * 0.05;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, radius * ringPulse, radius * 0.5 * ringPulse, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)';
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 2. High-Tech Green Holographic Floor Emblems
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(1, 0.5);
    ctx.rotate(animPhase * 0.5);
    for (let r = 0; r < 4; r++) {
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = 'rgba(74, 222, 128, 0.3)';
      ctx.fillRect(radius * 0.45, -2, radius * 0.4, 4);
    }
    ctx.restore();

    // 3. Central Nanite Containment Column (3D Elevated)
    const colHeight = 36;
    const colY = pos.y - colHeight;

    // Base pedestal
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, 14, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    // Glass cylinder with glowing green nanite liquid
    ctx.beginPath();
    ctx.rect(pos.x - 7, colY, 14, colHeight);
    const colGrad = ctx.createLinearGradient(pos.x - 7, 0, pos.x + 7, 0);
    colGrad.addColorStop(0, 'rgba(34, 197, 94, 0.4)');
    colGrad.addColorStop(0.5, 'rgba(74, 222, 128, 0.85)');
    colGrad.addColorStop(1, 'rgba(22, 101, 52, 0.5)');
    ctx.fillStyle = colGrad;
    ctx.fill();
    ctx.strokeStyle = '#4ade80';
    ctx.stroke();

    // 4. Floating 3D Holographic Medical Cross (+)
    const crossBob = Math.sin(animPhase * 3) * 4;
    const crossY = colY - 24 + crossBob;

    ctx.save();
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#4ade80';

    // Horizontal bar
    ctx.beginPath();
    ctx.roundRect(pos.x - 14, crossY - 4.5, 28, 9, 2.5);
    ctx.fill();
    // Vertical bar
    ctx.beginPath();
    ctx.roundRect(pos.x - 4.5, crossY - 14, 9, 28, 2.5);
    ctx.fill();

    // White core highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(pos.x - 10, crossY - 2, 20, 4, 1.5);
    ctx.roundRect(pos.x - 2, crossY - 10, 4, 20, 1.5);
    ctx.fill();
    ctx.restore();

    // 5. Overhead Information Hologram Badge
    ctx.font = 'bold 11px "Chakra Petch", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#86efac';
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 8;
    ctx.fillText('⚕ ESTACIÓN DE VIDA', pos.x, crossY - 18);
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#4ade80';
    ctx.fillText('RECARGA AUTOMÁTICA EN ZONA', pos.x, crossY - 8);

    ctx.restore();
  }

  // =========================================================================
  // NÚCLEOS Y BOTIQUINES DE VIDA FLOTANTES (Floating Health Pickups)
  // =========================================================================
  private static drawHealthPickup(
    ctx: CanvasRenderingContext2D,
    pickup: HealthPickup,
    camX: number,
    camY: number,
    w: number,
    h: number
  ) {
    const pos = this.toScreen(pickup.x, pickup.y, camX, camY, w, h);
    const bob = Math.sin(pickup.pulsePhase) * 5;
    const itemY = pos.y - 18 + bob;

    ctx.save();

    // 1. Ground Pulsing Energy Shadow / Ring
    const groundPulse = 1 + Math.sin(pickup.pulsePhase * 1.5) * 0.2;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, 14 * groundPulse, 7 * groundPulse, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 8;
    ctx.fill();

    // 2. Floating 3D Health Core / Nanite Capsule
    ctx.save();
    ctx.translate(pos.x, itemY);

    if (pickup.type === 'nanite_core') {
      // Rotating Glowing Nanite Core Orb
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 14;

      // Outer Energy Sphere
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fillStyle = '#16a34a';
      ctx.fill();
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Glowing Green Cross on Orb
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -2, 12, 4);
      ctx.fillRect(-2, -6, 4, 12);

      // Orbiting Nano-rings
      ctx.rotate(pickup.pulsePhase * 2);
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 6, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.8)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else {
      // 3D Tactical Combat Medkit Case
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;

      // Case Box
      ctx.fillStyle = '#f8fafc'; // White military medkit
      ctx.beginPath();
      ctx.roundRect(-10, -8, 20, 16, 3);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Red / Green Cross Emblem
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-6, -2, 12, 4);
      ctx.fillRect(-2, -6, 4, 12);
    }
    ctx.restore();

    // 3. Floating Label
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4ade80';
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 6;
    ctx.fillText(`+${pickup.healAmount} HP`, pos.x, itemY - 14);

    ctx.restore();
  }

  private static drawPlayer(
    ctx: CanvasRenderingContext2D,
    player: Player,
    camX: number,
    camY: number,
    w: number,
    h: number
  ) {
    const pos = this.toScreen(player.x, player.y, camX, camY, w, h);

    // Roll dodge afterimage motion blur trail
    if (player.isRolling) {
      const rollProgress = 1 - player.rollTimer / player.rollDuration;
      for (let i = 1; i <= 3; i++) {
        const trailDist = i * 14 * (1 - rollProgress);
        const trailWorldX = player.x - (player.rollVx / player.speed) * trailDist;
        const trailWorldY = player.y - (player.rollVy / player.speed) * trailDist;
        const tPos = this.toScreen(trailWorldX, trailWorldY, camX, camY, w, h);

        ctx.save();
        ctx.globalAlpha = 0.25 / i;
        ctx.beginPath();
        ctx.ellipse(tPos.x, tPos.y - 14, 18, 12, rollProgress * Math.PI * 4, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.restore();
      }
    }

    // Directional aim offset for 2.5D visual
    const aimIsoX = (Math.cos(player.angle) - Math.sin(player.angle)) * IsometricRenderer.ISO_COS;
    const aimIsoY = (Math.cos(player.angle) + Math.sin(player.angle)) * IsometricRenderer.ISO_SIN;
    const aimNorm = Math.hypot(aimIsoX, aimIsoY) || 1;
    const dirX = aimIsoX / aimNorm;
    const dirY = aimIsoY / aimNorm;

    // Movement walk cycle animation
    const isMoving = Math.hypot(player.vx, player.vy) > 15 && !player.isRolling;
    const walkPhase = isMoving ? Math.sin(Date.now() * 0.016) : 0;
    const idleBob = Math.sin(Date.now() * 0.004) * 1.8;

    // Dual ground contact shadow (soft ambient occlusion + crisp shoe contact)
    ctx.save();
    // Ambient soft shadow
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 4, 22, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 8;
    ctx.fill();

    // Sharp contact shadows beneath boots
    const legOffset1 = walkPhase * 6;
    const legOffset2 = -walkPhase * 6;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(pos.x - 7, pos.y + 2 + legOffset1 * 0.4, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(pos.x + 6, pos.y + 2 + legOffset2 * 0.4, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // =========================================================================
    // CÍRCULO TÁCTICO ALREDEDOR DEL MUÑEQUITO PRINCIPAL (Aura de Salud Dinámica)
    // Vida >= 50%: Círculo Verde brillante con pulsación táctica
    // Vida < 50%: Círculo Rojo de emergencia con pulsación de alerta
    // =========================================================================
    ctx.save();
    const hpRatio = Math.max(0, Math.min(1, player.health / player.maxHealth));
    const isHighHealth = hpRatio >= 0.5;
    const ringColor = isHighHealth ? '#22c55e' : '#ef4444';
    const ringGlow = isHighHealth ? 'rgba(34, 197, 94, 0.85)' : 'rgba(239, 68, 68, 0.95)';
    const ringFillSoft = isHighHealth ? 'rgba(34, 197, 94, 0.16)' : 'rgba(239, 68, 68, 0.25)';

    // Pulso dinámico según salud
    const pulseSpeed = isHighHealth ? 0.005 : 0.015;
    const pulseIntensity = isHighHealth ? 0.05 : 0.12;
    const pulse = 1 + Math.sin(Date.now() * pulseSpeed) * pulseIntensity;

    const ringRadiusX = 26 * pulse;
    const ringRadiusY = 13 * pulse;

    // 1. Resplandor radial suave en el suelo
    const floorGrad = ctx.createRadialGradient(pos.x, pos.y + 4, 4, pos.x, pos.y + 4, ringRadiusX);
    floorGrad.addColorStop(0, ringFillSoft);
    floorGrad.addColorStop(0.75, ringFillSoft);
    floorGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 4, ringRadiusX, ringRadiusY, 0, 0, Math.PI * 2);
    ctx.fillStyle = floorGrad;
    ctx.fill();

    // 2. Anillo exterior de alta definición
    ctx.shadowColor = ringColor;
    ctx.shadowBlur = isHighHealth ? 10 : 16;
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = isHighHealth ? 2.2 : 2.8;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 4, ringRadiusX, ringRadiusY, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Notches tácticos rotatorios en el borde
    const rotTime = Date.now() * (isHighHealth ? 0.002 : 0.006);
    ctx.save();
    ctx.translate(pos.x, pos.y + 4);
    ctx.scale(1, 0.5); // Achatamiento isométrico
    ctx.rotate(rotTime);
    ctx.strokeStyle = ringGlow;
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, ringRadiusX + 1.5, i * (Math.PI / 2) - 0.22, i * (Math.PI / 2) + 0.22);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Etiqueta numérica de salud con sombra de neón
    ctx.font = 'bold 9px "Chakra Petch", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = isHighHealth ? '#86efac' : '#fca5a5';
    ctx.shadowColor = ringColor;
    ctx.shadowBlur = 6;
    ctx.fillText(`${Math.round(player.health)} HP`, pos.x, pos.y + ringRadiusY + 6);
    ctx.restore();

    const charY = pos.y - 20 + (player.isRolling ? 4 : idleBob);

    // Tactical Laser Sight & Precision Aim System
    ctx.save();
    const isPrecisionAim = player.isAimingMode;
    const laserRange = isPrecisionAim ? 420 : 260;
    const laserEndScreen = this.toScreen(
      player.x + Math.cos(player.angle) * laserRange,
      player.y + Math.sin(player.angle) * laserRange,
      camX,
      camY,
      w,
      h
    );

    // Laser beam with glowing core
    const laserGrad = ctx.createLinearGradient(pos.x, charY - 6, laserEndScreen.x, laserEndScreen.y);
    if (isPrecisionAim) {
      laserGrad.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
      laserGrad.addColorStop(0.6, 'rgba(14, 165, 233, 0.45)');
      laserGrad.addColorStop(1, 'rgba(56, 189, 248, 1)');
    } else {
      laserGrad.addColorStop(0, 'rgba(239, 68, 68, 0.7)');
      laserGrad.addColorStop(0.7, 'rgba(239, 68, 68, 0.3)');
      laserGrad.addColorStop(1, 'rgba(239, 68, 68, 0.85)');
    }

    ctx.beginPath();
    ctx.moveTo(pos.x + dirX * 12, charY - 6 + dirY * 6);
    ctx.lineTo(laserEndScreen.x, laserEndScreen.y);
    ctx.strokeStyle = laserGrad;
    ctx.lineWidth = isPrecisionAim ? 1.8 : 1.2;
    if (isPrecisionAim) {
      ctx.setLineDash([8, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.stroke();
    }

    // Pinpoint reticle dot with pulse
    const reticlePulse = (isPrecisionAim ? 4.5 : 2.5) + Math.sin(Date.now() * 0.02) * 0.8;
    ctx.beginPath();
    ctx.arc(laserEndScreen.x, laserEndScreen.y, reticlePulse, 0, Math.PI * 2);
    ctx.fillStyle = isPrecisionAim ? '#38bdf8' : '#ef4444';
    ctx.shadowColor = isPrecisionAim ? '#38bdf8' : '#ef4444';
    ctx.shadowBlur = isPrecisionAim ? 12 : 8;
    ctx.fill();

    // Precision Cross Reticle when Aim Mode is active
    if (isPrecisionAim) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      // Horizontal tick
      ctx.moveTo(laserEndScreen.x - 9, laserEndScreen.y);
      ctx.lineTo(laserEndScreen.x + 9, laserEndScreen.y);
      // Vertical tick
      ctx.moveTo(laserEndScreen.x, laserEndScreen.y - 9);
      ctx.lineTo(laserEndScreen.x, laserEndScreen.y + 9);
      ctx.stroke();

      // Outer aiming circle
      ctx.beginPath();
      ctx.arc(laserEndScreen.x, laserEndScreen.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.stroke();
    }

    ctx.restore();

    ctx.save();

    // Full roll tumbling rotation
    if (player.isRolling) {
      const rollAngle = (1 - player.rollTimer / player.rollDuration) * Math.PI * 2;
      ctx.translate(pos.x, charY);
      ctx.rotate(rollAngle);
      ctx.translate(-pos.x, -charY);
    }

    // =========================================================================
    // 1. MUSCULAR COMBAT LEGS & ASSAULT BOOTS ("Contextura y Anatomía")
    // =========================================================================
    // Left Leg (Muscular cargo trouser)
    ctx.save();
    ctx.fillStyle = '#1e293b'; // Tactical ripstop cargo navy/dark slate
    // Left Thigh
    ctx.beginPath();
    ctx.roundRect(pos.x - 11, pos.y - 15 + legOffset1, 8, 14, 3);
    ctx.fill();
    // Left Thigh Cargo Pocket with flap
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(pos.x - 12, pos.y - 11 + legOffset1, 3, 7);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(pos.x - 12, pos.y - 11 + legOffset1, 3, 7);

    // Left Tactical Hard-Shell Knee Pad
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(pos.x - 11, pos.y - 6 + legOffset1, 7.5, 5, 2);
    ctx.fill();
    // Knee Pad Rivets
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(pos.x - 10, pos.y - 5 + legOffset1, 1.2, 1.2);
    ctx.fillRect(pos.x - 5, pos.y - 5 + legOffset1, 1.2, 1.2);

    // Left Combat Assault Boot with Deep Tread
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.roundRect(pos.x - 12, pos.y - 1 + legOffset1, 9, 6.5, 2.5);
    ctx.fill();
    // Boot Toe Cap
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(pos.x - 12, pos.y + 2 + legOffset1, 5, 3);
    // Lug Sole Tread
    ctx.fillStyle = '#475569';
    ctx.fillRect(pos.x - 12, pos.y + 4.5 + legOffset1, 9, 1.8);
    // Cross Laces
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(pos.x - 9, pos.y + legOffset1);
    ctx.lineTo(pos.x - 6, pos.y + 2 + legOffset1);
    ctx.moveTo(pos.x - 6, pos.y + legOffset1);
    ctx.lineTo(pos.x - 9, pos.y + 2 + legOffset1);
    ctx.stroke();

    // Right Leg (Muscular cargo trouser)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(pos.x + 3, pos.y - 15 + legOffset2, 8, 14, 3);
    ctx.fill();
    // Right Thigh Cargo Pocket with flap
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(pos.x + 9, pos.y - 11 + legOffset2, 3, 7);
    ctx.strokeRect(pos.x + 9, pos.y - 11 + legOffset2, 3, 7);

    // Right Tactical Hard-Shell Knee Pad
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(pos.x + 3.5, pos.y - 6 + legOffset2, 7.5, 5, 2);
    ctx.fill();
    // Knee Pad Rivets
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(pos.x + 4.5, pos.y - 5 + legOffset2, 1.2, 1.2);
    ctx.fillRect(pos.x + 9.5, pos.y - 5 + legOffset2, 1.2, 1.2);

    // Right Combat Assault Boot with Deep Tread
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.roundRect(pos.x + 3, pos.y - 1 + legOffset2, 9, 6.5, 2.5);
    ctx.fill();
    // Boot Toe Cap
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(pos.x + 6, pos.y + 2 + legOffset2, 6, 3);
    // Lug Sole Tread
    ctx.fillStyle = '#475569';
    ctx.fillRect(pos.x + 3, pos.y + 4.5 + legOffset2, 9, 1.8);
    // Cross Laces
    ctx.beginPath();
    ctx.moveTo(pos.x + 5, pos.y + legOffset2);
    ctx.lineTo(pos.x + 8, pos.y + 2 + legOffset2);
    ctx.moveTo(pos.x + 8, pos.y + legOffset2);
    ctx.lineTo(pos.x + 5, pos.y + 2 + legOffset2);
    ctx.stroke();
    ctx.restore();

    // =========================================================================
    // 2. TACTICAL 3-DAY ASSAULT BACKPACK (Back-mounted with antenna & gear)
    // =========================================================================
    const packOffsetX = -dirX * 10;
    const packOffsetY = -dirY * 7;

    ctx.save();
    // Backpack main volume
    ctx.beginPath();
    ctx.roundRect(pos.x - 11 + packOffsetX, charY - 11 + packOffsetY, 22, 20, 5);
    ctx.fillStyle = '#1e3a1e'; // Military olive drab
    ctx.fill();
    ctx.strokeStyle = '#0d230d';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Utility pockets with compression cinch straps
    ctx.fillStyle = '#2d4f2d';
    ctx.beginPath();
    ctx.roundRect(pos.x - 8 + packOffsetX, charY - 7 + packOffsetY, 16, 13, 3);
    ctx.fill();
    ctx.strokeStyle = '#143314';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Top rolled bedroll / extraction tarp
    ctx.fillStyle = '#4d7c0f';
    ctx.beginPath();
    ctx.roundRect(pos.x - 10 + packOffsetX, charY - 16 + packOffsetY, 20, 6, 3);
    ctx.fill();
    ctx.fillStyle = '#1a2e05';
    ctx.fillRect(pos.x - 5 + packOffsetX, charY - 16 + packOffsetY, 2.5, 6);
    ctx.fillRect(pos.x + 2.5 + packOffsetX, charY - 16 + packOffsetY, 2.5, 6);

    // Long flexible comms antenna
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(pos.x - 8 + packOffsetX, charY - 14 + packOffsetY);
    ctx.lineTo(pos.x - 12 + packOffsetX, charY - 28 + packOffsetY);
    ctx.stroke();

    // Blinking green comms LED
    const ledGlow = Math.sin(Date.now() * 0.008) > 0;
    ctx.fillStyle = ledGlow ? '#22c55e' : '#14532d';
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = ledGlow ? 8 : 0;
    ctx.beginPath();
    ctx.arc(pos.x - 12 + packOffsetX, charY - 28 + packOffsetY, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // =========================================================================
    // 3. BROAD ATHLETIC TORSO & CERAMIC PLATE CARRIER ("Contextura Muscular")
    // =========================================================================
    ctx.save();
    // V-Taper Combat Compression Shirt with Muscular Definition
    const torsoW = 24;
    const torsoH = 20;
    ctx.beginPath();
    ctx.roundRect(pos.x - torsoW / 2, charY - 10, torsoW, torsoH, 5);
    ctx.fillStyle = player.damageFlash > 0 ? '#ffffff' : '#0369a1'; // Deep combat navy
    ctx.fill();
    ctx.strokeStyle = '#082f49';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Reinforced Shoulder Pauldrons / Ballistic Shoulder Pads
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(pos.x - 15, charY - 10, 6, 9, 3);
    ctx.roundRect(pos.x + 9, charY - 10, 6, 9, 3);
    ctx.fill();
    // Shoulder Insignia Patch (Gold chevron rank)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(pos.x - 14, charY - 7);
    ctx.lineTo(pos.x - 12, charY - 5);
    ctx.lineTo(pos.x - 10, charY - 7);
    ctx.stroke();

    // Heavy Ceramic Plate Carrier (Armored Chest Rig with Volumetric Bevel)
    const plateW = 18;
    const plateH = 16;
    ctx.beginPath();
    ctx.roundRect(pos.x - plateW / 2, charY - 8, plateW, plateH, 4);
    ctx.fillStyle = '#090d16'; // Heavy Kevlar black
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Trauma Plate Bevel Specular Highlights
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pos.x - 8, charY - 7);
    ctx.lineTo(pos.x + 8, charY - 7);
    ctx.stroke();

    // MOLLE Laser-Cut Webbing Matrix
    ctx.fillStyle = '#334155';
    ctx.fillRect(pos.x - 7, charY - 4, 14, 1.8);
    ctx.fillRect(pos.x - 7, charY - 0.5, 14, 1.8);

    // Inverted Tactical Combat Knife Sheath (Mounted on left chest strap)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(pos.x - 8, charY - 8, 3, 9);
    ctx.fillStyle = '#64748b'; // Knife blade handle
    ctx.fillRect(pos.x - 8.5, charY + 1, 4, 3);

    // Dual 30-round Magazine Pouches on Chest with Brass Cartridge Tips
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(pos.x - 4, charY + 2, 4, 5.5);
    ctx.fillRect(pos.x + 1, charY + 2, 4, 5.5);
    ctx.fillStyle = '#fbbf24'; // Brass bullets
    ctx.fillRect(pos.x - 3, charY + 2, 2, 1.2);
    ctx.fillRect(pos.x + 2, charY + 2, 2, 1.2);

    // Tactical Duty Rigger Belt & Cobra Metal Buckle
    ctx.fillStyle = '#020617';
    ctx.fillRect(pos.x - 11, charY + 8.5, 22, 3.5);
    // Cobra Steel Buckle
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(pos.x - 2.5, charY + 8.5, 5, 3.5);
    ctx.fillStyle = '#020617';
    ctx.fillRect(pos.x - 0.5, charY + 9, 1, 2.5);

    // Sidearm Drop Holster on Right Hip
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(pos.x + 9, charY + 7, 3.5, 6);
    // Medical IFAK Pouch on Left Hip (with small red cross)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(pos.x - 12.5, charY + 7, 3.5, 5);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(pos.x - 11.5, charY + 8.5, 1.5, 2);
    ctx.fillRect(pos.x - 12, charY + 9, 2.5, 1);
    ctx.restore();

    // =========================================================================
    // 4. SCULPTED HEAD, OPS-CORE HELMET & POLARIZED VISOR ("Cabeza y Casco Pro")
    // =========================================================================
    const headX = pos.x;
    const headY = charY - 18;

    ctx.save();
    // Muscular Neck & Slate Tactical Balaclava
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(headX - 4.5, headY + 5, 9, 5, 2);
    ctx.fill();

    // Realistic Sculpted Face / Jawline
    ctx.beginPath();
    ctx.arc(headX, headY, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#fed7aa'; // Realistic skin tone
    ctx.fill();

    // Ops-Core Ballistic Tactical Helmet
    ctx.fillStyle = '#0f172a'; // Matte tactical black helmet
    ctx.beginPath();
    ctx.arc(headX, headY - 1.5, 10, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fill();

    // Front NVG Mount Shroud (Metallic night vision bracket)
    ctx.fillStyle = '#334155';
    ctx.fillRect(headX - 3 + dirX * 3, headY - 8 + dirY * 2, 6, 4);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(headX - 1.5 + dirX * 3, headY - 7 + dirY * 2, 3, 2);

    // Side Accessory Rail Combat (ARC) Rails
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(headX - 10, headY - 4, 3, 6);
    ctx.fillRect(headX + 7, headY - 4, 3, 6);

    // Curved High-Tech Polarized Ballistic Visor
    const visorW = 16;
    const visorH = 5.5;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(headX - visorW / 2 + dirX * 2, headY - 4 + dirY * 1.5, visorW, visorH, 2.5);
    // Iridescent Cyan-to-Purple Lens Gradient
    const visorGrad = ctx.createLinearGradient(headX - 8, headY - 4, headX + 8, headY);
    visorGrad.addColorStop(0, '#06b6d4');
    visorGrad.addColorStop(0.6, '#3b82f6');
    visorGrad.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = visorGrad;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Visor Diagonal Specular Light Glint
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(headX - 4 + dirX * 2, headY - 3 + dirY * 1.5);
    ctx.lineTo(headX - 1 + dirX * 2, headY - 1 + dirY * 1.5);
    ctx.stroke();
    ctx.restore();

    // Comms Headset with Earcups and Boom Mic
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.roundRect(headX - 11, headY - 3, 3, 6, 1.5);
    ctx.roundRect(headX + 8, headY - 3, 3, 6, 1.5);
    ctx.fill();
    // Boom Mic
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(headX - 9, headY + 2);
    ctx.lineTo(headX - 2, headY + 6);
    ctx.stroke();
    ctx.fillStyle = '#020617';
    ctx.fillRect(headX - 2, headY + 5, 2.5, 2.5);

    // Dynamic Flowing Ponytail (Reacts with physics inertia & wind!)
    const hairInertiaX = -player.vx * 0.025 - dirX * 5;
    const hairInertiaY = -player.vy * 0.025 - dirY * 4;
    const hairWave = Math.sin(Date.now() * 0.012) * 2.5;

    // Crimson Hair Band
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(headX - 8 + hairInertiaX * 0.3, headY - 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Flowing Strands
    ctx.fillStyle = '#3f1807';
    ctx.beginPath();
    ctx.moveTo(headX - 8, headY - 4);
    ctx.quadraticCurveTo(
      headX - 18 + hairInertiaX,
      headY - 2 + hairWave + hairInertiaY,
      headX - 22 + hairInertiaX * 1.5,
      headY + 8 + hairWave
    );
    ctx.quadraticCurveTo(
      headX - 14 + hairInertiaX,
      headY + 3 + hairInertiaY,
      headX - 6,
      headY - 1
    );
    ctx.closePath();
    ctx.fill();

    // Ponytail Specular Highlight
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(headX - 8, headY - 3);
    ctx.quadraticCurveTo(
      headX - 16 + hairInertiaX,
      headY - 1 + hairWave,
      headX - 19 + hairInertiaX * 1.3,
      headY + 5 + hairWave
    );
    ctx.stroke();
    ctx.restore();

    // =========================================================================
    // 5. DETAILED WEAPONS & TWO-HANDED TACTICAL GRIP ("Agarre Táctico Real")
    // =========================================================================
    const recoilKick = player.shotTimer > 0 ? 5 : 0;
    const gunBaseDist = 18 - recoilKick;
    const gunX = pos.x + dirX * gunBaseDist;
    const gunY = charY - 2 + dirY * (gunBaseDist * 0.65);

    ctx.save();
    ctx.translate(gunX, gunY);
    const gunAngle = Math.atan2(dirY, dirX);
    ctx.rotate(gunAngle);

    // Draw weapon sprite
    this.drawWeaponSprite(ctx, player.currentWeapon);

    // Anatomical Two-Handed Grip
    // Trigger Hand (Right Hand) on pistol grip
    ctx.fillStyle = '#fed7aa'; // Skin
    ctx.beginPath();
    ctx.arc(0, 3, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#020617'; // Tactical combat glove
    ctx.fillRect(-2, 1.5, 4.5, 3.5);
    // Knuckle Armor Plate
    ctx.fillStyle = '#334155';
    ctx.fillRect(-1.5, 2, 3.5, 1.5);

    // Support Hand (Left Hand) forward gripping barrel/handguard
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(9, 3, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#020617';
    ctx.fillRect(7, 1.5, 4.5, 3.5);
    ctx.fillStyle = '#334155';
    ctx.fillRect(7.5, 2, 3.5, 1.5);

    // High-Impact Muzzle Flash
    if (player.shotTimer > 0) {
      this.drawMuzzleFlashPro(ctx, player.currentWeapon);
    }

    // Tactical Melee CQC Knife Slash
    if (player.isMeleeAttacking) {
      this.drawMeleeSlash(ctx, player);
    }

    // Dynamic Tactical Reloading Animation
    if (player.isReloading) {
      this.drawReloadVisual(ctx, player);
    }

    ctx.restore();

    // Sprint Wind & Motion Blur Streaks
    if (player.isSprinting && Math.hypot(player.vx, player.vy) > 30) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const offset = (i - 1) * 8;
        ctx.beginPath();
        ctx.moveTo(pos.x - dirX * 16 + offset, charY + 5 - dirY * 12);
        ctx.lineTo(pos.x - dirX * 36 + offset, charY + 5 - dirY * 26);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  private static drawMeleeSlash(ctx: CanvasRenderingContext2D, player: Player) {
    ctx.save();
    // Knife slash blade extended in front of hand
    ctx.translate(14, -2);
    ctx.rotate(0.35);

    // Combat Tanto Knife
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2, -2, 6, 4); // Grip
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(4, -2);
    ctx.lineTo(24, 0); // Point
    ctx.lineTo(4, 3);
    ctx.closePath();
    ctx.fill();

    // Gleaming edge
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Curved neon energy slash arc
    ctx.beginPath();
    ctx.arc(8, 0, 26, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(8, 0, 28, -Math.PI * 0.35, Math.PI * 0.35);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  private static drawReloadVisual(ctx: CanvasRenderingContext2D, player: Player) {
    ctx.save();
    // Holographic Reload Progress Ring
    const prog = player.reloadProgress || 0;
    ctx.translate(0, -18);
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
    ctx.strokeStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Ejected empty magazine falling downwards
    const magDropY = prog * 22;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-2, magDropY + 4, 4, 7);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-2, magDropY + 4, 4, 7);
    ctx.restore();
  }

  private static drawWeaponSprite(ctx: CanvasRenderingContext2D, weaponId: string) {
    switch (weaponId) {
      case 'smg': {
        // Vector-9 SMG: angular polymer frame, holo optic, extended mag
        ctx.fillStyle = '#0f172a'; // Matte black receiver
        ctx.fillRect(-4, -4, 20, 8);
        ctx.fillStyle = '#334155';
        ctx.fillRect(2, -3, 14, 5);

        // Extended angled magazine
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(4, 3, 5, 9);

        // Holo Sight
        ctx.fillStyle = '#475569';
        ctx.fillRect(4, -7, 7, 3);
        // Glowing holo reticle dot
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(7, -6, 2, 1.5);

        // Barrel shroud & compensator
        ctx.fillStyle = '#64748b';
        ctx.fillRect(16, -2, 6, 4);
        break;
      }
      case 'shotgun': {
        // Breacher 12G: Heavy ribbed barrel, pump grip, side shell rack
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-4, -4, 24, 7);

        // Ribbed barrel heat shield
        ctx.fillStyle = '#475569';
        ctx.fillRect(4, -5, 18, 3);
        for (let i = 5; i < 20; i += 3) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(i, -5, 1.5, 2);
        }

        // Pump handle
        ctx.fillStyle = '#78350f'; // Dark wood / polymer pump
        ctx.fillRect(8, 2, 8, 4);

        // Red 12-gauge shells racked on receiver side
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(0, -1, 3, 2.5);
        ctx.fillRect(4, -1, 3, 2.5);
        break;
      }
      case 'rifle': {
        // M4 Tactical AR: Quad rail, ACOG scope, banana mag, flash hider
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-5, -4, 28, 7);

        // Handguard quad rails
        ctx.fillStyle = '#334155';
        ctx.fillRect(6, -3, 14, 5);

        // Curved 30-round Banana Magazine
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(3, 3);
        ctx.lineTo(8, 12);
        ctx.lineTo(4, 13);
        ctx.lineTo(0, 3);
        ctx.closePath();
        ctx.fill();

        // Tactical ACOG Optic Scope
        ctx.fillStyle = '#475569';
        ctx.fillRect(2, -8, 10, 4);
        ctx.fillStyle = '#38bdf8'; // Scope lens glow
        ctx.fillRect(11, -7, 2, 2.5);

        // Flash Hider
        ctx.fillStyle = '#64748b';
        ctx.fillRect(23, -2.5, 5, 4);
        break;
      }
      case 'plasma': {
        // Ion Plasma Carbine: Hyper-tech energy weapon with glowing core
        ctx.fillStyle = '#1e1b4b'; // Deep indigo casing
        ctx.fillRect(-4, -5, 26, 9);
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 1;
        ctx.strokeRect(-4, -5, 26, 9);

        // Glowing Plasma Energy Chamber
        const plasmaPulse = 0.7 + Math.sin(Date.now() * 0.02) * 0.3;
        ctx.fillStyle = `rgba(192, 132, 252, ${plasmaPulse})`;
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 10;
        ctx.fillRect(4, -3, 12, 5);
        ctx.shadowBlur = 0;

        // Energy coils
        ctx.fillStyle = '#e9d5ff';
        ctx.fillRect(6, -4, 2, 7);
        ctx.fillRect(10, -4, 2, 7);
        ctx.fillRect(14, -4, 2, 7);

        // Muzzle emitter rings
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(22, -3.5, 5, 6);
        break;
      }
      default: {
        // Tactical 9mm Pistol with suppressor & tactical flashlight
        ctx.fillStyle = '#0f172a'; // Slide
        ctx.fillRect(-2, -3.5, 14, 6);
        ctx.fillStyle = '#334155';
        ctx.fillRect(2, -2.5, 8, 4);

        // Suppressor / Silencer
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(12, -2.5, 9, 4);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(12, -2.5, 9, 4);

        // Under-barrel laser module
        ctx.fillStyle = '#475569';
        ctx.fillRect(4, 2.5, 6, 2.5);
        ctx.fillStyle = '#ef4444'; // Red diode
        ctx.fillRect(9, 2.8, 1.5, 1.5);
        break;
      }
    }
  }

  private static drawMuzzleFlashPro(ctx: CanvasRenderingContext2D, weaponId: string) {
    const isPlasma = weaponId === 'plasma';
    const isShotgun = weaponId === 'shotgun';
    const flashLen = isShotgun ? 28 : isPlasma ? 24 : 18;
    const flashW = isShotgun ? 16 : isPlasma ? 12 : 9;
    const coreColor = isPlasma ? '#ffffff' : '#ffffff';
    const outerColor = isPlasma ? '#c084fc' : isShotgun ? '#f97316' : '#fde047';

    ctx.save();
    ctx.translate(22, -0.5);

    // Glowing flame aura
    ctx.shadowColor = outerColor;
    ctx.shadowBlur = 16;

    // Multi-point starburst
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(flashLen * 0.4, -flashW * 0.7);
    ctx.lineTo(flashLen * 0.6, -flashW * 0.3);
    ctx.lineTo(flashLen, 0);
    ctx.lineTo(flashLen * 0.6, flashW * 0.3);
    ctx.lineTo(flashLen * 0.4, flashW * 0.7);
    ctx.closePath();
    ctx.fillStyle = outerColor;
    ctx.fill();

    // Hot central core
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(flashLen * 0.5, -flashW * 0.3);
    ctx.lineTo(flashLen * 0.7, 0);
    ctx.lineTo(flashLen * 0.5, flashW * 0.3);
    ctx.closePath();
    ctx.fillStyle = coreColor;
    ctx.fill();

    // Powder spark streaks
    for (let i = 0; i < 3; i++) {
      const sparkAng = (Math.random() - 0.5) * 0.8;
      const sparkDist = flashLen + Math.random() * 12;
      ctx.beginPath();
      ctx.arc(Math.cos(sparkAng) * sparkDist, Math.sin(sparkAng) * sparkDist, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();
    }
    ctx.restore();
  }

  private static drawEnemy(
    ctx: CanvasRenderingContext2D,
    enemy: Enemy,
    camX: number,
    camY: number,
    w: number,
    h: number
  ) {
    const pos = this.toScreen(enemy.x, enemy.y, camX, camY, w, h);

    // Directional ground contact shadow
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 3, enemy.radius * 1.05, enemy.radius * 0.52, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.restore();

    const charY = pos.y - 18;

    // Vision cone in stealth / patrolling mode
    if (enemy.state === 'patrol' || enemy.state === 'idle') {
      ctx.save();
      const visionRange = 140;
      const leftAngle = enemy.angle - enemy.fovAngle * 0.5;
      const rightAngle = enemy.angle + enemy.fovAngle * 0.5;
      const leftPos = this.toScreen(
        enemy.x + Math.cos(leftAngle) * visionRange,
        enemy.y + Math.sin(leftAngle) * visionRange,
        camX,
        camY,
        w,
        h
      );
      const rightPos = this.toScreen(
        enemy.x + Math.cos(rightAngle) * visionRange,
        enemy.y + Math.sin(rightAngle) * visionRange,
        camX,
        camY,
        w,
        h
      );

      ctx.beginPath();
      ctx.moveTo(pos.x, charY);
      ctx.lineTo(leftPos.x, leftPos.y);
      ctx.lineTo(rightPos.x, rightPos.y);
      ctx.closePath();
      const fovGrad = ctx.createRadialGradient(pos.x, charY, 10, pos.x, charY, 120);
      fovGrad.addColorStop(0, 'rgba(234, 179, 8, 0.12)');
      fovGrad.addColorStop(1, 'rgba(234, 179, 8, 0.0)');
      ctx.fillStyle = fovGrad;
      ctx.fill();
      ctx.restore();
    }

    // Directional aim vector
    const aimIsoX = (Math.cos(enemy.angle) - Math.sin(enemy.angle)) * IsometricRenderer.ISO_COS;
    const aimIsoY = (Math.cos(enemy.angle) + Math.sin(enemy.angle)) * IsometricRenderer.ISO_SIN;
    const aimNorm = Math.hypot(aimIsoX, aimIsoY) || 1;
    const dirX = aimIsoX / aimNorm;
    const dirY = aimIsoY / aimNorm;

    // Enemy walk cycle & hover physics
    const isMoving = Math.hypot(enemy.vx, enemy.vy) > 10;
    const walkPhase = isMoving ? Math.sin(Date.now() * 0.014 + enemy.id) : 0;
    const hoverBob = Math.sin(Date.now() * 0.005 + enemy.id) * 3;
    const idleBob = Math.sin(Date.now() * 0.003 + enemy.id) * 1.5;

    const isBoss = !!enemy.isBoss;
    const isHeavy = enemy.type === 'heavy' || isBoss;
    const isEnforcer = enemy.type === 'enforcer';
    const isDrone = enemy.type === 'grunt';

    // Pro Robot Attributes
    const robotModel = enemy.robotModel || (isBoss ? 'DREADNOUGHT OMEGA' : isHeavy ? 'TITÁN GOLIAT MK-IV' : isEnforcer ? 'CENTINELA TÁCTICO V2' : 'DRON ASALTO CIBER-01');
    const eyeColor = enemy.eyeColor || (isBoss ? '#ef4444' : isHeavy ? '#f97316' : isEnforcer ? '#ef4444' : '#06b6d4');
    const chassisColor = enemy.damageFlash > 0 ? '#ffffff' : (enemy.chassisColor || (isBoss ? '#090d16' : isHeavy ? '#1e293b' : isEnforcer ? '#131f24' : '#1e293b'));

    ctx.save();

    // =========================================================================
    // 1. LASER TARGETING POINTER (When in Attack / Aiming Stance)
    // =========================================================================
    if (enemy.laserAimActive || enemy.state === 'attack' || enemy.state === 'chase') {
      const laserOriginX = pos.x + dirX * 18;
      const laserOriginY = charY + dirY * 10 + (isDrone ? hoverBob : idleBob);
      const laserDist = isBoss ? 240 : isHeavy ? 200 : 160;
      const laserEndX = laserOriginX + dirX * laserDist;
      const laserEndY = laserOriginY + dirY * laserDist;

      ctx.save();
      ctx.strokeStyle = eyeColor;
      ctx.shadowColor = eyeColor;
      ctx.shadowBlur = 6;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.3;
      ctx.beginPath();
      ctx.moveTo(laserOriginX, laserOriginY);
      ctx.lineTo(laserEndX, laserEndY);
      ctx.stroke();

      // Laser impact dot
      ctx.beginPath();
      ctx.arc(laserEndX, laserEndY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = eyeColor;
      ctx.fill();
      ctx.restore();
    }

    // =========================================================================
    // 2. ROBOT LOCOMOTION (Hover Repulsors or Cybernetic Hydraulic Legs)
    // =========================================================================
    if (isDrone) {
      // DRON ASALTO: Hover Repulsor Thrusters with Glowing Plasma Jet Flame
      const thrusterY = pos.y - 12 + hoverBob;
      
      // Dual Anti-Gravity Pods
      [-9, 9].forEach((podOffset) => {
        // Metallic Thruster Pod Housing
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(pos.x + podOffset - 3, thrusterY, 6, 10, 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Blue Ion Plasma Flame Jet
        const flameLen = 6 + Math.random() * 5;
        const flameGrad = ctx.createLinearGradient(pos.x + podOffset, thrusterY + 10, pos.x + podOffset, thrusterY + 10 + flameLen);
        flameGrad.addColorStop(0, '#38bdf8');
        flameGrad.addColorStop(0.5, '#0284c7');
        flameGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(pos.x + podOffset - 2.5, thrusterY + 10);
        ctx.lineTo(pos.x + podOffset + 2.5, thrusterY + 10);
        ctx.lineTo(pos.x + podOffset, thrusterY + 10 + flameLen);
        ctx.closePath();
        ctx.fill();
      });

      // Ground Ion Light Reflection
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, 14, 7, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.fill();
    } else {
      // BIPEDAL COMBAT MECH: Articulated Hydraulic Inverted Cybernetic Legs
      const legW = isHeavy ? 10 : 7.5;
      const legH = isHeavy ? 17 : 14;
      const legStride1 = walkPhase * 6;
      const legStride2 = -walkPhase * 6;

      // Left & Right Hydraulic Leg Struts
      [-1, 1].forEach((side) => {
        const stride = side === -1 ? legStride1 : legStride2;
        const lx = pos.x + (side === -1 ? -(isHeavy ? 10 : 7) : (isHeavy ? 3 : 2));
        const ly = pos.y - 14 + stride;

        // Thigh Armor Plate
        ctx.fillStyle = chassisColor;
        ctx.beginPath();
        ctx.roundRect(lx, ly, legW, legH * 0.6, 2);
        ctx.fill();
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Hydraulic Piston Cylinder (Chrome Rod)
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(lx + 2, ly + legH * 0.5, legW - 4, legH * 0.4);

        // Knee Joint Servo Actuator
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(lx + legW / 2, ly + legH * 0.5, 3, 0, Math.PI * 2);
        ctx.fill();

        // Magnetic Clamp Stomper Foot
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(lx - 1, ly + legH - 2, legW + 2, 5, 1.5);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    // =========================================================================
    // 3. ROBOT CHASSIS & ARMOR TORSO
    // =========================================================================
    ctx.save();
    const bob = isDrone ? hoverBob : idleBob;
    const torsoW = isBoss ? 30 : isHeavy ? 26 : isEnforcer ? 22 : 18;
    const torsoH = isBoss ? 24 : isHeavy ? 22 : isEnforcer ? 18 : 16;
    const torsoX = pos.x - torsoW / 2;
    const torsoY = charY - 9 + bob;

    // Main Chassis Hull
    ctx.fillStyle = chassisColor;
    ctx.beginPath();
    ctx.roundRect(torsoX, torsoY, torsoW, torsoH, 4);
    ctx.fill();
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Robot Armor Plating & Reactor Details
    if (isBoss || isHeavy) {
      // Heavy Ballistic Reinforced Chest Plating with Hazard Decals
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(torsoX + 3, torsoY + 3, torsoW - 6, torsoH - 6);

      // Hazard Warning Chevrons on Upper Chest
      ctx.fillStyle = '#eab308';
      ctx.fillRect(torsoX + 4, torsoY + 4, torsoW - 8, 3);
      ctx.fillStyle = '#020617';
      for (let ch = 0; ch < 4; ch++) {
        ctx.fillRect(torsoX + 6 + ch * 5, torsoY + 4, 2.5, 3);
      }

      // Glowing Pulsing Arc Reactor Core in Chest Center
      const corePulse = 0.8 + Math.sin(Date.now() * 0.008) * 0.2;
      ctx.save();
      ctx.fillStyle = eyeColor;
      ctx.shadowColor = eyeColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(pos.x, torsoY + torsoH * 0.6, 5 * corePulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Dual Shoulder Armor Pauldrons
      ctx.fillStyle = '#334155';
      ctx.fillRect(torsoX - 5, torsoY - 2, 6, 10);
      ctx.fillRect(torsoX + torsoW - 1, torsoY - 2, 6, 10);
      ctx.strokeStyle = '#020617';
      ctx.strokeRect(torsoX - 5, torsoY - 2, 6, 10);
      ctx.strokeRect(torsoX + torsoW - 1, torsoY - 2, 6, 10);
    } else if (isEnforcer) {
      // Angular Centinela Carbon-Fiber Plating
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(pos.x, torsoY + 3);
      ctx.lineTo(torsoX + torsoW - 3, torsoY + 6);
      ctx.lineTo(pos.x, torsoY + torsoH - 3);
      ctx.lineTo(torsoX + 3, torsoY + 6);
      ctx.closePath();
      ctx.fill();

      // Glowing Cyan/Red Data Conduit Seams
      ctx.strokeStyle = eyeColor;
      ctx.shadowColor = eyeColor;
      ctx.shadowBlur = 6;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      // Grunt Drone Aerodynamic Intake Vents
      ctx.fillStyle = '#020617';
      ctx.fillRect(pos.x - 5, torsoY + 4, 10, 4);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(pos.x - 3, torsoY + 5, 6, 2);
    }
    ctx.restore();

    // =========================================================================
    // 4. ROBOT HEAD, OCULAR SENSORS & CYBERNETIC VISORS
    // =========================================================================
    const headX = pos.x;
    const headY = charY - 18 + (isDrone ? hoverBob : idleBob);
    const headSize = isBoss ? 13 : isHeavy ? 11 : isEnforcer ? 9 : 8;

    ctx.save();
    // Neck Actuator Turret Mount
    ctx.fillStyle = '#020617';
    ctx.fillRect(headX - 4, headY + headSize - 3, 8, 4);

    // Armored Head Pod Shell
    ctx.fillStyle = chassisColor;
    ctx.beginPath();
    ctx.roundRect(headX - headSize, headY - headSize * 0.7, headSize * 2, headSize * 1.5, 3.5);
    ctx.fill();
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Glowing Optical Sensor Array / Cyclops Visor
    ctx.save();
    ctx.fillStyle = eyeColor;
    ctx.shadowColor = eyeColor;
    ctx.shadowBlur = 12;

    if (isBoss) {
      // Quad Ocular Targeting Array
      [-6, -2, 2, 6].forEach((ox) => {
        ctx.fillRect(headX + ox + dirX * 2, headY - 1 + dirY * 1.5, 2.5, 3);
      });
    } else if (isHeavy) {
      // Heavy Horizontal Scanning Slit Visor
      ctx.fillRect(headX - 7 + dirX * 2, headY - 2 + dirY * 1.5, 14, 4);
      // Secondary Sensor Dot
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(headX - 2 + dirX * 3, headY - 1 + dirY * 1.5, 4, 2);
    } else if (isEnforcer) {
      // Dual Angular Predator Visor
      ctx.fillRect(headX - 6 + dirX * 2, headY - 2 + dirY * 1.5, 4.5, 3);
      ctx.fillRect(headX + 1.5 + dirX * 2, headY - 2 + dirY * 1.5, 4.5, 3);
    } else {
      // High-Tech Circular Cyclops Lens
      ctx.beginPath();
      ctx.arc(headX + dirX * 2.5, headY - 1 + dirY * 1.5, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(headX + dirX * 2.5, headY - 1 + dirY * 1.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.restore();

    // =========================================================================
    // 5. ARTICULATED ROBOT WEAPONS (Integrated Arm Cannons & Carbines)
    // =========================================================================
    const gunDist = isHeavy ? 18 : 14;
    const gunX = pos.x + dirX * gunDist;
    const gunY = charY + dirY * 9 + (isDrone ? hoverBob : idleBob);

    ctx.save();
    ctx.translate(gunX, gunY);
    ctx.rotate(Math.atan2(dirY, dirX));

    if (isBoss) {
      // Dual Heavy Plasma Cannon with Cooling Fins
      ctx.fillStyle = '#020617';
      ctx.fillRect(-6, -6, 28, 12);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(4, -4, 16, 8);
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.fillRect(20, -3, 6, 6);
    } else if (isHeavy) {
      // Rotating Heavy Rotary Auto-cannon with Tri-Barrel
      ctx.fillStyle = '#090d16';
      ctx.fillRect(-5, -5, 26, 10);
      // Ammo Hopper
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(5, 5, 5, 0, Math.PI * 2);
      ctx.fill();
      // Tri-Barrel Muzzle
      ctx.fillStyle = '#f97316';
      ctx.fillRect(18, -3, 6, 2);
      ctx.fillRect(18, 0, 6, 2);
      ctx.fillRect(18, 3, 6, 2);
    } else if (isEnforcer) {
      // Tactical Carbine with Laser Sight Mount
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-3, -3, 22, 6);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(5, -2, 10, 4);
      // Red targeting emitter
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(12, 3, 4, 2);
    } else {
      // Dron Pulse Laser Blaster
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-2, -3, 18, 5);
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(6, -2, 7, 3);
    }

    // Mechanical Robotic Servo Hand Gripping Weapon
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-2, 1, 4, 3);
    ctx.fillRect(6, 1, 4, 3);
    ctx.restore();

    ctx.restore();

    // =========================================================================
    // 6. PRO ROBOT HEALTH BAR & MODEL IDENTIFIER (Above Head)
    // =========================================================================
    const barW = isBoss ? 44 : isHeavy ? 36 : 30;
    const barH = 5;
    const barX = pos.x - barW / 2;
    const barY = charY - 30;

    // Background HUD Pill
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.beginPath();
    ctx.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Health Fill with Tech Gradient
    const hpPercent = Math.max(0, enemy.health / enemy.maxHealth);
    const hpGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    if (hpPercent > 0.5) {
      hpGrad.addColorStop(0, '#22c55e');
      hpGrad.addColorStop(1, '#eab308');
    } else {
      hpGrad.addColorStop(0, '#ef4444');
      hpGrad.addColorStop(1, '#7f1d1d');
    }
    ctx.fillStyle = hpGrad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * hpPercent, barH, 1.5);
    ctx.fill();

    // Robot Model Classification Label Tag
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = eyeColor;
    ctx.shadowColor = eyeColor;
    ctx.shadowBlur = 4;
    ctx.fillText(robotModel, pos.x, barY - 4);
    ctx.shadowBlur = 0;

    // Alert Status Pulsing Beacon
    if (enemy.state === 'chase' || enemy.state === 'attack') {
      const alertPulse = 1 + Math.sin(Date.now() * 0.02) * 0.2;
      ctx.save();
      ctx.translate(pos.x, barY - 14);
      ctx.scale(alertPulse, alertPulse);

      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  private static drawExtractionPad(
    ctx: CanvasRenderingContext2D,
    extraction: ExtractionZone,
    camX: number,
    camY: number,
    w: number,
    h: number
  ) {
    const pos = this.toScreen(extraction.x, extraction.y, camX, camY, w, h);
    const radius = extraction.radius;

    // Outer glowing square platform (isometric)
    const hw = radius * 1.3;
    const p1 = this.toScreen(extraction.x - hw, extraction.y - hw, camX, camY, w, h);
    const p2 = this.toScreen(extraction.x + hw, extraction.y - hw, camX, camY, w, h);
    const p3 = this.toScreen(extraction.x + hw, extraction.y + hw, camX, camY, w, h);
    const p4 = this.toScreen(extraction.x - hw, extraction.y + hw, camX, camY, w, h);

    // Concrete raised platform side
    ctx.beginPath();
    ctx.moveTo(p4.x, p4.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p3.x, p3.y + 12);
    ctx.lineTo(p4.x, p4.y + 12);
    ctx.closePath();
    ctx.fillStyle = '#064e3b';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(p3.x, p3.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p2.x, p2.y + 12);
    ctx.lineTo(p3.x, p3.y + 12);
    ctx.closePath();
    ctx.fillStyle = '#022c22';
    ctx.fill();

    // Top Helipad surface
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.fillStyle = '#065f46';
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Glowing corner neon brackets
    [p1, p2, p3, p4].forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#34d399';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Central circular helipad ring
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, radius * 0.9, radius * 0.45, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Helicopter icon stamped inside circle
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(1, 0.5); // Squash to match isometric perspective

    // Helicopter body silhouette
    ctx.fillStyle = '#6ee7b7';
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail boom
    ctx.fillRect(16, -3, 20, 6);
    ctx.fillRect(34, -10, 4, 14);

    // Main Rotor (spins when active)
    const rotorAngle = Date.now() * 0.015;
    ctx.save();
    ctx.rotate(rotorAngle);
    ctx.fillRect(-32, -2, 64, 4);
    ctx.restore();

    ctx.restore();
  }

  private static drawExtractionHologram(
    ctx: CanvasRenderingContext2D,
    extraction: ExtractionZone,
    camX: number,
    camY: number,
    w: number,
    h: number
  ) {
    const pos = this.toScreen(extraction.x, extraction.y, camX, camY, w, h);
    const radius = extraction.radius;

    // Vertical holographic beam walls
    const beamHeight = 85;
    const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.3;

    ctx.save();
    ctx.globalAlpha = 0.25 * pulse;
    const grad = ctx.createLinearGradient(pos.x, pos.y, pos.x, pos.y - beamHeight);
    grad.addColorStop(0, '#10b981');
    grad.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y - beamHeight, radius * 0.8, radius * 0.4, 0, 0, Math.PI * 2);
    ctx.ellipse(pos.x, pos.y, radius * 0.8, radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    // Holographic Billboard: [ EXTRACTION: 0:48 ]
    const billboardY = pos.y - 75;
    const minutes = Math.floor(Math.max(0, extraction.countdown) / 60);
    const seconds = Math.floor(Math.max(0, extraction.countdown) % 60);
    const timeStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    ctx.save();
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 12;

    // Floating banner box
    const bannerW = 150;
    const bannerH = 26;
    ctx.fillStyle = 'rgba(6, 78, 59, 0.85)';
    ctx.beginPath();
    ctx.roundRect(pos.x - bannerW / 2, billboardY - bannerH / 2, bannerW, bannerH, 4);
    ctx.fill();
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Text: EXTRACTION: 0:48
    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 13px "Chakra Petch", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`EXTRACTION: ${timeStr}`, pos.x, billboardY);

    // Extraction progress meter if player is inside
    if (extraction.isExtracting) {
      const progress = extraction.timeInZone / extraction.requiredStayTime;
      const progW = bannerW * 0.9;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(pos.x - progW / 2, billboardY + 16, progW, 5);
      ctx.fillStyle = '#34d399';
      ctx.fillRect(pos.x - progW / 2, billboardY + 16, progW * progress, 5);
    }

    ctx.restore();
  }

  private static drawGrenade(
    ctx: CanvasRenderingContext2D,
    grenade: Grenade,
    camX: number,
    camY: number,
    w: number,
    h: number
  ) {
    const shadowPos = this.toScreen(grenade.x, grenade.y, camX, camY, w, h);
    // Aerial position shifted vertically by height arc
    const airPos = {
      x: shadowPos.x,
      y: shadowPos.y - grenade.height,
    };

    // Ground Shadow (shrinks and darkens as grenade descends)
    ctx.save();
    const shadowScale = Math.max(0.3, 1 - grenade.height / 60);
    ctx.beginPath();
    ctx.ellipse(shadowPos.x, shadowPos.y, 9 * shadowScale, 4.5 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.45 * shadowScale})`;
    ctx.fill();

    // Red warning blast circle footprint on ground when near landing
    const progress = grenade.timer / grenade.totalTime;
    if (progress > 0.4) {
      const warningAlpha = (progress - 0.4) * 0.7;
      ctx.beginPath();
      ctx.ellipse(
        shadowPos.x,
        shadowPos.y,
        grenade.radius * 0.85,
        grenade.radius * 0.42,
        0,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = `rgba(239, 68, 68, ${warningAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(239, 68, 68, ${warningAlpha * 0.15})`;
      ctx.fill();
    }

    // Grenade in air with tumbling rotation
    ctx.translate(airPos.x, airPos.y);
    const spinAngle = grenade.timer * 14;
    ctx.rotate(spinAngle);

    // M67 Olive Drab Spherical Pineapple Grenade Body
    ctx.fillStyle = '#3f4f33'; // Olive Drab
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#27341e';
    ctx.lineWidth = 1;
    ctx.stroke();

    // High explosive yellow stripe
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-5, -1, 10, 1.6);

    // Fuse and spoon assembly
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-1.5, -7.5, 3, 3);
    // Curved metal safety lever (spoon)
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(1.5, -6.5);
    ctx.quadraticCurveTo(5, -4, 4, 3);
    ctx.stroke();

    // Glowing red primer/fuse indicator
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(0, -7.5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private static drawLaserSightBeam(
    ctx: CanvasRenderingContext2D,
    player: Player,
    enemy: Enemy,
    camX: number,
    camY: number,
    w: number,
    h: number
  ) {
    const playerPos = this.toScreen(player.x, player.y, camX, camY, w, h);
    const enemyPos = this.toScreen(enemy.x, enemy.y, camX, camY, w, h);

    const startX = playerPos.x;
    const startY = playerPos.y - 20;
    const endX = enemyPos.x;
    const endY = enemyPos.y - 18;

    ctx.save();
    // 1. Glow beam
    const laserGrad = ctx.createLinearGradient(startX, startY, endX, endY);
    laserGrad.addColorStop(0, 'rgba(239, 68, 68, 0.95)');
    laserGrad.addColorStop(0.5, 'rgba(244, 63, 94, 0.7)');
    laserGrad.addColorStop(1, 'rgba(239, 68, 68, 1)');

    ctx.strokeStyle = laserGrad;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // 2. High-intensity center core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // 3. Impact laser point on robot body
    const pulse = 1 + Math.sin(Date.now() * 0.02) * 0.2;
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(endX, endY, 4 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private static drawTargetLockOnReticle(
    ctx: CanvasRenderingContext2D,
    enemy: Enemy,
    camX: number,
    camY: number,
    w: number,
    h: number
  ) {
    const pos = this.toScreen(enemy.x, enemy.y, camX, camY, w, h);
    const charY = pos.y - 18;

    ctx.save();
    ctx.translate(pos.x, charY);

    // Dynamic rotating lock-on bracket rings
    const time = Date.now() * 0.005;
    const pulse = 1 + Math.sin(Date.now() * 0.016) * 0.09;
    const size = 28 * pulse;

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.0;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10;

    // Outer corner brackets (Tactical HUD square targeting box)
    const bracketLen = 8;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(-size, -size + bracketLen);
    ctx.lineTo(-size, -size);
    ctx.lineTo(-size + bracketLen, -size);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(size - bracketLen, -size);
    ctx.lineTo(size, -size);
    ctx.lineTo(size, -size + bracketLen);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(size, size - bracketLen);
    ctx.lineTo(size, size);
    ctx.lineTo(size - bracketLen, size);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(-size + bracketLen, size);
    ctx.lineTo(-size, size);
    ctx.lineTo(-size, size - bracketLen);
    ctx.stroke();

    // Inner rotating tactical circle ticks
    ctx.save();
    ctx.rotate(time);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Center precision laser dot
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // "MIRA FIJADA • LOCK-ON" Tactical military HUD text
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 9px "Chakra Petch", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;
    ctx.fillText('MIRA FIJADA [LOCK-ON]', 0, -size - 4);

    // Enemy robot model indicator
    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 8px "Chakra Petch", monospace';
    const robotName = (enemy.robotModel || enemy.type).toUpperCase();
    ctx.fillText(`ROBOT: ${robotName}`, 0, -size - 14);

    // Enemy Mini HP Bar under reticle
    const hpFrac = Math.max(0, Math.min(1, enemy.health / enemy.maxHealth));
    const barW = 38;
    const barH = 3;
    const barY = size + 6;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(-barW / 2, barY, barW, barH);

    ctx.fillStyle = hpFrac > 0.5 ? '#22c55e' : hpFrac > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(-barW / 2, barY, barW * hpFrac, barH);

    ctx.restore();
  }

  private static drawBullets(
    ctx: CanvasRenderingContext2D,
    bullets: Bullet[],
    camX: number,
    camY: number,
    w: number,
    h: number
  ) {
    bullets.forEach((bullet) => {
      const pos = this.toScreen(bullet.x, bullet.y, camX, camY, w, h);
      const tailWorldX = bullet.x - bullet.vx * 0.04;
      const tailWorldY = bullet.y - bullet.vy * 0.04;
      const tailPos = this.toScreen(tailWorldX, tailWorldY, camX, camY, w, h);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(tailPos.x, tailPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = bullet.color;
      ctx.lineWidth = bullet.fromPlayer ? 3 : 2;
      ctx.shadowColor = bullet.color;
      ctx.shadowBlur = 6;
      ctx.stroke();

      // Bullet tip
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, bullet.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    });
  }

  private static drawParticles(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    camX: number,
    camY: number,
    w: number,
    h: number
  ) {
    particles.forEach((p) => {
      const pos = this.toScreen(p.x, p.y, camX, camY, w, h);
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.type === 'shockwave') {
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  private static drawLightingOverlay(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    player: Player,
    barrels: Barrel[],
    extraction: ExtractionZone,
    theme: string
  ) {
    const playerPos = this.toScreen(player.x, player.y, camX, camY, w, h);

    // Screen darkness vignette
    const darknessCanvas = document.createElement('canvas');
    darknessCanvas.width = w;
    darknessCanvas.height = h;
    const dctx = darknessCanvas.getContext('2d');
    if (!dctx) return;

    // Ambient darkness
    dctx.fillStyle = theme === 'military' ? 'rgba(8, 4, 6, 0.45)' : 'rgba(5, 8, 14, 0.45)';
    dctx.fillRect(0, 0, w, h);

    // Punch out player light circle
    dctx.globalCompositeOperation = 'destination-out';

    // Player vision glow
    const playerGlow = dctx.createRadialGradient(
      playerPos.x,
      playerPos.y,
      20,
      playerPos.x,
      playerPos.y,
      280
    );
    playerGlow.addColorStop(0, 'rgba(0,0,0,1)');
    playerGlow.addColorStop(0.6, 'rgba(0,0,0,0.6)');
    playerGlow.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = playerGlow;
    dctx.beginPath();
    dctx.arc(playerPos.x, playerPos.y, 280, 0, Math.PI * 2);
    dctx.fill();

    // Extraction pad neon glow hole
    const extPos = this.toScreen(extraction.x, extraction.y, camX, camY, w, h);
    const extGlow = dctx.createRadialGradient(extPos.x, extPos.y, 20, extPos.x, extPos.y, 200);
    extGlow.addColorStop(0, 'rgba(0,0,0,0.9)');
    extGlow.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = extGlow;
    dctx.beginPath();
    dctx.arc(extPos.x, extPos.y, 200, 0, Math.PI * 2);
    dctx.fill();

    // Toxic barrel glow holes
    barrels.forEach((b) => {
      if (b.type === 'toxic') {
        const bp = this.toScreen(b.x, b.y, camX, camY, w, h);
        const bg = dctx.createRadialGradient(bp.x, bp.y, 5, bp.x, bp.y, 80);
        bg.addColorStop(0, 'rgba(0,0,0,0.6)');
        bg.addColorStop(1, 'rgba(0,0,0,0)');
        dctx.fillStyle = bg;
        dctx.beginPath();
        dctx.arc(bp.x, bp.y, 80, 0, Math.PI * 2);
        dctx.fill();
      }
    });

    // Draw composite overlay
    ctx.drawImage(darknessCanvas, 0, 0);
  }

  private static drawFloatingTexts(
    ctx: CanvasRenderingContext2D,
    floatingTexts: FloatingText[],
    camX: number,
    camY: number,
    w: number,
    h: number
  ) {
    floatingTexts.forEach((ft) => {
      const pos = this.toScreen(ft.x, ft.y, camX, camY, w, h);
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.fillStyle = ft.color;
      ctx.font = `bold ${ft.size || 14}px "Chakra Petch", sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, pos.x, pos.y);
      ctx.restore();
    });
  }
}
