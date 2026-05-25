"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";
import { CancellationRequest } from "@/types";
import { AlertCircle, Loader, CheckCircle2, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface SellerCancellationApprovalPanelProps {
  request: CancellationRequest;
  onApproved?: () => void;
  onRejected?: () => void;
}

const reasonLabels: Record<string, string> = {
  urgent_payment_delay: "Urgensi Pembayaran Tertangguh",
  product_mismatch: "Produk Tidak Sesuai",
  ordering_mistake: "Kesalahan Pemesanan",
  other: "Alasan Lain",
};

export default function SellerCancellationApprovalPanel({
  request,
  onApproved,
  onRejected,
}: SellerCancellationApprovalPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleApprove = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      await apiClient.put(
        `/orders/${request.order_id}/cancellation-request/approve`,
        {
          seller_notes: "",
        }
      );
      onApproved?.();
    } catch (error: unknown) {
      const maybeError = error as { response?: { data?: { message?: string } } };
      const errMsg = maybeError.response?.data?.message || "Gagal menyetujui pembatalan";
      setErrorMessage(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setErrorMessage("Alasan penolakan harus diisi");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      await apiClient.put(
        `/orders/${request.order_id}/cancellation-request/reject`,
        {
          reason: rejectionReason,
        }
      );
      onRejected?.();
    } catch (error: unknown) {
      const maybeError = error as { response?: { data?: { message?: string } } };
      const errMsg = maybeError.response?.data?.message || "Gagal menolak pembatalan";
      setErrorMessage(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Show status badges for non-pending
  if (request.status === "approved") {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
        <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-green-900">Pembatalan Disetujui</p>
          <p className="text-sm text-green-800">
            Pembatalan telah disetujui pada {formatDate(request.updated_at)}
          </p>
        </div>
      </div>
    );
  }

  if (request.status === "rejected") {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3 mb-2">
          <XCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Pembatalan Ditolak</p>
            <p className="text-sm text-red-800">
              Ditolak pada {formatDate(request.updated_at)}
            </p>
          </div>
        </div>
        {request.rejection_reason && (
          <p className="text-sm text-red-800 ml-8 break-words">
            <strong>Alasan:</strong> {request.rejection_reason}
          </p>
        )}
      </div>
    );
  }

  // Show approval form for pending
  return (
    <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
      <div className="mb-4">
        <div className="flex items-start gap-3 mb-3">
          <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-yellow-900">Permintaan Pembatalan Tertunda</p>
            <p className="text-sm text-yellow-800">Pembeli meminta pembatalan pesanan</p>
          </div>
        </div>

        <div className="ml-8 space-y-2 mb-4">
          <div>
            <p className="text-xs text-yellow-700 font-medium">ALASAN</p>
            <p className="text-sm text-yellow-900">
              {reasonLabels[request.reason] || request.reason}
            </p>
          </div>
          {request.details && (
            <div>
              <p className="text-xs text-yellow-700 font-medium">PENJELASAN PEMBELI</p>
              <p className="text-sm text-yellow-900 break-words whitespace-pre-wrap">
                {request.details}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-yellow-700 font-medium">DIAJUKAN PADA</p>
            <p className="text-sm text-yellow-900">{formatDate(request.created_at)}</p>
          </div>
        </div>

        {errorMessage && (
          <div className="ml-8 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 mb-4">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        {!showRejectForm && (
          <div className="ml-8 flex gap-3">
            <button
              onClick={handleApprove}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Setujui Pembatalan
                </>
              )}
            </button>
            <button
              onClick={() => setShowRejectForm(true)}
              disabled={isLoading}
              className="px-4 py-2 border border-yellow-400 text-yellow-900 rounded-lg font-medium text-sm hover:bg-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <XCircle size={16} />
              Tolak Pembatalan
            </button>
          </div>
        )}

        {showRejectForm && (
          <div className="ml-8 space-y-3 p-3 bg-white border border-yellow-300 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alasan Penolakan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Jelaskan mengapa pembatalan tidak bisa disetujui..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {rejectionReason.length}/500 karakter
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectionReason("");
                  setErrorMessage("");
                }}
                disabled={isLoading}
                className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={isLoading || !rejectionReason.trim()}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  "Tolak Pembatalan"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
