import { z } from "zod";
import { infrai, sign } from "./infrai.ts";
import { shouldRetry } from "./retry.ts";

const assetEvent = z.object({ playerId: z.string().min(1), assetId: z.string().min(1), event: z.enum(["asset.created", "asset.flagged"]), payload: z.record(z.unknown()) });
type AssetEvent = z.infer<typeof assetEvent>;

export async function enqueueAssetEvent(input: unknown): Promise<string> {
  const event: AssetEvent = assetEvent.parse(input);
  const result = await infrai.queue.publish(event);
  return result.message_id;
}

export function verifyWebhook(rawBody: string, signature: string, secret: string): boolean { return sign(rawBody, secret) === signature; }

export async function inspectDelivery(webhookId: string) {
  return infrai.account.webhooks.deliveries(webhookId);
}

export { shouldRetry };

if (process.argv[1]?.endsWith("relay.ts")) {
  const event = { playerId: "player-17", assetId: "sword-4", event: "asset.created", payload: { rarity: "rare" } };
  enqueueAssetEvent(event).then((id) => console.log(`queued ${id}`)).catch((error) => { console.error(error); process.exitCode = 1; });
}
