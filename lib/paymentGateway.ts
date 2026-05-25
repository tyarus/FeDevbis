import { PaymentMethod } from "@/types";

export interface MidtransCreateTransactionRequest {
  appOrderId: string;
  amount: number;
  paymentMethod: Exclude<PaymentMethod, "ewallet">;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  itemName?: string;
}

export interface MidtransCreateTransactionResponse {
  gateway_order_id: string;
  redirect_url: string;
  token?: string;
}

export interface MidtransStatusResponse {
  order_id?: string;
  transaction_id?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  status_code?: string;
  status_message?: string;
  gross_amount?: string;
}

export const shouldUsePaymentGateway = (method: PaymentMethod): boolean =>
  method !== "ewallet";

const SUCCESSFUL_STATUSES = new Set(["capture", "settlement"]);
const PENDING_STATUSES = new Set(["pending"]);
const FAILED_STATUSES = new Set(["deny", "cancel", "expire", "failure"]);

export const isMidtransPaidStatus = (
  transactionStatus?: string,
  fraudStatus?: string | null
): boolean => {
  if (!transactionStatus) return false;
  if (transactionStatus === "capture") {
    return !fraudStatus || fraudStatus === "accept";
  }
  return transactionStatus === "settlement";
};

export const isMidtransPendingStatus = (transactionStatus?: string): boolean =>
  Boolean(transactionStatus && PENDING_STATUSES.has(transactionStatus));

export const isMidtransFailedStatus = (transactionStatus?: string): boolean =>
  Boolean(transactionStatus && FAILED_STATUSES.has(transactionStatus));

export const getMidtransStatusLabel = (transactionStatus?: string): string => {
  if (!transactionStatus) return "unknown";
  if (SUCCESSFUL_STATUSES.has(transactionStatus)) return "paid";
  if (PENDING_STATUSES.has(transactionStatus)) return "pending";
  if (FAILED_STATUSES.has(transactionStatus)) return "failed";
  return "unknown";
};
