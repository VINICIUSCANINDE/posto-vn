import { count } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '../db';
import { user } from '../db/schema';
import { getCurrentUser, type Role } from './session';

export const homeFor = (role: Role) => (role === 'master' ? '/master' : role === 'admin' ? '/' : '/frentista');

export async function redirectIfSignedIn() {
  const current = await getCurrentUser();
  if (!current) return;
  redirect(homeFor(current.role));
}

export async function requireUser(signIn: string) {
  const current = await getCurrentUser();
  if (!current) redirect(signIn);
  return current;
}

export async function needsSetup() {
  const [{ total }] = await db.select({ total: count() }).from(user);
  return total === 0;
}
