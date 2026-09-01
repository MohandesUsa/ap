/** Phase 16: pluggable SMS provider — adding a second provider later means implementing this
 *  interface, not touching any route or the settings schema (which is provider-agnostic
 *  key/value already). */
export interface SmsTestResult {
  connected: boolean;
  detail: string;
}

export interface SmsProvider {
  testConnection(): Promise<SmsTestResult>;
  sendSms(to: string, text: string): Promise<{ sent: boolean; detail: string }>;
}

/**
 * MeliPayamak REST panel API (https://rest.payamak-panel.com) — the "simple username/password"
 * variant, the most commonly used one for the plain send/credit endpoints. UNVERIFIED against a
 * real MeliPayamak account in this environment (no credentials, no internet access to confirm the
 * exact live response shape) — verify field/endpoint names against your account's current API
 * documentation (console.melipayamak.com) before relying on this in production. GetCredit is used
 * for the connection test specifically because it's read-only — it costs nothing and sends no SMS,
 * unlike calling SendSMS just to "test" the connection would.
 */
export class MeliPayamakProvider implements SmsProvider {
  private readonly username: string;
  private readonly password: string;
  private readonly sender: string;

  constructor(username: string, password: string, sender: string) {
    this.username = username;
    this.password = password;
    this.sender = sender;
  }

  async testConnection(): Promise<SmsTestResult> {
    try {
      const res = await fetch('https://rest.payamak-panel.com/api/SendSMS/GetCredit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: this.username, password: this.password }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body) return { connected: false, detail: `پاسخ نامعتبر از ملی‌پیامک (HTTP ${res.status}).` };
      // MeliPayamak's convention: a positive numeric Value on success, a small negative
      // RetStatus/Value code on failure (invalid credentials, etc.).
      const credit = body.Value ?? body.value;
      if (typeof credit === 'number' && credit >= 0) {
        return { connected: true, detail: `اتصال برقرار است. اعتبار باقی‌مانده: ${credit}` };
      }
      return { connected: false, detail: `ملی‌پیامک خطا برگرداند: ${JSON.stringify(body)}` };
    } catch (err) {
      return { connected: false, detail: `خطا در اتصال به ملی‌پیامک: ${(err as Error).message}` };
    }
  }

  async sendSms(to: string, text: string): Promise<{ sent: boolean; detail: string }> {
    try {
      const res = await fetch('https://rest.payamak-panel.com/api/SendSMS/SendSMS', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: this.username, password: this.password, to, from: this.sender, text, isFlash: false }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body) return { sent: false, detail: `پاسخ نامعتبر از ملی‌پیامک (HTTP ${res.status}).` };
      const recId = body.Value ?? body.value;
      if (typeof recId === 'number' && recId > 0) return { sent: true, detail: `شناسه پیامک: ${recId}` };
      return { sent: false, detail: `ملی‌پیامک خطا برگرداند: ${JSON.stringify(body)}` };
    } catch (err) {
      return { sent: false, detail: `خطا در ارسال پیامک: ${(err as Error).message}` };
    }
  }
}
