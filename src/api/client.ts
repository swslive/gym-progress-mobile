declare const process: {
  env: Record<string, string | undefined>;
};

const fallbackApiBaseUrl = 'https://apigymapp.local/api';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || fallbackApiBaseUrl).replace(/\/$/, '');
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[] | string>;
};

export class ApiError extends Error {
  errors?: Record<string, string[] | string>;
  status?: number;

  constructor(message: string, errors?: Record<string, string[] | string>, status?: number) {
    super(message);
    this.errors = errors;
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const payload = (await response.json().catch(() => ({
    success: false,
    message: 'The API returned an unreadable response.',
  }))) as ApiEnvelope<T>;

  if (!response.ok || payload.success === false) {
    throw new ApiError(payload.message || 'API request failed.', payload.errors, response.status);
  }

  return (payload.data ?? ({} as T)) as T;
}

export function compactError(error: unknown): string {
  if (error instanceof ApiError && error.errors) {
    const first = Object.values(error.errors).flat()[0];
    return typeof first === 'string' ? first : error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong.';
}
