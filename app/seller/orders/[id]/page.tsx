"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { walletAPI } from "@/lib/wallet";
import { Order, TransactionChatData } from "@/types";
import { transactionChatAPI } from "@/lib/transactionChat";
import { OrderStatusBadge, OrderTimeline, LoadingSkeleton, TransactionStatusBadge } from "@/components";
import { formatRupiah, formatDate, formatDateShort } from "@/lib/utils";
import { MessageCircle } from "lucide-react";

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data.data);

export default function SellerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();

  const orderId = params.id as string;
  const { data: order, isLoading } = useSWR<Order>(
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
    if (!order) return;
    walletAPI.syncOrderSettlement({
      id: order.id,
      buyer_id: order.buyer_id,
      seller_id: order.seller_id,
      total_price: order.total_price,
      status: order.status,
    });
  }, [order]);

  if (isLoading) {
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

  const canOpenTransaction = ["paid", "processing", "shipped", "delivered", "completed"].includes(order.status);
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
              <h2 className="text-base font-medium text-text-primary mb-4">Informasi Pembeli</h2>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Nama</p>
                  <p className="font-medium text-text-primary">{order.buyer?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Email</p>
                  <p className="font-medium text-text-primary">{order.buyer?.email}</p>
                </div>
              </div>
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
              <h3 className="text-base font-medium text-text-primary mb-6">Ringkasan</h3>

              <div className="space-y-4 pb-6 border-b border-border">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Status</p>
                  <OrderStatusBadge status={effectiveOrderStatus} />
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Jumlah Item</p>
                  <p className="text-base font-medium text-text-primary">{order.quantity} unit</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Total</p>
                  <p className="text-lg font-medium text-text-primary">
                    {formatRupiah(order.total_price)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Dibuat</p>
                  <p className="text-xs text-text-primary">{formatDateShort(order.created_at)}</p>
                </div>
              </div>

              {canOpenTransaction && (
                <button
                  onClick={() => router.push(`/seller/orders/${order.id}/transaction`)}
                  className="btn-secondary w-full mt-4 text-xs flex items-center justify-center gap-2"
                >
                  <MessageCircle size={15} />
                  Buka Chat Transaksi
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
