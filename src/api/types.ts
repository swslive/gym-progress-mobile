export type WeightUnit = 'kg' | 'lb';

export type Verification = {
  required: boolean;
  channel?: 'email' | 'phone';
};

export type UserModel = {
  id: number;
  name: string;
  email: string;
  phone_number?: string | null;
  verification_channel?: 'email' | 'phone';
  weight_unit: WeightUnit;
};

export type MuscleGroup = {
  id: number;
  name: string;
  slug?: string;
  description?: string | null;
};

export type Exercise = {
  id: number;
  name: string;
  muscle_group?: MuscleGroup | string | null;
  muscle_group_id?: number | null;
  muscleGroup?: MuscleGroup | null;
  equipment_type?: string | null;
  description?: string | null;
  image_path?: string | null;
  is_custom: boolean;
};

export type WorkoutExercise = {
  id?: number;
  workout_exercise_id?: number;
  workout_id?: number;
  exercise_id: number;
  sort_order: number;
  notes?: string | null;
  name?: string | null;
  muscle_group?: string | null;
  equipment_type?: string | null;
  description?: string | null;
  image_path?: string | null;
  is_custom?: boolean;
  exercise?: Exercise;
};

export type Workout = {
  id: number;
  name: string;
  description?: string | null;
  exercises_count?: number;
  exercises?: WorkoutExercise[];
  workout_exercises?: WorkoutExercise[];
  workoutExercises?: WorkoutExercise[];
};

export type WorkoutTemplate = {
  id: number;
  name: string;
  description?: string | null;
};

export type WorkoutSet = {
  id: number;
  workout_session_id: number;
  exercise_id: number;
  set_number: number;
  reps: number;
  weight_kg: number;
  display_weight: number;
  display_weight_unit: WeightUnit;
  notes?: string | null;
  exercise?: Exercise;
};

export type SessionExercise = {
  workout_exercise_id?: number;
  exercise_id: number;
  name?: string | null;
  muscle_group?: string | null;
  equipment_type?: string | null;
  description?: string | null;
  image_path?: string | null;
  sort_order: number;
  notes?: string | null;
  sets: WorkoutSet[];
};

export type WorkoutSession = {
  id: number;
  workout_id: number;
  started_at: string;
  completed_at?: string | null;
  notes?: string | null;
  total_sets?: number;
  is_editable?: boolean;
  workout?: Workout | null;
  exercises?: SessionExercise[];
  workout_sets?: WorkoutSet[];
};

export type ProgressSummary = {
  exercise: Exercise;
  total_sets: number;
  total_reps: number;
  max_weight_kg?: number;
  display_max_weight?: number;
  display_weight_unit?: WeightUnit;
  latest_set?: WorkoutSet | null;
};
