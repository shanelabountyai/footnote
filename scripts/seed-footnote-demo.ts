import { db } from '@/core/db'; // importing it is what refuses a cloud database
import type { FootnoteRole } from '@/generated/prisma/enums';

// Demo staff for the Ledger & Lane org that corpus:index creates (task 4.5). Synthetic people, no TOTP, `isDemo` so /demo lists them
// (a demo session resolves only while DEMO_MODE=1). The StaffRole row is what the answer API reads (D-12, D-26).
const STAFF: [string, FootnoteRole][] = [['partner', 'partner'], ['bookkeeper', 'bookkeeper'], ['frontdesk', 'front_desk']];

const org = await db.org.findUnique({ where: { slug: 'ledger-lane' } });
if (!org) throw new Error('No ledger-lane org. Run npm run corpus:index first.');
for (const [name, role] of STAFF) {
  const email = `${name}@ledgerlane.demo.test`;
  const user = await db.user.upsert({ where: { email }, create: { email, isDemo: true, name: `${name} (Ledger & Lane)` }, update: { isDemo: true } });
  await db.membership.upsert({ where: { orgId_userId: { orgId: org.id, userId: user.id } }, create: { orgId: org.id, userId: user.id, role: 'member' }, update: {} });
  await db.staffRole.upsert({ where: { orgId_userId: { orgId: org.id, userId: user.id } }, create: { orgId: org.id, userId: user.id, role }, update: { role } });
  console.log(`${email}  ${role}`);
}
await db.$disconnect();
