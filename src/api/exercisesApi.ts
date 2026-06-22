import { apiRequest } from './client';
import type { Exercise, MuscleGroup } from './types';

export function listMuscleGroups(token: string) {
  return apiRequest<{ muscle_groups: MuscleGroup[] }>('/muscle-groups', {}, token);
}

export function listExercises(token: string, params: { search?: string; muscle_group_id?: number | null } = {}) {
  const query = new URLSearchParams();

  if (params.search) {
    query.set('search', params.search);
  }

  if (params.muscle_group_id) {
    query.set('muscle_group_id', String(params.muscle_group_id));
  }

  return apiRequest<{ exercises: Exercise[] }>(`/exercises${query.toString() ? `?${query}` : ''}`, {}, token);
}

export function createExercise(token: string, body: Partial<Exercise> & { name: string }) {
  return apiRequest<{ exercise: Exercise }>('/exercises', {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

export function updateExercise(token: string, exerciseId: number, body: Partial<Exercise>) {
  return apiRequest<{ exercise: Exercise }>(`/exercises/${exerciseId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }, token);
}

export function deleteExercise(token: string, exerciseId: number) {
  return apiRequest(`/exercises/${exerciseId}`, { method: 'DELETE' }, token);
}
