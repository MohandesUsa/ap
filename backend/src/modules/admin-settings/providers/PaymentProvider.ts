/** Phase 16: pluggable payment provider — a future BankProvider (or any other gateway) implements
 *  the same interface without touching routes or the settings schema. */
export interface PaymentTestResult {
  connected: boolean;
  detail: string;
}

export interface PaymentProvider {
  testConnection(): Promise<PaymentTestResult>;
}

/**
 * ZarinPal REST API v4 (https://api.zarinpal.com/pg/v4). UNVERIFIED against a real ZarinPal
 * merchant account in this environment (no credentials) — verify against zarinpal's current
 * documentation before production use. The connection test issues a real "payment request" for a
 * nominal amount (10,000 Rial, ZarinPal's typical minimum) — this is non-destructive and costs
 * nothing: a payment REQUEST only creates an "authority" token for a hypothetical checkout the
 * admin never completes, it does not move any money. A successful response (`data.code === 100`)
 * proves the merchant_id/api key are valid and ZarinPal is reachable, without a real transaction.
 */
export class ZarinpalProvider implements PaymentProvider {
  private readonly merchantId: string;
  private readonly sandbox: boolean;

  constructor(merchantId: string, sandbox: boolean = false) {
    this.merchantId = merchantId;
    this.sandbox = sandbox;
  }

  async testConnection(): Promise<PaymentTestResult> {
    const base = this.sandbox ? 'https://sandbox.zarinpal.com' : 'https://api.zarinpal.com';
    try {
      const res = await fetch(`${base}/pg/v4/payment/request.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: this.merchantId,
          amount: 10000,
          callback_url: 'https://example.com/payment/callback',
          description: 'TruckAccounting Admin — connection test',
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.data) {
        return { connected: false, detail: `پاسخ نامعتبر از زرین‌پال: ${JSON.stringify(body ?? {})} (HTTP ${res.status})` };
      }
      if (body.data.code === 100 && body.data.authority) {
        return { connected: true, detail: `اتصال برقرار است. Authority آزمایشی: ${body.data.authority}` };
      }
      return { connected: false, detail: `زرین‌پال خطا برگرداند: ${JSON.stringify(body.errors ?? body.data)}` };
    } catch (err) {
      return { connected: false, detail: `خطا در اتصال به زرین‌پال: ${(err as Error).message}` };
    }
  }
}
