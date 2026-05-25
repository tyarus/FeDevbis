"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";
import { CancellationReason } from "@/types";
import { AlertCircle, Loader } from "lucide-react";

interface CancellationRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const cancellationReasons: Array<{ value: CancellationReason; label: string }> = [
  { value: "urgent_payment_delay", label: "Urgensi Pembayaran Tertangguh" },
  { value: "product_mismatch", label: "Produk Tidak Sesuai" },
  { value: "ordering_mistake", label: "Kesalahan Pemesanan" },
  { value: "other", label: "Alasan Lain" },
];

export default function CancellationRequestDialog({
  open,
  onOpenChange,
  orderId,
  onSuccess,
  onError,
}: CancellationRequestDialogProps) {
  const [reason, setReason] = useState<CancellationReason | "">("");
  const [details, setDetails] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason) {
      setErrorMessage("Pilih alasan pembatalan");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      await apiClient.post(`/orders/${orderId}/cancellation-request`, {
        reason,
        details: details || undefined,
      });

      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setReason("");
      setDetails("");
    } catch (error: unknown) {
      const maybeError = error as { response?: { data?: { message?: string } } };
      const errMsg = maybeError.response?.data?.message || "Gagal mengirim permintaan pembatalan";
      setErrorMessage(errMsg);
      onError?.(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Batalkan Pesanan</h2>
          <p className="text-sm text-gray-600 mt-1">
            Pembatalan memerlukan persetujuan dari penjual
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pilih Alasan <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as CancellationReason)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">-- Pilih alasan --</option>
              {cancellationReasons.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Penjelasan Detail (Opsional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Jelaskan alasan pembatalan Anda secara detail..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {details.length}/500 karakter
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            <p className="font-medium mb-1">ℹ️ Informasi Pembatalan</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600">
              <li>Penjual akan meninjau permintaan Anda</li>
              <li>Jika disetujui, dana akan dikembalikan ke wallet Anda</li>
              <li>Anda akan menerima notifikasi setelah penjual merespons</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {isLoading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Mengirim...
                </>
              ) : (
                "Batalkan Pesanan"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
