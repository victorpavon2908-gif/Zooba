import React, { useState } from 'react';
import { LootItem } from '../types';

interface LootInventoryBarProps {
  loot: LootItem[];
  maxSlots: number;
  onUseItem?: (index: number) => void;
  onDropItem?: (index: number) => void;
}

export const LootInventoryBar: React.FC<LootInventoryBarProps> = ({
  loot,
  maxSlots,
  onUseItem,
  onDropItem,
}) => {
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  const selectedItem = selectedItemIndex !== null ? loot[selectedItemIndex] : null;

  // Build array of slots up to maxSlots
  const slots: Array<LootItem | null> = [];
  for (let i = 0; i < maxSlots; i++) {
    slots.push(loot[i] || null);
  }

  const getRarityColor = (rarity?: string) => {
    switch (rarity) {
      case 'legendary':
        return 'border-amber-400 text-amber-300 bg-amber-950/40';
      case 'epic':
        return 'border-purple-400 text-purple-300 bg-purple-950/40';
      case 'rare':
        return 'border-sky-400 text-sky-300 bg-sky-950/40';
      case 'uncommon':
        return 'border-emerald-400 text-emerald-300 bg-emerald-950/40';
      default:
        return 'border-slate-600 text-slate-300 bg-slate-800/40';
    }
  };

  return (
    <div id="loot-inventory-bar" className="flex flex-col gap-1 select-none">
      {/* Label: LOOT: X/Y */}
      <div className="flex items-center gap-2 text-xs font-tech font-bold tracking-wider text-slate-300 drop-shadow">
        <span>LOOT:</span>
        <span className={loot.length >= maxSlots ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
          {loot.length}/{maxSlots}
        </span>
      </div>

      {/* Item Slots Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto max-w-[280px] sm:max-w-[400px] py-0.5 no-scrollbar">
        {slots.map((item, idx) => (
          <div
            key={idx}
            onClick={() => {
              if (item) {
                setSelectedItemIndex(selectedItemIndex === idx ? null : idx);
              }
            }}
            className={`relative flex flex-col items-center justify-between w-12 h-14 p-1 rounded border transition-all cursor-pointer ${
              item
                ? `${getRarityColor(item.rarity)} hover:border-white`
                : 'border-slate-800/80 bg-slate-900/50 opacity-40'
            } ${selectedItemIndex === idx ? 'ring-2 ring-emerald-400 scale-105 z-10' : ''}`}
          >
            {item ? (
              <>
                <span className="text-xl mt-0.5">{item.icon}</span>
                <span className="text-[8px] leading-tight text-center font-mono truncate w-full text-slate-200">
                  {item.name}
                </span>
                {item.usable && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-900" />
                )}
              </>
            ) : (
              <span className="m-auto text-slate-600 text-xs font-mono">•</span>
            )}
          </div>
        ))}
      </div>

      {/* Item Detail Popover if tapped */}
      {selectedItem && selectedItemIndex !== null && (
        <div className="absolute bottom-16 left-0 bg-slate-900/95 border border-slate-700 p-2.5 rounded-lg shadow-2xl backdrop-blur-md w-56 text-xs z-30 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between font-tech font-bold text-slate-100">
            <span className="flex items-center gap-1.5">
              <span>{selectedItem.icon}</span>
              <span>{selectedItem.name}</span>
            </span>
            <span className="text-emerald-400 font-mono">${selectedItem.value}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{selectedItem.description}</p>

          <div className="flex gap-2 mt-2.5">
            {selectedItem.usable && (
              <button
                id="btn-use-item"
                onClick={() => {
                  onUseItem?.(selectedItemIndex);
                  setSelectedItemIndex(null);
                }}
                className="flex-1 py-1 px-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-tech font-bold text-[10px] transition-colors"
              >
                USE (+HP)
              </button>
            )}
            <button
              id="btn-drop-item"
              onClick={() => {
                onDropItem?.(selectedItemIndex);
                setSelectedItemIndex(null);
              }}
              className="py-1 px-2 rounded bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-tech text-[10px] transition-colors"
            >
              DROP
            </button>
            <button
              onClick={() => setSelectedItemIndex(null)}
              className="py-1 px-2 rounded bg-slate-800 text-slate-300 font-tech text-[10px]"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
