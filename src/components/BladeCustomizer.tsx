import React from 'react';
import { BladeStyle } from '../types';
import { BLADE_STYLES } from '../utils/fruitData';
import { X, Sparkles, Check } from 'lucide-react';

interface BladeCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBlade: BladeStyle;
  onSelectBlade: (blade: BladeStyle) => void;
}

export const BladeCustomizer: React.FC<BladeCustomizerProps> = ({
  isOpen,
  onClose,
  selectedBlade,
  onSelectBlade,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-stone-950 border border-amber-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-cinzel font-bold text-amber-200">Dojo Blade Armory</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Blade List */}
        <div className="grid grid-cols-1 gap-3">
          {BLADE_STYLES.map((blade) => {
            const isSelected = selectedBlade.id === blade.id;
            return (
              <button
                key={blade.id}
                onClick={() => {
                  onSelectBlade(blade);
                }}
                className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                    : 'bg-stone-900/60 border-stone-800 hover:border-stone-700 hover:bg-stone-900'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  {/* Blade Color Swatch */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/20 shadow-inner"
                    style={{ backgroundColor: blade.primaryColor }}
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: blade.coreColor }}
                    />
                  </div>

                  <div className="flex flex-col">
                    <span className="font-semibold text-stone-100 text-sm">{blade.name}</span>
                    <span className="text-xs text-stone-400">{blade.description}</span>
                  </div>
                </div>

                {isSelected && (
                  <div className="p-1 rounded-full bg-amber-500 text-stone-950">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm tracking-wide transition-colors"
          >
            Equip Blade
          </button>
        </div>
      </div>
    </div>
  );
};
