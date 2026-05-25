import { AxiosError } from "axios";
import { apiClient } from "@/lib/api";
import {
  TransactionActivity,
  TransactionChatData,
  TransactionChatMessage,
  TransactionChatMessageInput,
  TransactionChecklist,
  TransactionChecklistUpdateInput,
  TransactionCompletionCodeResponse,
  TransactionCompletionCodeVerifyResponse,
  TransactionStatus,
  Order,
} from "@/types";

interface ApiEnvelope<T> {
  data?: T;
  message?: string;
  success?: boolean;
}

const DEFAULT_CHECKLIST: TransactionChecklist = {
  account_match: false,
  account_secured: false,
  seller_device_removed: false,
  completion_code_verified: false,
};

const unwrapApiData = <T>(payload: ApiEnvelope<T> | T): T => {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as ApiEnvelope<T>).data !== undefined
  ) {
    return (payload as ApiEnvelope<T>).data as T;
  }

  return payload as T;
};

const isFallbackError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;

  const axiosError = error as AxiosError;
  const status = axiosError.response?.status;
  return status === 404 || status === 405;
};

const withFallback = async <T>(requests: Array<() => Promise<T>>): Promise<T> => {
  let lastError: unknown = null;

  for (const request of requests) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      if (!isFallbackError(error)) {
        throw error;
      }
    }
  }

  throw lastError;
};

const normalizeChecklist = (
  checklist?: Partial<TransactionChecklist> | null
): TransactionChecklist => ({
  account_match: Boolean(checklist?.account_match),
  account_secured: Boolean(checklist?.account_secured),
  seller_device_removed: Boolean(checklist?.seller_device_removed),
  completion_code_verified: Boolean(checklist?.completion_code_verified),
});

const normalizeMessages = (
  messages?: TransactionChatMessage[] | null
): TransactionChatMessage[] => (messages || []).map((message) => ({
  ...message,
  message_type: message.message_type || "text",
}));

const normalizeActivities = (
  activities?: TransactionActivity[] | null
): TransactionActivity[] => activities || [];

const normalizeTransactionData = (
  orderId: string,
  data?: Partial<TransactionChatData> | null
): TransactionChatData => ({
  order_id: String(data?.order_id || orderId),
  status: data?.status || "chat_open",
  checklist: normalizeChecklist(data?.checklist),
  completion_code: data?.completion_code ?? null,
  completion_code_expires_at: data?.completion_code_expires_at ?? null,
  completion_code_verified_at: data?.completion_code_verified_at ?? null,
  participants: data?.participants || [],
  messages: normalizeMessages(data?.messages),
  activities: normalizeActivities(data?.activities),
  updated_at: data?.updated_at,
});

const getTransactionBasePaths = (orderId: string): string[] => [
  `/orders/${orderId}/transaction-chat`,
  `/orders/${orderId}/transaction`,
];

const isThreadFallbackStatus = (status?: number): boolean =>
  status === 401 || status === 403 || status === 404 || status === 405;

