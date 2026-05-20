"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { AxiosError } from "axios";
import { apiClient } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { transactionChatAPI } from "@/lib/transactionChat";
import { walletAPI } from "@/lib/wallet";
import {
  Order,
  OrderStatus,
  TransactionChecklist,
  TransactionStatus,
  User,
} from "@/types";
import { formatDate, formatDateShort, getTransactionStatusLabel } from "@/lib/utils";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { TransactionStatusBadge } from "./TransactionStatusBadge";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  MessageCircle,
  RefreshCcw,
  Send,
  ShieldCheck,
  ShieldX,
  Sparkles,
  UserCheck2,
} from "lucide-react";

interface TransactionChatWorkspaceProps {
  orderId: string;
  role: "buyer" | "seller";
  backHref: string;
}

type AsyncActionKey =
  | "send"
  | "checklist"
  | "status"
  | "generate-code"
  | "verify-code"
  | "copy-code"
  | "finalize";

const fetchOrder = (url: string) => apiClient.get(url).then((res) => res.data.data as Order);

const ACTIVE_TRANSACTION_ORDER_STATUSES: OrderStatus[] = [
  "paid",
  "processing",
  "shipped",
  "delivered",
  "completed",
];

const TRANSACTION_STATUS_OPTIONS: Array<{
  value: TransactionStatus;
  description: string;
}> = [
  { value: "chat_open", description: "Chat sudah aktif dan siap koordinasi akun." },
  { value: "account_verification", description: "Buyer sedang cek kecocokan data akun." },
  { value: "account_secured", description: "Akun berhasil diamankan oleh buyer." },
  { value: "device_cleanup", description: "Seller sudah menghapus perangkat lama." },
  { value: "awaiting_completion_code", description: "Menunggu kode penyelesaian transaksi." },
  { value: "completed", description: "Transaksi selesai dan tervalidasi." },
  { value: "disputed", description: "Ada sengketa, perlu peninjauan admin." },
];

const CHECKLIST_LABELS: Array<{
  key: keyof TransactionChecklist;
  label: string;
  helper?: string;
}> = [
  {
    key: "account_match",
    label: "Akun sesuai dengan deskripsi produk",
  },
  {
    key: "account_secured",
    label: "Akun sudah diamankan (2FA, email, recovery)",
  },
  {
    key: "seller_device_removed",
    label: "Seller sudah menghapus semua perangkat yang terhubung",
  },
  {
    key: "completion_code_verified",
    label: "Kode penyelesaian sudah terverifikasi",
    helper: "Checklist ini otomatis aktif setelah verifikasi kode berhasil.",
  },
];

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError?.response?.data?.message || fallback;
};

const getStatusHelper = (status: TransactionStatus): string => {
  const matched = TRANSACTION_STATUS_OPTIONS.find((item) => item.value === status);
  return matched?.description || "Status transaksi aktif.";
};

const toComparableId = (value: string | number | undefined): string => String(value || "");

const formatChatTime = (date: string): string =>
  new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));

const isChecklistCompleted = (checklist: TransactionChecklist): boolean =>
  checklist.account_match &&
  checklist.account_secured &&
  checklist.seller_device_removed &&
  checklist.completion_code_verified;

