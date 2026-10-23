// Cohen's κ (task 3.5; no donor has it, 🔵 NEW). Pure. κ = (pₒ − pₑ) / (1 − pₑ), with pₑ from each rater's marginals.
// When pₑ = 1 (both raters used the same single label), κ is 0/0 and is returned as null beside the raw agreement,
// never coerced to 1 or 0 (D-36).
export const KAPPA_TARGET = 0.7;

export function cohenKappa<L extends string>(a: readonly L[], b: readonly L[], labels: readonly L[]) {
  if (a.length !== b.length) throw new Error(`kappa: ${a.length} vs ${b.length} ratings`);
  if (a.length === 0) throw new Error('kappa: no ratings');
  for (const x of [...a, ...b]) if (!labels.includes(x)) throw new Error(`kappa: label ${x} not in [${labels.join(', ')}]`);
  const n = a.length;
  const observed = a.filter((x, i) => x === b[i]).length / n;
  const expected = labels.reduce((s, l) => s + (a.filter((x) => x === l).length / n) * (b.filter((x) => x === l).length / n), 0);
  const kappa = expected === 1 ? null : (observed - expected) / (1 - expected);
  return { kappa, observed, expected, n };
}
