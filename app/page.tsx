import { redirect } from 'next/navigation';
import { requireUser } from '../lib/routing';
import Dashboard from './dashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const current = await requireUser('/entrar');
  if (current.role !== 'admin') redirect('/frentista');
  return <Dashboard />;
}
