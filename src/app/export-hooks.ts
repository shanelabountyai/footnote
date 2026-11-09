import { moduleExportTables } from '@/app/modules';
import type { ExportTable } from '@/core/tenancy/export';

// Clone-owned (v1.6.0), like org-hooks.ts: which tables a data export holds beyond the template's core ones
// (addendum §5). Add one entry per org-owned table, selecting only columns that are safe to hand over: never a
// sealed column, token hash or recovery code (INV-34 scans the output). Every query runs inside withOrg.
//   { name: 'Booking', rows: (tx, orgId) => tx.booking.findMany({ where: { orgId }, select: { id: true, startsAt: true } }) },
export const exportTables: readonly ExportTable[] = [
  ...moduleExportTables,
  // D-55: footnote's org tables. Whole rows where no column is secret; CorpusChunk's `tsv` is Unsupported, so Prisma
  // leaves it out, and the embedding vectors live in ChunkEmbedding (no orgId), so neither is exported.
  { name: 'CorpusChunk', rows: (tx, orgId) => tx.corpusChunk.findMany({ where: { orgId } }) },
  { name: 'StaffRole', rows: (tx, orgId) => tx.staffRole.findMany({ where: { orgId } }) },
  { name: 'Answer', rows: (tx, orgId) => tx.answer.findMany({ where: { orgId } }) },
  // Never whole: keyHash is the credential's sha256 (D-48).
  { name: 'FootnoteApiKey', rows: (tx, orgId) => tx.footnoteApiKey.findMany({ where: { orgId }, select: { id: true, label: true, role: true, createdAt: true, revokedAt: true } }) },
];

// An org-owned table left out on purpose, with the reason. INV-34 fails on any model with an orgId column that is in
// neither list, so a new table cannot silently drop out of every export.
export const exportSkipped: Readonly<Record<string, string>> = {};
