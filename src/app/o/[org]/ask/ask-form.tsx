'use client';
import { useState } from 'react';
import type { Answer } from '@/lib/answer/compose';

// One question, one answer; no history, no streaming. Everything shown comes from the API response.
export function AskForm({ org }: { org: string }) {
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/answers', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question, org }),
      });
      if (res.status === 201) setResult(await res.json());
      else setError(res.status === 409 ? 'The corpus changed since this page loaded. Reload and ask again.' : `The question could not be answered (HTTP ${res.status}).`);
    } catch {
      setError('The request failed. Try again.');
    }
    setBusy(false);
  }

  const byId = new Map(result?.citations.map((c) => [c.id, c]));
  return (
    <>
      <form onSubmit={submit}>
        <label>Question <textarea value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={2000} required rows={3} /></label>
        <button type="submit" disabled={busy || !question.trim()}>{busy ? 'Asking…' : 'Ask'}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {result && (
        <section aria-label="Answer">
          {result.refusal && <p role="status">{result.refusal.message}</p>}
          <ol>
            {result.sentences.map((s, i) => (
              <li key={i}>
                <p>{s.text}</p>
                {s.superseded && <p><em>{s.superseded}</em></p>}
                <ul>
                  {s.citations.map((cid) => {
                    const c = byId.get(cid);
                    return c && (
                      <li key={cid}>
                        {c.title}, {c.edition} (revised {c.revisionDate}), p. {c.location.page}
                        <blockquote>{c.quote}</blockquote>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
          <p><small>{result.disclaimer}</small></p>
          <p><small>Snapshot <code>{result.corpusSnapshot}</code></small></p>
        </section>
      )}
    </>
  );
}
