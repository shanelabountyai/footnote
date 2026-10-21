// The one Anthropic Messages call (D-19a: plain fetch, no SDK). Used by the composer and the judge only; the
// answer-path lint in permissions:verify holds that. The key is read from process.env at call time (O-12).
import { fetchWithRetry } from '@/lib/retrieval/voyage';

const URL = 'https://api.anthropic.com/v1/messages';

export function anthropicKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set — paste it into .env.local (O-12)');
  return key;
}

/** One non-streaming call; returns the joined text blocks and the billed token counts. Throws on a non-2xx reply. */
export async function callMessages(m: { model: string; maxTokens: number; system: string; user: string }) {
  const key = anthropicKey();
  const res = await fetchWithRetry(() => fetch(URL, {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: m.model, max_tokens: m.maxTokens, system: m.system, messages: [{ role: 'user', content: m.user }] }),
  }));
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as { content: { type: string; text?: string }[]; usage: { input_tokens: number; output_tokens: number } };
  return { text: body.content.filter((b) => b.type === 'text').map((b) => b.text).join(''), inputTokens: body.usage.input_tokens, outputTokens: body.usage.output_tokens };
}
