export type DeliveryAttempt = { attempt: number; accepted: boolean };

export function shouldRetry(attempts: DeliveryAttempt[], maxAttempts: number): boolean {
  const last = attempts.at(-1);
  return Boolean(last && !last.accepted && attempts.length < maxAttempts);
}
