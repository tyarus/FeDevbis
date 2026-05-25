"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/api";
import {
  canFetchTransactionThread,
  getEffectiveOrderStatus,
  getEffectiveTransactionStatus,
  isChecklistCompleted,
} from "@/lib/orderStatus";
import { transactionChatAPI } from "@/lib/transactionChat";
import {
  WalletError,
  WalletWithdrawReceipt,
  WalletWithdrawMethod,
  walletAPI,
} from "@/lib/wallet";
import { useWalletOverview } from "@/lib/useWallet";
import { formatDate, formatRupiah } from "@/lib/utils";
import { Order, PaginatedResponse, TransactionStatus } from "@/types";
import { ArrowLeft, ReceiptText, Wallet, Landmark, AlertCircle } from "lucide-react";

const TOPUP_OPTIONS = [50000, 100000, 250000, 500000, 1000000];
const FETCH_PAGE_SIZE = 100;

type WithdrawMethodOption = {
  value: WalletWithdrawMethod;
  label: string;
  accountLabel: string;
  accountPlaceholder: string;
  providerLabel: string;
  providerPlaceholder: string;
  needsProviderName: boolean;
};

const WITHDRAW_METHOD_OPTIONS: WithdrawMethodOption[] = [
  {
    value: "bank_transfer",
    label: "Transfer Bank",
    accountLabel: "Nomor rekening",
    accountPlaceholder: "Contoh: 1234567890",
    providerLabel: "Nama bank",
    providerPlaceholder: "Contoh: BCA, BRI, Mandiri",
    needsProviderName: true,
  },
  {
    value: "gopay",
    label: "GoPay",
    accountLabel: "Nomor HP terdaftar",
    accountPlaceholder: "Contoh: 081234567890",
    providerLabel: "Penerima",
    providerPlaceholder: "GoPay",
    needsProviderName: false,
  },
  {
    value: "dana",
    label: "DANA",
    accountLabel: "Nomor HP terdaftar",
    accountPlaceholder: "Contoh: 081234567890",
    providerLabel: "Penerima",
    providerPlaceholder: "DANA",
    needsProviderName: false,
  },
  {
    value: "shopeepay",
    label: "ShopeePay",
    accountLabel: "Nomor HP terdaftar",
    accountPlaceholder: "Contoh: 081234567890",
    providerLabel: "Penerima",
    providerPlaceholder: "ShopeePay",
    needsProviderName: false,
  },
];

const WITHDRAW_METHOD_LABEL: Record<WalletWithdrawMethod, string> = {
  bank_transfer: "Transfer Bank",
  gopay: "GoPay",
  dana: "DANA",
  shopeepay: "ShopeePay",
};

const fetchOrdersPage = async (
  role: "buyer" | "seller",
  page: number
): Promise<PaginatedResponse<Order>> => {
  const endpoint =
    role === "seller"
      ? `/seller/orders?page=${page}&limit=${FETCH_PAGE_SIZE}`
      : `/orders?page=${page}&limit=${FETCH_PAGE_SIZE}`;
  const res = await apiClient.get(endpoint);

  return {
    data: res.data.data || [],
    pagination: res.data.pagination || {
      current_page: 1,
      total: 0,
      per_page: FETCH_PAGE_SIZE,
      last_page: 1,
    },
  };
};

const fetchAllOrdersForRole = async (role: "buyer" | "seller"): Promise<Order[]> => {
  const firstPage = await fetchOrdersPage(role, 1);
  const allOrders = [...firstPage.data];
  const lastPage = firstPage.pagination?.last_page || 1;

  if (lastPage <= 1) return allOrders;

  const nextPages: Array<Promise<PaginatedResponse<Order>>> = [];
  for (let page = 2; page <= lastPage; page += 1) {
    nextPages.push(fetchOrdersPage(role, page));
  }

  const pageResults = await Promise.all(nextPages);
  for (const result of pageResults) {
    allOrders.push(...result.data);
  }

  return allOrders;
};

