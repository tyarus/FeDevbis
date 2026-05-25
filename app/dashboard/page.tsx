"use client";

import { useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import {
  canFetchTransactionThread,
  getEffectiveOrderStatus,
  getEffectiveTransactionStatus,
  isChecklistCompleted,
} from "@/lib/orderStatus";
import { transactionChatAPI } from "@/lib/transactionChat";
import { useWalletOverview } from "@/lib/useWallet";
import { walletAPI } from "@/lib/wallet";
import { Order, PaginatedResponse, TransactionStatus } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { OrderStatusBadge, LoadingSkeleton, EmptyState } from "@/components";
import { formatRupiah, formatShortId } from "@/lib/utils";
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  Package,
  ArrowRight
} from "lucide-react";

const FETCH_PAGE_SIZE = 100;

const fetchOrdersPage = async (page: number): Promise<PaginatedResponse<Order>> => {
  const res = await apiClient.get(`/orders?page=${page}&limit=${FETCH_PAGE_SIZE}`);

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

const fetchAllBuyerOrders = async (): Promise<Order[]> => {
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

export default function DashboardPage() {
  const { user } = useAuthStore();
  const wallet = useWalletOverview(user);

  const { data: allOrders, isLoading } = useSWR<Order[]>(
    "buyer-dashboard-orders-all",
    fetchAllBuyerOrders,
    { revalidateOnFocus: false }
  );

  const orders = useMemo(() => allOrders || [], [allOrders]);
  const totalOrders = orders.length;
  const orderIdsKey = useMemo(
    () =>
      orders
        .map((order) => String(order.id))
        .sort()
        .join(","),
    [orders]
  );

  const { data: threadStatusMap } = useSWR<Record<string, TransactionStatus>>(
    orderIdsKey ? `buyer-dashboard-thread-status:${orderIdsKey}` : null,
    async () => {
      const entries = await Promise.all(
        orders.map(async (order) => {
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
    if (orders.length === 0) return;
    walletAPI.syncOrders(
      orders.map((order) => {
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
  }, [orders, threadStatusMap]);

  const getTransactionStatus = useCallback(
    (order: Order): TransactionStatus | undefined =>
      getEffectiveTransactionStatus(order, threadStatusMap?.[String(order.id)]),
    [threadStatusMap]
  );

  const getEffectiveStatus = useCallback(
    (order: Order): Order["status"] => getEffectiveOrderStatus(order, getTransactionStatus(order)),
    [getTransactionStatus]
  );

  const pendingPayment = useMemo(
    () => orders.filter((order) => getEffectiveStatus(order) === "pending_payment").length,
    [orders, getEffectiveStatus]
  );

  const needsAction = useMemo(
    () =>
      orders.filter((order) => {
        const effectiveStatus = getEffectiveStatus(order);
        return effectiveStatus === "shipped" || effectiveStatus === "delivered";
      }).length,
    [orders, getEffectiveStatus]
  );

  const completed = useMemo(
    () => orders.filter((order) => getEffectiveStatus(order) === "completed").length,
    [orders, getEffectiveStatus]
  );

  const totalSpent = useMemo(
    () =>
      orders
        .filter((order) => {
          const effectiveStatus = getEffectiveStatus(order);
          return effectiveStatus !== "cancelled" && effectiveStatus !== "refunded";
        })
        .reduce((sum, order) => sum + order.total_price, 0),
    [orders, getEffectiveStatus]
  );

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5),
    [orders]
  );

  const urgentOrders = useMemo(
    () =>
      orders.filter((order) => {
        const effectiveStatus = getEffectiveStatus(order);
        return ["pending_payment", "shipped", "delivered"].includes(effectiveStatus);
      }),
    [orders, getEffectiveStatus]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="section-padding">
        <div className="max-content">
          {/* Greeting Section */}
          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
              Selamat datang kembali
            </h1>
            <p className="text-sm md:text-base text-text-secondary">
              Pantau dan kelola semua pesanan Anda dari sini
            </p>
          </div>

          {/* Urgent Alert */}
          {pendingPayment > 0 && (
            <div className="mb-10 p-5 bg-orange-50 border-l-4 border-l-orange-500 rounded-xl flex items-start gap-4 shadow-sm">
              <div className="p-3 bg-orange-100 rounded-lg flex-shrink-0 mt-0.5">
                <AlertCircle size={20} className="text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-orange-900 text-base mb-1">
                  {pendingPayment} Pesanan Menunggu Pembayaran
                </p>
                <p className="text-sm text-orange-800 mb-3">
                  Selesaikan pembayaran sebelum batas waktu untuk menghindari pembatalan otomatis.
                </p>
                <Link href="/orders?status=pending_payment" className="text-sm font-semibold text-orange-700 hover:text-orange-900 inline-flex items-center gap-1 transition-colors">
                  Lihat Detail <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )}

          {/* Metrics Cards */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {/* Total Orders */}
            <div className="card-border bg-white rounded-xl p-5 hover:shadow-lg transition-all duration-200 border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <ShoppingBag size={22} className="text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-text-secondary font-semibold mb-2 uppercase tracking-wider">Total Pesanan</p>
              <p className="text-3xl font-bold text-text-primary">{totalOrders}</p>
              <p className="text-xs text-text-secondary mt-2">Semua transaksi</p>
            </div>

            {/* Pending Payment */}
            {pendingPayment > 0 && (
              <div className="card-border bg-white rounded-xl p-5 hover:shadow-lg transition-all duration-200 border-l-4 border-l-orange-400">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Clock size={22} className="text-orange-600" />
                  </div>
                </div>
                <p className="text-xs text-text-secondary font-semibold mb-2 uppercase tracking-wider">Menunggu Bayar</p>
                <p className="text-3xl font-bold text-orange-600">{pendingPayment}</p>
                <p className="text-xs text-orange-600 mt-2">Perlu aksi</p>
              </div>
            )}

            {/* In Transit */}
            {needsAction > 0 && (
              <div className="card-border bg-white rounded-xl p-5 hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-400">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Package size={22} className="text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-text-secondary font-semibold mb-2 uppercase tracking-wider">Dalam Pengiriman</p>
                <p className="text-3xl font-bold text-blue-600">{needsAction}</p>
                <p className="text-xs text-blue-600 mt-2">Pesanan aktif</p>
              </div>
            )}

            {/* Completed */}
            {completed > 0 && (
              <div className="card-border bg-white rounded-xl p-5 hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-400">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle2 size={22} className="text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-text-secondary font-semibold mb-2 uppercase tracking-wider">Selesai</p>
                <p className="text-3xl font-bold text-green-600">{completed}</p>
                <p className="text-xs text-green-600 mt-2">Transaksi sukses</p>
              </div>
            )}

            {/* Total Spent */}
            <div className="card-border bg-white rounded-xl p-5 hover:shadow-lg transition-all duration-200 border-l-4 border-l-purple-400">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp size={22} className="text-purple-600" />
                </div>
              </div>
              <p className="text-xs text-text-secondary font-semibold mb-2 uppercase tracking-wider">Total Belanja</p>
              <p className="text-2xl font-bold text-text-primary">{formatRupiah(totalSpent)}</p>
              <p className="text-xs text-text-secondary mt-2">Total pengeluaran</p>
            </div>

            <Link
              href="/wallet"
              className="card-border bg-white rounded-xl p-5 hover:shadow-lg transition-all duration-200 border-l-4 border-l-cyan-400 block"
            >
              <p className="text-xs text-text-secondary font-semibold mb-2 uppercase tracking-wider">Saldo Wallet</p>
              <p className="text-2xl font-bold text-text-primary">
                {formatRupiah(wallet?.account.available_balance || 0)}
              </p>
              <p className="text-xs text-cyan-700 mt-2 font-semibold">Top up sekarang</p>
            </Link>
          </div>

          {/* Tips & Panduan Section */}
          <div className="mb-8 w-full card-border bg-blue-50 rounded-xl p-6 border-blue-200 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0 mt-0.5">
                <CheckCircle2 size={20} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-blue-900 mb-2">Tips & Panduan</p>
                <p className="text-sm text-blue-800 leading-relaxed">
                  Pantau pesanan secara berkala dan konfirmasi penerimaan saat barang tiba untuk menyelesaikan transaksi.
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div>
            {/* Recent Orders */}
            <div className="w-full mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-text-primary">Pesanan Terbaru</h2>
                <Link href="/orders" className="text-sm text-accent-primary hover:underline font-semibold flex items-center gap-1">
                  Lihat Semua <ArrowRight size={16} />
                </Link>
              </div>

              {isLoading ? (
                <LoadingSkeleton variant="line" count={3} />
              ) : recentOrders.length > 0 ? (
                <div className="card-border bg-white rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                            ID Pesanan
                          </th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                            Produk
                          </th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                            Total
                          </th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                            Status
                          </th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {recentOrders.map((order, idx) => {
                          const effectiveStatus = getEffectiveStatus(order);

                          return (
                            <tr
                              key={order.id}
                              className={`hover:bg-gray-50 transition-colors ${
                                idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                              }`}
                            >
                              <td className="px-6 py-4">
                                <Link
                                  href={`/orders/${order.id}`}
                                  className="text-sm font-semibold text-accent-primary hover:underline"
                                >
                                  #{formatShortId(order.id)}
                                </Link>
                              </td>
                              <td className="px-6 py-4 text-sm text-text-primary font-medium truncate">
                                {order.product?.name || "-"}
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-text-primary">
                                {formatRupiah(order.total_price)}
                              </td>
                              <td className="px-6 py-4">
                                <OrderStatusBadge status={effectiveStatus} size="sm" />
                              </td>
                              <td className="px-6 py-4">
                                <Link
                                  href={`/orders/${order.id}`}
                                  className="text-sm text-accent-primary hover:underline font-semibold"
                                >
                                  Lihat →
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={ShoppingBag}
                  title="Belum ada pesanan"
                  description="Mulai berbelanja sekarang untuk melihat pesanan Anda di sini"
                />
              )}
            </div>

            {/* Sidebar - Urgent Actions */}
            <div className="w-full">
              {urgentOrders.length > 0 && (
                <div className="card-border bg-white rounded-xl p-6 shadow-sm border-gray-200">
                  <h3 className="font-semibold text-text-primary text-base mb-4 flex items-center gap-2">
                    <AlertCircle size={18} className="text-orange-500 flex-shrink-0" />
                    Perlu Perhatian
                  </h3>
                  <ul className="space-y-2">
                    {urgentOrders.slice(0, 3).map((order) => (
                      <li key={order.id} className="p-3 bg-gray-50 rounded-lg hover:bg-orange-50 transition-colors border border-gray-200 hover:border-orange-200">
                        <Link href={`/orders/${order.id}`} className="text-sm text-accent-primary hover:underline truncate font-semibold flex items-center justify-between">
                          Order #{formatShortId(order.id)}
                          <ArrowRight size={14} className="flex-shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
