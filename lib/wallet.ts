import { Order, User } from "@/types";

export type WalletRole = "buyer" | "seller";
export type WalletWithdrawMethod =
  | "bank_transfer"
  | "gopay"
  | "dana"
  | "shopeepay";

export type WalletLedgerType =
  | "topup"
  | "order_hold"
  | "order_release"
  | "order_refund"
  | "withdraw";

export interface WalletAccount {
  user_id: string;
  role: WalletRole;
  available_balance: number;
  total_topup: number;
  total_sales: number;
  total_withdraw: number;
  total_refund: number;
  created_at: string;
  updated_at: string;
}

export interface WalletEscrowRecord {
  order_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: "held" | "released" | "refunded";
  funding_source: "wallet" | "gateway";
  created_at: string;
  updated_at: string;
  released_at?: string | null;
  refunded_at?: string | null;
}

export interface WalletLedgerEntry {
  id: string;
  user_id: string;
  role: WalletRole;
  type: WalletLedgerType;
  direction: "credit" | "debit";
  amount: number;
  balance_after: number;
  description: string;
  order_id?: string;
  created_at: string;
}

export interface WalletWithdrawReceipt {
  id: string;
  seller_id: string;
  amount: number;
  withdraw_method: WalletWithdrawMethod;
  bank_name: string;
  account_name: string;
  account_number: string;
  reference_number: string;
  created_at: string;
}

export interface WalletOverview {
  account: WalletAccount;
  held_amount_as_buyer: number;
  held_amount_as_seller: number;
  escrows: WalletEscrowRecord[];
  ledger: WalletLedgerEntry[];
  withdrawals: WalletWithdrawReceipt[];
}

interface WalletState {
  accounts: Record<string, WalletAccount>;
  escrows: Record<string, WalletEscrowRecord>;
  ledger: WalletLedgerEntry[];
  withdrawals: WalletWithdrawReceipt[];
}

interface OrderWalletContext {
  id: string | number;
  buyer_id: string | number;
  seller_id: string | number;
  total_price: number;
  status?: Order["status"];
  transaction_status?: Order["transaction_status"];
}

interface WithdrawPayload {
  amount: number;
  withdraw_method?: WalletWithdrawMethod;
  bank_name: string;
  account_name: string;
  account_number: string;
}

const STORAGE_NAMESPACE = "escrow_wallet_v1";
const STORAGE_KEYS = {
  accounts: `${STORAGE_NAMESPACE}:accounts`,
  escrows: `${STORAGE_NAMESPACE}:escrows`,
  ledger: `${STORAGE_NAMESPACE}:ledger`,
  withdrawals: `${STORAGE_NAMESPACE}:withdrawals`,
} as const;
const WALLET_UPDATED_EVENT = "wallet:updated";

const DEFAULT_STATE: WalletState = {
  accounts: {},
  escrows: {},
  ledger: [],
  withdrawals: [],
};

const nowISO = (): string => new Date().toISOString();

const toComparableId = (value: string | number | undefined): string =>
  String(value ?? "");

const toPositiveInteger = (value: number): number =>
  Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));

const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const SETTLED_ORDER_STATUSES = new Set<Order["status"]>([
  "paid",
  "processing",
  "shipped",
  "delivered",
  "completed",
]);

const WITHDRAW_METHOD_LABEL: Record<WalletWithdrawMethod, string> = {
  bank_transfer: "Bank Transfer",
  gopay: "GoPay",
  dana: "DANA",
  shopeepay: "ShopeePay",
};

const createWalletAccount = (userId: string, role: WalletRole): WalletAccount => {
  const createdAt = nowISO();
  return {
    user_id: userId,
    role,
    available_balance: 0,
    total_topup: 0,
    total_sales: 0,
    total_withdraw: 0,
    total_refund: 0,
    created_at: createdAt,
    updated_at: createdAt,
  };
};

const parseJSON = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const canUseStorage = (): boolean => typeof window !== "undefined";

const emitWalletUpdated = () => {
  if (!canUseStorage()) return;
  window.dispatchEvent(new CustomEvent(WALLET_UPDATED_EVENT));
};

