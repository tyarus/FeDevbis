"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { WalletError, walletAPI } from "@/lib/wallet";
import { useWalletOverview } from "@/lib/useWallet";
import { useAuthStore } from "@/store/authStore";
import { Order, PaymentMethod } from "@/types";
import { LoadingSkeleton, PaymentSuccessModal, PriceDisplay } from "@/components";
import { formatDate, formatRupiah, formatShortId } from "@/lib/utils";
import {
  isMidtransFailedStatus,
  isMidtransPaidStatus,
  isMidtransPendingStatus,
  MidtransCreateTransactionResponse,
  MidtransStatusResponse,
  shouldUsePaymentGateway,
} from "@/lib/paymentGateway";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  CreditCard,
  Shield,
  Wallet,
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
    label: "Transfer Bank (Midtrans)",
    icon: Banknote,
    description: "Bayar via payment gateway Midtrans",
    processingTime: "Ikuti instruksi Midtrans",
  },
  {
    value: "virtual_account",
    label: "Virtual Account (Midtrans)",
    icon: CreditCard,
    description: "VA otomatis dari payment gateway Midtrans",
    processingTime: "Nomor VA dibuat otomatis",
  },
  {
    value: "ewallet",
    label: "Crowalet",
    icon: Wallet,
    description: "Bayar menggunakan saldo Crowalet Anda",
    processingTime: "Instant",
  },
];

const isGatewayMethod = (
  method: string | null
): method is Exclude<PaymentMethod, "ewallet"> =>
  method === "bank_transfer" || method === "virtual_account";

