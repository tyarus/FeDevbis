"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { Order, PaginatedResponse } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { OrderStatusBadge, LoadingSkeleton, EmptyState } from "@/components";
import { formatRupiah, formatDateShort } from "@/lib/utils";
import { ShoppingBag, Clock, CheckCircle2 } from "lucide-react";

const fetcher = (url: string) =>
  apiClient.get(url).then((res) => res.data as PaginatedResponse<Order>);

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);

  const { data: ordersData, isLoading } = useSWR<PaginatedResponse<Order>>(
    "/orders?limit=5",
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const orders = ordersData?.data || [];
  const totalOrders = ordersData?.pagination.total_items || 0;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const pendingOrders = orders.filter((o) => ["pending_payment", "processing"].includes(o.status)).length;

  return (
    <div className="section-padding">
      <div className="max-content">
        {/* Greeting */}
        <div className="mb-12">
          <h1 className="text-section-heading text-text-primary mb-2">
            Selamat datang, {user?.name}!
          </h1>
          <p className="text-body text-text-secondary">
            Kelola pesanan dan transaksi Anda di sini
          </p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Total Orders */}
          <div className="card-border bg-bg-secondary p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-text-secondary mb-1">Total Pesanan</p>
                <p className="text-2xl font-medium text-text-primary">{totalOrders}</p>
              </div>
              <ShoppingBag size={24} className="text-text-secondary" />
            </div>
          </div>

          {/* Pending Orders */}
          <div className="card-border bg-bg-secondary p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-text-secondary mb-1">Perlu Diproses</p>
                <p className="text-2xl font-medium text-text-primary">{pendingOrders}</p>
              </div>
              <Clock size={24} className="text-text-secondary" />
            </div>
          </div>

          {/* Completed Orders */}
          <div className="card-border bg-bg-secondary p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-text-secondary mb-1">Selesai</p>
                <p className="text-2xl font-medium text-text-primary">{completedOrders}</p>
              </div>
              <CheckCircle2 size={24} className="text-text-secondary" />
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-medium text-text-primary mb-1">Pesanan Terbaru</h2>
            <p className="text-xs text-text-secondary">
              <Link href="/orders" className="text-accent-primary hover:underline">
                Lihat semua
              </Link>
            </p>
          </div>

          {isLoading ? (
            <LoadingSkeleton variant="line" count={3} />
          ) : orders.length > 0 ? (
            <div className="card-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary">
                        ID Pesanan
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
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-border hover:bg-bg-secondary transition-colors"
                      >
                        <td className="px-6 py-3">
                          <Link
                            href={`/orders/${order.id}`}
                            className="text-xs text-accent-primary hover:underline font-medium"
                          >
                            #{order.id.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-xs text-text-primary">
                          {order.product?.name || "Produk tidak tersedia"}
                        </td>
                        <td className="px-6 py-3 text-xs font-medium text-text-primary">
                          {formatRupiah(order.total_price)}
                        </td>
                        <td className="px-6 py-3">
                          <OrderStatusBadge status={order.status} size="sm" />
                        </td>
                        <td className="px-6 py-3 text-xs text-text-secondary">
                          {formatDateShort(order.created_at)}
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
              description="Mulai berbelanja untuk membuat pesanan pertama Anda"
              action={{
                label: "Jelajahi Produk",
                onClick: () => window.location.href = "/products",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
