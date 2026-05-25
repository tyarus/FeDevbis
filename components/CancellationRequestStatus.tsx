"use client";

import { CancellationRequest } from "@/types";
import { AlertCircle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface CancellationRequestStatusProps {
  request: CancellationRequest;
}

const reasonLabels: Record<string, string> = {
  urgent_payment_delay: "Urgensi Pembayaran Tertangguh",
  product_mismatch: "Produk Tidak Sesuai",
  ordering_mistake: "Kesalahan Pemesanan",
  other: "Alasan Lain",
};

export default function CancellationRequestStatus({
  request,
}: CancellationRequestStatusProps) {
  if (request.status === "pending") {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Clock size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-yellow-900 mb-1">
              Menunggu Persetujuan Penjual
            </p>
            <p className="text-sm text-yellow-800 mb-2">
              <strong>Alasan:</strong> {reasonLabels[request.reason] || request.reason}
            </p>
            {request.details && (
              <p className="text-sm text-yellow-800 mb-2 break-words">
                <strong>Penjelasan:</strong> {request.details}
              </p>
            )}
            <p className="text-xs text-yellow-700">
              Diajukan pada {formatDate(request.created_at)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (request.status === "approved") {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-green-900 mb-1">
              Pesanan Dibatalkan & Dana Dikembalikan
            </p>
            <p className="text-sm text-green-800 mb-1">
              Penjual telah menyetujui pembatalan pesanan Anda
            </p>
            {request.seller_notes && (
              <p className="text-sm text-green-800 mb-2 break-words">
                <strong>Catatan Penjual:</strong> {request.seller_notes}
              </p>
            )}
            <p className="text-xs text-green-700">
              Disetujui pada {formatDate(request.updated_at)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (request.status === "rejected") {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <XCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-red-900 mb-1">
              Permintaan Pembatalan Ditolak
            </p>
            {request.rejection_reason && (
              <p className="text-sm text-red-800 mb-2 break-words">
                <strong>Alasan Penolakan:</strong> {request.rejection_reason}
              </p>
            )}
            <p className="text-xs text-red-700">
              Ditolak pada {formatDate(request.updated_at)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