const readState = (): WalletState => {
  if (!canUseStorage()) return DEFAULT_STATE;

  return {
    accounts: parseJSON(localStorage.getItem(STORAGE_KEYS.accounts), {}),
    escrows: parseJSON(localStorage.getItem(STORAGE_KEYS.escrows), {}),
    ledger: parseJSON(localStorage.getItem(STORAGE_KEYS.ledger), []),
    withdrawals: parseJSON(localStorage.getItem(STORAGE_KEYS.withdrawals), []),
  };
};

const writeState = (state: WalletState): void => {
  if (!canUseStorage()) return;

  localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(state.accounts));
  localStorage.setItem(STORAGE_KEYS.escrows, JSON.stringify(state.escrows));
  localStorage.setItem(STORAGE_KEYS.ledger, JSON.stringify(state.ledger));
  localStorage.setItem(STORAGE_KEYS.withdrawals, JSON.stringify(state.withdrawals));
  emitWalletUpdated();
};

const getOrCreateAccount = (
  state: WalletState,
  userId: string,
  role: WalletRole
): WalletAccount => {
  const existing = state.accounts[userId];
  if (existing) return existing;

  const created = createWalletAccount(userId, role);
  state.accounts[userId] = created;
  return created;
};

const appendLedgerEntry = (
  state: WalletState,
  entry: Omit<WalletLedgerEntry, "id" | "created_at">
) => {
  state.ledger.unshift({
    ...entry,
    id: generateId("wtx"),
    created_at: nowISO(),
  });
};

const buildEscrowRecord = (
  orderId: string,
  buyerId: string,
  sellerId: string,
  amount: number,
  fundingSource: WalletEscrowRecord["funding_source"]
): WalletEscrowRecord => {
  const createdAt = nowISO();
  return {
    order_id: orderId,
    buyer_id: buyerId,
    seller_id: sellerId,
    amount,
    status: "held",
    funding_source: fundingSource,
    created_at: createdAt,
    updated_at: createdAt,
    released_at: null,
    refunded_at: null,
  };
};

const getEscrowCollectionsByUser = (state: WalletState, userId: string) => {
  const escrows = Object.values(state.escrows).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return escrows.filter(
    (escrow) => escrow.buyer_id === userId || escrow.seller_id === userId
  );
};

export class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletError";
  }
}

