import { api } from './client';
import type { AuthUser } from '@/types/user';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: AuthUser;
}

export const authApi = {
  login: (payload: LoginPayload) => api.post<LoginResponse>('/auth/login', payload),
  logout: () => api.post<{ message: string }>('/auth/logout'),
  me: () => api.get<{ user: AuthUser }>('/auth/me'),
};
