"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { Product, PaginatedResponse } from "@/types";
import { LoadingSkeleton, EmptyState, ConfirmDialog } from "@/components";
import { formatRupiah, formatDateShort } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Edit2, Trash2, Plus } from "lucide-react";

const fetcher = (url: string) =>
  apiClient.get(url).then((res) => ({
    data: res.data.data,
    pagination: res.data.pagination,
  }));

export default function SellerProductsPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; productId?: string }>({
    open: false,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const url = useMemo(
    () => `/seller/products?page=${currentPage}&limit=10`,
    [currentPage]
  );

  const { data, isLoading, mutate } = useSWR<PaginatedResponse<Product>>(
    url,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (!isMounted) return null;

  const products = data?.data || [];
  const pagination = data?.pagination;

  const handleDelete = async () => {
    if (!deleteConfirm.productId) return;

    setIsDeleting(true);
    try {
      await apiClient.delete(`/products/${deleteConfirm.productId}`);
      mutate();
      setDeleteConfirm({ open: false });
    } catch (error: any) {
      alert(error.response?.data?.message || "Gagal menghapus produk");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="section-padding">
      <div className="max-content">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-section-heading text-text-primary">Produk Saya</h1>
          <Link href="/seller/products/new" className="btn-primary text-xs flex items-center gap-2">
            <Plus size={16} />
            Tambah Produk
          </Link>
        </div>

        {isLoading ? (
          <LoadingSkeleton variant="line" count={5} />
        ) : products.length > 0 ? (
          <>
            <div className="card-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary">
                        Nama Produk
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary">
                        Harga
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary">
                        Stok
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary">
                        Status
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary">
                        Tanggal Dibuat
                      </th>
                      <th className="text-center px-6 py-3 text-xs font-medium text-text-secondary">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b border-border hover:bg-bg-secondary transition-colors"
                      >
                        <td className="px-6 py-3 text-xs font-medium text-text-primary">
                          {product.name}
                        </td>
                        <td className="px-6 py-3 text-xs text-text-primary">
                          {formatRupiah(product.price)}
                        </td>
                        <td className="px-6 py-3 text-xs text-text-primary">{product.stock}</td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-block px-2 py-1 rounded-badge text-xs font-medium ${
                              product.status === "active"
                                ? "bg-stock-available-bg text-stock-available-text"
                                : "bg-status-cancelled-bg text-status-cancelled-text"
                            }`}
                          >
                            {product.status === "active" ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-xs text-text-secondary">
                          {formatDateShort(product.created_at)}
                        </td>
                        <td className="px-6 py-3 flex justify-center gap-2">
                          <Link
                            href={`/seller/products/${product.id}/edit`}
                            className="p-2 hover:bg-bg-secondary rounded-input transition-colors"
                          >
                            <Edit2 size={16} className="text-text-secondary" />
                          </Link>
                          <button
                            onClick={() => setDeleteConfirm({ open: true, productId: product.id })}
                            className="p-2 hover:bg-bg-secondary rounded-input transition-colors"
                          >
                            <Trash2 size={16} className="text-accent-error" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination && pagination.last_page > 1 && (
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
                  Halaman {pagination.current_page} dari {pagination.last_page}
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.last_page, p + 1))}
                  disabled={currentPage === pagination.last_page}
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
            icon={Plus}
            title="Belum ada produk"
            description="Mulai dengan membuat produk pertama Anda"
            action={{
              label: "Tambah Produk",
              onClick: () => router.push("/seller/products/new"),
            }}
          />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        title="Hapus Produk"
        description="Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleDelete}
        confirmLabel="Hapus"
        isDangerous={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
