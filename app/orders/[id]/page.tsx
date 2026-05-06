"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import { AxiosError } from "axios";
import { apiClient } from "@/lib/api";
import { Order } from "@/types";
import {
  OrderStatusBadge,
  OrderTimeline,
  LoadingSkeleton,
  ConfirmDialog,
  TrackingCodeVerification,
} from "@/components";
import { formatRupiah, formatDate, formatDateShort } from "@/lib/utils";
import { Truck, AlertCircle, CheckCircle2 } from "lucide-react";

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data.data);

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
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
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      const backendMessage = err.response?.data?.message || "Gagal mengkonfirmasi pesanan";
      const messageLower = backendMessage.toLowerCase();

      if (order.status === "shipped" && messageLower.includes("delivered")) {
        alert("Backend masih mengharuskan status delivered. Ubah rule endpoint confirm agar status shipped juga boleh dikonfirmasi.");
      } else {
        alert(backendMessage);
      }
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

  const handleVerifyCode = async (_code: string) => {
    return Promise.resolve();
  };

  const canConfirm = order.status === "shipped" || order.status === "delivered";
  const canCancel = ["pending_payment", "paid", "processing"].includes(order.status);
  const canPay = order.status === "pending_payment";
  const isShipped = order.status === "shipped" || order.status === "delivered";
  const isCompleted = order.status === "completed";
  const isCancelled = order.status === "cancelled";
  const hasNoAction = !canPay && !canConfirm && !canCancel;

  return (
    <div className="section-padding">
      <div className="max-content">
        <button
          onClick={() => router.back()}
          className="text-xs text-text-secondary hover:text-text-primary mb-8"
        >
          {"<-"} Kembali ke Pesanan
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
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

            {order.tracking_number && (
              <div className="bg-white rounded-lg p-6 mb-6 border-l-4 border-l-accent-primary">
                <div className="flex items-start gap-3 mb-4">
                  <Truck size={20} className="text-accent-primary flex-shrink-0 mt-1" />
                  <div>
                    <h2 className="text-base font-semibold text-text-primary">Informasi Pengiriman</h2>
                    <p className="text-xs text-text-secondary mt-1">Paket Anda sedang dalam perjalanan</p>
                  </div>
                </div>
                <div className="space-y-3 pl-8">
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Nomor Tracking</p>
                    <p className="font-mono font-semibold text-text-primary text-sm bg-gray-50 p-2 rounded">
                      {order.tracking_number}
                    </p>
                  </div>
                  <p className="text-xs text-text-secondary italic">
                    Anda akan diminta memverifikasi kode pengiriman saat menerima paket.
                  </p>
                </div>
              </div>
            )}

            {isShipped && order.tracking_number && (
              <div className="mb-6">
                <TrackingCodeVerification
                  orderId={order.id}
                  trackingNumber={order.tracking_number}
                  onVerify={handleVerifyCode}
                  isVerified={order.status === "delivered"}
                />
              </div>
            )}

            <div className="card-border p-6">
              <h2 className="text-base font-medium text-text-primary mb-4">Timeline Pesanan</h2>
              <OrderTimeline order={order} />
            </div>
          </div>

          <div>
            <div className="card-border p-6 sticky top-20">
              <h3 className="text-base font-medium text-text-primary mb-4">Aksi</h3>

              <div className="space-y-3">
                {canPay && (
                  <>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                      <AlertCircle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-700">
                        Pesanan menunggu pembayaran. Selesaikan pembayaran dalam 24 jam untuk menghindari pembatalan otomatis.
                      </p>
                    </div>
                    <button
                      onClick={handlePayment}
                      className="btn-primary w-full text-sm font-medium"
                    >
                      Lanjutkan Pembayaran
                    </button>
                  </>
                )}

                {canConfirm && (
                  <button
                    onClick={() => {
                      setConfirmAction("confirm");
                      setIsConfirmDialogOpen(true);
                    }}
                    className="btn-primary w-full text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    Konfirmasi Penerimaan
                  </button>
                )}

                {canCancel && (
                  <button
                    onClick={() => {
                      setConfirmAction("cancel");
                      setIsConfirmDialogOpen(true);
                    }}
                    className="btn-secondary w-full text-sm font-medium text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Batalkan Pesanan
                  </button>
                )}

                {hasNoAction && isCompleted && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 text-center flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} />
                    Pesanan sudah selesai
                  </div>
                )}

                {hasNoAction && isCancelled && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 text-center">
                    Pesanan telah dibatalkan
                  </div>
                )}

                {hasNoAction && !isCompleted && !isCancelled && (
                  <div className="p-4 bg-bg-secondary rounded-input text-xs text-text-secondary text-center">
                    Tidak ada aksi yang tersedia untuk pesanan ini
                  </div>
                )}
              </div>

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
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">Dibuat</span>
                    <span className="text-text-primary">{formatDateShort(order.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

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
