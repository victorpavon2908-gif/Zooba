import React, { useState } from 'react';
import { Smartphone, Download, QrCode, Check, Copy, ExternalLink, X, ShieldCheck, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallAppModalProps {
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);

  // Get current app URL
  const appUrl = typeof window !== 'undefined' ? window.location.href : 'https://ais-pre-voloh4eyrmave5l7gpu365-314820299328.us-west2.run.app';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // QR Code generator API URL
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(appUrl)}&color=34-211-153&bgcolor=2-6-23`;

  return (
    <div id="install-modal-backdrop" className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
      <div
        id="install-modal-card"
        className="w-full max-w-lg bg-slate-900 border border-emerald-500/40 rounded-xl p-5 shadow-2xl flex flex-col gap-4 text-slate-100 max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-tech font-bold tracking-wide text-slate-100">
                PROBAR E INSTALAR EN TU CELULAR
              </h2>
              <p className="text-[11px] text-slate-400">
                Opciones para jugarlo ahora mismo en tu móvil (Android / iOS)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Option 1: Direct PWA WebAPK 1-Click Install */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/50 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="font-tech font-bold text-xs text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Opción 1: Instalar como App Nativa (APK)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              RECOMENDADO
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Al instalarlo desde tu navegador en Android (Chrome, Brave o Samsung), el sistema genera automáticamente un <strong>WebAPK</strong> nativo que se agrega con ícono a tu pantalla de inicio, corre a pantalla completa y sin barra de direcciones.
          </p>

          {isInstalled ? (
            <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-tech font-bold flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> ¡La aplicación ya está instalada en este dispositivo!
            </div>
          ) : isInstallable ? (
            <button
              id="btn-trigger-pwa-install"
              onClick={install}
              className="py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-98 font-tech font-bold text-xs text-slate-950 shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>INSTALAR APLICACIÓN EN ESTE DISPOSITIVO</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2">
              <span className="text-emerald-400 font-bold">💡 En tu móvil:</span>
              <span>
                Abre el enlace en Chrome/Brave y presiona en los 3 puntos del navegador <strong>(⋮)</strong> &gt; <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
              </span>
            </div>
          )}
        </div>

        {/* Option 2: QR Code to open directly on your Phone */}
        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col sm:flex-row items-center gap-4">
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-700 shadow-inner shrink-0 flex items-center justify-center">
            <img
              src={qrCodeUrl}
              alt="QR Code para celular"
              className="w-32 h-32 rounded object-contain"
              loading="lazy"
            />
          </div>

          <div className="flex flex-col gap-2 w-full text-left">
            <span className="font-tech font-bold text-xs text-sky-400 flex items-center gap-1.5 uppercase tracking-wider">
              <QrCode className="w-3.5 h-3.5" /> Escanea con la cámara de tu celular
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Apunta la cámara de tu teléfono al código QR para abrir el juego al instante sin descargas previas.
            </p>

            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="w-full text-[11px] font-mono bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded text-slate-300 truncate"
              />
              <button
                onClick={handleCopyLink}
                className="py-1.5 px-3 rounded bg-slate-700 hover:bg-slate-600 text-xs font-tech font-bold text-white flex items-center gap-1 shrink-0 transition-colors"
                title="Copiar enlace"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Option 3: APK Standalone Builder Info */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex flex-col gap-1.5">
          <span className="font-tech font-bold text-amber-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> ¿Deseas un archivo .APK suelto para distribución o Play Store?
          </span>
          <p className="text-[11px] leading-relaxed">
            Puedes convertir este mismo enlace en un archivo <strong>.APK firmado</strong> usando <strong>PWABuilder.com</strong> (creado por Microsoft para Android/Google Play) o <strong>Bubblewrap CLI</strong> de Google. Solo ingresas la URL y descarga tu paquete APK listo para instalar o publicar.
          </p>
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-tech font-bold text-xs text-slate-200 transition-colors"
        >
          CERRAR Y VOLVER AL JUEGO
        </button>
      </div>
    </div>
  );
};
