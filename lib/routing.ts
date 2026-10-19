import { count } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '../db';
import { user } from '../db/schema';
import { getCurrentUser } from './session';

export async function redirectIfSignedIn() {
  const current = await getCurrentUser();
  if (!current) return;
  redirect(current.role === 'admin' ? '/' : '/frentista');
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
