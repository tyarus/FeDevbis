"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { CancellationRequest } from "@/types";
import { SellerCancellationApprovalPanel, EmptyState, LoadingSkeleton } from "@/components";
import { formatRupiah, formatShortId } from "@/lib/utils";
import { AlertCircle, ChevronLeft, ChevronRight, FileText } from "lucide-react";

const ITEMS_PER_PAGE = 5;

interface CancellationRequestsResponse {
  data: CancellationRequest[];
  pagination?: {
    current_page: number;
    total: number;
    per_page: number;
    last_page: number;
  };
}

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

export default function SellerCancellationRequestsPanel() {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const { data: response, isLoading, mutate } = useSWR<CancellationRequestsResponse>(
    `/seller/cancellation-requests?page=${currentPage}&status=${statusFilter !== "all" ? statusFilter : ""}`,
    fetcher,
    { revalidateOnFocus: false, revalidateOnMount: true }
  );

  const requests = response?.data || [];
  const pagination = response?.pagination;
  const totalPages = pagination?.last_page || 1;

  const pendingCount = useMemo(() => {
    return requests.filter((r) => r.status === "pending").length;
  }, [requests]);

  if (isLoading) {
    return (
      <div className="card-border p-6">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Permintaan Pembatalan Pesanan</h2>
            <p className="text-sm text-gray-600 mt-1">
              {pendingCount > 0 && (
                <span className="text-red-600 font-medium">
                  {pendingCount} permintaan menunggu persetujuan
                </span>
              )}
              {pendingCount === 0 && "Tidak ada permintaan pembatalan yang menunggu"}
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={20} className="text-red-600" />
              <span className="font-semibold text-red-600">{pendingCount}</span>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {(["all", "pending", "approved", "rejected"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setStatusFilter(tab);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                statusFilter === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab === "all" && "Semua"}
              {tab === "pending" && "Menunggu"}
              {tab === "approved" && "Disetujui"}
              {tab === "rejected" && "Ditolak"}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="card-border p-12">
          <EmptyState
            icon={FileText}
            title={statusFilter === "pending" ? "Tidak ada yang menunggu" : "Tidak ada permintaan"}
            description={
              statusFilter === "pending"
                ? "Semua permintaan pembatalan telah diproses"
                : `Tidak ada permintaan dengan status "${statusFilter}"`
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="card-border p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Pesanan</p>
                  <p className="text-lg font-semibold text-gray-900">#{formatShortId(request.order_id)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600 mb-1">Status</p>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      request.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : request.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {request.status === "pending" && "Menunggu"}
                    {request.status === "approved" && "Disetujui"}
                    {request.status === "rejected" && "Ditolak"}
                  </span>
                </div>
              </div>

              <SellerCancellationApprovalPanel
                request={request}
                onApproved={() => mutate()}
                onRejected={() => mutate()}
              />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="card-border p-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Halaman {currentPage} dari {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
