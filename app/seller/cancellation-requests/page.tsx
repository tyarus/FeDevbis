"use client";

import { SellerCancellationRequestsPanel } from "@/components";

export default function SellerCancellationRequestsPage() {
  return (
    <div className="section-padding">
      <div className="max-content">
        <button
          onClick={() => window.history.back()}
          className="text-xs text-text-secondary hover:text-text-primary mb-8"
        >
          {"<-"} Kembali
        </button>

        <SellerCancellationRequestsPanel />
      </div>
    </div>
  );
}
