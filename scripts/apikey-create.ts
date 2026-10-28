// `npm run apikey:create -- --org=<slug> --label=<text>` (task 4.1, D-48): stores the sha256 of a new service key and
// prints the key once, to stdout only. It is not logged, not stored, and cannot be shown again; a lost key is revoked
// (`revokedAt`) and replaced.
import { db } from '@/core/db';
import { hashToken, newToken } from '@/core/tokens';

const arg = (k: string) => new RegExp(`--${k}=(.+)`).exec(process.argv.slice(2).find((a) => a.startsWith(`--${k}=`)) ?? '')?.[1];
const slug = arg('org');
const label = arg('label');
if (!slug || !label) { console.error('usage: npm run apikey:create -- --org=<slug> --label=<text>'); process.exit(2); }

const org = await db.org.findUnique({ where: { slug }, select: { id: true } });
if (!org) { console.error(`no org "${slug}"`); process.exit(1); }
const key = `fn_${newToken()}`;
const row = await db.apiKey.create({ data: { orgId: org.id, label, keyHash: hashToken(key) } });
await db.$disconnect();
console.error(`service key ${row.id} for ${slug} ("${label}"); shown once, store it now:`);
console.log(key);
