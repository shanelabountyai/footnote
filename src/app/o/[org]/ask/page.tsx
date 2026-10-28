import { requireOrg } from '@/core/authz/guards';
import { AskForm } from './ask-form';

export const metadata = { title: 'Ask' };

/** Task 4.3: the one UI page. The form posts to POST /api/answers with the session cookie; the role is the server's, never the form's (D-12). */
export default async function Ask({ params }: { params: Promise<{ org: string }> }) {
  const ctx = await requireOrg((await params).org);
  return (
    <main>
      <h1>Ask</h1>
      <AskForm org={ctx.slug} />
    </main>
  );
}
