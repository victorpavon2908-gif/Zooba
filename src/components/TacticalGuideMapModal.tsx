import React, { useRef, useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Heart,
  Shield,
  Bot,
  Box,
  Compass,
  Zap,
  Info,
  Layers,
  Crosshair,
} from 'lucide-react';
import { Player, Enemy, ExtractionZone, Crate, HealthStation, HealthPickup, MapSector } from '../types';

interface TacticalGuideMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  enemies: Enemy[];
  extraction: ExtractionZone;
  crates: Crate[];
  healthStations: HealthStation[];
  healthPickups: HealthPickup[];
  sectors: MapSector[];
  arenaSize: number;
}

export const TacticalGuideMapModal: React.FC<TacticalGuideMapModalProps> = ({
  isOpen,
  onClose,
  player,
  enemies,
  extraction,
  crates,
  healthStations,
  healthPickups,
  sectors,
  arenaSize,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Filter toggles
  const [showEnemies, setShowEnemies] = useState(true);
  const [showHealth, setShowHealth] = useState(true);
  const [showCrates, setShowCrates] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [activeTab, setActiveTab] = useState<'map' | 'guide'>('map');

  // Close on Escape or 'M' key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Render tactical schematic map on canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const scale = w / arenaSize;

    // 1. Background Grid & Deep Sci-Fi Theme
    ctx.fillStyle = '#060d17';
    ctx.fillRect(0, 0, w, h);

    // Subtle coordinate grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      const step = 200 * scale;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    // 2. Draw Sectors
    sectors.forEach((sec) => {
      const sx = sec.x * scale;
      const sy = sec.y * scale;
      const sw = sec.w * scale;
      const sh = sec.h * scale;

      // Sector tint
      ctx.fillStyle = sec.color;
      ctx.fillRect(sx, sy, sw, sh);

      // Sector boundary
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx, sy, sw, sh);

      // Sector label
      ctx.save();
      ctx.font = 'bold 10px "Chakra Petch", monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.75)';
      ctx.fillText(`[${sec.code}] ${sec.name}`, sx + 8, sy + 16);
      ctx.restore();
    });

    // Outer complex wall border
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, w - 4, h - 4);

    // 3. Draw Unopened & Opened Crates
    if (showCrates) {
      crates.forEach((c) => {
        const cx = c.x * scale;
        const cy = c.y * scale;
        if (c.isOpened) {
          ctx.fillStyle = 'rgba(100, 116, 139, 0.35)';
          ctx.fillRect(cx - 2, cy - 2, 4, 4);
        } else {
          ctx.fillStyle = c.type === 'safe' ? '#a855f7' : c.type === 'military' ? '#22c55e' : '#f59e0b';
          ctx.fillRect(cx - 2.5, cy - 2.5, 5, 5);
          ctx.strokeStyle = 'rgba(0,0,0,0.6)';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(cx - 2.5, cy - 2.5, 5, 5);
        }
      });
    }

    // 4. Draw Health Stations and Health Pickups
    if (showHealth) {
      // Health Stations (Cápsulas / Estaciones Médicas)
      healthStations.forEach((hs) => {
        const hx = hs.x * scale;
        const hy = hs.y * scale;

        // Healing area ring
        ctx.beginPath();
        ctx.arc(hx, hy, hs.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Green cross symbol
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 8;
        ctx.fillRect(hx - 1.5, hy - 5, 3, 10);
        ctx.fillRect(hx - 5, hy - 1.5, 10, 3);
        ctx.shadowBlur = 0;

        // Label
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#86efac';
        ctx.textAlign = 'center';
        ctx.fillText('VIDA', hx, hy + 12);
        ctx.textAlign = 'left';
      });

      // Health Pickups (Botiquines y Núcleos de Vida sueltos)
      healthPickups.forEach((hp) => {
        if (hp.collected) return;
        const px = hp.x * scale;
        const py = hp.y * scale;

        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#4ade80';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    // 5. Draw Enemy Robots
    if (showEnemies) {
      enemies.forEach((enemy) => {
        if (enemy.state === 'dead') return;
        const ex = enemy.x * scale;
        const ey = enemy.y * scale;

        const isBoss = enemy.type === 'boss';
        const isHeavy = enemy.type === 'heavy';

        ctx.beginPath();
        ctx.arc(ex, ey, isBoss ? 5 : isHeavy ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = isBoss ? '#ef4444' : isHeavy ? '#f97316' : '#f43f5e';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    // 6. Draw Extraction Helipad Zone
    const extX = extraction.x * scale;
    const extY = extraction.y * scale;
    const extRadius = extraction.radius * scale;

    // Helipad radar pulse
    ctx.beginPath();
    ctx.arc(extX, extY, extRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Central 'H' heli icon
    ctx.font = 'bold 10px "Chakra Petch", monospace';
    ctx.fillStyle = '#34d399';
    ctx.textAlign = 'center';
    ctx.fillText('🚁 EXT', extX, extY + 3.5);
    ctx.textAlign = 'left';

    // 7. Draw Player Position & Heading
    const plX = player.x * scale;
    const plY = player.y * scale;

    // Dynamic radar ping ring
    ctx.beginPath();
    ctx.arc(plX, plY, 12, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Directional orientation cone
    ctx.save();
    ctx.translate(plX, plY);
    ctx.rotate(player.angle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 24, -Math.PI * 0.2, Math.PI * 0.2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.fill();

    // Player marker
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, -4);
    ctx.lineTo(-2.5, 0);
    ctx.lineTo(-5, 4);
    ctx.closePath();
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();

    // Connection vector from player to Extraction Zone
    ctx.beginPath();
    ctx.moveTo(plX, plY);
    ctx.lineTo(extX, extY);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [
    isOpen,
    player.x,
    player.y,
    player.angle,
    enemies,
    extraction.x,
    extraction.y,
    crates,
    healthStations,
    healthPickups,
    sectors,
    arenaSize,
    showEnemies,
    showHealth,
    showCrates,
    showGrid,
  ]);

  if (!isOpen) return null;

  // Calculate distances
  const distToExtraction = Math.round(
    Math.hypot(extraction.x - player.x, extraction.y - player.y) / 10
  );

  // Find nearest health station
  let nearestStationDist = Infinity;
  let nearestStationLabel = 'Ninguna';
  healthStations.forEach((hs) => {
    const d = Math.hypot(hs.x - player.x, hs.y - player.y) / 10;
    if (d < nearestStationDist) {
      nearestStationDist = Math.round(d);
      nearestStationLabel = hs.label;
    }
  });

  // Current sector of player
  const currentSector = sectors.find(
    (s) =>
      player.x >= s.x &&
      player.x <= s.x + s.w &&
      player.y >= s.y &&
      player.y <= s.y + s.h
  ) || sectors[0];

  const extMinutes = Math.floor(Math.max(0, extraction.countdown) / 60);
  const extSeconds = Math.floor(Math.max(0, extraction.countdown) % 60);
  const timeStr = `${extMinutes}:${extSeconds < 10 ? '0' : ''}${extSeconds}`;

  return (
    <div
      id="tactical-guide-map-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl bg-slate-900 border border-cyan-500/40 rounded-xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400 animate-spin-slow" />
            <div>
              <h2 className="font-tech text-base font-bold tracking-wider text-slate-100 flex items-center gap-2">
                MAPA DE GUÍA TÁCTICO & NAVEGACIÓN
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                  {arenaSize}m x {arenaSize}m
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                SECTOR ACTUAL: <span className="text-cyan-300 font-bold">[{currentSector.code}] {currentSector.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
              <button
                id="tab-map-view"
                onClick={() => setActiveTab('map')}
                className={`px-3 py-1 rounded text-xs font-tech font-bold transition-all ${
                  activeTab === 'map' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                MAPA
              </button>
              <button
                id="tab-guide-view"
                onClick={() => setActiveTab('guide')}
                className={`px-3 py-1 rounded text-xs font-tech font-bold transition-all ${
                  activeTab === 'guide' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                GUÍA DE MISIÓN
              </button>
            </div>

            <button
              id="btn-close-guide-map"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Cerrar (Esc / M)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col md:flex-row gap-4">
          {activeTab === 'map' ? (
            <>
              {/* Tactical Canvas Map Area */}
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 rounded-lg p-2 border border-slate-800 relative">
                <canvas
                  ref={canvasRef}
                  width={520}
                  height={520}
                  className="w-full max-w-[520px] aspect-square rounded border border-cyan-500/20 shadow-inner"
                />

                {/* Map Filter Toggles below canvas */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2 w-full">
                  <button
                    onClick={() => setShowHealth(!showHealth)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-tech font-bold border transition-all ${
                      showHealth
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5 text-emerald-400" />
                    Vidas & Salud ({healthStations.length + healthPickups.filter((p) => !p.collected).length})
                  </button>

                  <button
                    onClick={() => setShowEnemies(!showEnemies)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-tech font-bold border transition-all ${
                      showEnemies
                        ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5 text-rose-400" />
                    Robots ({enemies.filter((e) => e.state !== 'dead').length})
                  </button>

                  <button
                    onClick={() => setShowCrates(!showCrates)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-tech font-bold border transition-all ${
                      showCrates
                        ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5 text-amber-400" />
                    Cajas ({crates.filter((c) => !c.isOpened).length})
                  </button>

                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-tech font-bold border transition-all ${
                      showGrid
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Cuadrícula
                  </button>
                </div>
              </div>

              {/* Tactical Status & Waypoints Sidebar */}
              <div className="w-full md:w-72 flex flex-col gap-3">
                {/* Extraction Status Card */}
                <div className="bg-slate-950/80 border border-emerald-500/40 rounded-lg p-3">
                  <div className="flex items-center justify-between text-xs font-tech font-bold text-emerald-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4" /> PUNTO DE EXTRACCIÓN
                    </span>
                    <span className="font-mono">{timeStr}</span>
                  </div>
                  <div className="text-sm font-tech font-bold text-slate-100">
                    Distancia: <span className="text-emerald-300 font-mono">{distToExtraction}m</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ubicado en el <strong className="text-emerald-400">Sector 06 (Helipuerto Fortificado)</strong>.
                  </p>
                </div>

                {/* Health & Life Stations Card */}
                <div className="bg-slate-950/80 border border-emerald-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs font-tech font-bold text-emerald-400 mb-1.5">
                    <Heart className="w-4 h-4 fill-emerald-500" />
                    ESTACIONES DE VIDA DISPONIBLES
                  </div>
                  <div className="text-xs font-mono text-slate-300 flex items-center justify-between py-1 border-b border-slate-800">
                    <span>Estación más cercana:</span>
                    <span className="text-emerald-400 font-bold">{nearestStationDist}m</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Acércate a una <strong className="text-emerald-300">Estación Médica</strong> o recoge botiquines en el suelo para restaurar tu salud al máximo.
                  </div>
                </div>

                {/* Threat Telemetry Card */}
                <div className="bg-slate-950/80 border border-rose-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs font-tech font-bold text-rose-400 mb-1.5">
                    <Bot className="w-4 h-4" />
                    ACTIVIDAD ROBÓTICA DETECTADA
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-300">
                    <div className="flex justify-between">
                      <span>Drones Asalto Ciber:</span>
                      <span className="font-mono text-rose-400 font-bold">
                        {enemies.filter((e) => e.type === 'grunt' && e.state !== 'dead').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Centinelas Tácticos Mech:</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {enemies.filter((e) => e.type === 'enforcer' && e.state !== 'dead').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Titanes Pesados Goliat:</span>
                      <span className="font-mono text-purple-400 font-bold">
                        {enemies.filter((e) => e.type === 'heavy' && e.state !== 'dead').length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Map Legend */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-400">
                  <div className="font-tech font-bold text-slate-300 mb-1.5">LEYENDA DEL MAPA</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      <span>Tú (Agente)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span>Helipuerto</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-emerald-500" />
                      <span>Vida / Salud</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-amber-400" />
                      <span>Caja Botín</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span>Robot Enemigo</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-purple-500" />
                      <span>Caja Fuerte</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Tactical Guide Tab */
            <div className="w-full flex flex-col gap-4 text-slate-200">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <h3 className="font-tech font-bold text-base text-cyan-400 flex items-center gap-2 mb-2">
                  <Info className="w-5 h-5 text-cyan-400" />
                  GUÍA COMPLETA DE SUPERVIVENCIA Y EXTRACCIÓN
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Te has infiltrado en un complejo industrial y de investigación de alta seguridad de <strong>3200 x 3200 metros</strong>. Tu objetivo es saquear suministros, derrotar robots de seguridad, recargar vidas cuando estés herido y evacuar en el Helipuerto con tu botín antes de que el sector sea clausurado.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Health Guide */}
                <div className="bg-slate-950 p-3 rounded-lg border border-emerald-500/30 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 font-tech font-bold text-sm text-emerald-400">
                    <Heart className="w-4 h-4 fill-emerald-500" />
                    1. RECARGA DE VIDA Y SALUD
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Hay <strong>Estaciones Médicas</strong> distribuidas por los sectores. Puedes pararte dentro del anillo verde para recargar tu salud. Además, los robots derrotados y cajas contienen <strong>Botiquines y Nano Stims</strong> que puedes usar directamente con el botón de vida o tecla <strong className="text-emerald-400">[H]</strong>.
                  </p>
                </div>

                {/* Combat Guide */}
                <div className="bg-slate-950 p-3 rounded-lg border border-rose-500/30 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 font-tech font-bold text-sm text-rose-400">
                    <Bot className="w-4 h-4" />
                    2. COMBATE CONTRA ROBOTS PRO
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Los <strong>Drones de Asalto</strong> son rápidos y atacan en patrullas. Los <strong>Centinelas Mech</strong> tienen escáner láser y cañones de plasma. Los <strong>Titanes Goliat</strong> son moles blindadas con ametralladoras rotativas. Usa esquivar (<strong className="text-sky-400">ROLL</strong>) y granadas para romper sus defensas.
                  </p>
                </div>

                {/* Scavenging Guide */}
                <div className="bg-slate-950 p-3 rounded-lg border border-amber-500/30 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 font-tech font-bold text-sm text-amber-400">
                    <Box className="w-4 h-4" />
                    3. SAQUEO Y ALMACÉN DE BOTÍN
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Las cajas de madera y militares contienen dinero, piezas electrónicas y botiquines. Las <strong>Cajas Fuertes</strong> en los sectores profundos contienen chips de datos clasificados y lingotes de oro de alto valor en el mercado negro.
                  </p>
                </div>

                {/* Extraction Guide */}
                <div className="bg-slate-950 p-3 rounded-lg border border-cyan-500/30 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 font-tech font-bold text-sm text-cyan-400">
                    <Shield className="w-4 h-4" />
                    4. EVACUACIÓN Y EXTRACCIÓN
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Sigue la flecha verde o el mapa hasta el <strong>Sector 06</strong>. Cuando el helicóptero esté listo, debes permanecer 5 segundos dentro del helipuerto mientras resistes la emboscada robótica final para completar la misión.
                  </p>
                </div>
              </div>

              {/* Controls Cheatsheet */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="font-tech font-bold text-xs text-slate-300 mb-2">CONTROLES DE TECLADO / MÓVIL:</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-slate-400">
                  <div><strong className="text-cyan-400">WASD:</strong> Moverse</div>
                  <div><strong className="text-cyan-400">Mouse:</strong> Apuntar / Disparar</div>
                  <div><strong className="text-cyan-400">Espacio:</strong> Esquivar (Roll)</div>
                  <div><strong className="text-cyan-400">Shift:</strong> Sprint Táctico</div>
                  <div><strong className="text-cyan-400">R:</strong> Recargar</div>
                  <div><strong className="text-cyan-400">H:</strong> Curar / Usar Vida</div>
                  <div><strong className="text-cyan-400">G:</strong> Lanzar Granada</div>
                  <div><strong className="text-cyan-400">M:</strong> Abrir Mapa de Guía</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-tech">
            Presiona <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">M</kbd> o <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">ESC</kbd> para regresar al juego
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-tech font-bold text-white transition-colors"
          >
            VOLVER AL COMBATE
          </button>
        </div>
      </div>
    </div>
  );
};
