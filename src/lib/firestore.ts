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
  muscleGroup: string;
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
