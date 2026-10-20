import { redirect } from 'next/navigation';
import { requireUser } from '../../lib/routing';
import Attendant from './attendant';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const current = await requireUser('/entrar/colaborador');
  if (current.role === 'master') redirect('/master');
  return <Attendant />;
}
