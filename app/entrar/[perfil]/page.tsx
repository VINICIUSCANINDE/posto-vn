import { notFound } from 'next/navigation';
import { needsSetup, redirectIfSignedIn } from '../../../lib/routing';
import { LoginForm, type Perfil } from '../../auth-screens';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ perfil: string }> }) {
  const { perfil } = await params;
  if (perfil !== 'administrador' && perfil !== 'colaborador') notFound();
  await redirectIfSignedIn();
  return <LoginForm perfil={perfil as Perfil} needsSetup={perfil === 'administrador' && (await needsSetup())} />;
}
