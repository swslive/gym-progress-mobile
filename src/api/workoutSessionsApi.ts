import { apiRequest } from './client';
import type { WorkoutSession, WorkoutSet, WeightUnit } from './types';

export function listWorkoutSessions(token: string) {
  return apiRequest<{ workout_sessions: WorkoutSession[] }>('/workout-sessions', {}, token);
}

export function startWorkoutSession(token: string, workoutId: number, notes?: string) {
  return apiRequest<{ workout_session: WorkoutSession }>('/workout-sessions', {
    method: 'POST',
    body: JSON.stringify({ workout_id: workoutId, notes: notes || null }),
  }, token);
}

export function showWorkoutSession(token: string, sessionId: number) {
  return apiRequest<{ workout_session: WorkoutSession }>(`/workout-sessions/${sessionId}`, {}, token);
}

export function completeWorkoutSession(token: string, sessionId: number, notes?: string) {
  return apiRequest<{ workout_session: WorkoutSession }>(`/workout-sessions/${sessionId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ notes: notes || null }),
  }, token);
}

export function addWorkoutSet(token: string, sessionId: number, body: {
  exercise_id: number;
  reps: number;
  weight: number;
  weight_unit: WeightUnit;
  notes?: string | null;
}) {
  return apiRequest<{ workout_set: WorkoutSet }>(`/workout-sessions/${sessionId}/sets`, {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

export function updateWorkoutSet(token: string, sessionId: number, setId: number, body: {
  reps?: number;
  weight?: number;
  weight_unit?: WeightUnit;
  notes?: string | null;
}) {
  return apiRequest<{ workout_set: WorkoutSet }>(`/workout-sessions/${sessionId}/sets/${setId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }, token);
}

export function deleteWorkoutSet(token: string, sessionId: number, setId: number) {
  return apiRequest(`/workout-sessions/${sessionId}/sets/${setId}`, { method: 'DELETE' }, token);
}
