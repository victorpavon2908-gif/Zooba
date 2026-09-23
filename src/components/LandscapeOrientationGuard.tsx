import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw } from 'lucide-react';

/**
 * LandscapeOrientationGuard
 * Enforces Landscape orientation for mobile phones & tablets.
 * When portrait orientation is detected on touch devices, displays a sleek prompt to rotate.
 */
export const LandscapeOrientationGuard: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if height > width and device is touch/mobile width
      const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 1024;
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div
      id="landscape-guard-overlay"
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100 select-none animate-in fade-in duration-200"
    >
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-emerald-950/80 border-2 border-emerald-400 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
          <Smartphone className="w-10 h-10 text-emerald-400 animate-pulse" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg animate-spin-slow">
          <RotateCw className="w-4 h-4" />
        </div>
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-tech font-bold uppercase tracking-widest mb-3">
        <span>MODO HORIZONTAL REQUERIDO</span>
      </div>

      <h2 className="text-2xl sm:text-3xl font-tech font-extrabold tracking-tight text-white mb-2">
        GIRA TU DISPOSITIVO A HORIZONTAL
      </h2>

      <p className="text-sm text-slate-400 max-w-sm font-sans leading-relaxed">
        Bounty Run 3D está diseñado para jugarse en pantalla panorámica (Landscape). Gira tu teléfono o tablet para acceder a los controles táctiles de combate y al mundo 3D.
      </p>

      <div className="mt-8 flex items-center gap-3 text-xs font-mono text-slate-500">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span>16:9 • 19.5:9 • 20:9 • TABLETS LANDSCAPE</span>
      </div>
    </div>
  );
};
