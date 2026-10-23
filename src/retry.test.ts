import test from "node:test";
import assert from "node:assert/strict";
import { shouldRetry } from "./retry.ts";

test("a failed delivery retries until the configured attempt cap", () => {
  assert.equal(shouldRetry([{ attempt: 1, accepted: false }], 3), true);
  assert.equal(shouldRetry([{ attempt: 1, accepted: false }, { attempt: 2, accepted: false }, { attempt: 3, accepted: false }], 3), false);
  assert.equal(shouldRetry([{ attempt: 1, accepted: true }], 3), false);
});
