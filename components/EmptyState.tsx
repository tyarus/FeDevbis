"use client";

import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Icon size={48} className="text-border mb-4" />
      <h3 className="text-lg font-medium text-text-primary mb-2">{title}</h3>
      {description && (
        <p className="text-body text-text-secondary mb-6">{description}</p>
      )}
      {action && (
        <button onClick={action.onClick} className="btn-primary text-xs">
          {action.label}
        </button>
      )}
    </div>
  );
}
