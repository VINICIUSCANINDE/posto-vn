import { ResetForm } from '../auth-screens';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token = '', error } = await searchParams;
  return <ResetForm token={token} invalid={Boolean(error)} />;
}
