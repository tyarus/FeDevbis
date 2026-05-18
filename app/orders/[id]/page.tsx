"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { Order, TransactionChatData } from "@/types";
import { transactionChatAPI } from "@/lib/transactionChat";
import {
  OrderStatusBadge,
  TransactionStatusBadge,
  OrderTimeline,
  LoadingSkeleton,
  ConfirmDialog,
} from "@/components";
import { formatRupiah, formatDate, formatDateShort } from "@/lib/utils";
import { AlertCircle, CheckCircle2, MessageCircle } from "lucide-react";

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data.data);

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const orderId = params.id as string;
  const { data: order, isLoading, mutate } = useSWR<Order>(
    `/orders/${orderId}`,
    fetcher,
    { revalidateOnFocus: false }
  );
  const { data: thread } = useSWR<TransactionChatData>(
    orderId ? `order-thread-status-${orderId}` : null,
    () => transactionChatAPI.getThread(orderId),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      refreshInterval: 5000,
    }
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

  const handleCancelOrder = async () => {
    setIsProcessing(true);
    try {
      await apiClient.put(`/orders/${order.id}/cancel`);
      mutate();
      setIsCancelDialogOpen(false);
    } catch (error: any) {
      alert(error.response?.data?.message || "Gagal membatalkan pesanan");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = () => {
    router.push(`/payment/${order.id}`);
  };

  const threadChecklistDone = Boolean(
    thread?.checklist?.account_match &&
      thread?.checklist?.account_secured &&
      thread?.checklist?.seller_device_removed &&
      thread?.checklist?.completion_code_verified
  );
  const transactionStatusRaw = thread?.status || order.transaction_status || "chat_open";
  const transactionStatus = threadChecklistDone ? "completed" : transactionStatusRaw;
  const effectiveOrderStatus = transactionStatus === "completed" ? "completed" : order.status;
  const timelineOrder: Order =
    effectiveOrderStatus === "completed"
      ? { ...order, status: "completed", transaction_status: "completed" }
      : order;
  const isCompleted = effectiveOrderStatus === "completed";
  const canCancel = ["pending_payment", "paid", "processing"].includes(order.status) && !isCompleted;
  const canPay = order.status === "pending_payment" && !isCompleted;
  const canOpenTransaction = ["paid", "processing", "shipped", "delivered", "completed"].includes(order.status);
  const isCancelled = order.status === "cancelled";
  const hasNoAction = !canPay && !canCancel && !canOpenTransaction;

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
                <div className="flex flex-col items-end gap-2">
                  <OrderStatusBadge status={effectiveOrderStatus} />
                  {canOpenTransaction && <TransactionStatusBadge status={transactionStatus} size="sm" />}
                </div>
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

            <div className="card-border p-6">
              <h2 className="text-base font-medium text-text-primary mb-4">Timeline Pesanan</h2>
              <OrderTimeline order={timelineOrder} />
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

                {canOpenTransaction && (
                  <button
                    onClick={() => router.push(`/orders/${order.id}/transaction`)}
                    className="btn-secondary w-full text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={16} />
                    Buka Chat Transaksi
                  </button>
                )}

                {canCancel && (
                  <button
                    onClick={() => setIsCancelDialogOpen(true)}
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
                    <span className="text-text-primary capitalize">{effectiveOrderStatus}</span>
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
          open={isCancelDialogOpen}
          onOpenChange={setIsCancelDialogOpen}
          title="Batalkan Pesanan"
          description="Apakah Anda yakin ingin membatalkan pesanan ini?"
          onConfirm={handleCancelOrder}
          confirmLabel="Batalkan"
          isDangerous
          isLoading={isProcessing}
        />
      </div>
    </div>
  );
}
