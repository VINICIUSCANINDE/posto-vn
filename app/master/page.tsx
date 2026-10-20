import { redirect } from 'next/navigation';
import { homeFor, requireUser } from '../../lib/routing';
import Master from './master';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const current = await requireUser('/entrar/administrador');
  if (current.role !== 'master') redirect(homeFor(current.role));
  return <Master />;
}
