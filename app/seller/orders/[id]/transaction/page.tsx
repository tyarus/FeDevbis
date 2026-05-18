"use client";

import { useParams } from "next/navigation";
import { TransactionChatWorkspace } from "@/components";

export default function SellerTransactionChatPage() {
  const params = useParams();
  const orderId = params.id as string;

  return (
    <TransactionChatWorkspace
      orderId={orderId}
      role="seller"
      backHref={`/seller/orders/${orderId}`}
    />
  );
}
