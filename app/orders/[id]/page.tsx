"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { Order } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { OrderStatusBadge, OrderTimeline, LoadingSkeleton, ConfirmDialog } from "@/components";
import { formatRupiah, formatDate, formatDateShort } from "@/lib/utils";

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"confirm" | "cancel" | null>(null);

  const orderId = params.id as string;
  const { data: order, isLoading, mutate } = useSWR<Order>(
    `/orders/${orderId}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || isLoading) {
    return (
      <div className="section-padding">
        <div className="max-content">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="section-padding text-center">
        <div className="max-content">
          <h1 className="text-section-heading text-text-primary mb-2">Pesanan tidak ditemukan</h1>
          <button
            onClick={() => router.back()}
            className="btn-secondary text-xs mt-6"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const handleConfirmOrder = async () => {
    setIsProcessing(true);
    try {
      await apiClient.put(`/orders/${order.id}/confirm`);
      mutate();
      setIsConfirmDialogOpen(false);
    } catch (error: any) {
      alert(error.response?.data?.message || "Gagal mengkonfirmasi pesanan");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelOrder = async () => {
    setIsProcessing(true);
    try {
      await apiClient.put(`/orders/${order.id}/cancel`);
      mutate();
      setIsConfirmDialogOpen(false);
    } catch (error: any) {
      alert(error.response?.data?.message || "Gagal membatalkan pesanan");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = () => {
    router.push(`/payment/${order.id}`);
  };

  const canConfirm = order.status === "shipped";
  const canCancel = order.status === "pending_payment";
  const canPay = order.status === "pending_payment";

  return (
    <div className="section-padding">
      <div className="max-content">
        <button
          onClick={() => router.back()}
          className="text-xs text-text-secondary hover:text-text-primary mb-8"
        >
          ← Kembali ke Pesanan
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: Order Details */}
          <div className="md:col-span-2">
            {/* Status Section */}
            <div className="card-border p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Nomor Pesanan</p>
                  <h1 className="text-lg font-medium text-text-primary">#{order.id}</h1>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="text-xs text-text-secondary">
                Dibuat pada {formatDate(order.created_at)}
              </p>
            </div>

            {/* Product Details */}
            <div className="card-border p-6 mb-6">
              <h2 className="text-base font-medium text-text-primary mb-4">Rincian Produk</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-body text-text-primary">{order.product?.name}</span>
                  <span className="font-medium text-text-primary">
                    {formatRupiah(order.product?.price || 0)} x {order.quantity}
                  </span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-medium text-text-primary">Total</span>
                  <span className="font-medium text-lg text-text-primary">
                    {formatRupiah(order.total_price)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tracking Info */}
            {order.tracking_number && (
              <div className="card-border p-6 mb-6">
                <h2 className="text-base font-medium text-text-primary mb-3">Informasi Pengiriman</h2>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Nomor Tracking</p>
                    <p className="font-medium text-text-primary">{order.tracking_number}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="card-border p-6">
              <h2 className="text-base font-medium text-text-primary mb-4">Timeline Pesanan</h2>
              <OrderTimeline order={order} />
            </div>
          </div>

          {/* Right: Actions Sidebar */}
          <div>
            <div className="card-border p-6 sticky top-20">
              <h3 className="text-base font-medium text-text-primary mb-4">Aksi</h3>

              <div className="space-y-3">
                {canPay && (
                  <button
                    onClick={handlePayment}
                    className="btn-primary w-full text-xs"
                  >
                    Lanjutkan Pembayaran
                  </button>
                )}

                {canConfirm && (
                  <button
                    onClick={() => {
                      setConfirmAction("confirm");
                      setIsConfirmDialogOpen(true);
                    }}
                    className="btn-primary w-full text-xs"
                  >
                    Konfirmasi Pesanan
                  </button>
                )}

                {canCancel && (
                  <button
                    onClick={() => {
                      setConfirmAction("cancel");
                      setIsConfirmDialogOpen(true);
                    }}
                    className="btn-secondary w-full text-xs text-accent-error border-accent-error"
                  >
                    Batalkan Pesanan
                  </button>
                )}

                {!canPay && !canConfirm && !canCancel && (
                  <div className="p-4 bg-bg-secondary rounded-input text-xs text-text-secondary text-center">
                    Tidak ada aksi yang tersedia untuk pesanan ini
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs text-text-secondary mb-3">Ringkasan Pesanan</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">Harga</span>
                    <span className="text-text-primary">{formatRupiah(order.total_price)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">Status</span>
                    <span className="text-text-primary capitalize">{order.status}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={isConfirmDialogOpen}
          onOpenChange={setIsConfirmDialogOpen}
          title={confirmAction === "confirm" ? "Konfirmasi Pesanan" : "Batalkan Pesanan"}
          description={
            confirmAction === "confirm"
              ? "Apakah Anda yakin barang sudah diterima dengan baik?"
              : "Apakah Anda yakin ingin membatalkan pesanan ini?"
          }
          onConfirm={confirmAction === "confirm" ? handleConfirmOrder : handleCancelOrder}
          confirmLabel={confirmAction === "confirm" ? "Konfirmasi" : "Batalkan"}
          isDangerous={confirmAction === "cancel"}
          isLoading={isProcessing}
        />
      </div>
    </div>
  );
}
