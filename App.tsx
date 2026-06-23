import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import {
  Activity,
  BookOpen,
  Check,
  Clock,
  Dumbbell,
  History,
  ImageIcon,
  LogOut,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { API_ORIGIN, compactError } from './src/api/client';
import * as authApi from './src/api/authApi';
import * as exercisesApi from './src/api/exercisesApi';
import * as progressApi from './src/api/progressApi';
import * as sessionsApi from './src/api/workoutSessionsApi';
import * as workoutsApi from './src/api/workoutsApi';
import type {
  Exercise,
  MuscleGroup,
  ProgressSummary,
  SessionExercise,
  UserModel,
  Verification,
  WeightUnit,
  Workout,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
  WorkoutTemplate,
} from './src/api/types';

const TOKEN_KEY = 'gearforfit_auth_token';
const logo = require('./assets/gearforfit-logo.png');
const equipmentImage = require('./assets/gearforfit-equipment.webp');

type Screen = 'home' | 'start' | 'workouts' | 'workout-form' | 'session' | 'settings' | 'history';
type IconComponent = (props: { color?: string; size?: number }) => ReactNode;

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserModel | null>(null);
  const [verification, setVerification] = useState<Verification>({ required: false });
  const [booting, setBooting] = useState(true);
  const [message, setMessage] = useState('');

  const saveToken = useCallback(async (nextToken: string | null) => {
    setToken(nextToken);

    if (nextToken) {
      await AsyncStorage.setItem(TOKEN_KEY, nextToken);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  const refreshMe = useCallback(async (authToken = token) => {
    if (!authToken) {
      return;
    }

    const data = await authApi.me(authToken);
    setUser(data.user);
    setVerification(data.verification);
  }, [token]);

  useEffect(() => {
    async function boot() {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);

      if (!storedToken) {
        setBooting(false);
        return;
      }

      try {
        await saveToken(storedToken);
        const data = await authApi.me(storedToken);
        setUser(data.user);
        setVerification(data.verification);
      } catch {
        await saveToken(null);
      } finally {
        setBooting(false);
      }
    }

    boot();
  }, [saveToken]);

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timeout = setTimeout(() => setMessage(''), 3200);

    return () => clearTimeout(timeout);
  }, [message]);

  const handleLogout = useCallback(async () => {
    try {
      if (token) {
        await authApi.logout(token);
      }
    } finally {
      await saveToken(null);
      setUser(null);
      setVerification({ required: false });
      setMessage('');
    }
  }, [saveToken, token]);

  if (booting) {
    return (
      <Shell>
        <CenterPanel text="Loading GearForFit App" />
      </Shell>
    );
  }

  if (!token || !user) {
    return (
      <AuthScreen
        onAuthenticated={async (nextToken, nextUser, nextVerification) => {
          await saveToken(nextToken);
          setUser(nextUser);
          setVerification(nextVerification);
        }}
      />
    );
  }

  if (verification.required) {
    return (
      <VerificationScreen
        token={token}
        user={user}
        verification={verification}
        onVerified={async () => {
          await refreshMe(token);
          setVerification({ required: false, channel: verification.channel });
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <MainApp
      token={token}
      user={user}
      message={message}
      onMessage={setMessage}
      onUserChanged={setUser}
      onRefreshMe={refreshMe}
      onLogout={handleLogout}
    />
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {children}
    </SafeAreaView>
  );
}

function AuthScreen({
  onAuthenticated,
}: {
  onAuthenticated: (token: string, user: UserModel, verification: Verification) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone_number: '',
    password: '',
    verification_channel: 'email' as 'email' | 'phone',
  });

  async function submit() {
    setLoading(true);
    setError('');

    try {
      const data = mode === 'login'
        ? await authApi.login(form.email.trim(), form.password)
        : await authApi.register({
            name: form.name.trim(),
            email: form.email.trim(),
            phone_number: form.verification_channel === 'phone' ? form.phone_number.trim() : undefined,
            verification_channel: form.verification_channel,
            password: form.password,
          });

      onAuthenticated(data.token, data.user, data.verification ?? { required: false });
    } catch (submitError) {
      setError(compactError(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <ScrollView contentContainerStyle={styles.authLayout}>
        <ImageBackground source={equipmentImage} imageStyle={styles.heroImage} style={styles.authHero}>
          <View style={styles.heroShade}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            <Text style={styles.heroTitle}>GearForFit App</Text>
            <Text style={styles.heroText}>Build workouts, start sessions, and track your progress.</Text>
          </View>
        </ImageBackground>

        <View style={styles.panel}>
          <SegmentedControl
            options={[
              { key: 'login', label: 'Login' },
              { key: 'register', label: 'Register' },
            ]}
            value={mode}
            onChange={(value) => {
              setMode(value as 'login' | 'register');
              setError('');
            }}
          />

          {mode === 'register' ? (
            <TextInput style={styles.input} placeholder="Name" placeholderTextColor={colors.steel} value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} />
          ) : null}

          <TextInput autoCapitalize="none" keyboardType="email-address" style={styles.input} placeholder="Email" placeholderTextColor={colors.steel} value={form.email} onChangeText={(email) => setForm((current) => ({ ...current, email }))} />

          {mode === 'register' ? (
            <>
              <SegmentedControl
                options={[
                  { key: 'email', label: 'Email code' },
                  { key: 'phone', label: 'SMS code' },
                ]}
                value={form.verification_channel}
                onChange={(verification_channel) => setForm((current) => ({ ...current, verification_channel: verification_channel as 'email' | 'phone' }))}
              />
              {form.verification_channel === 'phone' ? (
                <TextInput keyboardType="phone-pad" style={styles.input} placeholder="Phone number, e.g. +16475551234" placeholderTextColor={colors.steel} value={form.phone_number} onChangeText={(phone_number) => setForm((current) => ({ ...current, phone_number }))} />
              ) : null}
            </>
          ) : null}

          <TextInput secureTextEntry style={styles.input} placeholder="Password" placeholderTextColor={colors.steel} value={form.password} onChangeText={(password) => setForm((current) => ({ ...current, password }))} />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <PrimaryButton icon={mode === 'login' ? ShieldCheck : User} label={mode === 'login' ? 'Login' : 'Create account'} loading={loading} onPress={submit} />
        </View>
      </ScrollView>
    </Shell>
  );
}

function VerificationScreen({
  token,
  user,
  verification,
  onVerified,
  onLogout,
}: {
  token: string;
  user: UserModel;
  verification: Verification;
  onVerified: () => Promise<void>;
  onLogout: () => void;
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const channel = verification.channel ?? user.verification_channel ?? 'email';

  async function verifyCode() {
    setLoading(true);
    setError('');

    try {
      await authApi.verify(token, channel, code);
      await onVerified();
    } catch (verifyError) {
      setError(compactError(verifyError));
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setLoading(true);
    setError('');
    setNotice('');

    try {
      await authApi.resendVerification(token);
      setNotice('A new verification code was sent.');
    } catch (resendError) {
      setError(compactError(resendError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <ScrollView contentContainerStyle={styles.centerLayout}>
        <Image source={logo} style={styles.logoDark} resizeMode="contain" />
        <View style={styles.roundBadge}><ShieldCheck color={colors.red} size={26} /></View>
        <Text style={styles.screenTitle}>Verify your {channel === 'phone' ? 'phone number' : 'email'}</Text>
        <Text style={styles.screenText}>Enter the 6-digit code sent to {channel === 'phone' ? user.phone_number : user.email}.</Text>
        <TextInput keyboardType="number-pad" maxLength={6} style={[styles.input, styles.codeInput]} placeholder="000000" placeholderTextColor={colors.steel} value={code} onChangeText={setCode} />
        {notice ? <Text style={styles.successText}>{notice}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton icon={Check} label="Verify account" loading={loading} onPress={verifyCode} />
        <SecondaryButton icon={RefreshCw} label="Resend code" onPress={resend} />
        <SecondaryButton icon={LogOut} label="Logout" onPress={onLogout} />
      </ScrollView>
    </Shell>
  );
}

function MainApp({
  token,
  user,
  message,
  onMessage,
  onUserChanged,
  onRefreshMe,
  onLogout,
}: {
  token: string;
  user: UserModel;
  message: string;
  onMessage: (message: string) => void;
  onUserChanged: (user: UserModel) => void;
  onRefreshMe: () => Promise<void>;
  onLogout: () => void;
}) {
  const [screen, setScreen] = useState<Screen>('home');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [progress, setProgress] = useState<ProgressSummary[]>([]);
  const [editingWorkoutId, setEditingWorkoutId] = useState<number | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [sessionReturnScreen, setSessionReturnScreen] = useState<Screen>('home');

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [workoutsData, templatesData, sessionsData, progressData] = await Promise.all([
        workoutsApi.listWorkouts(token),
        workoutsApi.listWorkoutTemplates(token),
        sessionsApi.listWorkoutSessions(token),
        progressApi.listProgress(token),
      ]);

      setWorkouts(workoutsData.workouts ?? []);
      setTemplates(templatesData.workout_templates ?? []);
      setSessions(sessionsData.workout_sessions ?? []);
      setProgress(progressData.exercises ?? []);
    } catch (loadError) {
      setError(compactError(loadError));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  function openWorkoutForm(workoutId: number | null) {
    setEditingWorkoutId(workoutId);
    setScreen('workout-form');
  }

  function openSession(sessionId: number, returnScreen: Screen = 'home') {
    setActiveSessionId(sessionId);
    setSessionReturnScreen(returnScreen);
    setScreen('session');
  }

  function deleteSession(session: WorkoutSession) {
    const workoutName = session.workout?.name ?? `Workout #${session.workout_id}`;

    confirmAction(`Delete ${workoutName} session?`, async () => {
      setError('');

      try {
        await sessionsApi.deleteWorkoutSession(token, session.id);
        await refreshData();
        onMessage('Workout session deleted.');
      } catch (deleteError) {
        setError(compactError(deleteError));
      }
    });
  }

  return (
    <Shell>
      <View style={styles.header}>
        <Pressable onPress={() => setScreen('home')}>
          <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerSubline}>{user.name} | {user.weight_unit}</Text>
        </Pressable>
        <Pressable style={styles.iconButton} onPress={onLogout}><LogOut color={colors.ink} size={20} /></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {error ? <InlineNotice type="error" text={error} /> : null}
        {loading ? <CenterPanel text="Syncing data" compact /> : null}

        {screen === 'home' ? (
          <HomeScreen
            user={user}
            workouts={workouts}
            sessions={sessions}
            progress={progress}
            onStartWorkout={() => setScreen('start')}
            onMyWorkouts={() => setScreen('workouts')}
            onSettings={() => setScreen('settings')}
            onHistory={() => setScreen('history')}
          />
        ) : null}

        {screen === 'start' ? (
          <StartWorkoutScreen
            token={token}
            workouts={workouts}
            onRefresh={refreshData}
            onCreateWorkout={() => openWorkoutForm(null)}
            onStarted={(session) => {
              openSession(session.id, 'home');
              refreshData();
            }}
            onError={setError}
          />
        ) : null}

        {screen === 'workouts' ? (
          <MyWorkoutsScreen
            token={token}
            workouts={workouts}
            templates={templates}
            onRefresh={refreshData}
            onCreate={() => openWorkoutForm(null)}
            onEdit={openWorkoutForm}
            onMessage={onMessage}
            onError={setError}
          />
        ) : null}

        {screen === 'workout-form' ? (
          <WorkoutFormScreen
            token={token}
            workoutId={editingWorkoutId}
            templates={templates}
            onSaved={async (workoutId) => {
              setEditingWorkoutId(workoutId);
              await refreshData();
              onMessage('Workout saved.');
            }}
            onBack={() => setScreen('workouts')}
            onError={setError}
          />
        ) : null}

        {screen === 'session' && activeSessionId ? (
          <WorkoutSessionScreen
            token={token}
            sessionId={activeSessionId}
            weightUnit={user.weight_unit}
            onDone={async () => {
              await refreshData();
              onMessage('Progress saved.');
              setScreen(sessionReturnScreen);
            }}
            onError={setError}
          />
        ) : null}

        {screen === 'settings' ? (
          <SettingsScreen
            token={token}
            user={user}
            onSaved={async (updatedUser) => {
              onUserChanged(updatedUser);
              await onRefreshMe();
              onMessage('Settings saved.');
            }}
            onError={setError}
          />
        ) : null}

        {screen === 'history' ? (
          <HistoryScreen
            sessions={sessions}
            onRefresh={refreshData}
            onOpenSession={(sessionId) => openSession(sessionId, 'history')}
            onDeleteSession={deleteSession}
          />
        ) : null}
      </ScrollView>

      {message ? <ToastNotice text={message} /> : null}
      <BottomNav screen={screen} onChange={setScreen} />
    </Shell>
  );
}

function HomeScreen({
  user,
  workouts,
  sessions,
  progress,
  onStartWorkout,
  onMyWorkouts,
  onSettings,
  onHistory,
}: {
  user: UserModel;
  workouts: Workout[];
  sessions: WorkoutSession[];
  progress: ProgressSummary[];
  onStartWorkout: () => void;
  onMyWorkouts: () => void;
  onSettings: () => void;
  onHistory: () => void;
}) {
  const sessionCount = sessions.length;
  const totalSets = progress.reduce((sum, item) => sum + item.total_sets, 0);

  return (
    <View style={styles.stack}>
      <ImageBackground source={equipmentImage} imageStyle={styles.heroImage} style={styles.dashboardHero}>
        <View style={styles.heroShade}>
          <Text style={styles.kicker}>Welcome, {user.name}</Text>
          <Text style={styles.dashboardTitle}>Start your next workout.</Text>
          <Text style={styles.heroText}>Weights display in {user.weight_unit}. Backend stores set weights in kilograms.</Text>
        </View>
      </ImageBackground>

      <PrimaryButton icon={Play} label="Start Workout" onPress={onStartWorkout} />
      <View style={styles.buttonGrid}>
        <SecondaryButton icon={Dumbbell} label="My Workouts" onPress={onMyWorkouts} />
        <SecondaryButton icon={Settings} label="Settings" onPress={onSettings} />
      </View>

      <View style={styles.metricsGrid}>
        <Metric icon={Dumbbell} label="Workouts" value={String(workouts.length)} />
        <Metric icon={Clock} label="Sessions" value={String(sessionCount)} />
        <Metric icon={Activity} label="Logged sets" value={String(totalSets)} />
      </View>

      <SecondaryButton icon={History} label="View History" onPress={onHistory} />
    </View>
  );
}

function MyWorkoutsScreen({
  token,
  workouts,
  templates,
  onRefresh,
  onCreate,
  onEdit,
  onMessage,
  onError,
}: {
  token: string;
  workouts: Workout[];
  templates: WorkoutTemplate[];
  onRefresh: () => Promise<void>;
  onCreate: () => void;
  onEdit: (workoutId: number) => void;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [copyingId, setCopyingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function copyTemplate(template: WorkoutTemplate) {
    setCopyingId(template.id);
    onError('');

    try {
      await workoutsApi.copyWorkoutTemplate(token, template.id, { name: template.name });
      onMessage(`${template.name} copied to your workouts.`);
      await onRefresh();
    } catch (copyError) {
      onError(compactError(copyError));
    } finally {
      setCopyingId(null);
    }
  }

  async function deleteWorkout(workout: Workout) {
    const runDelete = async () => {
      setDeletingId(workout.id);
      onError('');

      try {
        await workoutsApi.deleteWorkout(token, workout.id);
        onMessage('Workout deleted.');
        await onRefresh();
      } catch (deleteError) {
        onError(compactError(deleteError));
      } finally {
        setDeletingId(null);
      }
    };

    confirmAction(`Delete ${workout.name}?`, runDelete);
  }

  return (
    <View style={styles.stack}>
      <SectionTitle icon={Dumbbell} title="My Workouts" />
      <PrimaryButton icon={Plus} label="Create Workout" onPress={onCreate} />

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Create from template</Text>
        {templates.map((template) => (
          <View key={template.id} style={styles.rowCard}>
            <View style={styles.rowBody}>
              <Text style={styles.cardTitle}>{template.name}</Text>
              <Text style={styles.cardText}>{template.description}</Text>
            </View>
            <Pressable style={styles.smallButton} onPress={() => copyTemplate(template)} disabled={copyingId === template.id}>
              {copyingId === template.id ? <ActivityIndicator color={colors.white} /> : <Plus color={colors.white} size={18} />}
            </Pressable>
          </View>
        ))}
      </View>

      {workouts.length === 0 ? (
        <InfoCard icon={BookOpen} title="No workouts yet" text="Create your first workout or copy a template." />
      ) : null}

      {workouts.map((workout) => (
        <View key={workout.id} style={styles.listCard}>
          <View style={styles.cardTopLine}>
            <Text style={styles.cardTitle}>{workout.name}</Text>
            <Text style={styles.pill}>{workout.exercises_count ?? 0} exercises</Text>
          </View>
          {workout.description ? <Text style={styles.cardText}>{workout.description}</Text> : null}
          <View style={styles.buttonGrid}>
            <SecondaryButton icon={Pencil} label="Open / Manage" onPress={() => onEdit(workout.id)} />
            <DangerButton icon={Trash2} label={deletingId === workout.id ? 'Deleting' : 'Delete'} onPress={() => deleteWorkout(workout)} />
          </View>
        </View>
      ))}
    </View>
  );
}

function WorkoutFormScreen({
  token,
  workoutId,
  onSaved,
  onBack,
  onError,
}: {
  token: string;
  workoutId: number | null;
  templates: WorkoutTemplate[];
  onSaved: (workoutId: number) => Promise<void>;
  onBack: () => void;
  onError: (message: string) => void;
}) {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [groupId, setGroupId] = useState<number | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [customForm, setCustomForm] = useState({ name: '', equipment_type: '', description: '', image_path: '' });
  const [creatingExercise, setCreatingExercise] = useState(false);

  const workoutExercises = getWorkoutExercises(workout);
  const selectedExerciseIds = new Set(workoutExercises.map((item) => item.exercise_id));
  const availableExercises = exercises.filter((exercise) => !selectedExerciseIds.has(exercise.id));

  const loadWorkout = useCallback(async () => {
    if (!workoutId) {
      setWorkout(null);
      setName('');
      setDescription('');
      return;
    }

    setLoading(true);

    try {
      const data = await workoutsApi.showWorkout(token, workoutId);
      setWorkout(data.workout);
      setName(data.workout.name);
      setDescription(data.workout.description ?? '');
    } catch (loadError) {
      onError(compactError(loadError));
    } finally {
      setLoading(false);
    }
  }, [onError, token, workoutId]);

  const loadExercises = useCallback(async () => {
    try {
      const [groupsData, exercisesData] = await Promise.all([
        exercisesApi.listMuscleGroups(token),
        exercisesApi.listExercises(token, { search, muscle_group_id: groupId }),
      ]);
      setMuscleGroups(groupsData.muscle_groups ?? []);
      setExercises(exercisesData.exercises ?? []);
    } catch (loadError) {
      onError(compactError(loadError));
    }
  }, [groupId, onError, search, token]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  async function saveWorkout() {
    if (!name.trim()) {
      onError('Workout name is required.');
      return;
    }

    setSaving(true);
    onError('');

    try {
      const data = workoutId
        ? await workoutsApi.updateWorkout(token, workoutId, { name: name.trim(), description: description.trim() || null })
        : await workoutsApi.createWorkout(token, { name: name.trim(), description: description.trim() || null });
      setWorkout(data.workout);
      await onSaved(data.workout.id);
    } catch (saveError) {
      onError(compactError(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function reloadCurrentWorkout(id = workout?.id) {
    if (!id) {
      return;
    }

    const data = await workoutsApi.showWorkout(token, id);
    setWorkout(data.workout);
  }

  async function addExercise(exercise: Exercise) {
    if (!workout?.id) {
      onError('Save the workout before adding exercises.');
      return;
    }

    setAddingId(exercise.id);
    onError('');

    try {
      await workoutsApi.addWorkoutExercise(token, workout.id, {
        exercise_id: exercise.id,
        sort_order: workoutExercises.length + 1,
      });
      await reloadCurrentWorkout(workout.id);
    } catch (addError) {
      onError(compactError(addError));
    } finally {
      setAddingId(null);
    }
  }

  async function removeExercise(item: WorkoutExercise) {
    const workoutExerciseId = getWorkoutExerciseId(item);

    if (!workout?.id || !workoutExerciseId) {
      return;
    }

    try {
      await workoutsApi.removeWorkoutExercise(token, workout.id, workoutExerciseId);
      await reloadCurrentWorkout(workout.id);
    } catch (removeError) {
      onError(compactError(removeError));
    }
  }

  async function createCustomExercise() {
    if (!customForm.name.trim()) {
      onError('Custom exercise name is required.');
      return;
    }

    setCreatingExercise(true);
    onError('');

    try {
      const data = await exercisesApi.createExercise(token, {
        name: customForm.name.trim(),
        muscle_group_id: groupId,
        equipment_type: customForm.equipment_type.trim() || null,
        description: customForm.description.trim() || null,
        image_path: customForm.image_path.trim() || null,
      });
      setCustomForm({ name: '', equipment_type: '', description: '', image_path: '' });
      setExercises((current) => [data.exercise, ...current]);
      await addExercise(data.exercise);
    } catch (createError) {
      onError(compactError(createError));
    } finally {
      setCreatingExercise(false);
    }
  }

  return (
    <View style={styles.stack}>
      <SectionTitle icon={Pencil} title={workoutId ? 'Edit Workout' : 'Add Workout'} />
      {loading ? <CenterPanel text="Loading workout" compact /> : null}
      <TextInput style={styles.input} placeholder="Workout name" placeholderTextColor={colors.steel} value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Description" placeholderTextColor={colors.steel} value={description} onChangeText={setDescription} />
      <PrimaryButton icon={Save} label="Save Workout" loading={saving} onPress={saveWorkout} />

      {workout?.id ? (
        <>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Exercises in workout</Text>
            {workoutExercises.length === 0 ? <Text style={styles.cardText}>No exercises in this workout yet.</Text> : null}
            {workoutExercises.map((item) => (
              <View key={getWorkoutExerciseId(item) ?? item.exercise_id} style={styles.exerciseRow}>
                <ExerciseThumbnail item={item} />
                <View style={styles.rowBody}>
                  <Text style={styles.exerciseName}>{getWorkoutExerciseName(item)}</Text>
                  <Text style={styles.exerciseMeta}>{getWorkoutExerciseMeta(item)}</Text>
                </View>
                <Pressable style={styles.removeButton} onPress={() => removeExercise(item)}>
                  <Trash2 color={colors.error} size={18} />
                </Pressable>
              </View>
            ))}
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Exercise picker</Text>
            <TextInput style={styles.input} placeholder="Search exercises" placeholderTextColor={colors.steel} value={search} onChangeText={setSearch} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Pressable style={[styles.selectChip, groupId === null && styles.selectChipActive]} onPress={() => setGroupId(null)}>
                <Text style={[styles.selectChipText, groupId === null && styles.selectChipTextActive]}>All</Text>
              </Pressable>
              {muscleGroups.map((group) => (
                <Pressable key={group.id} style={[styles.selectChip, groupId === group.id && styles.selectChipActive]} onPress={() => setGroupId(group.id)}>
                  <Text style={[styles.selectChipText, groupId === group.id && styles.selectChipTextActive]}>{group.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {availableExercises.map((exercise) => (
              <Pressable key={exercise.id} style={styles.exerciseRow} onPress={() => addExercise(exercise)} disabled={addingId === exercise.id}>
                <ExerciseThumbnail exercise={exercise} />
                <View style={styles.rowBody}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseMeta}>{getExerciseMuscleName(exercise)} | {exercise.equipment_type ?? 'Any equipment'}</Text>
                </View>
                {addingId === exercise.id ? <ActivityIndicator color={colors.red} /> : <Plus color={colors.red} size={20} />}
              </Pressable>
            ))}
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Create custom exercise</Text>
            <TextInput style={styles.input} placeholder="Exercise name" placeholderTextColor={colors.steel} value={customForm.name} onChangeText={(name) => setCustomForm((current) => ({ ...current, name }))} />
            <TextInput style={styles.input} placeholder="Equipment type" placeholderTextColor={colors.steel} value={customForm.equipment_type} onChangeText={(equipment_type) => setCustomForm((current) => ({ ...current, equipment_type }))} />
            <TextInput style={styles.input} placeholder="Description" placeholderTextColor={colors.steel} value={customForm.description} onChangeText={(description) => setCustomForm((current) => ({ ...current, description }))} />
            <TextInput style={styles.input} placeholder="Image path or URL" placeholderTextColor={colors.steel} value={customForm.image_path} onChangeText={(image_path) => setCustomForm((current) => ({ ...current, image_path }))} />
            <PrimaryButton icon={Plus} label="Create and Add" loading={creatingExercise} onPress={createCustomExercise} />
          </View>
        </>
      ) : (
        <InfoCard icon={Save} title="Save first" text="Save the workout before adding exercises." />
      )}

      <SecondaryButton icon={Dumbbell} label="Back to My Workouts" onPress={onBack} />
    </View>
  );
}

function StartWorkoutScreen({
  token,
  workouts,
  onRefresh,
  onCreateWorkout,
  onStarted,
  onError,
}: {
  token: string;
  workouts: Workout[];
  onRefresh: () => Promise<void>;
  onCreateWorkout: () => void;
  onStarted: (session: WorkoutSession) => void;
  onError: (message: string) => void;
}) {
  const [startingId, setStartingId] = useState<number | null>(null);

  async function startWorkout(workout: Workout) {
    setStartingId(workout.id);
    onError('');

    try {
      const data = await sessionsApi.startWorkoutSession(token, workout.id);
      onStarted(data.workout_session);
    } catch (startError) {
      onError(compactError(startError));
    } finally {
      setStartingId(null);
    }
  }

  return (
    <View style={styles.stack}>
      <SectionTitle icon={Play} title="Start Workout" />
      <SecondaryButton icon={RefreshCw} label="Refresh workouts" onPress={onRefresh} />
      {workouts.length === 0 ? (
        <View style={styles.panel}>
          <Text style={styles.cardTitle}>You do not have any workouts yet.</Text>
          <Text style={styles.cardText}>Create your first workout.</Text>
          <PrimaryButton icon={Plus} label="Create Workout" onPress={onCreateWorkout} />
        </View>
      ) : null}
      {workouts.map((workout) => (
        <View key={workout.id} style={styles.listCard}>
          <View style={styles.cardTopLine}>
            <Text style={styles.cardTitle}>{workout.name}</Text>
            <Text style={styles.pill}>{workout.exercises_count ?? 0} exercises</Text>
          </View>
          {workout.description ? <Text style={styles.cardText}>{workout.description}</Text> : null}
          <PrimaryButton icon={Play} label="Start" loading={startingId === workout.id} onPress={() => startWorkout(workout)} />
        </View>
      ))}
    </View>
  );
}

function WorkoutSessionScreen({
  token,
  sessionId,
  weightUnit,
  onDone,
  onError,
}: {
  token: string;
  sessionId: number;
  weightUnit: WeightUnit;
  onDone: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    setLoading(true);

    try {
      const data = await sessionsApi.showWorkoutSession(token, sessionId);
      setSession(data.workout_session);
    } catch (loadError) {
      onError(compactError(loadError));
    } finally {
      setLoading(false);
    }
  }, [onError, sessionId, token]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  if (loading || !session) {
    return <CenterPanel text="Loading workout session" compact />;
  }

  const exercises = session.exercises ?? [];

  return (
    <View style={styles.stack}>
      <SectionTitle icon={Activity} title={session.workout?.name ?? 'Workout Session'} />
      <Text style={styles.cardText}>{session.workout?.description}</Text>
      <Text style={styles.cardText}>Started {new Date(session.started_at).toLocaleString()}</Text>
      {exercises.length === 0 ? <InfoCard icon={Dumbbell} title="No exercises" text="Add exercises to this workout before logging sets." /> : null}
      {exercises.map((exercise) => (
        <SessionExerciseCard
          key={exercise.exercise_id}
          token={token}
          sessionId={sessionId}
          exercise={exercise}
          weightUnit={weightUnit}
          onChanged={loadSession}
          onError={onError}
        />
      ))}
      <PrimaryButton icon={Check} label="Done" onPress={onDone} />
    </View>
  );
}

function SessionExerciseCard({
  token,
  sessionId,
  exercise,
  weightUnit,
  onChanged,
  onError,
}: {
  token: string;
  sessionId: number;
  exercise: SessionExercise;
  weightUnit: WeightUnit;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('0');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function addSet() {
    setSaving(true);
    onError('');

    try {
      await sessionsApi.addWorkoutSet(token, sessionId, {
        exercise_id: exercise.exercise_id,
        reps: Number.parseInt(reps, 10),
        weight: Number.parseFloat(weight),
        weight_unit: weightUnit,
        notes: notes.trim() || null,
      });
      setNotes('');
      await onChanged();
    } catch (saveError) {
      onError(compactError(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.panel}>
      <View style={styles.cardTopLine}>
        <View style={styles.rowBody}>
          <Text style={styles.cardTitle}>{exercise.name}</Text>
          <Text style={styles.exerciseMeta}>{exercise.muscle_group ?? 'General'} | {exercise.equipment_type ?? 'Any equipment'}</Text>
        </View>
        <Text style={styles.pill}>{exercise.sets.length} sets</Text>
      </View>

      {exercise.sets.map((set) => (
        <SetEditor key={set.id} token={token} sessionId={sessionId} set={set} weightUnit={weightUnit} onChanged={onChanged} onError={onError} />
      ))}

      <View style={styles.inlineInputs}>
        <TextInput keyboardType="number-pad" style={[styles.input, styles.shortInput]} placeholder="Reps" placeholderTextColor={colors.steel} value={reps} onChangeText={setReps} />
        <TextInput keyboardType="decimal-pad" style={[styles.input, styles.shortInput]} placeholder={`Weight ${weightUnit}`} placeholderTextColor={colors.steel} value={weight} onChangeText={setWeight} />
      </View>
      <TextInput style={styles.input} placeholder="Notes optional" placeholderTextColor={colors.steel} value={notes} onChangeText={setNotes} />
      <PrimaryButton icon={Plus} label={`Add Set (${weightUnit})`} loading={saving} onPress={addSet} />
    </View>
  );
}

function SetEditor({
  token,
  sessionId,
  set,
  weightUnit,
  onChanged,
  onError,
}: {
  token: string;
  sessionId: number;
  set: WorkoutSet;
  weightUnit: WeightUnit;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [reps, setReps] = useState(String(set.reps));
  const [weight, setWeight] = useState(String(set.display_weight));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveSet() {
    setSaving(true);

    try {
      await sessionsApi.updateWorkoutSet(token, sessionId, set.id, {
        reps: Number.parseInt(reps, 10),
        weight: Number.parseFloat(weight),
        weight_unit: weightUnit,
      });
      await onChanged();
    } catch (saveError) {
      onError(compactError(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function removeSet() {
    setDeleting(true);

    try {
      await sessionsApi.deleteWorkoutSet(token, sessionId, set.id);
      await onChanged();
    } catch (deleteError) {
      onError(compactError(deleteError));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={styles.setRow}>
      <Text style={styles.setNumber}>Set {set.set_number}</Text>
      <TextInput keyboardType="number-pad" style={[styles.input, styles.setInput]} value={reps} onChangeText={setReps} />
      <TextInput keyboardType="decimal-pad" style={[styles.input, styles.setInput]} value={weight} onChangeText={setWeight} />
      <Text style={styles.unitLabel}>{weightUnit}</Text>
      <Pressable style={styles.iconMiniButton} onPress={saveSet} disabled={saving}>
        {saving ? <ActivityIndicator color={colors.red} /> : <Save color={colors.red} size={16} />}
      </Pressable>
      <Pressable style={styles.iconMiniButtonDanger} onPress={removeSet} disabled={deleting}>
        {deleting ? <ActivityIndicator color={colors.error} /> : <Trash2 color={colors.error} size={16} />}
      </Pressable>
    </View>
  );
}

function SettingsScreen({
  token,
  user,
  onSaved,
  onError,
}: {
  token: string;
  user: UserModel;
  onSaved: (user: UserModel) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState(user.name);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(user.weight_unit ?? 'kg');
  const [saving, setSaving] = useState(false);

  async function saveSettings() {
    setSaving(true);
    onError('');

    try {
      const data = await authApi.updateMe(token, { name: name.trim(), weight_unit: weightUnit });
      await onSaved(data.user);
    } catch (saveError) {
      onError(compactError(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.stack}>
      <SectionTitle icon={Settings} title="Settings" />
      <View style={styles.panel}>
        <TextInput style={styles.input} placeholder="Display name" placeholderTextColor={colors.steel} value={name} onChangeText={setName} />
        <SegmentedControl
          options={[
            { key: 'kg', label: 'kg' },
            { key: 'lb', label: 'lb' },
          ]}
          value={weightUnit}
          onChange={(value) => setWeightUnit(value as WeightUnit)}
        />
        <PrimaryButton icon={Save} label="Save Settings" loading={saving} onPress={saveSettings} />
      </View>
    </View>
  );
}

function HistoryScreen({
  sessions,
  onRefresh,
  onOpenSession,
  onDeleteSession,
}: {
  sessions: WorkoutSession[];
  onRefresh: () => Promise<void>;
  onOpenSession: (sessionId: number) => void;
  onDeleteSession: (session: WorkoutSession) => void;
}) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const filteredSessions = sessions.filter((session) => isDateInRange(session.started_at, fromDate, toDate));

  return (
    <View style={styles.stack}>
      <SectionTitle icon={History} title="Workout History" />
      <SecondaryButton icon={RefreshCw} label="Refresh" onPress={onRefresh} />

      <View style={styles.panel}>
        <View style={styles.sectionTitle}>
          <Search color={colors.red} size={20} />
          <Text style={styles.panelTitle}>Search by date</Text>
        </View>
        <View style={styles.inlineInputs}>
          <TextInput style={[styles.input, styles.shortInput]} placeholder="From YYYY-MM-DD" placeholderTextColor={colors.steel} value={fromDate} onChangeText={setFromDate} />
          <TextInput style={[styles.input, styles.shortInput]} placeholder="To YYYY-MM-DD" placeholderTextColor={colors.steel} value={toDate} onChangeText={setToDate} />
        </View>
        {fromDate || toDate ? <SecondaryButton icon={RefreshCw} label="Clear Dates" onPress={() => { setFromDate(''); setToDate(''); }} /> : null}
      </View>

      {filteredSessions.length === 0 ? <InfoCard icon={History} title="No workout sessions" text="No workouts match the selected dates." /> : null}

      {filteredSessions.map((session) => (
        <View key={session.id} style={styles.listCard}>
          <View style={styles.cardTopLine}>
            <Text style={styles.cardTitle}>{session.workout?.name ?? `Workout #${session.workout_id}`}</Text>
            <Text style={styles.pill}>{session.total_sets ?? session.workout_sets?.length ?? 0} sets</Text>
          </View>
          <Text style={styles.cardText}>Started {new Date(session.started_at).toLocaleString()}</Text>
          {session.completed_at ? <Text style={styles.cardText}>Completed {new Date(session.completed_at).toLocaleString()}</Text> : null}
          <View style={styles.buttonGrid}>
            <SecondaryButton icon={Pencil} label="Edit Session" onPress={() => onOpenSession(session.id)} />
            <DangerButton icon={Trash2} label="Delete Session" onPress={() => onDeleteSession(session)} />
          </View>
        </View>
      ))}
    </View>
  );
}

function BottomNav({ screen, onChange }: { screen: Screen; onChange: (screen: Screen) => void }) {
  const tabs: { key: Screen; label: string; icon: IconComponent }[] = [
    { key: 'home', label: 'Home', icon: Activity },
    { key: 'start', label: 'Start', icon: Play },
    { key: 'workouts', label: 'Workouts', icon: Dumbbell },
    { key: 'history', label: 'History', icon: History },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <View style={styles.bottomTabs}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = screen === tab.key;

        return (
          <Pressable key={tab.key} style={styles.tabButton} onPress={() => onChange(tab.key)}>
            <Icon color={active ? colors.red : colors.steel} size={20} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ExerciseThumbnail({ exercise, item }: { exercise?: Exercise; item?: WorkoutExercise }) {
  const imagePath = exercise?.image_path ?? item?.image_path ?? item?.exercise?.image_path;
  const uri = imagePath
    ? imagePath.startsWith('http://') || imagePath.startsWith('https://')
      ? imagePath
      : `${API_ORIGIN}/${imagePath.replace(/^\/+/, '')}`
    : null;

  if (uri) {
    return <Image source={{ uri }} style={styles.exerciseThumb} resizeMode="cover" />;
  }

  return (
    <View style={[styles.exerciseThumb, styles.exerciseThumbPlaceholder]}>
      <ImageIcon color={colors.red} size={18} />
    </View>
  );
}

function PrimaryButton({ icon: Icon, label, loading, onPress }: { icon: IconComponent; label: string; loading?: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.button, styles.primaryButton]} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color={colors.white} /> : <Icon color={colors.white} size={18} />}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ icon: Icon, label, loading, onPress }: { icon: IconComponent; label: string; loading?: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.button, styles.secondaryButton]} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color={colors.red} /> : <Icon color={colors.red} size={18} />}
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function DangerButton({ icon: Icon, label, onPress }: { icon: IconComponent; label: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.button, styles.dangerButton]} onPress={onPress}>
      <Icon color={colors.error} size={18} />
      <Text style={styles.dangerButtonText}>{label}</Text>
    </Pressable>
  );
}

function SegmentedControl({ options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable key={option.key} style={[styles.segment, active && styles.segmentActive]} onPress={() => onChange(option.key)}>
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: IconComponent; title: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Icon color={colors.red} size={22} />
      <Text style={styles.sectionHeading}>{title}</Text>
    </View>
  );
}

function Metric({ icon: Icon, label, value }: { icon: IconComponent; label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Icon color={colors.red} size={20} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function InfoCard({ icon: Icon, title, text }: { icon: IconComponent; title: string; text: string }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIcon}><Icon color={colors.red} size={20} /></View>
      <View style={styles.rowBody}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.cardText}>{text}</Text>
      </View>
    </View>
  );
}

function InlineNotice({ type, text }: { type: 'success' | 'error'; text: string }) {
  return (
    <View style={[styles.notice, type === 'error' ? styles.noticeError : styles.noticeSuccess]}>
      <Text style={[styles.noticeText, type === 'error' ? styles.noticeErrorText : styles.noticeSuccessText]}>{text}</Text>
    </View>
  );
}

function ToastNotice({ text }: { text: string }) {
  return (
    <View style={styles.toast}>
      <Check color={colors.success} size={18} />
      <Text style={styles.toastText}>{text}</Text>
    </View>
  );
}

function CenterPanel({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <View style={[styles.centerPanel, compact && styles.centerPanelCompact]}>
      <ActivityIndicator color={colors.red} />
      <Text style={styles.cardText}>{text}</Text>
    </View>
  );
}

function getWorkoutExercises(workout?: Workout | null): WorkoutExercise[] {
  return workout?.exercises ?? workout?.workout_exercises ?? workout?.workoutExercises ?? [];
}

function getWorkoutExerciseId(item: WorkoutExercise): number | undefined {
  return item.workout_exercise_id ?? item.id;
}

function isDateInRange(value: string, fromDate: string, toDate: string): boolean {
  const date = new Date(value);
  const from = parseDateBoundary(fromDate, false);
  const to = parseDateBoundary(toDate, true);

  if (Number.isNaN(date.getTime())) {
    return true;
  }

  if (from && date < from) {
    return false;
  }

  if (to && date > to) {
    return false;
  }

  return true;
}

function parseDateBoundary(value: string, endOfDay: boolean): Date | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const date = new Date(`${trimmed}T${endOfDay ? '23:59:59' : '00:00:00'}`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getWorkoutExerciseName(item: WorkoutExercise): string {
  return item.name ?? item.exercise?.name ?? `Exercise ${item.exercise_id}`;
}

function getWorkoutExerciseMeta(item: WorkoutExercise): string {
  const muscle = item.muscle_group ?? getExerciseMuscleName(item.exercise);
  const equipment = item.equipment_type ?? item.exercise?.equipment_type ?? 'Any equipment';

  return `${muscle} | ${equipment}`;
}

function getExerciseMuscleName(exercise?: Exercise): string {
  if (!exercise) {
    return 'General';
  }

  if (exercise.muscleGroup?.name) {
    return exercise.muscleGroup.name;
  }

  if (typeof exercise.muscle_group === 'object' && exercise.muscle_group?.name) {
    return exercise.muscle_group.name;
  }

  if (typeof exercise.muscle_group === 'string') {
    return exercise.muscle_group;
  }

  return 'General';
}

function confirmAction(title: string, onConfirm: () => void | Promise<void>) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'confirm' in window) {
    if (window.confirm(title)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, undefined, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'OK', style: 'destructive', onPress: onConfirm },
  ]);
}

const colors = {
  black: '#0B0B0B',
  ink: '#151515',
  text: '#242424',
  muted: '#666666',
  steel: '#8A8A8A',
  red: '#992626',
  redSoft: '#F8E9E8',
  bg: '#F6F6F4',
  card: '#FFFFFF',
  border: '#E4E1DD',
  white: '#FFFFFF',
  success: '#1F7A4D',
  successBg: '#E9F6EE',
  error: '#B42318',
  errorBg: '#FDECEC',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  authLayout: {
    minHeight: '100%',
    padding: 18,
    gap: 18,
    alignItems: 'center',
  },
  centerLayout: {
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
    gap: 12,
  },
  authHero: {
    width: '100%',
    maxWidth: 980,
    minHeight: 260,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: colors.black,
  },
  dashboardHero: {
    minHeight: 230,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: colors.black,
  },
  heroImage: {
    opacity: 0.9,
  },
  heroShade: {
    flex: 1,
    padding: 22,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.44)',
  },
  logo: {
    width: 170,
    height: 54,
    backgroundColor: colors.white,
    borderRadius: 4,
    marginBottom: 28,
  },
  logoDark: {
    width: 190,
    height: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'web' ? 18 : 10,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  headerLogo: {
    width: 148,
    height: 38,
  },
  headerSubline: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  body: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
    padding: 16,
    paddingBottom: 96,
    gap: 14,
  },
  stack: {
    gap: 14,
  },
  panel: {
    gap: 10,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  listCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 10,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: colors.white,
    padding: 10,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  cardTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 34,
    fontWeight: '800',
  },
  dashboardTitle: {
    color: colors.white,
    fontSize: 31,
    fontWeight: '900',
    marginTop: 5,
  },
  heroText: {
    color: colors.white,
    maxWidth: 560,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  kicker: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
  },
  screenText: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 420,
  },
  panelTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
    flex: 1,
  },
  cardText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  exerciseName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  exerciseMeta: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '800',
  },
  setNumber: {
    minWidth: 45,
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  unitLabel: {
    color: colors.red,
    fontWeight: '900',
    width: 24,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  sectionHeading: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: '900',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 13,
    backgroundColor: colors.white,
    color: colors.ink,
    fontSize: 16,
  },
  shortInput: {
    flex: 1,
    minWidth: 100,
  },
  setInput: {
    flex: 1,
    minWidth: 54,
    minHeight: 40,
    paddingHorizontal: 8,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    maxWidth: 240,
  },
  inlineInputs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  button: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexGrow: 1,
  },
  primaryButton: {
    backgroundColor: colors.red,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dangerButton: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: '#F4B8B0',
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 15,
  },
  secondaryButtonText: {
    color: colors.red,
    fontWeight: '900',
    fontSize: 15,
  },
  dangerButtonText: {
    color: colors.error,
    fontWeight: '900',
    fontSize: 15,
  },
  smallButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  iconMiniButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.redSoft,
  },
  iconMiniButtonDanger: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorBg,
  },
  removeButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorBg,
  },
  segmented: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 8,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    paddingHorizontal: 8,
  },
  segmentActive: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: colors.red,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 4,
  },
  selectChip: {
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: 999,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
  },
  selectChipActive: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  selectChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  selectChipTextActive: {
    color: colors.white,
  },
  pill: {
    color: colors.red,
    backgroundColor: colors.redSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
  },
  exerciseThumb: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.redSoft,
  },
  exerciseThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.border,
    borderWidth: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: 145,
    minHeight: 104,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  metricValue: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '900',
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  roundBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPanel: {
    flex: 1,
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  centerPanelCompact: {
    flex: 0,
    minHeight: 120,
  },
  notice: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  noticeSuccess: {
    backgroundColor: colors.successBg,
    borderColor: '#B8E2C8',
  },
  noticeError: {
    backgroundColor: colors.errorBg,
    borderColor: '#F4B8B0',
  },
  noticeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  noticeSuccessText: {
    color: colors.success,
  },
  noticeErrorText: {
    color: colors.error,
  },
  toast: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 76 : 64,
    left: 16,
    right: 16,
    maxWidth: 520,
    alignSelf: 'center',
    zIndex: 20,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B8E2C8',
    backgroundColor: colors.successBg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toastText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 20,
  },
  successText: {
    color: colors.success,
    fontSize: 14,
    lineHeight: 20,
  },
  bottomTabs: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 72,
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 12 : 6,
    paddingTop: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 58,
  },
  tabLabel: {
    color: colors.steel,
    fontSize: 11,
    fontWeight: '800',
  },
  tabLabelActive: {
    color: colors.red,
  },
});
