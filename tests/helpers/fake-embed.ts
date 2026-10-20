import { EMBED_DIM, type Embedder } from '@/lib/retrieval/voyage';

/** Bag-of-words hashed into EMBED_DIM and normalized: deterministic, no network, no spend. */
export const fakeEmbed: Embedder = async (texts) =>
  texts.map((t) => {
    const v = new Array<number>(EMBED_DIM).fill(0);
    for (const w of t.toLowerCase().match(/[a-z]+/g) ?? []) {
      let h = 0;
      for (const ch of w) h = (h * 31 + ch.charCodeAt(0)) % EMBED_DIM;
      v[h]! += 1;
    }
    const n = Math.hypot(...v) || 1;
    return v.map((x) => x / n);
  });
