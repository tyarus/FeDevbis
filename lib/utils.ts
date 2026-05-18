import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatShortId(id: string | number, length = 8): string {
  return String(id).slice(0, length);
}

export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_payment: "Menunggu Pembayaran",
    paid: "Sudah Dibayar",
    processing: "Diproses",
    shipped: "Dikirim",
    delivered: "Terkirim",
    completed: "Selesai",
    cancelled: "Dibatalkan",
    refunded: "Dikembalikan",
  };
  return labels[status] || status;
}

export function getOrderStatusColor(status: string): {
  bg: string;
  text: string;
} {
  const colors: Record<string, { bg: string; text: string }> = {
    pending_payment: { bg: "bg-status-pending-bg", text: "text-status-pending-text" },
    paid: { bg: "bg-status-paid-bg", text: "text-status-paid-text" },
    processing: { bg: "bg-status-processing-bg", text: "text-status-processing-text" },
    shipped: { bg: "bg-status-shipped-bg", text: "text-status-shipped-text" },
    delivered: { bg: "bg-status-shipped-bg", text: "text-status-shipped-text" },
    completed: { bg: "bg-status-completed-bg", text: "text-status-completed-text" },
    cancelled: { bg: "bg-status-cancelled-bg", text: "text-status-cancelled-text" },
    refunded: { bg: "bg-status-refunded-bg", text: "text-status-refunded-text" },
  };
  return colors[status] || { bg: "bg-bg-secondary", text: "text-text-secondary" };
}

export function getTransactionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    chat_open: "Chat Dibuka",
    account_verification: "Verifikasi Akun",
    account_secured: "Akun Diamankan",
    device_cleanup: "Pembersihan Perangkat",
    awaiting_completion_code: "Menunggu Kode Selesai",
    completed: "Transaksi Selesai",
    disputed: "Sengketa",
  };

  return labels[status] || status;
}

export function getTransactionStatusColor(status: string): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    chat_open: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
    account_verification: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    account_secured: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    device_cleanup: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
    awaiting_completion_code: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    completed: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    disputed: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  };

  return colors[status] || { bg: "bg-bg-secondary", text: "text-text-secondary", border: "border-border" };
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
