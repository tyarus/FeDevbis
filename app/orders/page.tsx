"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { Order, PaginatedResponse } from "@/types";
import { OrderStatusBadge, LoadingSkeleton, EmptyState } from "@/components";
import { formatRupiah, formatDateShort } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";

const fetcher = (url: string) =>
  apiClient.get(url).then((res) => res.data as PaginatedResponse<Order>);

export default function OrdersPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const params = new URLSearchParams({
    page: currentPage.toString(),
    limit: "10",
    ...(statusFilter && { status: statusFilter }),
  });

  const { data, isLoading } = useSWR<PaginatedResponse<Order>>(
    `/orders?${params.toString()}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (!isMounted) return null;

  const orders = data?.data || [];
  const pagination = data?.pagination;

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
        <h1 className="text-section-heading text-text-primary mb-8">Pesanan Saya</h1>

        {/* Filter */}
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

        {/* Orders Table */}
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
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-border hover:bg-bg-secondary transition-colors"
                      >
                        <td className="px-6 py-3 text-xs font-medium text-text-primary">
                          #{order.id.slice(0, 8)}
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
                        <td className="px-6 py-3">
                          <Link
                            href={`/orders/${order.id}`}
                            className="text-xs text-accent-primary hover:underline font-medium"
                          >
                            Lihat Detail
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination && pagination.total_pages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ChevronLeft size={16} />
                  Sebelumnya
                </button>

                <div className="text-xs text-text-secondary">
                  Halaman {pagination.current_page} dari {pagination.total_pages}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.total_pages, p + 1))}
                  disabled={currentPage === pagination.total_pages}
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
            description="Anda belum memiliki pesanan yang sesuai dengan filter ini"
          />
        )}
      </div>
    </div>
  );
}
