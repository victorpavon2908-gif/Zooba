import React from 'react';
import { ShieldCheck, Skull, DollarSign, Award, ArrowRight, RotateCcw } from 'lucide-react';
import { LootItem, Player } from '../types';

interface ExtractionSummaryModalProps {
  isSuccess: boolean;
  player: Player;
  onContinue: () => void;
  onRetry: () => void;
}

export const ExtractionSummaryModal: React.FC<ExtractionSummaryModalProps> = ({
  isSuccess,
  player,
  onContinue,
  onRetry,
}) => {
  const lootValue = player.backpack.reduce((sum, item) => sum + item.value, 0);
  const killBonus = player.kills * 120;
  const survivalBonus = isSuccess ? 500 : 0;
  const totalBounty = isSuccess ? lootValue + killBonus + survivalBonus : 100; // $100 pity insurance if dead

  return (
    <div id="extraction-modal-backdrop" className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div
        id="extraction-modal-card"
        className={`w-full max-w-md rounded-xl p-6 border shadow-2xl flex flex-col gap-4 text-slate-100 ${
          isSuccess
            ? 'bg-gradient-to-b from-slate-900 to-emerald-950/40 border-emerald-500/50 shadow-emerald-500/10'
            : 'bg-gradient-to-b from-slate-900 to-rose-950/40 border-rose-600/50 shadow-rose-500/10'
        }`}
      >
        {/* Header Title */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              isSuccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {isSuccess ? <ShieldCheck className="w-7 h-7" /> : <Skull className="w-7 h-7" />}
          </div>
          <div>
            <h2 className="text-xl font-tech font-bold tracking-wide">
              {isSuccess ? 'EXTRACTION SUCCESSFUL' : 'OPERATIVE K.I.A.'}
            </h2>
            <p className="text-xs text-slate-400">
              {isSuccess
                ? 'Cargo securely evacuated via helicopter extraction.'
                : 'Vital signs lost in the combat sector. Unsecured loot lost.'}
            </p>
          </div>
        </div>

        {/* Scavenged Loot Breakdown */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs font-tech font-semibold text-slate-400">
            <span>SCAVENGED LOOT ({player.backpack.length} items)</span>
            <span>VALUE</span>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
            {player.backpack.length > 0 ? (
              player.backpack.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-slate-900/90 border border-slate-800 text-xs"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">{item.icon}</span>
                    <span className="font-medium text-slate-200">{item.name}</span>
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">${item.value}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-3 text-xs text-slate-500 italic">
                {isSuccess ? 'No items in backpack' : 'All scavenged cargo was lost'}
              </div>
            )}
          </div>
        </div>

        {/* Performance & Bonus Breakdown */}
        <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between text-slate-300">
            <span className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Hostiles Neutralized ({player.kills}x)</span>
            </span>
            <span className="font-mono text-slate-200">+${killBonus}</span>
          </div>

          {isSuccess && (
            <div className="flex justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sector Evacuation Bonus</span>
              </span>
              <span className="font-mono text-emerald-400">+${survivalBonus}</span>
            </div>
          )}

          {!isSuccess && (
            <div className="flex justify-between text-slate-400">
              <span>Emergency Insurance Payout</span>
              <span className="font-mono text-amber-400">+$100</span>
            </div>
          )}

          <div className="border-t border-slate-800 pt-2 flex justify-between font-tech font-bold text-sm">
            <span className="text-slate-200">TOTAL BOUNTY EARNED:</span>
            <span className="font-mono text-base text-emerald-400 font-bold">
              ${totalBounty}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {isSuccess ? (
            <button
              id="btn-collect-bounty"
              onClick={onContinue}
              className="flex-1 py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-98 font-tech font-bold text-sm text-white shadow-lg shadow-emerald-700/40 flex items-center justify-center gap-2 transition-all"
            >
              <span>DEPOSIT & ARMORY</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                id="btn-retry-mission"
                onClick={onRetry}
                className="flex-1 py-3 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-98 font-tech font-bold text-sm text-white shadow-lg shadow-rose-700/40 flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>REDEPLOY SECTOR</span>
              </button>
              <button
                id="btn-kia-armory"
                onClick={onContinue}
                className="py-3 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-98 font-tech text-sm text-slate-300 transition-colors"
              >
                ARMORY
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
