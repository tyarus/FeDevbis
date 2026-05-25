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
import { Product, Order, PaginatedResponse, TransactionStatus } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { OrderStatusBadge, LoadingSkeleton, EmptyState } from "@/components";
import { formatRupiah, formatShortId } from "@/lib/utils";
import { 
  Package, 
  ShoppingBag, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Truck,
  ArrowRight
} from "lucide-react";

const fetcher = (url: string) =>
  apiClient.get(url).then((res) => ({
    data: res.data.data,
    pagination: res.data.pagination,
  }));

export default function SellerDashboardPage() {
  const { user } = useAuthStore();
  const wallet = useWalletOverview(user);

  const { data: productsData } = useSWR<PaginatedResponse<Product>>(
    "/seller/products?limit=1",
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: ordersData, isLoading: isOrdersLoading } = useSWR<PaginatedResponse<Order>>(
    "/seller/orders?limit=5",
    fetcher,
    { revalidateOnFocus: false }
  );

  const totalProducts = productsData?.pagination.total || 0;
  const totalOrders = ordersData?.pagination.total || 0;
  const recentOrders = useMemo(() => ordersData?.data || [], [ordersData?.data]);
  const orderIdsKey = useMemo(
    () =>
      recentOrders
        .map((order) => String(order.id))
        .sort()
        .join(","),
    [recentOrders]
  );

  const { data: threadStatusMap } = useSWR<Record<string, TransactionStatus>>(
    orderIdsKey ? `seller-dashboard-thread-status:${orderIdsKey}` : null,
    async () => {
      const entries = await Promise.all(
        recentOrders.map(async (order) => {
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
    if (recentOrders.length === 0) return;
    walletAPI.syncOrders(
      recentOrders.map((order) => {
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
  }, [recentOrders, threadStatusMap]);

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
    () => recentOrders.filter((order) => getEffectiveStatus(order) === "pending_payment").length,
    [recentOrders, getEffectiveStatus]
  );

  const processingOrders = useMemo(
    () => recentOrders.filter((order) => getEffectiveStatus(order) === "processing").length,
    [recentOrders, getEffectiveStatus]
  );

  const shippedOrders = useMemo(
    () =>
      recentOrders.filter((order) => {
        const effectiveStatus = getEffectiveStatus(order);
        return effectiveStatus === "shipped" || effectiveStatus === "delivered";
      }).length,
    [recentOrders, getEffectiveStatus]
  );

  const needsProcessing = pendingPayment + processingOrders;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="section-padding">
        <div className="max-content">
          {/* Greeting Section */}
          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
              Dashboard Toko Anda
            </h1>
            <p className="text-sm md:text-base text-text-secondary">
              Kelola produk dan pesanan dengan efisien dari sini
            </p>
          </div>

          {/* Urgent Alert */}
          {needsProcessing > 0 && (
            <div className="mb-10 p-5 bg-red-50 border-l-4 border-l-red-500 rounded-xl flex items-start gap-4 shadow-sm">
              <div className="p-3 bg-red-100 rounded-lg flex-shrink-0 mt-0.5">
                <AlertCircle size={20} className="text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-900 text-base mb-1">
                  {needsProcessing} Pesanan Perlu Diproses
                </p>
                <p className="text-sm text-red-800 mb-3">
                  Pesanan yang sudah dibayar harus segera diproses dan dikirim untuk kepuasan pelanggan.
                </p>
                <Link href="/seller/orders" className="text-sm font-semibold text-red-700 hover:text-red-900 inline-flex items-center gap-1 transition-colors">
                  Lihat Detail <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )}

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
            {/* Total Products */}
            <div className="card-border bg-white rounded-xl p-5 hover:shadow-lg transition-all duration-200 border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Package size={22} className="text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-text-secondary font-semibold mb-2 uppercase tracking-wider">Total Produk</p>
              <p className="text-3xl font-bold text-text-primary">{totalProducts}</p>
              <p className="text-xs text-text-secondary mt-2">Produk aktif</p>
            </div>

            {/* Total Orders */}
            <div className="card-border bg-white rounded-xl p-5 hover:shadow-lg transition-all duration-200 border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <ShoppingBag size={22} className="text-purple-600" />
                </div>
              </div>
              <p className="text-xs text-text-secondary font-semibold mb-2 uppercase tracking-wider">Pesanan Masuk</p>
              <p className="text-3xl font-bold text-text-primary">{totalOrders}</p>
              <p className="text-xs text-text-secondary mt-2">Total semua</p>
            </div>

            {/* Need Processing */}
            {needsProcessing > 0 && (
              <div className="card-border bg-white rounded-xl p-5 hover:shadow-lg transition-all duration-200 border-l-4 border-l-red-400">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <Clock size={22} className="text-red-600" />
                  </div>
                </div>
                <p className="text-xs text-text-secondary font-semibold mb-2 uppercase tracking-wider">Perlu Diproses</p>
                <p className="text-3xl font-bold text-red-600">{needsProcessing}</p>
                <p className="text-xs text-red-600 mt-2">Mendesak</p>
              </div>
            )}

            {/* Pending Payment */}
            {pendingPayment > 0 && (
              <div className="card-border bg-white rounded-xl p-5 hover:shadow-lg transition-all duration-200 border-l-4 border-l-yellow-400">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <AlertCircle size={22} className="text-yellow-600" />
                  </div>
                </div>
                <p className="text-xs text-text-secondary font-semibold mb-2 uppercase tracking-wider">Menunggu Bayar</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingPayment}</p>
                <p className="text-xs text-yellow-600 mt-2">Pending</p>
              </div>
            )}

            {/* Shipped */}
            {shippedOrders > 0 && (
              <div className="card-border bg-white rounded-xl p-5 hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-400">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Truck size={22} className="text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-text-secondary font-semibold mb-2 uppercase tracking-wider">Dikirim</p>
                <p className="text-3xl font-bold text-green-600">{shippedOrders}</p>
                <p className="text-xs text-green-600 mt-2">Pengiriman aktif</p>
              </div>
            )}

            <Link
              href="/wallet"
              className="card-border bg-white rounded-xl p-5 hover:shadow-lg transition-all duration-200 border-l-4 border-l-cyan-400 block"
            >
              <p className="text-xs text-text-secondary font-semibold mb-2 uppercase tracking-wider">Saldo Wallet</p>
              <p className="text-2xl font-bold text-text-primary">
                {formatRupiah(wallet?.account.available_balance || 0)}
              </p>
              <p className="text-xs text-cyan-700 mt-2 font-semibold">Tarik saldo</p>
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            <Link href="/seller/products/new" className="btn-primary text-center py-4 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all duration-200">
              <Package size={20} />
              Tambah Produk Baru
            </Link>
            <Link href="/seller/orders" className="btn-secondary text-center py-4 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all duration-200">
              <ShoppingBag size={20} />
              Lihat Semua Pesanan
            </Link>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Orders */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-text-primary">Pesanan Terbaru</h2>
                <Link href="/seller/orders" className="text-sm text-accent-primary hover:underline font-semibold flex items-center gap-1">
                  Lihat Semua <ArrowRight size={16} />
                </Link>
              </div>

              {isOrdersLoading ? (
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
                            Pembeli
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
                        {recentOrders.map((order, idx) => (
                          <tr
                            key={order.id}
                            className={`hover:bg-gray-50 transition-colors ${
                              idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                            }`}
                          >
                            <td className="px-6 py-4">
                              <Link
                                href={`/seller/orders/${order.id}`}
                                className="text-sm font-semibold text-accent-primary hover:underline"
                              >
                                #{formatShortId(order.id)}
                              </Link>
                            </td>
                            <td className="px-6 py-4 text-sm text-text-primary font-medium truncate">
                              {order.buyer?.name || "Pembeli"}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-text-primary">
                              {formatRupiah(order.total_price)}
                            </td>
                            <td className="px-6 py-4">
                              <OrderStatusBadge status={getEffectiveStatus(order)} size="sm" />
                            </td>
                            <td className="px-6 py-4">
                              <Link
                                href={`/seller/orders/${order.id}`}
                                className="text-sm text-accent-primary hover:underline font-semibold"
                              >
                                Lihat →
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={ShoppingBag}
                  title="Belum ada pesanan"
                  description="Pesanan akan muncul di sini ketika ada pembeli"
                />
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Urgent Orders */}
              {needsProcessing > 0 && (
                <div className="card-border bg-white rounded-xl p-6 shadow-sm border-gray-200">
                  <h3 className="font-semibold text-text-primary text-base mb-4 flex items-center gap-2">
                    <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                    Perlu Diproses
                  </h3>
                  <ul className="space-y-2">
                    {recentOrders
                      .filter((order) => {
                        const effectiveStatus = getEffectiveStatus(order);
                        return ["pending_payment", "paid", "processing"].includes(effectiveStatus);
                      })
                      .slice(0, 3)
                      .map((order) => (
                        <li key={order.id} className="p-3 bg-gray-50 rounded-lg hover:bg-red-50 transition-colors border border-gray-200 hover:border-red-200">
                          <Link href={`/seller/orders/${order.id}`} className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-accent-primary hover:underline">
                                Order #{formatShortId(order.id)}
                              </p>
                              <p className="text-xs text-text-secondary mt-0.5">
                                {order.buyer?.name || "Pembeli"}
                              </p>
                            </div>
                            <ArrowRight size={14} className="flex-shrink-0 text-gray-400 mt-0.5" />
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Info Boxes */}
              <div className="card-border bg-blue-50 rounded-xl p-5 border-blue-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-blue-100 rounded-lg flex-shrink-0 mt-0.5">
                    <CheckCircle2 size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">Tips Penjualan</p>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Proses pesanan cepat dan inputkan nomor tracking untuk pengalaman pembeli terbaik.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-border bg-green-50 rounded-xl p-5 border-green-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-green-100 rounded-lg flex-shrink-0 mt-0.5">
                    <CheckCircle2 size={18} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-900 mb-1">Keamanan Transaksi</p>
                    <p className="text-xs text-green-800 leading-relaxed">
                      Buyer akan verifikasi kode pengiriman saat terima paket untuk keamanan bersama.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
