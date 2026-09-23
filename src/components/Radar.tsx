/**
 * Top-left Radar / Minimap Component.
 * Exactly matches the aesthetic from Bounty Run 2D screenshot:
 * - Square dark radar display
 * - Forward vision cone (green spotlight)
 * - Green player arrow indicator
 * - Red hostile blips
 * - Neon green extraction beacon marker
 * - Gold/cyan crate blips
 */

import React, { useEffect, useRef } from 'react';
import { Player, Enemy, ExtractionZone, Crate, HealthStation, HealthPickup } from '../types';
import { MapPin } from 'lucide-react';

interface RadarProps {
  player: Player;
  enemies: Enemy[];
  extraction: ExtractionZone;
  crates: Crate[];
  healthStations?: HealthStation[];
  healthPickups?: HealthPickup[];
  onOpenMap?: () => void;
  size?: number;
}

export const Radar: React.FC<RadarProps> = ({
  player,
  enemies,
  extraction,
  crates,
  healthStations = [],
  healthPickups = [],
  onOpenMap,
  size = 96,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const radarSize = size;
    canvas.width = radarSize;
    canvas.height = radarSize;
    const center = radarSize / 2;
    const radarRange = 420; // World distance visible on radar
    const scale = (radarSize * 0.45) / radarRange;

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Dark high-tech radar background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    // Radar scan rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    [0.3, 0.65, 0.95].forEach((pct) => {
      ctx.beginPath();
      ctx.arc(center, center, (size * 0.45) * pct, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Radar crosshairs
    ctx.beginPath();
    ctx.moveTo(center, 6);
    ctx.lineTo(center, size - 6);
    ctx.moveTo(6, center);
    ctx.lineTo(size - 6, center);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.stroke();

    // North indicator chevron at top
    ctx.beginPath();
    ctx.moveTo(center - 5, 10);
    ctx.lineTo(center, 4);
    ctx.lineTo(center + 5, 10);
    ctx.closePath();
    ctx.fillStyle = '#94a3b8';
    ctx.fill();

    // Player Vision Cone (Green translucent sector facing player.angle)
    ctx.save();
    ctx.translate(center, center);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const fov = Math.PI * 0.4;
    ctx.arc(0, 0, size * 0.4, player.angle - fov / 2, player.angle + fov / 2);
    ctx.closePath();
    const coneGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, size * 0.4);
    coneGrad.addColorStop(0, 'rgba(34, 197, 94, 0.45)');
    coneGrad.addColorStop(1, 'rgba(34, 197, 94, 0.0)');
    ctx.fillStyle = coneGrad;
    ctx.fill();
    ctx.restore();

    // Unopened Crates (small amber square blips)
    crates.forEach((c) => {
      if (c.isOpened) return;
      const dx = (c.x - player.x) * scale;
      const dy = (c.y - player.y) * scale;
      if (Math.hypot(dx, dy) < size * 0.45) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(center + dx - 2, center + dy - 2, 4, 4);
      }
    });

    // Health Stations (Green cross markers)
    healthStations.forEach((hs) => {
      const dx = (hs.x - player.x) * scale;
      const dy = (hs.y - player.y) * scale;
      if (Math.hypot(dx, dy) < size * 0.45) {
        ctx.fillStyle = hs.availableHeals > 0 ? '#10b981' : '#64748b';
        const hx = center + dx;
        const hy = center + dy;
        ctx.fillRect(hx - 1, hy - 3, 2, 6);
        ctx.fillRect(hx - 3, hy - 1, 6, 2);
      }
    });

    // Health Pickups (Floating glowing green dots)
    healthPickups.forEach((hp) => {
      if (hp.collected) return;
      const dx = (hp.x - player.x) * scale;
      const dy = (hp.y - player.y) * scale;
      if (Math.hypot(dx, dy) < size * 0.45) {
        ctx.beginPath();
        ctx.arc(center + dx, center + dy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#34d399';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Extraction Helipad (Neon green beacon blip / icon)
    const extDx = (extraction.x - player.x) * scale;
    const extDy = (extraction.y - player.y) * scale;
    const extDist = Math.hypot(extDx, extDy);
    const maxRadius = size * 0.42;

    if (extDist <= maxRadius) {
      // In range
      ctx.beginPath();
      ctx.arc(center + extDx, center + extDy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // Edge arrow pointer pointing towards extraction zone!
      const extAngle = Math.atan2(extDy, extDx);
      const edgeX = center + Math.cos(extAngle) * maxRadius;
      const edgeY = center + Math.sin(extAngle) * maxRadius;

      ctx.save();
      ctx.translate(edgeX, edgeY);
      ctx.rotate(extAngle);
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(-4, -4);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fillStyle = '#34d399';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }

    // Hostile Enemies (Red blips)
    enemies.forEach((enemy) => {
      if (enemy.state === 'dead') return;
      const dx = (enemy.x - player.x) * scale;
      const dy = (enemy.y - player.y) * scale;
      if (Math.hypot(dx, dy) < size * 0.45) {
        ctx.beginPath();
        ctx.arc(center + dx, center + dy, 3, 0, Math.PI * 2);
        ctx.fillStyle = enemy.isBoss ? '#f43f5e' : '#ef4444';
        ctx.fill();
      }
    });

    // Player Green Arrow in Center (Facing player.angle)
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(player.angle);
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-5, -4.5);
    ctx.lineTo(-2.5, 0);
    ctx.lineTo(-5, 4.5);
    ctx.closePath();
    ctx.fillStyle = '#22c55e';
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.restore();
  }, [player.x, player.y, player.angle, enemies, extraction.x, extraction.y, crates, healthStations, healthPickups]);

  return (
    <div
      id="radar-container"
      onClick={onOpenMap}
      role={onOpenMap ? 'button' : undefined}
      tabIndex={onOpenMap ? 0 : undefined}
      className={`relative p-1 bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-700/80 shadow-2xl overflow-hidden group ${
        onOpenMap ? 'cursor-pointer hover:border-emerald-500/80 transition-all' : ''
      }`}
      title={onOpenMap ? 'Clic para abrir el Mapa de Guía Táctico (M)' : undefined}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="block rounded-md"
      />
      {/* Tactical border accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-emerald-400 pointer-events-none" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-emerald-400 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-emerald-400 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-emerald-400 pointer-events-none" />

      {onOpenMap && (
        <div className="absolute bottom-1 right-1 bg-slate-950/80 text-[8px] font-mono text-emerald-400 px-1 py-0.5 rounded border border-emerald-500/30 opacity-70 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
          <MapPin className="w-2.5 h-2.5" />
          <span>MAPA</span>
        </div>
      )}
    </div>
  );
};
