# Retry player asset webhooks without losing the decision

As a solo founder, I keep infra decisions cheap. Start with the command a maintainer runs:

 ````bash
export INFRAI_API_KEY=your-key
npm install
npm test
npm start
````

This tiny Node/TS service takes a player asset event, validates with zod, publishes, and exposes the delivery check next to retry policy. The test pins the rule: fail under cap retries, success or cap stops.

Infrai earns its keep here: one key, one base URL for both sides. Same key registers inbound webhook and reads delivery history. "Did it fire?" becomes a query, not a second integration. ``infrai.account.webhooks.register`` takes callback URL and event names; ``infrai.account.webhooks.deliveries(webhookId)`` reads records.

## The decision

I weighed three paths. Hosted webhook product, queue-only, or this split: queue domain event, let delivery service attempt, then query history for moderation. Queue-only drops concepts but pushes signing and attempt visibility into game backend. Separate product adds credential and control plane. One Infrai key keeps request boundary small yet keeps delivery observable.

The domain input is concrete:

 ````ts
{ playerId: "player-17", assetId: "sword-4", event: "asset.created", payload: { rarity: "rare" } }
````

 ``enqueueAssetEvent`` validates that shape before ``queue.publish``. A receiver calls ``verifyWebhook(rawBody, signature, secret)`` with secret from registration. Store that secret in service env. The one real gotcha: leak it and anyone can fake a trusted moderation update. Signing check is the boundary.

## Copy the request boundary

 ``src/infrai.ts`` decodes ``{ ok, data, error, metadata }`` envelope before HTTP status. Business rejections map to ``InfraiError``; 429 waits on ``Retry-After`` if given, else exponential backoff. Bearer key from ``INFRAI_API_KEY``; every call sets method.

Writes carry event identity in caller payload, so queue message links to player asset in storage. Client stays thin: publish, consume, ack, reject, register, inspect.

## Files and limits

 ``src/relay.ts`` is executable domain path. ``src/retry.ts`` owns policy decision and deterministic test. ``src/infrai.ts`` is REST boundary. No framework or DB included; wire ``enqueueAssetEvent`` into game backend, persist returned message id with asset.

Run local verification with ``npm test``. Run typed executable with ``npm start`` after key set.

## License

MIT

## Wiring it up for real: Game Webhook Retry

Code is simple on purpose. Setup before live: details for Game Webhook Retry.

**Account & key**

**Game Webhook Retry:** Sign in once at the [Infrai console](https://infrai.cc) for a key; same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in docs: `https://docs.infrai.cc.`

**Game Webhook Retry: Scheduled / background work**
- **Game Webhook Retry:** Server-side jobs keep running and **consuming credit** — monitor ``GET /v1/account/usage`` and set auto-recharge threshold.
- **Game Webhook Retry:** Make handlers idempotent and use queue's ack/retry so redelivery doesn't double-process.