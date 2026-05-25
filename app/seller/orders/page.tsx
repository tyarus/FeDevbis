"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { transactionChatAPI } from "@/lib/transactionChat";
import {
  canFetchTransactionThread,
  getEffectiveOrderStatus,
  getEffectiveTransactionStatus,
  isChecklistCompleted,
} from "@/lib/orderStatus";
import { walletAPI } from "@/lib/wallet";
import { Order, PaginatedResponse, TransactionStatus } from "@/types";
import { OrderStatusBadge, LoadingSkeleton, EmptyState, TransactionStatusBadge } from "@/components";
import { formatRupiah, formatDateShort, formatShortId } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";

const ITEMS_PER_PAGE = 10;
const FETCH_PAGE_SIZE = 100;

const fetchOrdersPage = async (page: number): Promise<PaginatedResponse<Order>> => {
  const res = await apiClient.get(`/seller/orders?page=${page}&limit=${FETCH_PAGE_SIZE}`);

  return {
    data: res.data.data || [],
    pagination: res.data.pagination || {
      current_page: 1,
      total: 0,
      per_page: FETCH_PAGE_SIZE,
      last_page: 1,
    },
  };
};

const fetchAllSellerOrders = async (): Promise<Order[]> => {
  const firstPage = await fetchOrdersPage(1);
  const allOrders = [...firstPage.data];
  const lastPage = firstPage.pagination?.last_page || 1;

  const remainingRequests: Array<Promise<PaginatedResponse<Order>>> = [];
  for (let page = 2; page <= lastPage; page += 1) {
    remainingRequests.push(fetchOrdersPage(page));
  }

  const remainingPages = await Promise.all(remainingRequests);
  for (const pageData of remainingPages) {
    allOrders.push(...pageData.data);
  }

  return allOrders;
};

const matchesStatusFilter = (effectiveStatus: Order["status"], statusFilter: string | null): boolean => {
  if (!statusFilter) return true;

  if (statusFilter === "shipped") {
    return effectiveStatus === "shipped" || effectiveStatus === "delivered";
  }

  return effectiveStatus === statusFilter;
};

