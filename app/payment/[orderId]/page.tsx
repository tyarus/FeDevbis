"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { Order, PaymentMethod } from "@/types";
import { LoadingSkeleton, PriceDisplay, PaymentSuccessModal } from "@/components";
import { formatDate, formatShortId } from "@/lib/utils";
import { 
  CreditCard, 
  Banknote, 
  Wallet, 
  CheckCircle2, 
  AlertCircle,
  Shield,
  ArrowRight
} from "lucide-react";

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data.data);

const paymentMethods: { 
  value: PaymentMethod; 
  label: string; 
  icon: typeof CreditCard;
  description: string;
  processingTime: string;
}[] = [
  { 
    value: "bank_transfer", 
    label: "Transfer Bank", 
    icon: Banknote,
    description: "Transfer langsung dari rekening bank Anda",
    processingTime: "1-2 jam"
  },
  { 
    value: "virtual_account", 
    label: "Virtual Account", 
    icon: CreditCard,
    description: "Pembayaran otomatis melalui virtual account",
    processingTime: "Instant"
  },
  { 
    value: "ewallet", 
    label: "E-Wallet", 
    icon: Wallet,
    description: "Bayar menggunakan aplikasi e-wallet favorit Anda",
    processingTime: "Instant"
  },
];

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("bank_transfer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

      setShowSuccess(true);
      setTimeout(() => {
        router.push(`/orders/${order.id}`);
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Pembayaran gagal");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {showSuccess && (
        <PaymentSuccessModal
          orderId={order.id}
          amount={order.total_price}
          onClose={() => router.push(`/orders/${order.id}`)}
        />
      )}
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <div className="section-padding">
          <div className="max-content">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary mb-8 transition-colors"
          >
            <span>←</span> Kembali
          </button>

          {/* Progress Indicator */}
          <div className="mb-12 flex items-center justify-between max-w-md">
            <div className="flex flex-col items-center flex-1">
              <div className="w-8 h-8 rounded-full bg-accent-primary text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                1
              </div>
              <p className="text-xs text-text-secondary mt-2">Pilih Metode</p>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 mx-2 mt-1"></div>
            <div className="flex flex-col items-center flex-1">
              <div className="w-8 h-8 rounded-full bg-gray-200 text-text-secondary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                2
              </div>
              <p className="text-xs text-text-secondary mt-2">Bayar</p>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 mx-2 mt-1"></div>
            <div className="flex flex-col items-center flex-1">
              <div className="w-8 h-8 rounded-full bg-gray-200 text-text-secondary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                3
              </div>
              <p className="text-xs text-text-secondary mt-2">Selesai</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Left: Payment Methods */}
            <div className="lg:col-span-2">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-text-primary mb-2">Pilih Metode Pembayaran</h1>
                <p className="text-sm text-text-secondary">Semua transaksi dijamin aman dengan enkripsi SSL</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                  <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Payment Methods Grid */}
              <div className="space-y-3 mb-8">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = selectedMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      onClick={() => setSelectedMethod(method.value)}
                      className={`w-full rounded-lg p-4 transition-all duration-200 border-2 group ${
                        isSelected
                          ? "border-accent-primary bg-blue-50 shadow-md"
                          : "border-gray-200 bg-white hover:border-accent-primary hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-accent-primary text-white"
                            : "bg-gray-100 text-text-secondary group-hover:bg-accent-primary group-hover:text-white"
                        }`}>
                          <Icon size={24} />
                        </div>

                        {/* Content */}
                        <div className="text-left flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-text-primary">{method.label}</p>
                            {isSelected && (
                              <CheckCircle2 size={18} className="text-accent-primary flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-text-secondary mt-1">{method.description}</p>
                          <p className="text-xs text-accent-primary font-medium mt-2">
                            Diproses dalam {method.processingTime}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Payment Instructions */}
              <div className="card-border bg-white p-6 rounded-lg">
                <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Shield size={18} className="text-accent-primary" />
                  Langkah-langkah Pembayaran
                </h3>
                <div className="space-y-4">
                  {selectedMethod === "bank_transfer" && (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-primary text-white flex items-center justify-center text-xs font-semibold">1</div>
                        <p className="text-sm text-text-secondary">Buka aplikasi perbankan Anda</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-primary text-white flex items-center justify-center text-xs font-semibold">2</div>
                        <p className="text-sm text-text-secondary">Pilih menu Transfer Antar Bank</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-primary text-white flex items-center justify-center text-xs font-semibold">3</div>
                        <p className="text-sm text-text-secondary">Masukkan nomor rekening tujuan dan nominal</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-primary text-white flex items-center justify-center text-xs font-semibold">4</div>
                        <p className="text-sm text-text-secondary">Konfirmasi transaksi</p>
                      </div>
                    </div>
                  )}
                  {selectedMethod === "virtual_account" && (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-primary text-white flex items-center justify-center text-xs font-semibold">1</div>
                        <p className="text-sm text-text-secondary">Pilih bank yang Anda gunakan</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-primary text-white flex items-center justify-center text-xs font-semibold">2</div>
                        <p className="text-sm text-text-secondary">Nomor Virtual Account akan ditampilkan</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-primary text-white flex items-center justify-center text-xs font-semibold">3</div>
                        <p className="text-sm text-text-secondary">Transfer sesuai dengan nominal</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-primary text-white flex items-center justify-center text-xs font-semibold">4</div>
                        <p className="text-sm text-text-secondary">Pembayaran terverifikasi secara otomatis</p>
                      </div>
                    </div>
                  )}
                  {selectedMethod === "ewallet" && (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-primary text-white flex items-center justify-center text-xs font-semibold">1</div>
                        <p className="text-sm text-text-secondary">Buka aplikasi e-wallet Anda</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-primary text-white flex items-center justify-center text-xs font-semibold">2</div>
                        <p className="text-sm text-text-secondary">Pilih opsi pembayaran ke merchant</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-primary text-white flex items-center justify-center text-xs font-semibold">3</div>
                        <p className="text-sm text-text-secondary">Masukkan nominal pembayaran</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-primary text-white flex items-center justify-center text-xs font-semibold">4</div>
                        <p className="text-sm text-text-secondary">Verifikasi dan selesaikan transaksi</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-1">
              <div className="card-border bg-white p-6 rounded-lg sticky top-20">
                <h3 className="text-lg font-semibold text-text-primary mb-6">Ringkasan Pesanan</h3>

                {/* Order Details */}
                <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
                  <div>
                    <p className="text-xs text-text-secondary mb-1">ID Pesanan</p>
                    <p className="font-semibold text-text-primary">#{formatShortId(order.id)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Tanggal Pesanan</p>
                    <p className="font-semibold text-text-primary">{formatDate(order.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Metode Pembayaran</p>
                    <p className="font-semibold text-accent-primary">
                      {paymentMethods.find((m) => m.value === selectedMethod)?.label}
                    </p>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Subtotal</span>
                    <span className="text-sm font-medium text-text-primary">
                      <PriceDisplay amount={order.total_price} size="sm" />
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Biaya Layanan</span>
                    <span className="text-sm font-medium text-text-primary">Gratis</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="font-semibold text-text-primary">Total</span>
                    <span className="font-bold text-lg text-accent-primary">
                      <PriceDisplay amount={order.total_price} size="lg" />
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <button
                  onClick={handlePayment}
                  disabled={isSubmitting}
                  className="btn-primary w-full text-sm font-medium disabled:opacity-50 mb-3 flex items-center justify-center gap-2 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Memproses...
                    </>
                  ) : (
                    <>
                      Lanjutkan Pembayaran
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <button
                  onClick={() => router.push(`/orders/${order.id}`)}
                  className="btn-secondary w-full text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  Batalkan
                </button>

                {/* Security Badge */}
                <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <Shield size={16} className="text-green-600 flex-shrink-0" />
                  <p className="text-xs text-green-700">Transaksi aman dengan enkripsi SSL</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
