import { NextResponse } from "next/server";
import {
  getMidtransStatusLabel,
  isMidtransPaidStatus,
  MidtransStatusResponse,
} from "@/lib/paymentGateway";
import { buildMidtransBasicAuth, getMidtransConfig } from "@/lib/midtransServer";

interface MidtransStatusRequestBody {
  gatewayOrderId?: string;
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MidtransStatusRequestBody;
    const gatewayOrderId = String(body.gatewayOrderId ?? "").trim();

    if (!gatewayOrderId) {
      return NextResponse.json(
        {
          success: false,
          message: "gatewayOrderId wajib diisi.",
        },
        { status: 400 }
      );
    }

    const { serverKey, coreApiBaseUrl } = getMidtransConfig();
    if (!serverKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Konfigurasi MIDTRANS_SERVER_KEY belum diatur.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${coreApiBaseUrl}/v2/${encodeURIComponent(gatewayOrderId)}/status`,
      {
        method: "GET",
        headers: {
          Authorization: buildMidtransBasicAuth(serverKey),
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const data = (await response.json()) as MidtransStatusResponse;
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data.status_message || "Gagal mengambil status Midtrans.",
          data,
        },
        { status: response.status || 500 }
      );
    }

    const normalizedStatus = getMidtransStatusLabel(data.transaction_status);
    const isPaid = isMidtransPaidStatus(data.transaction_status, data.fraud_status);

    return NextResponse.json({
      success: true,
      message: "Status transaksi Midtrans berhasil diambil.",
      data: {
        ...data,
        normalized_status: normalizedStatus,
        is_paid: isPaid,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat mengecek status payment gateway.",
      },
      { status: 500 }
    );
  }
}