export function TransactionChatWorkspace({
  orderId,
  role,
  backHref,
}: TransactionChatWorkspaceProps) {
  const [messageInput, setMessageInput] = useState("");
  const [completionCodeInput, setCompletionCodeInput] = useState("");
  const [statusDraft, setStatusDraft] = useState<TransactionStatus | null>(null);
  const [activeAction, setActiveAction] = useState<AsyncActionKey | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const {
    data: order,
    isLoading: isOrderLoading,
    mutate: mutateOrder,
  } = useSWR<Order>(orderId ? `/orders/${orderId}` : null, fetchOrder, {
    revalidateOnFocus: false,
  });

  const {
    data: thread,
    isLoading: isThreadLoading,
    error: threadError,
    mutate: mutateThread,
  } = useSWR(orderId ? `transaction-thread-${orderId}` : null, () => transactionChatAPI.getThread(orderId), {
    revalidateOnFocus: false,
    refreshInterval: 6000,
  });

  const transactionStatus = thread?.status || order?.transaction_status || "chat_open";
  const selectedStatus = statusDraft || transactionStatus;
  const checklist = thread?.checklist || transactionChatAPI.getDefaultChecklist();
  const isChecklistDone = isChecklistCompleted(checklist);
  const effectiveOrderStatus: OrderStatus =
    isChecklistDone || transactionStatus === "completed" ? "completed" : order?.status || "processing";
  const canOpenTransaction = Boolean(order && ACTIVE_TRANSACTION_ORDER_STATUSES.includes(order.status));
  const isPaymentPending = order?.status === "pending_payment";
  const currentUser = useMemo<User | null>(
    () => (typeof window === "undefined" ? null : getAuthUser()),
    []
  );

  const sortedActivities = useMemo(
    () =>
      [...(thread?.activities || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [thread?.activities]
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

  const setSuccessNotice = (message: string) => {
    setNotice({ type: "success", message });
  };

  const setErrorNotice = (message: string) => {
    setNotice({ type: "error", message });
  };

  const refreshAll = async () => {
    await Promise.all([mutateOrder(), mutateThread()]);
  };

  const finalizeIfChecklistDone = async (nextChecklist: TransactionChecklist): Promise<void> => {
    if (!order || !isChecklistCompleted(nextChecklist)) return;
    if (order.status === "completed" && transactionStatus === "completed") return;

    setActiveAction("finalize");
    try {
      if (transactionStatus !== "completed") {
        await transactionChatAPI.updateStatus(orderId, "completed");
      }

      if (order.status !== "completed") {
        await transactionChatAPI.completeOrder(orderId);
      }

      walletAPI.releaseEscrowForOrder({
        id: order.id,
        buyer_id: order.buyer_id,
        seller_id: order.seller_id,
        total_price: order.total_price,
        status: "completed",
      });

      await refreshAll();
      setSuccessNotice("Semua checklist terpenuhi. Transaksi otomatis diselesaikan.");
    } catch (error) {
      setErrorNotice(
        getApiErrorMessage(
          error,
          "Checklist sudah lengkap, tetapi sinkron status order ke 'completed' gagal. Cek endpoint backend complete order."
        )
      );
    } finally {
      setActiveAction(null);
    }
  };

  const handleSendMessage = async () => {
    const message = messageInput.trim();
    if (!message) return;

    setActiveAction("send");
    setNotice(null);
    try {
      await transactionChatAPI.sendMessage(orderId, { message });
      setMessageInput("");
      await mutateThread();
    } catch (error) {
      setErrorNotice(getApiErrorMessage(error, "Gagal mengirim pesan transaksi."));
    } finally {
      setActiveAction(null);
    }
  };

  const handleChecklistToggle = async (
    key: keyof TransactionChecklist,
    checked: boolean
  ) => {
    if (key === "completion_code_verified") return;

    setActiveAction("checklist");
    setNotice(null);
    try {
      const updatedThread = await transactionChatAPI.updateChecklist(orderId, {
        [key]: checked,
      });
      await finalizeIfChecklistDone(updatedThread.checklist);
      await refreshAll();
      if (!isChecklistCompleted(updatedThread.checklist)) {
        setSuccessNotice("Checklist transaksi berhasil diperbarui.");
      }
    } catch (error) {
      setErrorNotice(getApiErrorMessage(error, "Gagal memperbarui checklist transaksi."));
    } finally {
      setActiveAction(null);
    }
  };

  const handleStatusUpdate = async () => {
    if (selectedStatus === transactionStatus) {
      setSuccessNotice("Status transaksi sudah sama.");
      return;
    }

    setActiveAction("status");
    setNotice(null);
    try {
      await transactionChatAPI.updateStatus(orderId, selectedStatus);
      await refreshAll();
      setStatusDraft(null);
      setSuccessNotice(`Status transaksi diubah ke "${getTransactionStatusLabel(selectedStatus)}".`);
    } catch (error) {
      setErrorNotice(getApiErrorMessage(error, "Gagal memperbarui status transaksi."));
    } finally {
      setActiveAction(null);
    }
  };

  const handleGenerateCompletionCode = async () => {
    setActiveAction("generate-code");
    setNotice(null);
    try {
      const result = await transactionChatAPI.generateCompletionCode(orderId);
      await refreshAll();
      setSuccessNotice(`Kode penyelesaian baru: ${result.completion_code}`);
    } catch (error) {
      setErrorNotice(getApiErrorMessage(error, "Gagal membuat kode penyelesaian transaksi."));
    } finally {
      setActiveAction(null);
    }
  };

  const handleVerifyCompletionCode = async () => {
    const code = completionCodeInput.trim();
    if (!code) {
      setErrorNotice("Masukkan kode penyelesaian terlebih dahulu.");
      return;
    }

    setActiveAction("verify-code");
    setNotice(null);
    try {
      const result = await transactionChatAPI.verifyCompletionCode(orderId, code);
      await refreshAll();
      if (result.verified) {
        const latestThread = await transactionChatAPI.getThread(orderId);
        await finalizeIfChecklistDone(latestThread.checklist);
        setCompletionCodeInput("");
        if (!isChecklistCompleted(latestThread.checklist)) {
          setSuccessNotice("Kode penyelesaian valid. Bukti transaksi tercatat.");
        }
        return;
      }
      setErrorNotice("Kode penyelesaian tidak valid.");
    } catch (error) {
      setErrorNotice(getApiErrorMessage(error, "Gagal memverifikasi kode penyelesaian."));
    } finally {
      setActiveAction(null);
    }
  };

  const handleCopyCompletionCode = async () => {
    if (!thread?.completion_code) return;

    setActiveAction("copy-code");
    setNotice(null);
    try {
      await navigator.clipboard.writeText(thread.completion_code);
      setSuccessNotice("Kode penyelesaian berhasil disalin.");
    } catch {
      setErrorNotice("Gagal menyalin kode. Coba salin manual.");
    } finally {
      setActiveAction(null);
    }
  };

  if (isOrderLoading || isThreadLoading) {
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
      <div className="section-padding">
        <div className="max-content">
          <div className="card-border p-8 text-center">
            <h1 className="text-section-heading text-text-primary mb-3">Pesanan tidak ditemukan</h1>
            <p className="text-text-secondary text-sm mb-6">
              Pastikan nomor pesanan benar atau kembali ke halaman pesanan.
            </p>
            <Link href={backHref} className="btn-secondary text-xs inline-flex items-center gap-2">
              <ArrowLeft size={15} />
              Kembali
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-blue-50">
      <div className="section-padding">
        <div className="max-content space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft size={15} />
              Kembali ke Detail Pesanan
            </Link>
            <button
              onClick={refreshAll}
              className="btn-secondary text-xs inline-flex items-center gap-2"
            >
              <RefreshCcw size={14} />
              Refresh Data
            </button>
          </div>

          <div className="card-border bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs text-text-secondary">Transaksi #{order.id}</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{order.product?.name}</h1>
                <p className="text-xs text-text-secondary">
                  Buyer: {order.buyer?.name || "-"} · Seller: {order.seller?.name || "-"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <OrderStatusBadge status={effectiveOrderStatus} />
                <TransactionStatusBadge status={transactionStatus} />
              </div>
            </div>
          </div>

          {isPaymentPending && (
            <div className="card-border p-4 bg-amber-50 border-amber-200">
              <p className="text-sm text-amber-800">
                Chat transaksi aktif setelah pembayaran berhasil. Selesaikan pembayaran dulu untuk membuka chat.
              </p>
            </div>
          )}

          {threadError && (
            <div className="card-border p-4 bg-red-50 border-red-200">
              <p className="text-sm text-red-700">
                Endpoint transaksi chat belum siap atau gagal diakses. Pastikan backend menyediakan endpoint transaksi, chat, checklist, status, dan activity log.
              </p>
            </div>
          )}

          {notice && (
            <div
              className={`card-border p-4 ${
                notice.type === "success"
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              <p className="text-sm">{notice.message}</p>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <section className="xl:col-span-8 card-border bg-white flex flex-col min-h-[620px]">
              <div className="border-b border-border p-4 sm:p-5 flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-text-primary flex items-center gap-2">
                    <MessageCircle size={18} />
                    Chat Transaksi
                  </h2>
                  <p className="text-xs text-text-secondary mt-1">
                    Semua pesan tersimpan sebagai bukti audit transaksi.
                  </p>
                </div>
                <span className="text-xs text-text-secondary">
                  {thread?.messages?.length || 0} pesan
                </span>
              </div>

              <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3 bg-[linear-gradient(180deg,rgba(248,250,252,0.75)_0%,rgba(255,255,255,1)_35%)]">
                {(thread?.messages || []).length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center">
                    <div className="max-w-sm">
                      <Sparkles size={28} className="mx-auto text-accent-primary mb-3" />
                      <p className="text-sm text-text-primary font-medium">Chat transaksi belum dimulai</p>
                      <p className="text-xs text-text-secondary mt-1">
                        Kirim pesan pertama untuk koordinasi detail akun dengan aman.
                      </p>
                    </div>
                  </div>
                ) : (
                  thread?.messages?.map((message) => {
                    const isMine =
                      toComparableId(message.sender_id) === toComparableId(currentUser?.id) ||
                      (!currentUser && message.sender_role === role);
                    const isSystem = message.sender_role === "system";

                    if (isSystem) {
                      return (
                        <div key={message.id} className="text-center">
                          <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-3 py-1 text-xs">
                            {message.message}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[90%] sm:max-w-[72%] rounded-2xl px-4 py-3 shadow-sm ${
                            isMine
                              ? "bg-accent-primary text-white rounded-br-md"
                              : "bg-slate-100 text-slate-800 rounded-bl-md"
                          }`}
                        >
                          <p className="text-xs font-semibold mb-1 opacity-90">
                            {message.sender?.name ||
                              (message.sender_role === "buyer"
                                ? "Buyer"
                                : message.sender_role === "seller"
                                ? "Seller"
                                : "Admin")}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                          <p className={`text-[11px] mt-2 ${isMine ? "text-blue-100" : "text-slate-500"}`}>
                            {formatChatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-border p-4 bg-white">
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    "Akun sudah saya cek, datanya cocok.",
                    "2FA sudah aktif, akun aman.",
                    "Mohon konfirmasi perangkat lama sudah dihapus.",
                  ].map((template) => (
                    <button
                      key={template}
                      type="button"
                      onClick={() => setMessageInput(template)}
                      className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    >
                      {template}
                    </button>
                  ))}
                </div>

                <div className="flex items-end gap-3">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    rows={3}
                    disabled={!canOpenTransaction || activeAction === "send"}
                    placeholder="Ketik pesan transaksi..."
                    className="input-base w-full resize-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!canOpenTransaction || !messageInput.trim() || activeAction === "send"}
                    className="btn-primary px-4 py-3 h-[52px] inline-flex items-center gap-2"
                  >
                    <Send size={15} />
                    {activeAction === "send" ? "Mengirim..." : "Kirim"}
                  </button>
                </div>
              </div>
            </section>

            <aside className="xl:col-span-4 space-y-4">
              <div className="card-border bg-white p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <ShieldCheck size={16} />
                  Checklist Keamanan
                </h3>
                <div className="space-y-2.5">
                  {CHECKLIST_LABELS.map((item) => {
                    const checked = checklist[item.key];
                    const disabled =
                      item.key === "completion_code_verified" || activeAction === "checklist" || !canOpenTransaction;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleChecklistToggle(item.key, !checked)}
                        className={`w-full text-left rounded-lg border px-3 py-3 transition-colors ${
                          checked
                            ? "border-green-200 bg-green-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        } ${disabled ? "cursor-not-allowed opacity-80" : ""}`}
                      >
                        <div className="flex items-start gap-2">
                          {checked ? (
                            <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <ShieldX size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                          )}
                          <div>
                            <p className="text-xs font-medium text-text-primary">{item.label}</p>
                            {item.helper && (
                              <p className="text-[11px] text-text-secondary mt-1">{item.helper}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="card-border bg-white p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-2">Status Transaksi</h3>
                <p className="text-xs text-text-secondary mb-3">{getStatusHelper(transactionStatus)}</p>
                <div className="space-y-3">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setStatusDraft(e.target.value as TransactionStatus)}
                    disabled={!canOpenTransaction || activeAction === "status"}
                    className="input-base w-full text-sm"
                  >
                    {TRANSACTION_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {getTransactionStatusLabel(option.value)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleStatusUpdate}
                    disabled={!canOpenTransaction || activeAction === "status"}
                    className="btn-secondary w-full text-xs"
                  >
                    {activeAction === "status" ? "Menyimpan Status..." : "Simpan Status Transaksi"}
                  </button>
                </div>
              </div>

              <div className="card-border bg-white p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <UserCheck2 size={16} />
                  Kode Penyelesaian
                </h3>

                {role === "seller" && (
                  <div className="space-y-3">
                    {thread?.completion_code ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] text-text-secondary mb-1">Kode aktif</p>
                        <p className="font-mono text-sm font-semibold text-text-primary">
                          {thread.completion_code}
                        </p>
                        <p className="text-[11px] text-text-secondary mt-1">
                          Expired:{" "}
                          {thread.completion_code_expires_at
                            ? formatDateShort(thread.completion_code_expires_at)
                            : "Tidak ada"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-text-secondary">
                        Belum ada kode aktif. Buat kode saat akun sudah siap diserahkan.
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateCompletionCode}
                        disabled={!canOpenTransaction || activeAction === "generate-code"}
                        className="btn-primary text-xs w-full"
                      >
                        {activeAction === "generate-code" ? "Membuat..." : "Generate Kode"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyCompletionCode}
                        disabled={!thread?.completion_code || activeAction === "copy-code"}
                        className="btn-secondary text-xs w-full inline-flex items-center justify-center gap-2"
                      >
                        <Copy size={14} />
                        Salin Kode
                      </button>
                    </div>
                  </div>
                )}

                {role === "buyer" && (
                  <div className="space-y-3">
                    <p className="text-xs text-text-secondary">
                      Masukkan kode dari seller untuk validasi final transaksi.
                    </p>
                    <input
                      value={completionCodeInput}
                      onChange={(e) => setCompletionCodeInput(e.target.value)}
                      placeholder="Contoh: FIN-238714"
                      className="input-base w-full text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCompletionCode}
                      disabled={!canOpenTransaction || activeAction === "verify-code"}
                      className="btn-primary w-full text-xs"
                    >
                      {activeAction === "verify-code" ? "Memverifikasi..." : "Verifikasi Kode"}
                    </button>
                  </div>
                )}
              </div>

              <div className="card-border bg-white p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-3">Aktivitas Audit</h3>
                {sortedActivities.length === 0 ? (
                  <p className="text-xs text-text-secondary">
                    Belum ada aktivitas. Aktivitas akan tercatat otomatis untuk kebutuhan admin.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                    {sortedActivities.map((activity) => (
                      <div key={activity.id} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                        <p className="text-xs font-medium text-text-primary">{activity.description}</p>
                        <p className="text-[11px] text-text-secondary mt-1">
                          {activity.actor_role.toUpperCase()} · {formatDate(activity.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
