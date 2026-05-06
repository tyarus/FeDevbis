"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface TrackingCodeVerificationProps {
  orderId: string;
  trackingNumber: string;
  onVerify: (code: string) => Promise<void>;
  isVerified?: boolean;
}

export function TrackingCodeVerification({
  orderId,
  trackingNumber,
  onVerify,
  isVerified = false,
}: TrackingCodeVerificationProps) {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(isVerified);

  const handleVerify = async () => {
    if (!code.trim()) {
      setError("Kode verifikasi harus diisi");
      return;
    }

    if (code.trim() !== trackingNumber) {
      setError("Kode verifikasi tidak sesuai dengan nomor tracking");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onVerify(code);
      setVerified(true);
      setCode("");
    } catch (err: any) {
      setError(err.message || "Verifikasi gagal");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (verified) {
    return (
      <div className="card-border bg-green-50 border-green-200 p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <CheckCircle2 size={20} className="text-green-600" />
          <p className="text-sm font-semibold text-green-700">Kode Verifikasi Berhasil</p>
        </div>
        <p className="text-xs text-green-600">
          Anda telah mengkonfirmasi bahwa akun Anda sesuai dengan penerima paket.
        </p>
      </div>
    );
  }

  return (
    <div className="card-border bg-white p-6 rounded-lg">
      <h3 className="text-base font-semibold text-text-primary mb-4">Verifikasi Kode Pengiriman</h3>

      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4 flex items-start gap-2">
        <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Masukkan kode yang diberikan seller untuk mengkonfirmasi bahwa Anda telah menerima paket dengan akun yang sesuai.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-2">
            Kode Pengiriman
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            placeholder="Masukkan kode dari seller"
            className="input-base w-full text-sm font-mono"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={isSubmitting || !code.trim()}
          className="btn-primary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Memverifikasi..." : "Verifikasi Kode"}
        </button>
      </div>
    </div>
  );
}