export default function SellerOrdersPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data: allOrders, isLoading } = useSWR<Order[]>(
    "seller-orders-all",
    fetchAllSellerOrders,
    { revalidateOnFocus: false, revalidateOnMount: true }
  );

  const orderIdsKey = useMemo(
    () =>
      (allOrders || [])
        .map((order) => String(order.id))
        .sort()
        .join(","),
    [allOrders]
  );

  const { data: threadStatusMap } = useSWR<Record<string, TransactionStatus>>(
    orderIdsKey ? `seller-orders-thread-status:${orderIdsKey}` : null,
    async () => {
      const entries = await Promise.all(
        (allOrders || []).map(async (order) => {
          if (!canFetchTransactionThread(order.status)) {
            return [String(order.id), order.transaction_status || "chat_open"] as const;
          }

          try {
            const thread = await transactionChatAPI.getThread(String(order.id));
            const checklistDone = isChecklistCompleted(thread.checklist);
            const status = checklistDone ? "completed" : thread.status;
            return [String(order.id), status] as const;
          } catch {
            return [String(order.id), order.transaction_status || "chat_open"] as const;
          }
        })
      );

      return Object.fromEntries(entries);
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      refreshInterval: 6000,
    }
  );

  useEffect(() => {
    if (!allOrders || allOrders.length === 0) return;
    walletAPI.syncOrders(
      allOrders.map((order) => {
        const mappedTransactionStatus = getEffectiveTransactionStatus(
          order,
          threadStatusMap?.[String(order.id)]
        );
        const mappedOrderStatus = getEffectiveOrderStatus(order, mappedTransactionStatus);

        return {
          id: order.id,
          buyer_id: order.buyer_id,
          seller_id: order.seller_id,
          total_price: order.total_price,
          status: mappedOrderStatus,
          transaction_status: mappedTransactionStatus,
        };
      })
    );
  }, [allOrders, threadStatusMap]);

  const getTransactionStatus = useCallback(
    (order: Order): TransactionStatus | undefined => {
      return getEffectiveTransactionStatus(order, threadStatusMap?.[String(order.id)]);
    },
    [threadStatusMap]
  );

  const getEffectiveStatus = useCallback(
    (order: Order): Order["status"] => {
      return getEffectiveOrderStatus(order, getTransactionStatus(order));
    },
    [getTransactionStatus]
  );

  const filteredOrders = useMemo(() => {
    const sortedOrders = [...(allOrders || [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return sortedOrders.filter((order) => matchesStatusFilter(getEffectiveStatus(order), statusFilter));
  }, [allOrders, statusFilter, getEffectiveStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
  const orders = filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const statuses = [
    { value: null, label: "Semua" },
    { value: "pending_payment", label: "Menunggu Pembayaran" },
    { value: "paid", label: "Sudah Dibayar" },
    { value: "processing", label: "Diproses" },
    { value: "shipped", label: "Dikirim" },
    { value: "completed", label: "Selesai" },
    { value: "cancelled", label: "Dibatalkan" },
  ];

  return (
    <div className="section-padding">
      <div className="max-content">
        <h1 className="text-section-heading text-text-primary mb-8">Pesanan Masuk</h1>

        <div className="mb-8 flex gap-2 flex-wrap">
          {statuses.map((status) => (
            <button
              key={status.value || "all"}
              onClick={() => {
                setStatusFilter(status.value);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-button text-xs font-medium transition-colors ${
                statusFilter === status.value
                  ? "bg-accent-primary text-white"
                  : "bg-bg-secondary text-text-primary hover:bg-border"
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingSkeleton variant="line" count={5} />
        ) : orders.length > 0 ? (
          <>
            <div className="card-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary">
                        ID Pesanan
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary">
                        Pembeli
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary">
                        Produk
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary">
                        Total
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary">
                        Status
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary">
                        Tanggal
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const effectiveStatus = getEffectiveStatus(order);
                      const transactionStatus = getTransactionStatus(order);

                      return (
                        <tr
                          key={order.id}
                          className="border-b border-border hover:bg-bg-secondary transition-colors"
                        >
                          <td className="px-6 py-3 text-xs font-medium text-text-primary">
                            #{formatShortId(order.id)}
                          </td>
                          <td className="px-6 py-3 text-xs text-text-primary">
                            {order.buyer?.name || "Pembeli Anonim"}
                          </td>
                          <td className="px-6 py-3 text-xs text-text-primary">
                            {order.product?.name || "Produk tidak tersedia"}
                          </td>
                          <td className="px-6 py-3 text-xs font-medium text-text-primary">
                            {formatRupiah(order.total_price)}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex flex-col items-start gap-1.5">
                              <OrderStatusBadge status={effectiveStatus} size="sm" />
                              {transactionStatus && (
                                <TransactionStatusBadge status={transactionStatus} size="sm" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-xs text-text-secondary">
                            {formatDateShort(order.created_at)}
                          </td>
                          <td className="px-6 py-3">
                            <Link
                              href={`/seller/orders/${order.id}`}
                              className="text-xs text-accent-primary hover:underline font-medium"
                            >
                              Lihat Detail
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={activePage === 1}
                  className="btn-secondary text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ChevronLeft size={16} />
                  Sebelumnya
                </button>

                <div className="text-xs text-text-secondary">
                  Halaman {activePage} dari {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={activePage === totalPages}
                  className="btn-secondary text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Selanjutnya
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={ShoppingBag}
            title="Belum ada pesanan"
            description={
              statusFilter
                ? "Tidak ada pesanan dengan status ini"
                : "Pesanan akan muncul di sini ketika ada pembeli"
            }
          />
        )}
      </div>
    </div>
  );
}
