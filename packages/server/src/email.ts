export interface EmailProvider {
  send(to: string, subject: string, text: string): Promise<void>;
}

export class LogEmailProvider implements EmailProvider {
  constructor(private readonly log: (message: string, meta?: Record<string, unknown>) => void) {}
  async send(to: string, subject: string, text: string): Promise<void> {
    this.log('[email] log-only provider', { to, subject, text });
  }
}

export class HttpApiEmailProvider implements EmailProvider {
  constructor(private readonly endpoint: string, private readonly apiKey: string, private readonly from: string) {}
  async send(to: string, subject: string, text: string): Promise<void> {
    const response = await fetch(`${this.endpoint.replace(/\/$/, '')}/v3/mail/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: this.from },
        subject,
        content: [{ type: 'text/plain', value: text }],
      }),
    });
    if (!response.ok) throw new Error(`Email API responded ${response.status}`);
  }
}
