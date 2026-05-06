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

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
