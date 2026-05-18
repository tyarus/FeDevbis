"use client";

import { LoginMethod } from "@/types";
import { SECURITY_GUIDES, LOGIN_METHODS } from "@/lib/gameData";
import { cn } from "@/lib/utils";
import { Shield, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";

interface SecurityGuideProps {
  method?: LoginMethod;
  compact?: boolean;
  className?: string;
}

export function SecurityGuide({ method, compact = false, className }: SecurityGuideProps) {
  const sectionPadding = compact ? "p-4" : "p-6";
  const sectionTitleClass = compact ? "text-sm" : "text-base";

  if (!method) {
    return (
      <div className={cn("bg-white rounded-lg border border-border text-center", compact ? "p-5" : "p-8", className)}>
        <Shield size={compact ? 28 : 40} className="text-text-secondary mx-auto mb-3" />
        <p className="text-sm text-text-secondary">
          Pilih metode login untuk melihat panduan keamanan
        </p>
      </div>
    );
  }

  const guide = SECURITY_GUIDES[method];
  const loginMethod = LOGIN_METHODS.find((item) => item.id === method);

  if (!guide || !loginMethod) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className={cn("rounded-lg border border-border bg-white", sectionPadding)}>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
            <Shield size={16} />
          </div>
          <h2 className={cn("font-semibold text-text-primary", compact ? "text-base" : "text-lg")}>
            {guide.title}
          </h2>
        </div>
        <p className="text-sm text-text-secondary">
          Panduan keamanan untuk {loginMethod.name}
        </p>
      </div>

      <div className={cn("bg-white border border-border rounded-lg", sectionPadding)}>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 size={20} className="text-green-600" />
          <h3 className={cn("font-semibold text-text-primary", sectionTitleClass)}>Tips Keamanan</h3>
        </div>
        <ul className="list-disc list-outside pl-5 space-y-2 marker:text-green-600 text-sm text-text-primary">
          {guide.tips.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      </div>

      <div className={cn("bg-white border border-border rounded-lg", sectionPadding)}>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={20} className="text-amber-600" />
          <h3 className={cn("font-semibold text-text-primary", sectionTitleClass)}>Hal yang Harus Dihindari</h3>
        </div>
        <ul className="list-disc list-outside pl-5 space-y-2 marker:text-amber-600 text-sm text-text-primary">
          {guide.warnings.map((warning, index) => (
            <li key={index}>{warning}</li>
          ))}
        </ul>
      </div>

      <div className={cn("bg-white border border-border rounded-lg", sectionPadding)}>
        <h3 className={cn("font-semibold text-text-primary mb-4", sectionTitleClass)}>Sumber Daya Tambahan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {guide.resources.map((resource, index) => (
            <a
              key={index}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg hover:bg-gray-100 transition-colors border border-border group"
            >
              <ExternalLink
                size={16}
                className="text-text-secondary flex-shrink-0 group-hover:text-text-primary transition-colors"
              />
              <span className="text-sm font-medium text-text-primary">
                {resource.label}
              </span>
            </a>
          ))}
        </div>
      </div>

      <div className={cn("bg-blue-50 border border-blue-200 rounded-lg flex gap-3", compact ? "p-3" : "p-4")}>
        <Shield size={16} className="text-blue-700 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-1">Praktik Terbaik</p>
          <p>
            Perbarui password secara berkala dan aktifkan autentikasi dua faktor untuk keamanan maksimal.
          </p>
        </div>
      </div>
    </div>
  );
}
