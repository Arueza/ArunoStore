import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/midtrans/webhook — receives payment status notifications.
 *
 * Verifies signature_key (SHA512 of order_id + status_code + gross_amount + ServerKey),
 * checks settlement conditions, and updates the payment row. Idempotent on order_id.
 */
export async function POST(request: Request) {
  let body: {
    order_id?: string;
    status_code?: string;
    gross_amount?: string;
    signature_key?: string;
    transaction_status?: string;
    fraud_status?: string;
    payment_type?: string;
    transaction_id?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { order_id, status_code, gross_amount, signature_key } = body;

  if (!order_id || !status_code || !gross_amount || !signature_key) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    return NextResponse.json(
      { error: "MIDTRANS_SERVER_KEY missing." },
      { status: 500 },
    );
  }

  // Verify signature: SHA512(order_id + status_code + gross_amount + serverKey).
  // Plain hash, not HMAC — Midtrans appends the key to the message.
  const expected = createHash("sha512")
    .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
    .digest("hex");

  const sigBuf = Buffer.from(signature_key, "utf8");
  const expBuf = Buffer.from(expected, "utf8");

  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // Find the payment row.
  const { data: payment, error: readError } = await serviceClient
    .from("payments")
    .select("id, amount, status, commission_id, titipan_request_id, shop_order_id")
    .eq("order_id", order_id)
    .maybeSingle();

  if (readError || !payment) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  // Map Midtrans transaction_status to our payment status.
  const txnStatus = body.transaction_status;
  // Midtrans sends fraud_status lowercase ("accept"), and only for credit
  // cards — bank transfer, QRIS and e-wallets omit it.
  const fraud = (body.fraud_status ?? "").toLowerCase();
  const isCard = (body.payment_type ?? "").toLowerCase() === "credit_card";

  let paymentStatus: string;
  if (txnStatus === "settlement" || txnStatus === "capture") {
    if (status_code !== "200" || (isCard && fraud !== "accept")) {
      return NextResponse.json(
        { error: "Fraud check failed." },
        { status: 400 },
      );
    }
    paymentStatus = txnStatus;
  } else if (txnStatus === "deny") {
    paymentStatus = "deny";
  } else if (txnStatus === "expire") {
    paymentStatus = "expire";
  } else if (txnStatus === "cancel") {
    paymentStatus = "cancel";
  } else if (txnStatus === "pending") {
    paymentStatus = "pending";
  } else {
    paymentStatus = "failure";
  }

  // Idempotent: skip if already in final state.
  if (
    payment.status === "settlement" ||
    payment.status === "capture" ||
    payment.status === "deny" ||
    payment.status === "expire" ||
    payment.status === "cancel"
  ) {
    return NextResponse.json({ ok: true });
  }

  // Update payment row.
  const { error: updateError } = await serviceClient
    .from("payments")
    .update({
      status: paymentStatus,
      transaction_id: body.transaction_id ?? null,
      payment_type: body.payment_type ?? null,
    })
    .eq("id", payment.id);

  if (updateError) {
    return NextResponse.json(
      { error: `Update failed: ${updateError.message}` },
      { status: 500 },
    );
  }

  // If settled, advance the order to paid (4.8). Errors are reported rather
  // than swallowed: a reverted trigger or a lost write must surface as a 500.
  if (paymentStatus === "settlement" || paymentStatus === "capture") {
    if (payment.commission_id) {
      const { error: orderError } = await serviceClient
        .from("commissions")
        .update({ status: "paid" })
        .eq("id", payment.commission_id)
        .eq("status", "accepted");
      if (orderError) {
        return NextResponse.json(
          { error: `Order update failed: ${orderError.message}` },
          { status: 500 },
        );
      }
    } else if (payment.titipan_request_id) {
      const { error: orderError } = await serviceClient
        .from("titipan_requests")
        .update({ status: "paid" })
        .eq("id", payment.titipan_request_id)
        .eq("status", "accepted");
      if (orderError) {
        return NextResponse.json(
          { error: `Order update failed: ${orderError.message}` },
          { status: 500 },
        );
      }
    } else if (payment.shop_order_id) {
      await serviceClient
        .from("shop_orders")
        .update({ status: "settled" })
        .eq("id", payment.shop_order_id)
        .eq("status", "pending");
    }
  } else if (
    paymentStatus === "deny" ||
    paymentStatus === "expire" ||
    paymentStatus === "cancel"
  ) {
    // Deny/expire/cancel only touch shop_orders — commissions and titipan
    // have no matching terminal state here and stay as they are.
    if (payment.shop_order_id) {
      const orderStatus =
        paymentStatus === "deny"
          ? "deny"
          : paymentStatus === "expire"
            ? "expire"
            : "expire";
      await serviceClient
        .from("shop_orders")
        .update({ status: orderStatus })
        .eq("id", payment.shop_order_id)
        .eq("status", "pending");
    }
  }

  return NextResponse.json({ ok: true });
}
