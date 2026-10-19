import { redirectIfSignedIn } from '../../lib/routing';
import { RoleChooser } from '../auth-screens';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await redirectIfSignedIn();
  return <RoleChooser />;
}
