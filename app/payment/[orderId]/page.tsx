"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { Order, PaymentMethod } from "@/types";
import { LoadingSkeleton, PriceDisplay } from "@/components";
import { formatDate } from "@/lib/utils";
import { CreditCard, Banknote, Wallet } from "lucide-react";

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

const paymentMethods: { value: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
  { value: "bank_transfer", label: "Transfer Bank", icon: Banknote },
  { value: "virtual_account", label: "Virtual Account", icon: CreditCard },
  { value: "ewallet", label: "E-Wallet", icon: Wallet },
];

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("bank_transfer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const orderId = params.orderId as string;
  const { data: order, isLoading } = useSWR<Order>(
    `/orders/${orderId}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || isLoading) {
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
      <div className="section-padding text-center">
        <div className="max-content">
          <h1 className="text-section-heading text-text-primary mb-2">Pesanan tidak ditemukan</h1>
          <button
            onClick={() => router.back()}
            className="btn-secondary text-xs mt-6"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  if (order.status !== "pending_payment") {
    return (
      <div className="section-padding text-center">
        <div className="max-content">
          <h1 className="text-section-heading text-text-primary mb-2">Status Pesanan Tidak Valid</h1>
          <p className="text-body text-text-secondary mb-6">
            Pesanan ini sudah dibayar atau tidak memerlukan pembayaran.
          </p>
          <button
            onClick={() => router.push(`/orders/${order.id}`)}
            className="btn-secondary text-xs"
          >
            Lihat Pesanan
          </button>
        </div>
      </div>
    );
  }

  const handlePayment = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.post(`/orders/${order.id}/pay`, {
        payment_method: selectedMethod,
      });

      router.push(`/orders/${order.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Pembayaran gagal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="section-padding">
      <div className="max-content">
        <button
          onClick={() => router.back()}
          className="text-xs text-text-secondary hover:text-text-primary mb-8"
        >
          ← Kembali
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Left: Payment Methods */}
          <div className="md:col-span-2">
            <h1 className="text-section-heading text-text-primary mb-8">Pilih Metode Pembayaran</h1>

            {error && (
              <div className="mb-6 p-4 bg-accent-error/10 border border-accent-error rounded-input text-accent-error text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3 mb-8">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.value}
                    onClick={() => setSelectedMethod(method.value)}
                    className={`w-full border-2 rounded-card p-4 transition-colors flex items-center gap-4 ${
                      selectedMethod === method.value
                        ? "border-accent-primary bg-blue-50"
                        : "border-border hover:border-text-secondary"
                    }`}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center">
                      <Icon size={20} className="text-text-primary" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-text-primary">{method.label}</p>
                      <p className="text-xs text-text-secondary">
                        {method.value === "bank_transfer" && "Metode pembayaran melalui transfer bank"}
                        {method.value === "virtual_account" && "Metode pembayaran melalui virtual account"}
                        {method.value === "ewallet" && "Metode pembayaran melalui e-wallet"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="card-border p-6">
              <h3 className="text-base font-medium text-text-primary mb-4">Instruksi Pembayaran</h3>
              <div className="space-y-3 text-xs text-text-secondary">
                {selectedMethod === "bank_transfer" && (
                  <>
                    <p>1. Buka aplikasi perbankan Anda</p>
                    <p>2. Pilih menu "Transfer Antar Bank"</p>
                    <p>3. Masukkan nomor rekening tujuan</p>
                    <p>4. Masukkan jumlah sesuai dengan total pembayaran</p>
                    <p>5. Selesaikan transaksi dan simpan bukti pembayaran</p>
                  </>
                )}
                {selectedMethod === "virtual_account" && (
                  <>
                    <p>1. Pilih bank yang Anda gunakan</p>
                    <p>2. Kode virtual account akan ditampilkan</p>
                    <p>3. Lakukan transfer sesuai dengan nominal di atas</p>
                    <p>4. Pembayaran akan terverifikasi secara otomatis</p>
                  </>
                )}
                {selectedMethod === "ewallet" && (
                  <>
                    <p>1. Buka aplikasi e-wallet Anda</p>
                    <p>2. Pilih opsi pembayaran ke merchant</p>
                    <p>3. Masukkan nominal pembayaran</p>
                    <p>4. Verifikasi dan selesaikan transaksi</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div>
            <div className="card-border p-6 sticky top-20">
              <h3 className="text-base font-medium text-text-primary mb-6">Ringkasan Pesanan</h3>

              <div className="space-y-3 mb-6 pb-6 border-b border-border">
                <div>
                  <p className="text-xs text-text-secondary mb-1">ID Pesanan</p>
                  <p className="font-medium text-text-primary">#{order.id.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Tanggal</p>
                  <p className="font-medium text-text-primary">{formatDate(order.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Metode Pembayaran</p>
                  <p className="font-medium text-text-primary">
                    {paymentMethods.find((m) => m.value === selectedMethod)?.label}
                  </p>
                </div>
              </div>

              <div className="flex justify-between mb-6">
                <span className="font-medium text-text-primary">Total Pembayaran</span>
                <PriceDisplay amount={order.total_price} size="lg" />
              </div>

              <button
                onClick={handlePayment}
                disabled={isSubmitting}
                className="btn-primary w-full text-xs disabled:opacity-50 mb-3"
              >
                {isSubmitting ? "Memproses..." : "Lanjutkan Pembayaran"}
              </button>

              <button
                onClick={() => router.push(`/orders/${order.id}`)}
                className="btn-secondary w-full text-xs"
              >
                Batalkan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
