import { requireUser } from '../../lib/routing';
import Attendant from './attendant';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await requireUser('/entrar/colaborador');
  return <Attendant />;
}
