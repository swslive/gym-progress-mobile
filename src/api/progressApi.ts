import { apiRequest } from './client';
import type { ProgressSummary } from './types';

export function listProgress(token: string) {
  return apiRequest<{ exercises: ProgressSummary[] }>('/progress/exercises', {}, token);
}
