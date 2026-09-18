import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ==================== User Profile ====================

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  age: number;
  weight: number;
  height: number;
  goal: "perte_poids_muscle" | "prise_masse";
  injuries: string;
  equipment: string[];
  onboardingComplete: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export async function createUserProfile(
  uid: string,
  data: Partial<UserProfile>
) {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    ...data,
    uid,
    onboardingComplete: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getUserProfile(
  uid: string
): Promise<UserProfile | null> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function completeOnboarding(uid: string) {
  await updateUserProfile(uid, { onboardingComplete: true });
}

// ==================== Body Analysis ====================

export interface BodyAnalysis {
  id?: string;
  userId: string;
  type: "initial" | "weekly" | "monthly";
  photoUrls: string[];
  aiAnalysis: {
    estimatedBodyFatPercentage: number;
    muscleBalance: {
      strengths: string[];
      weaknesses: string[];
    };
    posturalAnalysis: string;
    priorityMuscleGroups: string[];
    athleticProfile: string;
    recommendations: string[];
  };
  analyzedAt?: Timestamp;
}

export async function saveBodyAnalysis(
  uid: string,
  analysis: Omit<BodyAnalysis, "id">
) {
  const colRef = collection(db, "users", uid, "bodyAnalyses");
  const docRef = await addDoc(colRef, {
    ...analysis,
    analyzedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getBodyAnalyses(uid: string): Promise<BodyAnalysis[]> {
  const colRef = collection(db, "users", uid, "bodyAnalyses");
  const q = query(colRef, orderBy("analyzedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BodyAnalysis);
}

// ==================== Exercise Log ====================

export interface ExerciseLog {
  id?: string;
  date: string;
  exerciseName: string;
  muscleGroup?: string;
  sets: { reps: number; weight: number; rpe?: number }[];
  completed: boolean;
  notes?: string;
}

export async function saveExerciseLog(uid: string, log: ExerciseLog) {
  const colRef = collection(db, "users", uid, "exerciseLogs");
  await addDoc(colRef, {
    ...log,
    createdAt: serverTimestamp(),
  });
}

export async function getExerciseLogs(
  uid: string,
  date?: string
): Promise<ExerciseLog[]> {
  const colRef = collection(db, "users", uid, "exerciseLogs");
  let q;
  if (date) {
    q = query(colRef, where("date", "==", date));
  } else {
    q = query(colRef, orderBy("createdAt", "desc"));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ExerciseLog);
}

// ==================== Weigh-ins ====================

export interface WeighIn {
  id?: string;
  date: string;
  weight: number;
  note?: string;
  createdAt?: Timestamp;
}

export async function saveWeighIn(
  uid: string,
  weighIn: { date: string; weight: number; note?: string }
) {
  const colRef = collection(db, "users", uid, "weighIns");
  await addDoc(colRef, {
    ...weighIn,
    createdAt: serverTimestamp(),
  });
}

export async function getWeighIns(uid: string): Promise<WeighIn[]> {
  const colRef = collection(db, "users", uid, "weighIns");
  const q = query(colRef, orderBy("date", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WeighIn);
}

// ==================== Benchmark Lifts ====================

export interface BenchmarkLift {
  id?: string;
  name: string;
  currentWeight: number;
  previousWeight?: number;
  reps: number | string;
  date: string;
  updatedAt?: Timestamp;
}

export async function saveBenchmarkLift(
  uid: string,
  lift: { name: string; currentWeight: number; reps: number | string; date: string }
) {
  const docId = lift.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const docRef = doc(db, "users", uid, "benchmarkLifts", docId);
  const snap = await getDoc(docRef);
  let previousWeight = lift.currentWeight;
  if (snap.exists()) {
    const existing = snap.data() as BenchmarkLift;
    previousWeight = existing.currentWeight || lift.currentWeight;
  }
  await setDoc(docRef, {
    name: lift.name,
    currentWeight: lift.currentWeight,
    previousWeight,
    reps: lift.reps,
    date: lift.date,
    updatedAt: serverTimestamp(),
  });
}

export async function getBenchmarkLifts(uid: string): Promise<BenchmarkLift[]> {
  const colRef = collection(db, "users", uid, "benchmarkLifts");
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BenchmarkLift);
}

// ==================== Progress Photos (4 angles) ====================

export interface ProgressPhotoGroup {
  id?: string;
  date: string;
  sessionDay: string;
  photos: {
    face: string;
    profilGauche: string;
    profilDroit: string;
    dos: string;
  };
  notes?: string;
  createdAt?: Timestamp;
}

export async function saveProgressPhotoGroup(
  uid: string,
  data: Omit<ProgressPhotoGroup, "id" | "createdAt">
) {
  const colRef = collection(db, "users", uid, "progressPhotos");
  await addDoc(colRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function getProgressPhotos(uid: string): Promise<ProgressPhotoGroup[]> {
  const colRef = collection(db, "users", uid, "progressPhotos");
  const q = query(colRef, orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProgressPhotoGroup);
}

// ==================== Saved Fixed Workouts ====================

export async function getSavedWorkout(
  uid: string,
  dayOfWeek: string
): Promise<any | null> {
  const docRef = doc(db, "users", uid, "savedWorkouts", dayOfWeek);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data().workout;
}

export async function saveWorkout(
  uid: string,
  dayOfWeek: string,
  workout: any
): Promise<void> {
  const docRef = doc(db, "users", uid, "savedWorkouts", dayOfWeek);
  await setDoc(docRef, {
    dayOfWeek,
    workout,
    updatedAt: serverTimestamp(),
  });
}

// ==================== Coach Chat per Day ====================

export interface CoachChatMessage {
  id?: string;
  role: "user" | "ai";
  text: string;
  actionSummary?: string;
  timestamp?: number;
}

export async function getDailyCoachMessages(
  uid: string,
  dayOfWeek: string
): Promise<CoachChatMessage[]> {
  const colRef = collection(db, "users", uid, "dailyChats", dayOfWeek, "messages");
  const q = query(colRef, orderBy("timestamp", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CoachChatMessage);
}

export async function saveDailyCoachMessage(
  uid: string,
  dayOfWeek: string,
  msg: { role: "user" | "ai"; text: string; actionSummary?: string }
) {
  const colRef = collection(db, "users", uid, "dailyChats", dayOfWeek, "messages");
  await addDoc(colRef, {
    ...msg,
    timestamp: Date.now(),
    createdAt: serverTimestamp(),
  });
}