export const transactionChatAPI = {
  async getThread(orderId: string): Promise<TransactionChatData> {
    const basePaths = getTransactionBasePaths(orderId);
    let lastError: unknown = null;

    for (const path of basePaths) {
      try {
        const response = await apiClient.get(path, { skipAuthRedirect: true });
        const data = unwrapApiData<Partial<TransactionChatData>>(response.data);
        return normalizeTransactionData(orderId, data);
      } catch (error) {
        lastError = error;
        const axiosError = error as AxiosError;
        if (!isThreadFallbackStatus(axiosError.response?.status)) {
          throw error;
        }
      }
    }

    throw lastError;
  },

  async sendMessage(orderId: string, input: TransactionChatMessageInput): Promise<TransactionChatMessage> {
    const basePaths = getTransactionBasePaths(orderId);
    const payload = {
      message: input.message,
      message_type: input.message_type || "text",
    };

    return withFallback(
      basePaths.map((path) => async () => {
        const response = await apiClient.post(`${path}/messages`, payload);
        return unwrapApiData<TransactionChatMessage>(response.data);
      })
    );
  },

  async updateChecklist(orderId: string, updates: TransactionChecklistUpdateInput): Promise<TransactionChatData> {
    const basePaths = getTransactionBasePaths(orderId);
    const payload = {
      ...updates,
      checklist: updates,
    };

    const data = await withFallback(
      basePaths.flatMap((path) => [
        async () => {
          const response = await apiClient.patch(`${path}/checklist`, payload);
          return unwrapApiData<Partial<TransactionChatData>>(response.data);
        },
        async () => {
          const response = await apiClient.put(`${path}/checklist`, payload);
          return unwrapApiData<Partial<TransactionChatData>>(response.data);
        },
      ])
    );

    return normalizeTransactionData(orderId, data);
  },

  async updateStatus(orderId: string, status: TransactionStatus): Promise<TransactionChatData> {
    const basePaths = getTransactionBasePaths(orderId);
    const payload = { status };
    const data = await withFallback(
      basePaths.flatMap((path) => [
        async () => {
          const response = await apiClient.patch(`${path}/status`, payload);
          return unwrapApiData<Partial<TransactionChatData>>(response.data);
        },
        async () => {
          const response = await apiClient.put(`${path}/status`, payload);
          return unwrapApiData<Partial<TransactionChatData>>(response.data);
        },
      ])
    );

    return normalizeTransactionData(orderId, data);
  },

  async generateCompletionCode(orderId: string): Promise<TransactionCompletionCodeResponse> {
    const basePaths = getTransactionBasePaths(orderId);
    const result = await withFallback(
      basePaths.map((path) => async () => {
        const response = await apiClient.post(`${path}/completion-code`);
        return unwrapApiData<Partial<TransactionCompletionCodeResponse> & Partial<TransactionChatData>>(response.data);
      })
    );

    const completionCode = result.completion_code;
    const expiresAt = result.expires_at ?? result.completion_code_expires_at ?? null;

    if (!completionCode) {
      throw new Error("Backend belum mengembalikan completion_code");
    }

    return {
      completion_code: completionCode,
      expires_at: expiresAt,
    };
  },

  async verifyCompletionCode(orderId: string, code: string): Promise<TransactionCompletionCodeVerifyResponse> {
    const basePaths = getTransactionBasePaths(orderId);
    const payload = { code, completion_code: code };
    const result = await withFallback(
      basePaths.flatMap((path) => [
        async () => {
          const response = await apiClient.post(`${path}/verify-completion-code`, payload);
          return unwrapApiData<Partial<TransactionCompletionCodeVerifyResponse> & Partial<TransactionChatData>>(response.data);
        },
        async () => {
          const response = await apiClient.post(`${path}/completion-code/verify`, payload);
          return unwrapApiData<Partial<TransactionCompletionCodeVerifyResponse> & Partial<TransactionChatData>>(response.data);
        },
      ])
    );

    return {
      verified: Boolean(result.verified ?? result.completion_code_verified_at),
      status: result.status,
      verified_at: result.verified_at ?? result.completion_code_verified_at ?? null,
    };
  },

  async completeOrder(orderId: string): Promise<Partial<Order>> {
    const basePaths = getTransactionBasePaths(orderId);
    const result = await withFallback(
      [
        ...basePaths.flatMap((path) => [
          async () => {
            const response = await apiClient.post(`${path}/complete`);
            return unwrapApiData<Partial<Order>>(response.data);
          },
          async () => {
            const response = await apiClient.post(`${path}/finalize`);
            return unwrapApiData<Partial<Order>>(response.data);
          },
          async () => {
            const response = await apiClient.post(`${path}/mark-complete`);
            return unwrapApiData<Partial<Order>>(response.data);
          },
        ]),
        async () => {
          const response = await apiClient.put(`/orders/${orderId}/complete`);
          return unwrapApiData<Partial<Order>>(response.data);
        },
        async () => {
          const response = await apiClient.patch(`/orders/${orderId}/status`, { status: "completed" });
          return unwrapApiData<Partial<Order>>(response.data);
        },
        async () => {
          const response = await apiClient.put(`/orders/${orderId}/status`, { status: "completed" });
          return unwrapApiData<Partial<Order>>(response.data);
        },
        async () => {
          const response = await apiClient.put(`/orders/${orderId}/confirm`);
          return unwrapApiData<Partial<Order>>(response.data);
        },
      ]
    );

    return result || {};
  },

  getDefaultChecklist(): TransactionChecklist {
    return { ...DEFAULT_CHECKLIST };
  },
};
