import { loginSchema, userSchema, type SessionUser } from '../types/api';
import { api } from './api';
export async function authenticate(email: string, password: string): Promise<SessionUser> {
  const response = loginSchema.parse(await api.post<unknown>('/auth/login', { email, password }));
  api.setSession(response.accessToken);
  return response.user;
}
export async function endSession(): Promise<void> {
  await api.post('/auth/logout');
  api.setSession(null);
}
export async function currentUser(): Promise<SessionUser> {
  return userSchema.parse(await api.get('/auth/me'));
}