export default function WalletPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [customTopup, setCustomTopup] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawMethod, setWithdrawMethod] = useState<WalletWithdrawMethod>("bank_transfer");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [latestReceipt, setLatestReceipt] = useState<WalletWithdrawReceipt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wallet = useWalletOverview(user);
  const { data: relatedOrders } = useSWR<Order[]>(
    user ? `wallet-orders-sync:${user.id}:${user.role}` : null,
    () => fetchAllOrdersForRole(user!.role),
    { revalidateOnFocus: false, revalidateOnMount: true }
  );
  const orderIdsKey = useMemo(
    () =>
      (relatedOrders || [])
        .map((order) => String(order.id))
        .sort()
        .join(","),
    [relatedOrders]
  );
  const { data: threadStatusMap } = useSWR<Record<string, TransactionStatus>>(
    orderIdsKey ? `wallet-thread-status:${orderIdsKey}` : null,
    async () => {
      const entries = await Promise.all(
        (relatedOrders || []).map(async (order) => {
          if (!canFetchTransactionThread(order.status)) {
            return [String(order.id), order.transaction_status || "chat_open"] as const;
          }

          try {
            const thread = await transactionChatAPI.getThread(String(order.id));
            const checklistDone = isChecklistCompleted(thread.checklist);
            const status = checklistDone ? "completed" : thread.status;
            return [String(order.id), status] as const;
          } catch {
            return [String(order.id), order.transaction_status || "chat_open"] as const;
          }
        })
      );

      return Object.fromEntries(entries);
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      refreshInterval: 6000,
    }
  );

  const topupFromInput = useMemo(() => {
    const parsed = Number(customTopup.replace(/[^0-9]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }, [customTopup]);

  const selectedWithdrawMethod = useMemo(
    () =>
      WITHDRAW_METHOD_OPTIONS.find((option) => option.value === withdrawMethod) ||
      WITHDRAW_METHOD_OPTIONS[0],
    [withdrawMethod]
  );

  useEffect(() => {
    if (!relatedOrders || relatedOrders.length === 0) return;

    walletAPI.syncOrders(
      relatedOrders.map((order) => {
        const mappedTransactionStatus = getEffectiveTransactionStatus(
          order,
          threadStatusMap?.[String(order.id)]
        );
        const mappedOrderStatus = getEffectiveOrderStatus(order, mappedTransactionStatus);

        return {
          id: order.id,
          buyer_id: order.buyer_id,
          seller_id: order.seller_id,
          total_price: order.total_price,
          status: mappedOrderStatus,
          transaction_status: mappedTransactionStatus,
        };
      })
    );
  }, [relatedOrders, threadStatusMap]);

  if (!user || !wallet) {
    return (
      <div className="section-padding">
        <div className="max-content text-center">
          <p className="text-sm text-text-secondary mb-6">Akses wallet membutuhkan login.</p>
          <button onClick={() => router.push("/login")} className="btn-primary text-xs">
            Masuk
          </button>
        </div>
      </div>
    );
  }

  const clearNotice = () => {
    setError(null);
    setSuccess(null);
  };

  const handleTopup = (amount: number) => {
    clearNotice();
    try {
      walletAPI.topUpBuyer(user, amount);
      setCustomTopup("");
      setSuccess(`Top up berhasil. Saldo bertambah ${formatRupiah(amount)}.`);
    } catch (errorValue) {
      const message =
        errorValue instanceof WalletError
          ? errorValue.message
          : "Top up gagal diproses.";
      setError(message);
    }
  };

  const handleWithdraw = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearNotice();
    setIsSubmitting(true);

    try {
      const parsedAmount = Number(withdrawAmount.replace(/[^0-9]/g, ""));
      const normalizedProviderName = selectedWithdrawMethod.needsProviderName
        ? bankName
        : WITHDRAW_METHOD_LABEL[withdrawMethod];
      const result = walletAPI.withdrawSeller(user, {
        amount: parsedAmount,
        withdraw_method: withdrawMethod,
        bank_name: normalizedProviderName,
        account_name: accountName,
        account_number: accountNumber,
      });
      setLatestReceipt(result.receipt);
      setWithdrawAmount("");
      setBankName("");
      setAccountName("");
      setAccountNumber("");
      setSuccess(
        `Withdraw berhasil. Bukti transaksi ${result.receipt.reference_number} telah dibuat.`
      );
    } catch (errorValue) {
      const message =
        errorValue instanceof WalletError
          ? errorValue.message
          : "Withdraw gagal diproses.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="section-padding">
      <div className="max-content space-y-6">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft size={14} />
            Kembali
          </button>
          <Link href={user.role === "seller" ? "/seller/orders" : "/orders"} className="btn-secondary text-xs">
            Lihat Pesanan
          </Link>
        </div>

        <div className="card-border bg-white p-6">
          <p className="text-xs text-text-secondary mb-2">Wallet {user.role === "buyer" ? "Buyer" : "Seller"}</p>
          <h1 className="text-2xl font-bold text-text-primary">Saldo Tersedia</h1>
          <p className="text-3xl font-bold text-accent-primary mt-2">
            {formatRupiah(wallet.account.available_balance)}
          </p>
          <p className="text-xs text-text-secondary mt-2">
            Dana ditahan escrow:{" "}
            {formatRupiah(
              user.role === "buyer"
                ? wallet.held_amount_as_buyer
                : wallet.held_amount_as_seller
            )}
          </p>
        </div>

        {error && (
          <div className="card-border p-4 bg-red-50 border-red-200 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {success && (
          <div className="card-border p-4 bg-green-50 border-green-200 text-green-700 text-sm">
            {success}
          </div>
        )}

        {user.role === "buyer" && (
          <section className="card-border bg-white p-6">
            <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Wallet size={16} />
              Top Up Simulasi
            </h2>
            <p className="text-xs text-text-secondary mb-4">
              Top up ini bersifat dummy, saldo langsung bertambah tanpa payment gateway.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
              {TOPUP_OPTIONS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => handleTopup(amount)}
                  className="btn-secondary text-xs"
                >
                  +{formatRupiah(amount)}
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customTopup}
                onChange={(event) => setCustomTopup(event.target.value)}
                placeholder="Nominal custom (angka saja)"
                className="input-base w-full text-sm"
              />
              <button
                type="button"
                onClick={() => handleTopup(topupFromInput)}
                className="btn-primary text-xs whitespace-nowrap"
              >
                Top Up Sekarang
              </button>
            </div>
          </section>
        )}

        {user.role === "seller" && (
          <section className="card-border bg-white p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-text-primary mb-1 flex items-center gap-2">
                <Landmark size={16} />
                Withdraw Simulasi
              </h2>
              <p className="text-xs text-text-secondary">
                Saldo seller akan langsung berkurang dan sistem membuat struk withdraw.
              </p>
            </div>

            <form className="space-y-3" onSubmit={handleWithdraw}>
              <input
                type="text"
                value={withdrawAmount}
                onChange={(event) => setWithdrawAmount(event.target.value)}
                placeholder="Nominal withdraw"
                className="input-base w-full text-sm"
              />
              <select
                value={withdrawMethod}
                onChange={(event) => setWithdrawMethod(event.target.value as WalletWithdrawMethod)}
                className="input-base w-full text-sm"
              >
                {WITHDRAW_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {selectedWithdrawMethod.needsProviderName && (
                <input
                  type="text"
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                  placeholder={selectedWithdrawMethod.providerPlaceholder}
                  className="input-base w-full text-sm"
                />
              )}
              <input
                type="text"
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
                placeholder="Nama pemilik akun"
                className="input-base w-full text-sm"
              />
              <input
                type="text"
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
                placeholder={selectedWithdrawMethod.accountPlaceholder}
                className="input-base w-full text-sm"
              />
              <button type="submit" disabled={isSubmitting} className="btn-primary text-xs w-full">
                {isSubmitting ? "Memproses..." : "Tarik Saldo"}
              </button>
            </form>

            {latestReceipt && (
              <div className="card-border bg-slate-50 p-4 border-slate-200">
                <p className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-2">
                  <ReceiptText size={14} />
                  Bukti Withdraw
                </p>
                <div className="space-y-1 text-xs text-text-secondary">
                  <p>Ref: {latestReceipt.reference_number}</p>
                  <p>Nominal: {formatRupiah(latestReceipt.amount)}</p>
                  <p>Metode: {WITHDRAW_METHOD_LABEL[latestReceipt.withdraw_method || "bank_transfer"]}</p>
                  <p>Bank: {latestReceipt.bank_name}</p>
                  <p>Rekening: {latestReceipt.account_number}</p>
                  <p>Nama: {latestReceipt.account_name}</p>
                  <p>Waktu: {formatDate(latestReceipt.created_at)}</p>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="card-border bg-white p-6">
          <h2 className="text-base font-semibold text-text-primary mb-4">Riwayat Wallet</h2>
          {wallet.ledger.length === 0 ? (
            <p className="text-xs text-text-secondary">Belum ada transaksi wallet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-xs text-text-secondary">Waktu</th>
                    <th className="text-left py-2 text-xs text-text-secondary">Aktivitas</th>
                    <th className="text-right py-2 text-xs text-text-secondary">Nominal</th>
                    <th className="text-right py-2 text-xs text-text-secondary">Saldo Akhir</th>
                  </tr>
                </thead>
                <tbody>
                  {wallet.ledger.slice(0, 10).map((entry) => (
                    <tr key={entry.id} className="border-b border-border">
                      <td className="py-2 text-xs text-text-secondary">
                        {formatDate(entry.created_at)}
                      </td>
                      <td className="py-2 text-xs text-text-primary">{entry.description}</td>
                      <td
                        className={`py-2 text-xs text-right font-semibold ${
                          entry.direction === "credit" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {entry.direction === "credit" ? "+" : "-"}
                        {formatRupiah(entry.amount)}
                      </td>
                      <td className="py-2 text-xs text-right text-text-primary">
                        {formatRupiah(entry.balance_after)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
