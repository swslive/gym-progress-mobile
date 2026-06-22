import { apiRequest } from './client';
import type { UserModel, Verification, WeightUnit } from './types';

export function register(body: {
  name: string;
  email: string;
  phone_number?: string;
  verification_channel: 'email' | 'phone';
  password: string;
}) {
  return apiRequest<{ user: UserModel; token: string; verification: Verification }>('/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function login(email: string, password: string) {
  return apiRequest<{ user: UserModel; token: string; verification: Verification }>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function me(token: string) {
  return apiRequest<{ user: UserModel; verification: Verification }>('/me', {}, token);
}

export function updateMe(token: string, body: { name: string; weight_unit: WeightUnit }) {
  return apiRequest<{ user: UserModel; verification: Verification }>('/me', {
    method: 'PUT',
    body: JSON.stringify(body),
  }, token);
}

export function logout(token: string) {
  return apiRequest('/logout', { method: 'POST' }, token);
}

export function verify(token: string, channel: 'email' | 'phone', code: string) {
  return apiRequest<{ user: UserModel }>(channel === 'phone' ? '/verify-phone' : '/verify-email', {
    method: 'POST',
    body: JSON.stringify({ code }),
  }, token);
}

export function resendVerification(token: string) {
  return apiRequest<{ verification: Verification }>('/resend-verification', { method: 'POST' }, token);
}
