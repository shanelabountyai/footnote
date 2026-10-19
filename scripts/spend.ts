// `npm run spend` — spent / remaining by purpose from ModelCall rows (D-18, D-23). Zero model calls.
// Exits 1 when config/prices.json is older than 60 days: a stale price table is not allowed to price a run.
import { db } from '@/core/db';
import { CAPS_MICRO_USD } from '@/lib/spend/budget';
import { PRICE_MAX_AGE_DAYS, priceAgeDays, prices } from '@/lib/spend/prices';

const usd = (micro: number) => `$${(micro / 1e6).toFixed(4)}`;
const rows = await db.modelCall.groupBy({ by: ['purpose', 'outcome'], _count: { _all: true }, _sum: { costMicroUsd: true, inputTokens: true, outputTokens: true } });
let spent = 0;
console.log('purpose  outcome          calls   in-tokens  out-tokens   cost');
for (const r of rows) {
  const cost = r._sum.costMicroUsd ?? 0;
  if (r.outcome === 'ok') spent += cost;
  console.log(`${r.purpose.padEnd(8)} ${r.outcome.padEnd(16)} ${String(r._count._all).padStart(5)} ${String(r._sum.inputTokens ?? 0).padStart(11)} ${String(r._sum.outputTokens ?? 0).padStart(11)}   ${usd(cost)}${r.outcome === 'ok' ? '' : ' (refused, not spent)'}`);
}
if (!rows.length) console.log('(no model calls logged)');
console.log(`\nspent ${usd(spent)} of ${usd(CAPS_MICRO_USD.build)} build cap — remaining ${usd(CAPS_MICRO_USD.build - spent)}; per-run cap ${usd(CAPS_MICRO_USD.run)}, per-answer cap ${usd(CAPS_MICRO_USD.answer)}`);
const age = priceAgeDays();
console.log(`prices checked ${prices.checkedAt} (${age} days ago)`);
await db.$disconnect();
if (age > PRICE_MAX_AGE_DAYS) {
  console.error(`WARNING: config/prices.json is ${age} days old (> ${PRICE_MAX_AGE_DAYS}); re-read the vendor pages and update checkedAt before any run`);
  process.exit(1);
}
