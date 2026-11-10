import { User, UserRole } from '../types/models';
import { apiFetch } from './client';

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: Exclude<UserRole, 'admin'>;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export function registerApi(payload: RegisterPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function loginApi(payload: LoginPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function meApi(): Promise<User> {
  return apiFetch<User>('/auth/me');
}

export function healthApi(): Promise<{ status: string; db: string }> {
  return apiFetch<{ status: string; db: string }>('/health');
}