const isPaidStatus = (status?: string): boolean =>
  status ? ["paid", "processing", "shipped", "delivered", "completed"].includes(status) : false;

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const [userSelectedMethod, setUserSelectedMethod] =
    useState<PaymentMethod>("bank_transfer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingGateway, setIsVerifyingGateway] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gatewayInfo, setGatewayInfo] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const processedGatewayKeyRef = useRef<string | null>(null);

  const orderId = params.orderId as string;
  const { data: order, isLoading } = useSWR<Order>(
    `/orders/${orderId}`,
    fetcher,
    { revalidateOnFocus: false }
  );
  const wallet = useWalletOverview(user);

  const gatewayMethodFromUrl = useMemo(() => {
    const paymentMethod = searchParams.get("paymentMethod");
    return isGatewayMethod(paymentMethod) ? paymentMethod : null;
  }, [searchParams]);

  const selectedMethod: PaymentMethod = gatewayMethodFromUrl || userSelectedMethod;
  const buyerBalance = wallet?.account.available_balance || 0;
  const isCrowaletMethod = selectedMethod === "ewallet";
  const useGateway = shouldUsePaymentGateway(selectedMethod);
  const isBalanceInsufficient = isCrowaletMethod && buyerBalance < (order?.total_price || 0);

  const showSuccessAndRedirect = useCallback(
    (targetOrderId: string | number) => {
      setShowSuccess(true);
      setTimeout(() => {
        router.push(`/orders/${targetOrderId}/transaction`);
      }, 3000);
    },
    [router]
  );

  const markOrderAsPaid = useCallback(
    async (method: PaymentMethod) => {
      if (!order) return;

      await apiClient.post(`/orders/${order.id}/pay`, {
        payment_method: method,
        use_wallet: method === "ewallet",
        wallet_channel: method === "ewallet" ? "crowalet" : null,
      });

      if (method === "ewallet") {
        walletAPI.holdFundsForOrder({
          id: order.id,
          buyer_id: order.buyer_id,
          seller_id: order.seller_id,
          total_price: order.total_price,
        });
      }
    },
    [order]
  );

  useEffect(() => {
    if (!order || order.status !== "pending_payment") return;

    const gateway = searchParams.get("gateway");
    const result = searchParams.get("result");
    const gatewayOrderId = searchParams.get("gatewayOrderId");

    if (gateway !== "midtrans" || !gatewayOrderId) return;

    const processKey = `${gatewayOrderId}:${result || "unknown"}`;
    if (processedGatewayKeyRef.current === processKey) return;
    processedGatewayKeyRef.current = processKey;

    const verifyGatewayResult = async () => {
      setError(null);

      if (result === "unfinish") {
        setGatewayInfo("Pembayaran belum diselesaikan. Silakan lanjutkan lagi dari tombol pembayaran.");
        return;
      }

      if (result === "error") {
        setError("Terjadi kendala saat proses pembayaran di gateway.");
        return;
      }

      try {
        setIsVerifyingGateway(true);

        const statusResponse = await fetch("/api/payment-gateway/midtrans/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gatewayOrderId }),
        });
        const statusBody = await statusResponse.json();

        if (!statusResponse.ok || !statusBody?.success) {
          throw new Error(
            statusBody?.message || "Tidak bisa memverifikasi status transaksi gateway."
          );
        }

        const midtransStatus = statusBody.data as MidtransStatusResponse;
        const transactionStatus = midtransStatus.transaction_status;

        if (isMidtransPaidStatus(transactionStatus, midtransStatus.fraud_status)) {
          await markOrderAsPaid(gatewayMethodFromUrl || "bank_transfer");
          showSuccessAndRedirect(order.id);
          return;
        }

        if (isMidtransPendingStatus(transactionStatus)) {
          setGatewayInfo(
            "Pembayaran sudah dibuat dan menunggu dana masuk. Setelah pembayaran tervalidasi, status order akan otomatis berubah."
          );
          return;
        }

        if (isMidtransFailedStatus(transactionStatus)) {
          throw new Error(
            `Pembayaran gagal (${transactionStatus}). Coba metode lain atau ulangi pembayaran.`
          );
        }

        setGatewayInfo("Status pembayaran belum final. Silakan cek ulang beberapa saat lagi.");
      } catch (errorValue) {
        const message =
          errorValue instanceof Error
            ? errorValue.message
            : "Verifikasi pembayaran gateway gagal.";
        setError(message);
      } finally {
        setIsVerifyingGateway(false);
      }
    };

    void verifyGatewayResult();
  }, [
    gatewayMethodFromUrl,
    markOrderAsPaid,
    order,
    searchParams,
    showSuccessAndRedirect,
  ]);

  const handleGatewayPayment = async () => {
    if (!order) return;

    if (!user) {
      throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");
    }

    const paymentMethod = selectedMethod;
    if (!isGatewayMethod(paymentMethod)) {
      throw new Error("Metode payment gateway tidak valid.");
    }

    const response = await fetch("/api/payment-gateway/midtrans/snap-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appOrderId: String(order.id),
        amount: order.total_price,
        paymentMethod,
        customer: {
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
        itemName: order.product?.name || `Order #${formatShortId(order.id)}`,
      }),
    });

    const body = await response.json();

    if (!response.ok || !body?.success || !body?.data?.redirect_url) {
      throw new Error(body?.message || "Gagal membuat transaksi gateway.");
    }

    const gatewayData = body.data as MidtransCreateTransactionResponse;
    window.location.href = gatewayData.redirect_url;
  };

  const handleCrowaletPayment = async () => {
    if (!order) return;

    if (!user || user.role !== "buyer") {
      throw new WalletError("Pembayaran Crowalet hanya tersedia untuk akun buyer.");
    }

    if (isBalanceInsufficient) {
      throw new WalletError(
        `Saldo Crowalet tidak mencukupi. Butuh ${formatRupiah(order.total_price)}, saldo Anda ${formatRupiah(
          buyerBalance
        )}.`
      );
    }

    await markOrderAsPaid("ewallet");
    showSuccessAndRedirect(order.id);
  };

  const handlePayment = async () => {
    setIsSubmitting(true);
    setError(null);
    setGatewayInfo(null);

    try {
      if (useGateway) {
        await handleGatewayPayment();
        return;
      }

      await handleCrowaletPayment();
    } catch (errorValue: unknown) {
      const maybeError = errorValue as { response?: { data?: { message?: string } } };
      const message =
        errorValue instanceof WalletError
          ? errorValue.message
          : maybeError.response?.data?.message ||
            (errorValue instanceof Error ? errorValue.message : "Pembayaran gagal");
      setError(message);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
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
          <button onClick={() => router.back()} className="btn-secondary text-xs mt-6">
            Kembali
          </button>
        </div>
      </div>
    );
  }

  if (order.status !== "pending_payment") {
    const canOpenTransaction = isPaidStatus(order.status);

    return (
      <div className="section-padding text-center">
        <div className="max-content">
          <h1 className="text-section-heading text-text-primary mb-2">Status Pesanan Tidak Valid</h1>
          <p className="text-body text-text-secondary mb-6">
            Pesanan ini sudah dibayar atau tidak memerlukan pembayaran.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => router.push(`/orders/${order.id}`)}
              className="btn-secondary text-xs"
            >
              Lihat Pesanan
            </button>
            {canOpenTransaction && (
              <button
                onClick={() => router.push(`/orders/${order.id}/transaction`)}
                className="btn-primary text-xs"
              >
                Buka Chat Transaksi
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showSuccess && (
        <PaymentSuccessModal
          orderId={order.id}
          amount={order.total_price}
          onClose={() => router.push(`/orders/${order.id}/transaction`)}
        />
      )}
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <div className="section-padding">
          <div className="max-content">
            <button
              onClick={() => router.back()}
              className="group flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary mb-8 transition-colors"
            >
              <span>{"<-"}</span> Kembali
            </button>

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
              <div className="lg:col-span-2">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-text-primary mb-2">
                    Pilih Metode Pembayaran
                  </h1>
                  <p className="text-sm text-text-secondary">
                    Transfer Bank dan VA diproses oleh Midtrans, Crowalet tetap escrow internal.
                  </p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {gatewayInfo && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">{gatewayInfo}</p>
                  </div>
                )}

                <div className="space-y-3 mb-8">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    const isSelected = selectedMethod === method.value;
                    return (
                      <button
                        key={method.value}
                        onClick={() => setUserSelectedMethod(method.value)}
                        className={`w-full rounded-lg p-4 transition-all duration-200 border-2 group ${
                          isSelected
                            ? "border-accent-primary bg-blue-50 shadow-md"
                            : "border-gray-200 bg-white hover:border-accent-primary hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-accent-primary text-white"
                                : "bg-gray-100 text-text-secondary group-hover:bg-accent-primary group-hover:text-white"
                            }`}
                          >
                            <Icon size={24} />
                          </div>

                          <div className="text-left flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-text-primary">{method.label}</p>
                              {isSelected && (
                                <CheckCircle2 size={18} className="text-accent-primary flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-text-secondary mt-1">{method.description}</p>
                            <p className="text-xs text-accent-primary font-medium mt-2">
                              {method.processingTime}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="card-border bg-white p-6 rounded-lg">
                  <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <Shield size={18} className="text-accent-primary" />
                    Langkah-langkah Pembayaran
                  </h3>
                  <div className="space-y-4">
                    {useGateway && (
                      <div className="space-y-3">
                        <p className="text-sm text-text-secondary">
                          1. Klik tombol pembayaran untuk diarahkan ke halaman Midtrans.
                        </p>
                        <p className="text-sm text-text-secondary">
                          2. Pilih bank/VA yang tersedia dan ikuti instruksi pembayaran.
                        </p>
                        <p className="text-sm text-text-secondary">
                          3. Setelah selesai, Anda akan kembali ke halaman ini untuk verifikasi status.
                        </p>
                      </div>
                    )}
                    {selectedMethod === "ewallet" && (
                      <div className="space-y-3">
                        <p className="text-sm text-text-secondary">
                          1. Pastikan saldo Crowalet Anda mencukupi total pembayaran.
                        </p>
                        <p className="text-sm text-text-secondary">
                          2. Klik lanjutkan pembayaran untuk memotong saldo buyer.
                        </p>
                        <p className="text-sm text-text-secondary">
                          3. Dana akan ditahan di escrow sampai transaksi selesai.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="card-border bg-white p-6 rounded-lg sticky top-20">
                  <h3 className="text-lg font-semibold text-text-primary mb-6">Ringkasan Pesanan</h3>

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

                  {isCrowaletMethod ? (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-700 mb-1">Saldo Crowalet Anda</p>
                      <p className="text-sm font-semibold text-blue-900">{formatRupiah(buyerBalance)}</p>
                    </div>
                  ) : (
                    <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="text-xs text-slate-700">Pembayaran diproses oleh Midtrans.</p>
                    </div>
                  )}

                  {isCrowaletMethod && isBalanceInsufficient && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs text-red-700 mb-2">
                        Saldo Crowalet kurang untuk membayar pesanan ini.
                      </p>
                      <button
                        onClick={() => router.push("/wallet")}
                        className="text-xs font-semibold text-red-700 hover:underline"
                      >
                        Top up dulu di Crowalet
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handlePayment}
                    disabled={isSubmitting || isVerifyingGateway || isBalanceInsufficient}
                    className="btn-primary w-full text-sm font-medium disabled:opacity-50 mb-3 flex items-center justify-center gap-2 transition-all"
                  >
                    {isSubmitting || isVerifyingGateway ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Memproses...
                      </>
                    ) : (
                      <>
                        {useGateway ? "Bayar via Midtrans" : "Lanjutkan Pembayaran"}
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
