"use client";

interface LoadingSkeletonProps {
  count?: number;
  variant?: "card" | "line" | "circle";
}

export function LoadingSkeleton({ count = 3, variant = "card" }: LoadingSkeletonProps) {
  if (variant === "card") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="card-border overflow-hidden">
            <div className="aspect-video shimmer" />
            <div className="p-3.5 space-y-3">
              <div className="h-4 bg-bg-secondary rounded shimmer w-full" />
              <div className="h-4 bg-bg-secondary rounded shimmer w-2/3" />
              <div className="h-6 bg-bg-secondary rounded shimmer w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "line") {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-4 bg-bg-secondary rounded shimmer w-full" />
            <div className="h-4 bg-bg-secondary rounded shimmer w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-12 h-12 rounded-full bg-bg-secondary shimmer flex-shrink-0" />
      ))}
    </div>
  );
}
