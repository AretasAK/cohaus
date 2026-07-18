/**
 * Splits an amount across participants proportional to their weights, using the
 * largest-remainder method so the shares always sum exactly to the total (no
 * missing/extra cents from rounding), which matters once shares get compared
 * for debt settlement.
 */
export function splitAmount(total: number, weights: number[]): number[] {
  const totalCents = Math.round(total * 100);
  const weightSum = weights.reduce((s, w) => s + w, 0) || 1;

  const raw = weights.map((w) => (totalCents * w) / weightSum);
  const floors = raw.map((r) => Math.floor(r));
  let remainder = totalCents - floors.reduce((s, f) => s + f, 0);

  const order = raw
    .map((r, i) => ({ i, frac: r - floors[i] }))
    .sort((a, b) => b.frac - a.frac);

  const cents = [...floors];
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) {
    cents[order[k].i] += 1;
  }

  return cents.map((c) => c / 100);
}
