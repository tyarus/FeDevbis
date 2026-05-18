"use client";

import { LoginMethod } from "@/types";
import { LOGIN_METHODS } from "@/lib/gameData";
import { CheckCircle2 } from "lucide-react";

interface LoginMethodSelectorProps {
  value?: LoginMethod;
  onChange: (method: LoginMethod) => void;
  disabled?: boolean;
}

export function LoginMethodSelector({
  value,
  onChange,
  disabled = false,
}: LoginMethodSelectorProps) {
  return (
    <div>
      <label className="block text-label text-text-primary mb-4 font-semibold">
        Metode Login Akun
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {LOGIN_METHODS.map((method) => {
          const isSelected = value === method.id;

          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onChange(method.id)}
              disabled={disabled}
              className={`relative rounded-lg transition-all duration-300 overflow-hidden border-2 ${
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              } ${
                isSelected
                  ? `border-white/40 bg-gradient-to-br ${method.color} shadow-lg`
                  : "border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 shadow-sm"
              }`}
            >
              <div className="p-4 flex flex-col items-center gap-3 min-h-24 justify-center">
                {/* Icon Badge - Only visible when selected */}
                {isSelected && (
                  <div className={`w-12 h-12 rounded-lg bg-white flex items-center justify-center font-bold text-lg transition-all duration-300 shadow-md`}>
                    <span className={`bg-gradient-to-br ${method.color} text-transparent bg-clip-text`}>
                      {method.icon}
                    </span>
                  </div>
                )}

                {/* Name */}
                <p
                  className={`text-sm font-semibold text-center line-clamp-2 transition-colors ${
                    isSelected ? "text-white" : "text-gray-900"
                  }`}
                >
                  {method.name}
                </p>

                {/* Check Icon */}
                {isSelected && (
                  <div className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow-md">
                    <CheckCircle2 size={14} className="text-gray-900" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {value && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-900">
            Metode login <span className="font-semibold">
              {LOGIN_METHODS.find((m) => m.id === value)?.name}
            </span> telah dipilih
          </p>
        </div>
      )}
    </div>
  );
}
