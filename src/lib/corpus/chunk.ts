// Chunker (Phase 1 task 1.6; D-10, D-25, O-3). Pure over the extracted text: the same input yields the same ids
// and texts. Heading-bounded, ≈ 350 tokens (approximated as words × 4/3; no tokenizer dependency), 15% overlap
// within a section, never inside a table row, one page per chunk. Ids are `<docId>:<page>:<ordinal>`.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const TIERS = ['public', 'staff', 'engagement', 'partner'] as const;
export type Tier = (typeof TIERS)[number];

export type Page = { docId: string; tier: Tier; page: number; text: string };

export type Chunk = {
  id: string;
  docId: string;
  tier: Tier;
  page: number;
  ordinal: number;
  /** The heading or table caption the chunk sits under, verbatim from the page; null before the first heading. */
  heading: string | null;
  /** D-25: a table region. A citation never spans one; a long table repeats its caption on every chunk. */
  isTable: boolean;
  text: string;
};

export const TARGET_WORDS = Math.round((350 * 3) / 4); // 262 words ≈ 350 tokens
export const OVERLAP_WORDS = Math.round(TARGET_WORDS * 0.15); // 39

const TABLE_CAPTION = /^Table [0-9A-Z][0-9A-Z-]*\./;
/** A bold run-in lead ("Semiweekly deposit period spanning 2 quarters (Form 941 filers). If you have …"). */
const RUN_IN = /^[A-Z][^.]{3,90}\. [A-Z]/;
/** Sentence boundary: terminal punctuation, whitespace, then a capital, digit, bullet or opening mark. */
const SENTENCE_END = /(?<=[.?!])\s+(?=[A-Z0-9•("])/;

/** A markdown heading, or a short title-case line with no trailing punctuation ("Deducting Business Expenses"). */
export function isHeading(line: string): boolean {
  if (/^#{1,6} /.test(line)) return true;
  if (!/^[A-Z][A-Za-z0-9 '’()/-]{1,70}$/.test(line)) return false;
  const words = line.split(' ');
  return words.length <= 10 && words.every((w) => w.length < 4 || /^[A-Z0-9(]/.test(w));
}

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

type Segment = { heading: string | null; isTable: boolean; lines: string[] };

/** Splits a page's lines at headings and table captions; the heading line stays as the segment's first line. */
function segment(lines: string[]): Segment[] {
  const segs: Segment[] = [];
  let cur: Segment = { heading: null, isTable: false, lines: [] };
  for (const line of lines) {
    if (TABLE_CAPTION.test(line)) {
      segs.push(cur);
      cur = { heading: line, isTable: true, lines: [] };
    } else if (cur.isTable ? RUN_IN.test(line) : isHeading(line)) {
      // ponytail: a table region runs to the next run-in lead or the end of the page. A title heading cannot end
      // it because a bare cell ("Friday") looks like one; the over-reach only makes a table chunk carry trailing prose.
      segs.push(cur);
      cur = { heading: cur.isTable ? null : line, isTable: false, lines: [] };
    }
    cur.lines.push(line);
  }
  segs.push(cur);
  return segs.filter((s) => s.lines.length);
}

/** Packs a segment's units (sentences, or table rows) into chunk texts under the word budget. */
function pack(seg: Segment): string[] {
  const units = seg.isTable ? seg.lines : seg.lines.join('\n').split(SENTENCE_END);
  const sep = seg.isTable ? '\n' : ' ';
  const out: string[] = [];
  let cur: string[] = [];
  let n = 0;
  for (const unit of units) {
    const w = wordCount(unit);
    if (cur.length && n + w > TARGET_WORDS) {
      out.push(cur.join(sep));
      if (seg.isTable) {
        cur = [seg.heading!]; // caption repeated, no row overlap (D-25)
        n = wordCount(seg.heading!);
      } else {
        const prev = cur; // 15% overlap: the trailing sentences of the chunk just closed
        cur = [];
        n = 0;
        for (let i = prev.length - 1; i >= 0 && n + wordCount(prev[i]!) <= OVERLAP_WORDS; i--) {
          cur.unshift(prev[i]!);
          n += wordCount(prev[i]!);
        }
      }
    }
    cur.push(unit);
    n += w;
  }
  if (cur.length) out.push(cur.join(sep));
  return out;
}

export function chunkPage(p: Page): Chunk[] {
  const lines = p.text.split('\n').map((l) => l.trim()).filter(Boolean);
  const chunks: Chunk[] = [];
  for (const seg of segment(lines)) {
    for (const text of pack(seg)) {
      if (wordCount(text) < 3) continue; // a bare heading with nothing under it on this page
      const ordinal = chunks.length + 1;
      chunks.push({ id: `${p.docId}:${p.page}:${ordinal}`, docId: p.docId, tier: p.tier, page: p.page, ordinal, heading: seg.heading, isTable: seg.isTable, text });
    }
  }
  return chunks;
}

export const chunkCorpus = (pages: Page[]): Chunk[] => pages.flatMap(chunkPage);

/** A private-tier memo (D-11): front-matter `docId` and `tier`; a missing or unknown tier fails closed. */
export function parseMemo(raw: string, name = 'memo'): Page {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  if (!m) throw new Error(`${name}: no front-matter`);
  const field = (k: string) => new RegExp(`^${k}: (.*)$`, 'm').exec(m[1]!)?.[1]?.trim();
  const docId = field('docId');
  const tier = field('tier') as Tier | undefined;
  if (!docId) throw new Error(`${name}: no docId`);
  if (!tier || !TIERS.includes(tier)) throw new Error(`${name}: tier '${tier}' not in ${TIERS.join(', ')}`);
  return { docId, tier, page: 1, text: m[2]! };
}

/** Every extracted public page (`corpus/text/<docId>/NNN.txt`) and every private memo (`corpus/private/**.md`). */
export function loadCorpus(root = 'corpus'): Page[] {
  const pages: Page[] = [];
  const text = join(root, 'text');
  for (const d of readdirSync(text, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
    for (const f of readdirSync(join(text, d)).filter((f) => f.endsWith('.txt')).sort()) {
      pages.push({ docId: d, tier: 'public', page: Number(f.slice(0, 3)), text: readFileSync(join(text, d, f), 'utf8') });
    }
  }
  const priv = join(root, 'private');
  for (const f of (readdirSync(priv, { recursive: true }) as string[]).filter((f) => f.endsWith('.md')).sort()) {
    pages.push(parseMemo(readFileSync(join(priv, f), 'utf8'), f));
  }
  return pages;
}
