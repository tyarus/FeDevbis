import { Order, OrderStatus, TransactionChecklist, TransactionStatus } from "@/types";

const THREAD_ELIGIBLE_ORDER_STATUSES = new Set<OrderStatus>([
  "paid",
  "processing",
  "shipped",
  "delivered",
  "completed",
]);

export const canFetchTransactionThread = (status?: OrderStatus): boolean =>
  Boolean(status && THREAD_ELIGIBLE_ORDER_STATUSES.has(status));

export const isChecklistCompleted = (
  checklist?: Partial<TransactionChecklist> | null
): boolean =>
  Boolean(
    checklist?.account_match &&
      checklist?.account_secured &&
      checklist?.seller_device_removed &&
      checklist?.completion_code_verified
  );

export const getEffectiveTransactionStatus = (
  order: Pick<Order, "transaction_status">,
  threadStatus?: TransactionStatus
): TransactionStatus | undefined => {
  if (threadStatus === "completed") {
    return "completed";
  }

  return threadStatus || order.transaction_status;
};

export const getEffectiveOrderStatus = (
  order: Pick<Order, "status">,
  transactionStatus?: TransactionStatus
): OrderStatus => (transactionStatus === "completed" ? "completed" : order.status);
