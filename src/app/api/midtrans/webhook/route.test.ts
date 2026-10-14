import { createHash } from "node:crypto";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  update: vi.fn(),
  maybeSingle: vi.fn(),
  paymentData: null as Record<string, unknown> | null,
  updateError: null as { message: string } | null,
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: mocks.from,
  })),
}));

import { POST } from "./route";

const ORDER_ID = "aruno-titipan-abc1234-1234567890";
const SERVER_KEY = "test-server-key";

function makeBody(overrides: Record<string, unknown> = {}) {
  return {
    order_id: ORDER_ID,
    status_code: "200",
    gross_amount: "125000",
    signature_key: "valid",
    transaction_status: "pending",
    fraud_status: "accept",
    payment_type: "credit_card",
    transaction_id: "txn-123",
    ...overrides,
  };
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/midtrans/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Computes the valid signature for a given body (Midtrans style: plain SHA512). */
function sign(body: Record<string, unknown>): string {
  return createHash("sha512")
    .update(`${body.order_id}${body.status_code}${body.gross_amount}${SERVER_KEY}`)
    .digest("hex");
}

/** Sets up the mock Supabase client for a payment row. */
function setupPayment(payment: Record<string, unknown>) {
  mocks.paymentData = payment;
  mocks.from.mockImplementation((table: string) => ({
    select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
    update: mocks.update.mockImplementation(() => ({
      eq: () => ({ eq: () => Promise.resolve({ error: mocks.updateError }) }),
    })),
    _table: table,
  }));
  mocks.maybeSingle.mockResolvedValue({ data: payment, error: null });
}

describe("webhook", () => {
  beforeEach(() => {
    vi.stubEnv("MIDTRANS_SERVER_KEY", SERVER_KEY);
    mocks.from.mockReset();
    mocks.update.mockReset();
    mocks.maybeSingle.mockReset();
    mocks.updateError = null;
    mocks.paymentData = null;
  });

  test("deny updates payment but does not advance order", async () => {
    setupPayment({
      id: "pay-1",
      amount: 125000,
      status: "pending",
      commission_id: null,
      titipan_request_id: "req-1",
    });

    const body = makeBody({ transaction_status: "deny" });
    body.signature_key = sign(body);

    const res = await POST(makeRequest(body));

    expect(res.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith("payments");
    expect(mocks.from).not.toHaveBeenCalledWith("commissions");
    expect(mocks.from).not.toHaveBeenCalledWith("titipan_requests");
  });

  test("expire updates payment but does not advance order", async () => {
    setupPayment({
      id: "pay-1",
      amount: 125000,
      status: "pending",
      commission_id: "comm-1",
      titipan_request_id: null,
    });

    const body = makeBody({ transaction_status: "expire" });
    body.signature_key = sign(body);

    const res = await POST(makeRequest(body));

    expect(res.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith("payments");
    expect(mocks.from).not.toHaveBeenCalledWith("commissions");
    expect(mocks.from).not.toHaveBeenCalledWith("titipan_requests");
  });

  test("settlement advances order to paid", async () => {
    setupPayment({
      id: "pay-1",
      amount: 125000,
      status: "pending",
      commission_id: "comm-1",
      titipan_request_id: null,
    });

    const body = makeBody({ transaction_status: "settlement" });
    body.signature_key = sign(body);

    const res = await POST(makeRequest(body));

    expect(res.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith("commissions");
  });

  test("settlement advances titipan order to paid", async () => {
    setupPayment({
      id: "pay-1",
      amount: 125000,
      status: "pending",
      commission_id: null,
      titipan_request_id: "req-1",
    });

    const body = makeBody({ transaction_status: "settlement" });
    body.signature_key = sign(body);

    const res = await POST(makeRequest(body));

    expect(res.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith("titipan_requests");
  });

  test("capture with lowercase accept advances order to paid", async () => {
    setupPayment({
      id: "pay-1",
      amount: 15000,
      status: "pending",
      commission_id: "comm-1",
      titipan_request_id: null,
    });

    const body = makeBody({
      transaction_status: "capture",
      fraud_status: "accept",
      payment_type: "credit_card",
      gross_amount: "15000.00",
    });
    body.signature_key = sign(body);

    const res = await POST(makeRequest(body));

    expect(res.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith("commissions");
  });

  test("capture with challenge fraud is rejected", async () => {
    setupPayment({
      id: "pay-1",
      amount: 15000,
      status: "pending",
      commission_id: "comm-1",
      titipan_request_id: null,
    });

    const body = makeBody({
      transaction_status: "capture",
      fraud_status: "challenge",
    });
    body.signature_key = sign(body);

    const res = await POST(makeRequest(body));

    expect(res.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalledWith("commissions");
  });

  test("settlement without fraud_status advances non-card order", async () => {
    setupPayment({
      id: "pay-1",
      amount: 125000,
      status: "pending",
      commission_id: null,
      titipan_request_id: "req-1",
    });

    const body = makeBody({
      transaction_status: "settlement",
      payment_type: "bank_transfer",
    });
    delete (body as Record<string, unknown>).fraud_status;
    body.signature_key = sign(body);

    const res = await POST(makeRequest(body));

    expect(res.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith("titipan_requests");
  });

  test("invalid signature rejected", async () => {
    const body = makeBody({ transaction_status: "settlement" });
    body.signature_key = "wrong";

    const res = await POST(makeRequest(body));

    expect(res.status).toBe(401);
  });

  test("already-settled payment is idempotent", async () => {
    setupPayment({
      id: "pay-1",
      amount: 125000,
      status: "settlement",
      commission_id: "comm-1",
      titipan_request_id: null,
    });

    const body = makeBody({ transaction_status: "settlement" });
    body.signature_key = sign(body);

    const res = await POST(makeRequest(body));

    expect(res.status).toBe(200);
    expect(mocks.from).not.toHaveBeenCalledWith("commissions");
  });

  test("missing fields returns 400", async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
  });

  test("payment not found returns 404", async () => {
    mocks.paymentData = null;
    mocks.from.mockImplementation(() => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
      update: mocks.update,
    }));
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const body = makeBody({ transaction_status: "settlement" });
    body.signature_key = sign(body);

    const res = await POST(makeRequest(body));

    expect(res.status).toBe(404);
  });
});