export const walletAPI = {
  subscribe(callback: () => void): () => void {
    if (!canUseStorage()) return () => undefined;

    const onWalletUpdate = () => callback();
    const onStorage = (event: StorageEvent) => {
      if (event.key?.startsWith(STORAGE_NAMESPACE)) {
        callback();
      }
    };

    window.addEventListener(WALLET_UPDATED_EVENT, onWalletUpdate);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(WALLET_UPDATED_EVENT, onWalletUpdate);
      window.removeEventListener("storage", onStorage);
    };
  },

  getAccount(user: Pick<User, "id" | "role">): WalletAccount {
    const state = readState();
    const userId = toComparableId(user.id);
    return state.accounts[userId] || createWalletAccount(userId, user.role);
  },

  getOverview(user: Pick<User, "id" | "role">): WalletOverview {
    const state = readState();
    const userId = toComparableId(user.id);
    const account = state.accounts[userId] || createWalletAccount(userId, user.role);
    const escrows = getEscrowCollectionsByUser(state, userId);
    const held_amount_as_buyer = escrows
      .filter((escrow) => escrow.buyer_id === userId && escrow.status === "held")
      .reduce((sum, escrow) => sum + escrow.amount, 0);
    const held_amount_as_seller = escrows
      .filter((escrow) => escrow.seller_id === userId && escrow.status === "held")
      .reduce((sum, escrow) => sum + escrow.amount, 0);
    const ledger = state.ledger.filter((entry) => entry.user_id === userId);
    const withdrawals = state.withdrawals
      .filter((receipt) => receipt.seller_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      account,
      held_amount_as_buyer,
      held_amount_as_seller,
      escrows,
      ledger,
      withdrawals: withdrawals.map((receipt) => ({
        ...receipt,
        withdraw_method: receipt.withdraw_method || "bank_transfer",
      })),
    };
  },

  topUpBuyer(user: Pick<User, "id" | "role" | "name">, amount: number): WalletAccount {
    if (user.role !== "buyer") {
      throw new WalletError("Top up hanya tersedia untuk akun buyer.");
    }

    const normalizedAmount = toPositiveInteger(amount);
    if (normalizedAmount <= 0) {
      throw new WalletError("Nominal top up harus lebih dari Rp0.");
    }

    const state = readState();
    const buyerId = toComparableId(user.id);
    const account = getOrCreateAccount(state, buyerId, "buyer");

    account.available_balance += normalizedAmount;
    account.total_topup += normalizedAmount;
    account.updated_at = nowISO();

    appendLedgerEntry(state, {
      user_id: buyerId,
      role: "buyer",
      type: "topup",
      direction: "credit",
      amount: normalizedAmount,
      balance_after: account.available_balance,
      description: `Top up saldo simulasi oleh ${user.name}`,
    });

    writeState(state);
    return account;
  },

  holdFundsForOrder(order: OrderWalletContext): WalletEscrowRecord {
    const orderId = toComparableId(order.id);
    const buyerId = toComparableId(order.buyer_id);
    const sellerId = toComparableId(order.seller_id);
    const amount = toPositiveInteger(order.total_price);

    if (!orderId || !buyerId || !sellerId || amount <= 0) {
      throw new WalletError("Data order tidak valid untuk proses escrow.");
    }

    const state = readState();
    const existingEscrow = state.escrows[orderId];
    if (existingEscrow) {
      return existingEscrow;
    }

    const buyerAccount = getOrCreateAccount(state, buyerId, "buyer");
    if (buyerAccount.available_balance < amount) {
      throw new WalletError("Saldo buyer tidak mencukupi untuk melakukan pembayaran ini.");
    }

    buyerAccount.available_balance -= amount;
    buyerAccount.updated_at = nowISO();

    const escrow = buildEscrowRecord(orderId, buyerId, sellerId, amount, "wallet");

    state.escrows[orderId] = escrow;

    appendLedgerEntry(state, {
      user_id: buyerId,
      role: "buyer",
      type: "order_hold",
      direction: "debit",
      amount,
      balance_after: buyerAccount.available_balance,
      description: `Dana order #${orderId} ditahan sistem escrow`,
      order_id: orderId,
    });

    writeState(state);
    return escrow;
  },

  holdGatewayFundsForOrder(order: OrderWalletContext): WalletEscrowRecord | null {
    const orderId = toComparableId(order.id);
    const buyerId = toComparableId(order.buyer_id);
    const sellerId = toComparableId(order.seller_id);
    const amount = toPositiveInteger(order.total_price);

    if (!orderId || !buyerId || !sellerId || amount <= 0) {
      return null;
    }

    const state = readState();
    const existingEscrow = state.escrows[orderId];
    if (existingEscrow) return existingEscrow;

    state.escrows[orderId] = buildEscrowRecord(
      orderId,
      buyerId,
      sellerId,
      amount,
      "gateway"
    );
    writeState(state);
    return state.escrows[orderId];
  },

  releaseEscrowForOrder(order: OrderWalletContext): WalletEscrowRecord | null {
    const orderId = toComparableId(order.id);
    const state = readState();
    const escrow = state.escrows[orderId];

    if (!escrow) return null;
    if (escrow.status !== "held") return escrow;

    const sellerAccount = getOrCreateAccount(state, escrow.seller_id, "seller");
    sellerAccount.available_balance += escrow.amount;
    sellerAccount.total_sales += escrow.amount;
    sellerAccount.updated_at = nowISO();

    escrow.status = "released";
    escrow.released_at = nowISO();
    escrow.updated_at = nowISO();
    state.escrows[orderId] = escrow;

    appendLedgerEntry(state, {
      user_id: escrow.seller_id,
      role: "seller",
      type: "order_release",
      direction: "credit",
      amount: escrow.amount,
      balance_after: sellerAccount.available_balance,
      description: `Dana order #${orderId} berhasil dirilis ke seller`,
      order_id: orderId,
    });

    writeState(state);
    return escrow;
  },

  refundEscrowForOrder(order: OrderWalletContext): WalletEscrowRecord | null {
    const orderId = toComparableId(order.id);
    const state = readState();
    const escrow = state.escrows[orderId];

    if (!escrow) return null;
    if (escrow.status !== "held") return escrow;

    const buyerAccount = getOrCreateAccount(state, escrow.buyer_id, "buyer");
    buyerAccount.available_balance += escrow.amount;
    buyerAccount.total_refund += escrow.amount;
    buyerAccount.updated_at = nowISO();

    escrow.status = "refunded";
    escrow.refunded_at = nowISO();
    escrow.updated_at = nowISO();
    state.escrows[orderId] = escrow;

    appendLedgerEntry(state, {
      user_id: escrow.buyer_id,
      role: "buyer",
      type: "order_refund",
      direction: "credit",
      amount: escrow.amount,
      balance_after: buyerAccount.available_balance,
      description: `Dana order #${orderId} dikembalikan ke buyer`,
      order_id: orderId,
    });

    writeState(state);
    return escrow;
  },

  syncOrderSettlement(order: OrderWalletContext): "released" | "refunded" | "none" {
    const orderId = toComparableId(order.id);
    let state = readState();
    let escrow = state.escrows[orderId];
    const isTransactionCompleted = order.transaction_status === "completed";

    if (
      !escrow &&
      ((order.status && SETTLED_ORDER_STATUSES.has(order.status)) || isTransactionCompleted)
    ) {
      this.holdGatewayFundsForOrder(order);
      state = readState();
      escrow = state.escrows[orderId];
    }

    if (!escrow || escrow.status !== "held") {
      return "none";
    }

    if (order.status === "completed" || isTransactionCompleted) {
      this.releaseEscrowForOrder(order);
      return "released";
    }

    if (order.status === "cancelled" || order.status === "refunded") {
      this.refundEscrowForOrder(order);
      return "refunded";
    }

    return "none";
  },

  syncOrders(orders: Array<OrderWalletContext>): void {
    for (const order of orders) {
      this.syncOrderSettlement(order);
    }
  },

  withdrawSeller(
    seller: Pick<User, "id" | "role" | "name">,
    payload: WithdrawPayload
  ): { account: WalletAccount; receipt: WalletWithdrawReceipt } {
    if (seller.role !== "seller") {
      throw new WalletError("Withdraw hanya tersedia untuk akun seller.");
    }

    const amount = toPositiveInteger(payload.amount);
    if (amount <= 0) {
      throw new WalletError("Nominal withdraw harus lebih dari Rp0.");
    }

    const withdrawMethod = payload.withdraw_method || "bank_transfer";
    const bankName = payload.bank_name.trim();
    const accountName = payload.account_name.trim();
    const accountNumber = payload.account_number.trim();

    if (!accountName || !accountNumber) {
      throw new WalletError("Data rekening untuk withdraw belum lengkap.");
    }
    if (withdrawMethod === "bank_transfer" && !bankName) {
      throw new WalletError("Nama bank wajib diisi untuk transfer bank.");
    }

    const state = readState();
    const sellerId = toComparableId(seller.id);
    const account = getOrCreateAccount(state, sellerId, "seller");

    if (account.available_balance < amount) {
      throw new WalletError("Saldo seller tidak mencukupi untuk withdraw.");
    }

    account.available_balance -= amount;
    account.total_withdraw += amount;
    account.updated_at = nowISO();

    const receipt: WalletWithdrawReceipt = {
      id: generateId("wd"),
      seller_id: sellerId,
      amount,
      withdraw_method: withdrawMethod,
      bank_name: bankName,
      account_name: accountName,
      account_number: accountNumber,
      reference_number: `WD-${Date.now().toString().slice(-8)}`,
      created_at: nowISO(),
    };

    state.withdrawals.unshift(receipt);

    appendLedgerEntry(state, {
      user_id: sellerId,
      role: "seller",
      type: "withdraw",
      direction: "debit",
      amount,
      balance_after: account.available_balance,
      description: `Withdraw simulasi ke ${WITHDRAW_METHOD_LABEL[withdrawMethod]} (${accountNumber})`,
    });

    writeState(state);
    return { account, receipt };
  },
};
