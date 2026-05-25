const MIDTRANS_SNAP_SANDBOX_URL = "https://app.sandbox.midtrans.com/snap/v1/transactions";
const MIDTRANS_SNAP_PRODUCTION_URL = "https://app.midtrans.com/snap/v1/transactions";
const MIDTRANS_CORE_SANDBOX_URL = "https://api.sandbox.midtrans.com";
const MIDTRANS_CORE_PRODUCTION_URL = "https://api.midtrans.com";

const TRUE_ENV_VALUES = new Set(["1", "true", "yes", "on"]);
const MIDTRANS_ORDER_ID_MAX_LENGTH = 50;

export interface MidtransConfig {
  serverKey: string;
  isProduction: boolean;
  snapApiBaseUrl: string;
  coreApiBaseUrl: string;
}

export const getMidtransConfig = (): MidtransConfig => {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim() || "";
  const isProductionRaw =
    process.env.MIDTRANS_IS_PRODUCTION ??
    process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION ??
    "false";
  const isProduction = TRUE_ENV_VALUES.has(isProductionRaw.trim().toLowerCase());

  return {
    serverKey,
    isProduction,
    snapApiBaseUrl: isProduction
      ? MIDTRANS_SNAP_PRODUCTION_URL
      : MIDTRANS_SNAP_SANDBOX_URL,
    coreApiBaseUrl: isProduction
      ? MIDTRANS_CORE_PRODUCTION_URL
      : MIDTRANS_CORE_SANDBOX_URL,
  };
};

export const buildMidtransBasicAuth = (serverKey: string): string =>
  `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;

export const createGatewayOrderId = (appOrderId: string): string => {
  const sanitizedOrderId =
    appOrderId.replace(/[^a-zA-Z0-9\-_.~]/g, "").slice(0, 24) || "order";
  return `escrow-${sanitizedOrderId}-${Date.now()}`.slice(
    0,
    MIDTRANS_ORDER_ID_MAX_LENGTH
  );
};
