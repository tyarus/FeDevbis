"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { Product, PaginatedResponse } from "@/types";
import { ProductCard, LoadingSkeleton, EmptyState } from "@/components";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

const fetcher = (url: string) =>
  apiClient.get(url).then((res) => res.data as PaginatedResponse<Product>);

export default function ProductsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const params = new URLSearchParams({
    page: currentPage.toString(),
    limit: "12",
    ...(debouncedSearch && { search: debouncedSearch }),
  });

  const { data, isLoading } = useSWR<PaginatedResponse<Product>>(
    `/products?${params.toString()}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (!isMounted) return null;

  const products = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="section-padding">
      <div className="max-content">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-section-heading text-text-primary mb-6">Jelajahi Produk</h1>

          {/* Search and Filter */}
          <div className="flex gap-4 flex-col md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-3 text-text-secondary" />
              <input
                type="text"
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-base w-full pl-10 text-body"
              />
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <LoadingSkeleton count={12} />
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.total_pages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-12">
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
            icon={Search}
            title="Produk tidak ditemukan"
            description={
              debouncedSearch
                ? `Tidak ada produk yang cocok dengan "${debouncedSearch}"`
                : "Belum ada produk yang tersedia"
            }
          />
        )}
      </div>
    </div>
  );
}
