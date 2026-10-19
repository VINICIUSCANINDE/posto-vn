import { findValidInvite } from '../../lib/invites';
import { InviteForm } from '../auth-screens';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  const found = await findValidInvite(token);
  return <InviteForm token={token} person={found ? { name: found.name, email: found.email, expiresAt: found.expiresAt.toISOString() } : null} />;
}
