import React from 'react';
import { Settings as SettingsIcon, Volume2, Smartphone, Eye, Sparkles, X } from 'lucide-react';
import { GameSettings } from '../types';
import { sound } from '../audio/soundEngine';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  return (
    <div id="settings-modal-backdrop" className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div
        id="settings-modal-card"
        className="w-full max-w-md bg-slate-900 border border-slate-700/90 rounded-xl p-5 shadow-2xl flex flex-col gap-4 text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <SettingsIcon className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-tech font-bold tracking-wide">GAMEPLAY & GRAPHICS SETTINGS</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3.5 text-xs">
          {/* Mobile Auto-Aim Assist */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-850/60 border border-slate-800">
            <div>
              <span className="font-tech font-bold text-slate-200 block">Mobile Auto-Aim Assist</span>
              <span className="text-[11px] text-slate-400">Snaps weapon laser to closest enemy for smooth touch play</span>
            </div>
            <button
              onClick={() => {
                onUpdateSettings({ autoAim: !settings.autoAim });
                sound.playReload();
              }}
              className={`w-12 h-6 rounded-full transition-colors p-1 relative flex items-center ${
                settings.autoAim ? 'bg-emerald-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.autoAim ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Touch Controls Style */}
          <div className="p-2.5 rounded-lg bg-slate-850/60 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="font-tech font-bold text-slate-200">Touch Controls Layout</span>
              <Smartphone className="w-4 h-4 text-sky-400" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ touchControlsStyle: 'twin-stick' })}
                className={`p-2 rounded border font-tech font-bold text-[11px] transition-all ${
                  settings.touchControlsStyle === 'twin-stick'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                Twin-Stick (Dual Thumb)
              </button>
              <button
                onClick={() => onUpdateSettings({ touchControlsStyle: 'auto-target-button' })}
                className={`p-2 rounded border font-tech font-bold text-[11px] transition-all ${
                  settings.touchControlsStyle === 'auto-target-button'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                Auto-Aim + Action Buttons
              </button>
            </div>
          </div>

          {/* Graphics Quality */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-850/60 border border-slate-800">
            <div>
              <span className="font-tech font-bold text-slate-200 block">Dynamic Lighting & Shaders</span>
              <span className="text-[11px] text-slate-400">Atmospheric darkness, spotlight flashlight & glows</span>
            </div>
            <button
              onClick={() => onUpdateSettings({ highGraphics: !settings.highGraphics })}
              className={`w-12 h-6 rounded-full transition-colors p-1 relative flex items-center ${
                settings.highGraphics ? 'bg-emerald-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.highGraphics ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Screen Shake */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-850/60 border border-slate-800">
            <div>
              <span className="font-tech font-bold text-slate-200 block">Impact Screen Shake</span>
              <span className="text-[11px] text-slate-400">Tactical camera shake on heavy explosions & shotgun shots</span>
            </div>
            <button
              onClick={() => onUpdateSettings({ screenShake: !settings.screenShake })}
              className={`w-12 h-6 rounded-full transition-colors p-1 relative flex items-center ${
                settings.screenShake ? 'bg-emerald-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.screenShake ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Sound FX Volume Slider */}
          <div className="p-2.5 rounded-lg bg-slate-850/60 border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-tech font-bold text-slate-200">Sound Effects Volume</span>
              <span className="font-mono text-slate-400">{Math.round(settings.soundVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.soundVolume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onUpdateSettings({ soundVolume: val });
                sound.setVolume(val);
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-tech font-bold text-sm text-white shadow-md transition-colors mt-2"
        >
          CONFIRM & RESUME
        </button>
      </div>
    </div>
  );
};
