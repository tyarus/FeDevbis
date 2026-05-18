"use client";

import { GameCategory } from "@/types";
import { GAME_CATEGORIES } from "@/lib/gameData";
import { CheckCircle2 } from "lucide-react";

interface GameCategorySelectorProps {
  value?: GameCategory;
  onChange: (category: GameCategory) => void;
  disabled?: boolean;
}

export function GameCategorySelector({
  value,
  onChange,
  disabled = false,
}: GameCategorySelectorProps) {
  return (
    <div>
      <label className="block text-label text-text-primary mb-4 font-semibold">
        Kategori Game
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GAME_CATEGORIES.map((category) => {
          const isSelected = value === category.id;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onChange(category.id)}
              disabled={disabled}
              className={`relative group overflow-hidden rounded-lg transition-all duration-300 border-2 h-48 ${
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              } ${
                isSelected
                  ? "border-accent-primary shadow-lg"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {/* Background Image with Overlay - Dynamic background requires inline styles */}
              <div 
                className="absolute inset-0 group-hover:scale-105 transition-transform duration-300"
                style={{
                  backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.5), rgba(0,0,0,0.4)), url('${category.image}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />

              {/* Content */}
              <div className="relative p-6 h-full flex flex-col justify-between">
                {/* Logo - Top */}
                <div className="flex items-start">
                  <img
                    src={category.icon}
                    alt={category.name}
                    className="h-12 w-auto max-w-[96px] object-contain drop-shadow-lg transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>

                {/* Text - Bottom */}
                <div>
                  {/* Name */}
                  <h3 className="font-bold text-white text-base mb-1">
                    {category.name}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-gray-100">
                    {category.description}
                  </p>
                </div>

                {/* Check Icon */}
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-accent-primary rounded-full p-1 shadow-md">
                    <CheckCircle2 size={20} className="text-white" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {value && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            Kategori game <span className="font-semibold">
              {GAME_CATEGORIES.find((g) => g.id === value)?.name}
            </span> telah dipilih
          </p>
        </div>
      )}
    </div>
  );
}
