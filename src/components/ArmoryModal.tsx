import React, { useState } from 'react';
import { ShoppingBag, Shield, Crosshair, Zap, Package, Check, Lock, Play, X } from 'lucide-react';
import { Weapon, WeaponId, SectorMission } from '../types';
import { WEAPONS, SECTOR_MISSIONS } from '../game/gameData';
import { sound } from '../audio/soundEngine';

interface ArmoryModalProps {
  cash: number;
  unlockedWeapons: WeaponId[];
  equippedWeapon: WeaponId;
  backpackTier: number; // 0 = 5 slots, 1 = 7 slots, 2 = 9 slots, 3 = 12 slots
  armorTier: number;    // 0 = 15%, 1 = 30%, 2 = 45%
  selectedMissionId: string;
  onEquipWeapon: (id: WeaponId) => void;
  onBuyWeapon: (id: WeaponId, price: number) => void;
  onUpgradeBackpack: (tier: number, price: number) => void;
  onUpgradeArmor: (tier: number, price: number) => void;
  onSelectMission: (missionId: string) => void;
  onStartRaid: () => void;
  onClose: () => void;
}

export const ArmoryModal: React.FC<ArmoryModalProps> = ({
  cash,
  unlockedWeapons,
  equippedWeapon,
  backpackTier,
  armorTier,
  selectedMissionId,
  onEquipWeapon,
  onBuyWeapon,
  onUpgradeBackpack,
  onUpgradeArmor,
  onSelectMission,
  onStartRaid,
  onClose,
}) => {
  const [tab, setTab] = useState<'weapons' | 'gear' | 'missions'>('weapons');

  const backpackUpgrades = [
    { tier: 0, slots: 5, price: 0, label: 'Standard Rig (5 Slots)' },
    { tier: 1, slots: 7, price: 1200, label: 'Tactical Rucksack (7 Slots)' },
    { tier: 2, slots: 9, price: 2800, label: 'Heavy Military Pack (9 Slots)' },
    { tier: 3, slots: 12, price: 5500, label: 'Exo-Cargo Hauler (12 Slots)' },
  ];

  const armorUpgrades = [
    { tier: 0, armor: 15, price: 0, label: 'Light Combat Vest (15% Armor)' },
    { tier: 1, armor: 30, price: 1500, label: 'Kevlar Plate Carrier (30% Armor)' },
    { tier: 2, armor: 45, price: 3600, label: 'Nano-Ceramic Exosuit (45% Armor)' },
  ];

  return (
    <div id="armory-modal-backdrop" className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-150">
      <div
        id="armory-modal-card"
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-tech font-bold tracking-wide">BLACK MARKET ARMORY</h2>
              <p className="text-[11px] text-slate-400">Equip tactical gear & choose your infiltration sector</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Cash Balance */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 font-mono font-bold text-sm shadow-inner">
              <span>$</span>
              <span>{cash.toLocaleString()}</span>
            </div>

            <button
              id="btn-close-armory"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/80 px-4">
          <button
            onClick={() => setTab('weapons')}
            className={`py-2.5 px-4 font-tech text-xs font-bold border-b-2 transition-all ${
              tab === 'weapons'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            FIREARMS
          </button>
          <button
            onClick={() => setTab('gear')}
            className={`py-2.5 px-4 font-tech text-xs font-bold border-b-2 transition-all ${
              tab === 'gear'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            TACTICAL RIGS
          </button>
          <button
            onClick={() => setTab('missions')}
            className={`py-2.5 px-4 font-tech text-xs font-bold border-b-2 transition-all ${
              tab === 'missions'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            SECTORS & RAIDS
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {/* WEAPONS TAB */}
          {tab === 'weapons' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.values(WEAPONS).map((w) => {
                const isUnlocked = unlockedWeapons.includes(w.id);
                const isEquipped = equippedWeapon === w.id;
                const canAfford = cash >= w.price;

                return (
                  <div
                    key={w.id}
                    className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                      isEquipped
                        ? 'bg-emerald-950/30 border-emerald-500/60 ring-1 ring-emerald-500/30'
                        : isUnlocked
                        ? 'bg-slate-800/60 border-slate-700 hover:border-slate-500'
                        : 'bg-slate-900/40 border-slate-800 opacity-80'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-tech font-bold text-sm text-slate-100 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: w.color }} />
                            {w.name}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">
                            {w.type}
                          </span>
                        </div>

                        {isEquipped ? (
                          <span className="text-[10px] font-tech font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            EQUIPPED
                          </span>
                        ) : !isUnlocked ? (
                          <span className="text-xs font-mono font-bold text-amber-400">
                            ${w.price}
                          </span>
                        ) : null}
                      </div>

                      <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">{w.description}</p>

                      {/* Stat Bars */}
                      <div className="grid grid-cols-3 gap-2 mt-3 text-[10px] font-mono text-slate-400 bg-slate-950/40 p-2 rounded">
                        <div>
                          <span>DMG: </span>
                          <span className="text-slate-200 font-bold">{w.damage * w.bulletsPerShot}</span>
                        </div>
                        <div>
                          <span>RATE: </span>
                          <span className="text-slate-200 font-bold">{w.fireRate}/s</span>
                        </div>
                        <div>
                          <span>MAG: </span>
                          <span className="text-slate-200 font-bold">{w.magSize}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="mt-3">
                      {isEquipped ? (
                        <div className="text-center py-1.5 text-xs text-emerald-400 font-tech font-bold flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5" /> IN HOLSTER
                        </div>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => {
                            onEquipWeapon(w.id);
                            sound.playReload();
                          }}
                          className="w-full py-1.5 rounded bg-slate-700 hover:bg-slate-600 font-tech font-bold text-xs text-white transition-colors"
                        >
                          EQUIP WEAPON
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (canAfford) {
                              onBuyWeapon(w.id, w.price);
                              sound.playExtractionBeep();
                            }
                          }}
                          disabled={!canAfford}
                          className={`w-full py-1.5 rounded font-tech font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                            canAfford
                              ? 'bg-amber-600 hover:bg-amber-500 text-white'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Lock className="w-3 h-3" />
                          <span>UNLOCK FOR ${w.price}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* GEAR TAB */}
          {tab === 'gear' && (
            <div className="space-y-4">
              {/* Backpack Expansion */}
              <div className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-tech font-bold text-sm text-slate-100">BACKPACK CAPACITY</h3>
                </div>
                <p className="text-xs text-slate-300 mb-3">
                  Allows you to extract more high-value watches, data chips, and gold ingots per run.
                </p>

                <div className="space-y-2">
                  {backpackUpgrades.map((b) => {
                    const isPurchased = backpackTier >= b.tier;
                    const isNext = backpackTier + 1 === b.tier;
                    const canAfford = cash >= b.price;

                    return (
                      <div
                        key={b.tier}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                          isPurchased
                            ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-200'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div>
                          <span className="font-semibold text-slate-200 block">{b.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Max Capacity: {b.slots} items</span>
                        </div>

                        {isPurchased ? (
                          <span className="text-emerald-400 font-tech font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> INSTALLED
                          </span>
                        ) : isNext ? (
                          <button
                            onClick={() => {
                              if (canAfford) {
                                onUpgradeBackpack(b.tier, b.price);
                                sound.playLootPickup('rare');
                              }
                            }}
                            disabled={!canAfford}
                            className={`py-1 px-3 rounded font-tech font-bold text-xs ${
                              canAfford
                                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            UPGRADE ${b.price}
                          </button>
                        ) : (
                          <span className="text-slate-600 font-mono text-[11px]">LOCKED</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Armor Upgrades */}
              <div className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-sky-400" />
                  <h3 className="font-tech font-bold text-sm text-slate-100">BODY ARMOR</h3>
                </div>
                <p className="text-xs text-slate-300 mb-3">
                  Mitigates damage taken from enemy bullets and shrapnel explosions.
                </p>

                <div className="space-y-2">
                  {armorUpgrades.map((a) => {
                    const isPurchased = armorTier >= a.tier;
                    const isNext = armorTier + 1 === a.tier;
                    const canAfford = cash >= a.price;

                    return (
                      <div
                        key={a.tier}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                          isPurchased
                            ? 'bg-sky-950/20 border-sky-500/40 text-slate-200'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div>
                          <span className="font-semibold text-slate-200 block">{a.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Ballistic Absorption: {a.armor}%</span>
                        </div>

                        {isPurchased ? (
                          <span className="text-sky-400 font-tech font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> EQUIPPED
                          </span>
                        ) : isNext ? (
                          <button
                            onClick={() => {
                              if (canAfford) {
                                onUpgradeArmor(a.tier, a.price);
                                sound.playLootPickup('rare');
                              }
                            }}
                            disabled={!canAfford}
                            className={`py-1 px-3 rounded font-tech font-bold text-xs ${
                              canAfford
                                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            UPGRADE ${a.price}
                          </button>
                        ) : (
                          <span className="text-slate-600 font-mono text-[11px]">LOCKED</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* MISSIONS TAB */}
          {tab === 'missions' && (
            <div className="space-y-3">
              {SECTOR_MISSIONS.map((m) => {
                const isSelected = selectedMissionId === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => onSelectMission(m.id)}
                    className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/30 border-emerald-500/80 ring-1 ring-emerald-500/40'
                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-emerald-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {m.sectorCode}
                          </span>
                          <h3 className="font-tech font-bold text-sm text-slate-100">{m.name}</h3>
                        </div>
                        <p className="text-xs text-slate-300 mt-2">{m.description}</p>
                      </div>

                      <span
                        className={`text-[10px] font-tech font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          m.difficulty === 'Extreme'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : m.difficulty === 'Hostile'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        }`}
                      >
                        {m.difficulty}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                      <span>Loot Value: <strong className="text-emerald-400">{m.lootMultiplier}x</strong></span>
                      <span>Extraction Window: <strong className="text-slate-200">{m.extractionTimeSec}s</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer: START RAID */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-tech">
            <span>SELECTED: </span>
            <strong className="text-slate-200">
              {SECTOR_MISSIONS.find((m) => m.id === selectedMissionId)?.name}
            </strong>
          </div>

          <button
            id="btn-deploy-raid"
            onClick={onStartRaid}
            className="py-2.5 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-98 font-tech font-bold text-sm text-white shadow-lg shadow-emerald-700/50 flex items-center gap-2 transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>DEPLOY EXTRACTION RAID</span>
          </button>
        </div>
      </div>
    </div>
  );
};
