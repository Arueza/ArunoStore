import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { quoteTotal } from "@/lib/quote";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MIDTRANS_SNAP_URL = "https://app.sandbox.midtrans.com/snap/v1/transactions";

/**
 * POST /api/checkout — creates a Snap transaction for an accepted quote or a
 * pending shop order.
 *
 * Body: { type: "commission" | "titipan" | "shop", id: string }
 *
 * Amount is always recomputed from the database, never trusted from the client.
 * The order must be owned by the signed-in buyer and currently "accepted"
 * (commission/titipan) or "pending" (shop).
 */
export async function POST(request: Request) {
  let body: { type?: unknown; id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { type, id } = body;

  if (type !== "commission" && type !== "titipan" && type !== "shop") {
    return NextResponse.json(
      { error: "type must be commission, titipan, or shop." },
      { status: 400 },
    );
  }

  if (typeof id !== "string" || !UUID.test(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Shop orders: read shop_orders, verify ownership + pending status.
  if (type === "shop") {
    const { data: shopOrder, error: shopReadError } = await supabase
      .from("shop_orders")
      .select(
        "id, buyer_id, status, total_price, recipient_name, phone, address, city, province, postal_code",
      )
      .eq("id", id)
      .maybeSingle();

    if (shopReadError || !shopOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (shopOrder.buyer_id !== user.id) {
      return NextResponse.json({ error: "Not your order." }, { status: 403 });
    }

    if (shopOrder.status !== "pending") {
      return NextResponse.json(
        { error: "Order is not in pending state." },
        { status: 400 },
      );
    }

    // The checkout page gates the Snap button on a saved address, but the
    // button is only UI — refuse here too so a forged POST cannot settle an
    // order nobody knows where to send.
    const recipient = (shopOrder as { recipient_name: string | null }).recipient_name?.trim();
    const orderPhone = (shopOrder as { phone: string | null }).phone?.trim();
    const orderAddress = (shopOrder as { address: string | null }).address?.trim();
    const orderCity = (shopOrder as { city: string | null }).city?.trim();
    const orderPostal = (shopOrder as { postal_code: string | null }).postal_code?.trim();

    if (!recipient || !orderPhone || !orderAddress || !orderCity || !orderPostal) {
      return NextResponse.json(
        { error: "Alamat pengiriman belum diisi." },
        { status: 400 },
      );
    }

    const amount = shopOrder.total_price;
    const orderId = `aruno-shop-${id.slice(0, 8)}-${Date.now()}`;

    const serviceClient = createServiceClient();

    const { error: insertError } = await serviceClient
      .from("payments")
      .insert({
        buyer_id: user.id,
        shop_order_id: id,
        amount,
        order_id: orderId,
        snap_token: "",
        status: "pending",
      });

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to create payment: ${insertError.message}` },
        { status: 500 },
      );
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      return NextResponse.json(
        { error: "MIDTRANS_SERVER_KEY is missing." },
        { status: 500 },
      );
    }

    const basicAuth = Buffer.from(`${serverKey}:`).toString("base64");

    // Address rides along to Snap so the buyer sees it on the payment page.
    // Truncated to Midtrans-sized fields; the database keeps the full text.
    // First word is the given name, the rest the family name.
    const nameParts = recipient.split(/\s+/);
    const firstName = nameParts[0]!.slice(0, 20);
    const lastName = nameParts.slice(1).join(" ").slice(0, 20) || undefined;

    let snapToken: string;
    try {
      const res = await fetch(MIDTRANS_SNAP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify({
          transaction_details: {
            order_id: orderId,
            gross_amount: amount,
          },
          customer_details: {
            first_name: firstName,
            ...(lastName ? { last_name: lastName } : {}),
            phone: orderPhone.slice(0, 20),
            shipping_address: {
              first_name: firstName,
              ...(lastName ? { last_name: lastName } : {}),
              phone: orderPhone.slice(0, 20),
              address: orderAddress.slice(0, 200),
              city: orderCity.slice(0, 50),
              postal_code: orderPostal.slice(0, 10),
              country_code: "IDN",
            },
          },
        }),
      });

      const data = (await res.json()) as {
        token?: string;
        error_messages?: string[];
      };

      if (!res.ok || !data.token) {
        return NextResponse.json(
          { error: data.error_messages?.join("; ") ?? "Midtrans error." },
          { status: 502 },
        );
      }

      snapToken = data.token;
    } catch {
      return NextResponse.json(
        { error: "Failed to reach Midtrans." },
        { status: 502 },
      );
    }

    const { error: updateError } = await serviceClient
      .from("payments")
      .update({ snap_token: snapToken })
      .eq("order_id", orderId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to store snap token: ${updateError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ snap_token: snapToken, order_id: orderId, amount });
  }

  // Read the order row and verify ownership + status in one query.
  const { data: order, error: readError } =
    type === "commission"
      ? await supabase
          .from("commissions")
          .select("id, buyer_id, status, quote_price")
          .eq("id", id)
          .maybeSingle()
      : await supabase
          .from("titipan_requests")
          .select(
            "id, buyer_id, status, quote_item_price, quote_shipping, quote_service_fee",
          )
          .eq("id", id)
          .maybeSingle();

  if (readError || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (order.buyer_id !== user.id) {
    return NextResponse.json({ error: "Not your order." }, { status: 403 });
  }

  if (order.status !== "accepted") {
    return NextResponse.json(
      { error: "Order is not in accepted state." },
      { status: 400 },
    );
  }

  // Compute amount server-side.
  const amount =
    type === "commission"
      ? (order as { quote_price: number }).quote_price
      : quoteTotal({
          itemPrice: (order as { quote_item_price: number }).quote_item_price,
          shipping: (order as { quote_shipping: number }).quote_shipping,
          serviceFee: (order as { quote_service_fee: number }).quote_service_fee,
        });

  // Generate a Midtrans-safe order_id: alphanumerics plus -_.~ only, single-use.
  const orderId = `aruno-${type}-${id.slice(0, 8)}-${Date.now()}`;

  const serviceClient = createServiceClient();

  // Insert payment row first so a Midtrans failure leaves a trace.
  const { error: insertError } = await serviceClient.from("payments").insert({
    buyer_id: user.id,
    commission_id: type === "commission" ? id : null,
    titipan_request_id: type === "titipan" ? id : null,
    amount,
    order_id: orderId,
    snap_token: "", // updated below
    status: "pending",
  });

  if (insertError) {
    return NextResponse.json(
      { error: `Failed to create payment: ${insertError.message}` },
      { status: 500 },
    );
  }

  // Call Midtrans Snap API.
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    return NextResponse.json(
      { error: "MIDTRANS_SERVER_KEY is missing." },
      { status: 500 },
    );
  }

  const basicAuth = Buffer.from(`${serverKey}:`).toString("base64");

  let snapToken: string;
  try {
    const res = await fetch(MIDTRANS_SNAP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: amount,
        },
      }),
    });

    const data = (await res.json()) as {
      token?: string;
      error_messages?: string[];
    };

    if (!res.ok || !data.token) {
      return NextResponse.json(
        { error: data.error_messages?.join("; ") ?? "Midtrans error." },
        { status: 502 },
      );
    }

    snapToken = data.token;
  } catch {
    return NextResponse.json(
      { error: "Failed to reach Midtrans." },
      { status: 502 },
    );
  }

  // Store the snap token.
  const { error: updateError } = await serviceClient
    .from("payments")
    .update({ snap_token: snapToken })
    .eq("order_id", orderId);

  if (updateError) {
    return NextResponse.json(
      { error: `Failed to store snap token: ${updateError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ snap_token: snapToken, order_id: orderId, amount });
}
