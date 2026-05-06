"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

interface PaymentSuccessModalProps {
  orderId: string;
  amount: number;
  onClose: () => void;
}

export function PaymentSuccessModal({
  orderId,
  amount,
  onClose,
}: PaymentSuccessModalProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 text-center">
        <div className="mb-4 flex justify-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">
          Pembayaran Berhasil!
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          Pesanan Anda telah dikonfirmasi dan sedang diproses.
        </p>
        <div className="bg-green-50 p-3 rounded-lg mb-4">
          <p className="text-xs text-text-secondary">ID Pesanan</p>
          <p className="font-mono font-semibold text-green-700">#{String(orderId).slice(0, 8)}</p>
        </div>
        <p className="text-xs text-text-secondary">
          Anda akan dialihkan dalam beberapa detik...
        </p>
      </div>
    </div>
  );
}
