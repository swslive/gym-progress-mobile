import { apiRequest } from './client';
import type { Workout, WorkoutTemplate } from './types';

export function listWorkouts(token: string) {
  return apiRequest<{ workouts: Workout[] }>('/workouts', {}, token);
}

export function showWorkout(token: string, workoutId: number) {
  return apiRequest<{ workout: Workout }>(`/workouts/${workoutId}`, {}, token);
}

export function createWorkout(token: string, body: { name: string; description?: string | null }) {
  return apiRequest<{ workout: Workout }>('/workouts', {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

export function updateWorkout(token: string, workoutId: number, body: { name: string; description?: string | null }) {
  return apiRequest<{ workout: Workout }>(`/workouts/${workoutId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }, token);
}

export function deleteWorkout(token: string, workoutId: number) {
  return apiRequest(`/workouts/${workoutId}`, { method: 'DELETE' }, token);
}

export function addWorkoutExercise(token: string, workoutId: number, body: { exercise_id: number; sort_order?: number; notes?: string | null }) {
  return apiRequest(`/workouts/${workoutId}/exercises`, {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

export function updateWorkoutExercise(token: string, workoutId: number, workoutExerciseId: number, body: { sort_order?: number; notes?: string | null }) {
  return apiRequest(`/workouts/${workoutId}/exercises/${workoutExerciseId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }, token);
}

export function removeWorkoutExercise(token: string, workoutId: number, workoutExerciseId: number) {
  return apiRequest(`/workouts/${workoutId}/exercises/${workoutExerciseId}`, { method: 'DELETE' }, token);
}

export function listWorkoutTemplates(token: string) {
  return apiRequest<{ workout_templates: WorkoutTemplate[] }>('/workout-templates', {}, token);
}

export function copyWorkoutTemplate(token: string, templateId: number, body: { name?: string; description?: string | null }) {
  return apiRequest<{ workout: Workout }>(`/workout-templates/${templateId}/copy`, {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}
