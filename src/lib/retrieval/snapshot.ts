// Corpus snapshot id (D-9), computed exactly as tools/check_corpus.py prints it: sha256 over the sorted document
// hashes then the sorted private-tier file hashes, newline-joined. corpus:index runs corpus:check first, so the
// manifest it hashes has just been verified against the files.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

type Manifest = { documents: { sha256: string }[]; private: Record<string, string> };

export function snapshotId(manifestPath = 'corpus/manifest.json'): string {
  const m = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  const parts = [...m.documents.map((d) => d.sha256).sort(), ...Object.values(m.private).sort()];
  return `sha256:${createHash('sha256').update(parts.join('\n')).digest('hex')}`;
}
