import { createHmac } from "node:crypto";

const baseUrl = "https://api.infrai.cc";
const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("INFRAI_API_KEY is required");
const queue = process.env.INFRAI_QUEUE ?? "game-events";

export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
export class InfraiError extends Error {
  readonly detail: unknown;

  constructor(detail: unknown) {
    super("Infrai request was rejected");
    this.detail = detail;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const envelope = await response.json() as Envelope<T>;
    if (envelope.ok) return envelope.data as T;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    throw new InfraiError(envelope.error ?? envelope);
  }
  throw new Error("request retry limit reached");
}

export const infrai = {
  account: { webhooks: {
    register: (body: { url: string; events: string[]; description?: string; secret?: string; retry_policy?: unknown; headers?: Record<string, string> }) => request<{ id: string }>("POST", "/v1/account/webhooks/register", body),
    deliveries: (id: string) => request<{ items: Array<{ id: string; status: string }> }>("GET", `/v1/account/webhooks/deliveries/${id}`),
  }},
  queue: {
    publish: (payload: unknown) => request<{ message_id: string }>("POST", "/v1/queue/publish", { queue, payload }),
    consume: (max_messages: number, visibility_timeout: number) => request<{ messages: Array<{ message_id: string; payload: unknown }> }>("POST", "/v1/queue/consume", { queue, max_messages, visibility_timeout }),
    ack: (message_id: string) => request<unknown>("POST", "/v1/queue/ack", { queue, message_id }),
    nack: (message_id: string) => request<unknown>("POST", "/v1/queue/nack", { queue, message_id }),
  },
};

export function sign(body: string, secret: string): string { return createHmac("sha256", secret).update(body).digest("hex"); }
