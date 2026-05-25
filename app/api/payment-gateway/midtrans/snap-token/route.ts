import { NextResponse } from "next/server";
import { MidtransCreateTransactionRequest } from "@/lib/paymentGateway";
import {
  buildMidtransBasicAuth,
  createGatewayOrderId,
  getMidtransConfig,
} from "@/lib/midtransServer";

interface MidtransSnapResponse {
  token?: string;
  redirect_url?: string;
  status_code?: string;
  status_message?: string;
}

export const runtime = "nodejs";

const toPositiveInteger = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.floor(numeric));
};

const getEnabledPayments = (
  paymentMethod: MidtransCreateTransactionRequest["paymentMethod"]
): string[] =>
  paymentMethod === "virtual_account"
    ? ["permata_va", "bca_va", "bni_va", "bri_va", "echannel", "other_va"]
    : ["bank_transfer"];

const resolveOrigin = (request: Request): string => {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, "");
  }

  return new URL(request.url).origin;
};

const buildCallbackUrl = (
  origin: string,
  appOrderId: string,
  gatewayOrderId: string,
  paymentMethod: MidtransCreateTransactionRequest["paymentMethod"],
  result: "success" | "unfinish" | "error"
): string => {
  const params = new URLSearchParams({
    gateway: "midtrans",
    result,
    gatewayOrderId,
    paymentMethod,
  });
  return `${origin}/payment/${encodeURIComponent(appOrderId)}?${params.toString()}`;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<MidtransCreateTransactionRequest>;
    const appOrderId = String(payload.appOrderId ?? "").trim();
    const amount = toPositiveInteger(payload.amount);
    const paymentMethod = payload.paymentMethod;

    if (!appOrderId || !amount || (paymentMethod !== "bank_transfer" && paymentMethod !== "virtual_account")) {
      return NextResponse.json(
        {
          success: false,
          message: "Payload pembayaran tidak valid.",
        },
        { status: 400 }
      );
    }

    const { serverKey, snapApiBaseUrl } = getMidtransConfig();
    if (!serverKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Konfigurasi MIDTRANS_SERVER_KEY belum diatur.",
        },
        { status: 500 }
      );
    }

    const customerName = payload.customer?.name?.trim() || "Customer";
    const customerEmail = payload.customer?.email?.trim() || "customer@example.com";
    const customerPhone = payload.customer?.phone?.trim() || undefined;
    const itemName = payload.itemName?.trim() || `Order #${appOrderId}`;
    const gatewayOrderId = createGatewayOrderId(appOrderId);
    const origin = resolveOrigin(request);

    const midtransPayload = {
      transaction_details: {
        order_id: gatewayOrderId,
        gross_amount: amount,
      },
      item_details: [
        {
          id: appOrderId,
          price: amount,
          quantity: 1,
          name: itemName,
        },
      ],
      customer_details: {
        first_name: customerName,
        email: customerEmail,
        ...(customerPhone ? { phone: customerPhone } : {}),
      },
      enabled_payments: getEnabledPayments(paymentMethod),
      callbacks: {
        finish: buildCallbackUrl(origin, appOrderId, gatewayOrderId, paymentMethod, "success"),
        unfinish: buildCallbackUrl(origin, appOrderId, gatewayOrderId, paymentMethod, "unfinish"),
        error: buildCallbackUrl(origin, appOrderId, gatewayOrderId, paymentMethod, "error"),
      },
      custom_field1: appOrderId,
      custom_field2: paymentMethod,
      custom_field3: "escrow-project",
    };

    const response = await fetch(snapApiBaseUrl, {
      method: "POST",
      headers: {
        Authorization: buildMidtransBasicAuth(serverKey),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(midtransPayload),
      cache: "no-store",
    });

    const data = (await response.json()) as MidtransSnapResponse;

    if (!response.ok || !data.redirect_url) {
      return NextResponse.json(
        {
          success: false,
          message: data.status_message || "Gagal membuat transaksi Midtrans.",
          data,
        },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Transaksi Midtrans berhasil dibuat.",
      data: {
        gateway_order_id: gatewayOrderId,
        token: data.token,
        redirect_url: data.redirect_url,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat membuat transaksi gateway.",
      },
      { status: 500 }
    );
  }
}
