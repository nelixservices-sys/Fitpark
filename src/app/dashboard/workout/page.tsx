"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dumbbell,
  Loader2,
  Sparkles,
  Clock,
  Flame,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Plus,
  Minus,
  Camera,
  Upload,
  AlertCircle,
  Save,
  RotateCcw,
} from "lucide-react";
import {
  getSavedWorkout,
  saveWorkout,
  saveExerciseLog,
  saveBenchmarkLift,
  saveProgressPhotoGroup,
  getProgressPhotos,
} from "@/lib/firestore";
import { uploadProgressPhotoWithFallback } from "@/lib/storage";
import { DayOfWeek, DAY_LABELS } from "@/lib/schedule-engine";

interface Exercise {
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  restSeconds: number;
  weight: string;
  technique: string;
  alternatives: string[];
}

interface Workout {
  splitType: string;
  title: string;
  targetMuscles: string[];
  estimatedDuration: string;
  estimatedCalories: string;
  warmup: { duration: string; exercises: string[] };
  exercises: Exercise[];
  cooldown: { duration: string; exercises: string[] };
  coachNote: string;
}

export default function WorkoutPage() {
  const { userProfile } = useAuth();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [fatigueLevel, setFatigueLevel] = useState(5);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  const [completedSets, setCompletedSets] = useState<Record<string, number>>({});
  const [exerciseWeights, setExerciseWeights] = useState<Record<number, string>>({});

  // 4-Angle Photo Check-in state
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<{
    face: File | null;
    profilGauche: File | null;
    profilDroit: File | null;
    dos: File | null;
  }>({
    face: null,
    profilGauche: null,
    profilDroit: null,
    dos: null,
  });
  const [photoPreviews, setPhotoPreviews] = useState<{
    face: string | null;
    profilGauche: string | null;
    profilDroit: string | null;
    dos: string | null;
  }>({
    face: null,
    profilGauche: null,
    profilDroit: null,
    dos: null,
  });

  const fileInputRefs = {
    face: useRef<HTMLInputElement>(null),
    profilGauche: useRef<HTMLInputElement>(null),
    profilDroit: useRef<HTMLInputElement>(null),
    dos: useRef<HTMLInputElement>(null),
  };

  const days: DayOfWeek[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dayOfWeek = days[new Date().getDay()];
  const todayStr = new Date().toISOString().split("T")[0];

  // Load saved fixed workout for today + check photo check-in
  useEffect(() => {
    if (!userProfile?.uid) return;

    let isMounted = true;
    const init = async () => {
      try {
        // Check saved workout
        const saved = await getSavedWorkout(userProfile.uid, dayOfWeek);
        if (isMounted && saved) {
          setWorkout(saved);
          const initialW: Record<number, string> = {};
          saved.exercises?.forEach((ex: Exercise, idx: number) => {
            initialW[idx] = ex.weight || "";
          });
          setExerciseWeights(initialW);
        }

        // Check if user already took 4 photos today
        const photos = await getProgressPhotos(userProfile.uid);
        const todayPhoto = photos.find((p) => p.date === todayStr);
        if (todayPhoto) {
          if (isMounted) setHasCheckedInToday(true);
        } else {
          // Check local session storage bypass or requirement
          const bypassed = sessionStorage.getItem(`photo_checkin_${todayStr}`);
          if (bypassed && isMounted) {
            setHasCheckedInToday(true);
          }
        }
      } catch (err) {
        console.warn("Init error in workout page:", err);
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    };

    init();
    return () => {
      isMounted = false;
    };
  }, [userProfile?.uid, dayOfWeek, todayStr]);

  const generateWorkout = async (forceRegenerate = false) => {
    if (!userProfile) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/generate-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: userProfile,
          dayOfWeek,
          fatigueLevel,
          availableEquipment: userProfile.equipment,
        }),
      });

      if (!response.ok) throw new Error("Erreur API");

      const data = await response.json();
      setWorkout(data.workout);

      // Persist permanently for this day of the week
      if (userProfile?.uid && data.workout) {
        await saveWorkout(userProfile.uid, dayOfWeek, data.workout);
      }

      const initialW: Record<number, string> = {};
      data.workout?.exercises?.forEach((ex: Exercise, idx: number) => {
        initialW[idx] = ex.weight || "";
      });
      setExerciseWeights(initialW);
    } catch (err) {
      console.error(err);
      setError("Impossible de générer le programme. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (
    position: "face" | "profilGauche" | "profilDroit" | "dos",
    file: File
  ) => {
    setPhotoFiles((prev) => ({ ...prev, [position]: file }));
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreviews((prev) => ({ ...prev, [position]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const submitCheckInPhotos = async () => {
    if (
      !photoFiles.face ||
      !photoFiles.profilGauche ||
      !photoFiles.profilDroit ||
      !photoFiles.dos
    ) {
      alert("Merci de fournir les 4 photos (Face, Profil gauche, Profil droit, Dos) pour valider le check-in !");
      return;
    }

    if (!userProfile?.uid) return;
    setUploadingPhotos(true);

    try {
      const [faceUrl, gaucheUrl, droitUrl, dosUrl] = await Promise.all([
        uploadProgressPhotoWithFallback(userProfile.uid, photoFiles.face, "face"),
        uploadProgressPhotoWithFallback(userProfile.uid, photoFiles.profilGauche, "profil_gauche"),
        uploadProgressPhotoWithFallback(userProfile.uid, photoFiles.profilDroit, "profil_droit"),
        uploadProgressPhotoWithFallback(userProfile.uid, photoFiles.dos, "dos"),
      ]);

      await saveProgressPhotoGroup(userProfile.uid, {
        date: todayStr,
        sessionDay: DAY_LABELS[dayOfWeek],
        photos: {
          face: faceUrl,
          profilGauche: gaucheUrl,
          profilDroit: droitUrl,
          dos: dosUrl,
        },
        notes: `Check-in de début de séance (${DAY_LABELS[dayOfWeek]})`,
      });

      setHasCheckedInToday(true);
      setShowCheckInModal(false);
    } catch (err) {
      console.error("Check-in photo error:", err);
      alert("Erreur lors de l'envoi des photos. Réessaie.");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const bypassCheckIn = () => {
    sessionStorage.setItem(`photo_checkin_${todayStr}`, "true");
    setHasCheckedInToday(true);
    setShowCheckInModal(false);
  };

  const toggleSet = async (exerciseIndex: number) => {
    const key = `ex-${exerciseIndex}`;
    const current = completedSets[key] || 0;
    const exercise = workout?.exercises[exerciseIndex];
    const maxSets = exercise?.sets || 4;
    const next = current >= maxSets ? 0 : current + 1;

    setCompletedSets((prev) => ({
      ...prev,
      [key]: next,
    }));

    // Auto log to progress and benchmark lift when exercise is completed
    if (next >= maxSets && exercise && userProfile?.uid) {
      const rawWeight = exerciseWeights[exerciseIndex] || exercise.weight;
      const weightNum = parseFloat(rawWeight.replace(/[^0-9.]/g, "")) || 0;

      try {
        await saveExerciseLog(userProfile.uid, {
          date: todayStr,
          exerciseName: exercise.name,
          muscleGroup: exercise.muscleGroup,
          sets: Array(maxSets).fill({ reps: 8, weight: weightNum }),
          completed: true,
        });

        if (weightNum > 0) {
          await saveBenchmarkLift(userProfile.uid, {
            name: exercise.name,
            currentWeight: weightNum,
            reps: exercise.reps,
            date: todayStr,
          });
        }
      } catch (err) {
        console.warn("Log exercise error:", err);
      }
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">
              Programme du{" "}
              <span className="gradient-text-purple">{DAY_LABELS[dayOfWeek]}</span>
            </h1>
            <p className="text-text-secondary mt-1">
              Routine fixe d&apos;entraînement — Salle Fitness Park
            </p>
          </div>

          {/* Photo Check-in Status Badge */}
          <button
            onClick={() => setShowCheckInModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              hasCheckedInToday
                ? "bg-accent-emerald/10 border-accent-emerald/30 text-accent-emerald"
                : "bg-accent-rose/10 border-accent-rose/30 text-accent-rose animate-pulse"
            }`}
          >
            <Camera className="w-4 h-4" />
            {hasCheckedInToday
              ? "✅ Check-in 4 angles validé"
              : "⚠️ Check-in Photo (4 angles) requis"}
          </button>
        </div>
      </motion.div>

      {/* Mandatory Photo Check-in Banner if not completed */}
      {!hasCheckedInToday && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-5 border border-accent-rose/30 bg-accent-rose/5"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-rose/20 text-accent-rose flex items-center justify-center flex-shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-text-primary">
                  Check-in Photo Obligatoire avant la séance
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Envoie tes 4 photos (Face, Profil gauche, Profil droit, Dos) pour suivre ta sèche et déverrouiller la progression.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCheckInModal(true)}
              className="px-5 py-2.5 rounded-xl bg-accent-rose hover:bg-accent-rose/90 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 flex-shrink-0"
            >
              <Upload className="w-4 h-4" />
              Envoyer les 4 photos
            </button>
          </div>
        </motion.div>
      )}

      {/* Generator / State Card */}
      {!workout && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Flame className="w-5 h-5 text-accent-amber" />
            Niveau de fatigue
          </h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setFatigueLevel(Math.max(1, fatigueLevel - 1))}
              className="p-2 rounded-lg glass-card hover:bg-white/10 cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex-1">
              <div className="flex justify-between text-xs text-text-muted mb-2">
                <span>En forme 💪</span>
                <span>Épuisé 😴</span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    fatigueLevel <= 3
                      ? "bg-accent-emerald"
                      : fatigueLevel <= 6
                      ? "bg-accent-amber"
                      : "bg-accent-rose"
                  }`}
                  animate={{ width: `${fatigueLevel * 10}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
            <button
              onClick={() => setFatigueLevel(Math.min(10, fatigueLevel + 1))}
              className="p-2 rounded-lg glass-card hover:bg-white/10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
            <span className="text-2xl font-black w-10 text-center gradient-text-purple">
              {fatigueLevel}
            </span>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => generateWorkout(false)}
            disabled={loading}
            className="w-full mt-6 py-4 bg-gradient-to-r from-accent-purple to-accent-purple-light rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 shadow-lg shadow-accent-purple/25 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            {loading ? "Génération de la routine fixe..." : "Charger ma séance"}
          </motion.button>

          {error && (
            <p className="text-accent-rose text-sm mt-3 text-center">{error}</p>
          )}
        </motion.div>
      )}

      {/* Generated & Persisted Workout */}
      <AnimatePresence>
        {workout && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Workout Header */}
            <div className="glass-card p-6 gradient-border">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-accent-purple/10 border border-accent-purple/30 text-accent-purple-light text-xs font-bold uppercase">
                      Routine Fixe {DAY_LABELS[dayOfWeek]}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold mt-2">{workout.title}</h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {workout.targetMuscles?.map((muscle) => (
                      <span
                        key={muscle}
                        className="px-2 py-1 rounded-lg bg-accent-purple/10 text-accent-purple-light text-xs font-medium"
                      >
                        {muscle}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-1 text-text-secondary text-sm">
                    <Clock className="w-4 h-4" />
                    {workout.estimatedDuration} min
                  </div>
                  <div className="flex items-center gap-1 text-accent-amber text-sm">
                    <Flame className="w-4 h-4" />
                    {workout.estimatedCalories} kcal
                  </div>
                </div>
              </div>

              {workout.coachNote && (
                <div className="p-3 rounded-xl bg-accent-purple/5 border border-accent-purple/15">
                  <p className="text-sm text-text-secondary">
                    💬{" "}
                    <span className="font-medium text-accent-purple-light">
                      Coach IA :
                    </span>{" "}
                    {workout.coachNote}
                  </p>
                </div>
              )}
            </div>

            {/* Warmup */}
            {workout.warmup && (
              <div className="glass-card p-5">
                <h3 className="font-semibold text-accent-amber mb-3">
                  🔥 Échauffement — {workout.warmup.duration}
                </h3>
                <ul className="space-y-2">
                  {workout.warmup.exercises?.map((ex, i) => (
                    <li
                      key={i}
                      className="text-sm text-text-secondary flex items-center gap-2"
                    >
                      <span className="w-5 h-5 rounded-full bg-accent-amber/10 text-accent-amber flex items-center justify-center text-xs">
                        {i + 1}
                      </span>
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Exercises List */}
            {workout.exercises?.map((exercise, index) => {
              const completed = completedSets[`ex-${index}`] || 0;
              const isExpanded = expandedExercise === index;
              const currentW = exerciseWeights[index] ?? exercise.weight;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`glass-card overflow-hidden transition-all ${
                    completed >= exercise.sets
                      ? "border-accent-emerald/30 bg-accent-emerald/5"
                      : ""
                  }`}
                >
                  <div className="p-5 flex flex-wrap items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center text-accent-purple-light font-bold text-sm flex-shrink-0">
                      {index + 1}
                    </div>
                    <div
                      className="flex-1 min-w-[200px] cursor-pointer"
                      onClick={() =>
                        setExpandedExercise(isExpanded ? null : index)
                      }
                    >
                      <h4 className="font-semibold text-text-primary">
                        {exercise.name}
                      </h4>
                      <p className="text-xs text-text-muted mt-0.5">
                        {exercise.muscleGroup} • {exercise.sets}×{exercise.reps} • Repos {exercise.restSeconds}s
                      </p>
                    </div>

                    {/* Weight Input */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">Charge:</span>
                      <input
                        type="text"
                        value={currentW}
                        onChange={(e) =>
                          setExerciseWeights({
                            ...exerciseWeights,
                            [index]: e.target.value,
                          })
                        }
                        placeholder="ex: 50 kg"
                        className="w-20 px-2 py-1 text-xs rounded-lg bg-white/5 border border-border-default text-text-primary font-bold text-center focus:outline-none focus:border-accent-purple"
                      />
                    </div>

                    {/* Set counter */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSet(index)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          completed >= exercise.sets
                            ? "bg-accent-emerald/20 text-accent-emerald"
                            : "bg-white/5 text-text-secondary hover:bg-white/10"
                        }`}
                      >
                        {completed >= exercise.sets ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 inline" /> Validé
                          </span>
                        ) : (
                          `${completed}/${exercise.sets} séries`
                        )}
                      </button>

                      <button
                        onClick={() =>
                          setExpandedExercise(isExpanded ? null : index)
                        }
                        className="p-1 text-text-muted hover:text-text-primary cursor-pointer"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-3">
                          {exercise.technique && (
                            <div className="p-3 rounded-lg bg-accent-cyan/5 border border-accent-cyan/15">
                              <p className="text-sm text-text-secondary">
                                📝 {exercise.technique}
                              </p>
                            </div>
                          )}
                          {exercise.alternatives?.length > 0 && (
                            <div>
                              <p className="text-xs text-text-muted mb-1">
                                Alternatives si la machine est prise :
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {exercise.alternatives.map((alt) => (
                                  <span
                                    key={alt}
                                    className="px-2 py-1 rounded-md bg-white/5 text-xs text-text-secondary"
                                  >
                                    {alt}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* Cooldown */}
            {workout.cooldown && (
              <div className="glass-card p-5">
                <h3 className="font-semibold text-accent-cyan mb-3">
                  🧊 Retour au calme — {workout.cooldown.duration}
                </h3>
                <ul className="space-y-2">
                  {workout.cooldown.exercises?.map((ex, i) => (
                    <li
                      key={i}
                      className="text-sm text-text-secondary flex items-center gap-2"
                    >
                      <span className="w-5 h-5 rounded-full bg-accent-cyan/10 text-accent-cyan flex items-center justify-center text-xs">
                        {i + 1}
                      </span>
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Regenerate Option */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => generateWorkout(true)}
                disabled={loading}
                className="text-xs text-text-muted hover:text-accent-rose transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Réinitialiser et regénérer la routine permanente
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mandatory Check-in Modal (4 angles) */}
      <AnimatePresence>
        {showCheckInModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="glass-card p-6 max-w-2xl w-full border border-border-default space-y-5 my-8"
            >
              <div className="flex items-center justify-between border-b border-border-default pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-purple/20 text-accent-purple-light flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg">Check-in Début de Séance</h3>
                    <p className="text-xs text-text-muted">
                      Prends 4 photos sous les 4 angles pour déverrouiller la séance
                    </p>
                  </div>
                </div>
                <button
                  onClick={bypassCheckIn}
                  className="text-xs text-text-muted hover:text-text-primary underline cursor-pointer"
                >
                  Passer pour aujourd&apos;hui
                </button>
              </div>

              {/* 4 Angles Upload Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: "face", label: "1. Face" },
                  { key: "profilGauche", label: "2. Profil Gauche" },
                  { key: "profilDroit", label: "3. Profil Droit" },
                  { key: "dos", label: "4. Dos" },
                ].map((item) => {
                  const k = item.key as
                    | "face"
                    | "profilGauche"
                    | "profilDroit"
                    | "dos";
                  const preview = photoPreviews[k];

                  return (
                    <div
                      key={k}
                      onClick={() => fileInputRefs[k].current?.click()}
                      className="aspect-[3/4] rounded-xl border border-dashed border-border-default hover:border-accent-purple/50 bg-white/3 flex flex-col items-center justify-center p-2 relative overflow-hidden cursor-pointer group transition-all"
                    >
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRefs[k]}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoSelect(k, file);
                        }}
                        className="hidden"
                      />

                      {preview ? (
                        <>
                          <img
                            src={preview}
                            alt={item.label}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-white">
                            Changer
                          </div>
                        </>
                      ) : (
                        <div className="text-center">
                          <Camera className="w-6 h-6 text-text-muted mx-auto mb-2 group-hover:text-accent-purple-light" />
                          <p className="text-xs font-semibold text-text-primary">
                            {item.label}
                          </p>
                          <span className="text-[10px] text-text-muted mt-1 block">
                            Ajouter photo
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl bg-accent-purple/5 border border-accent-purple/15 text-xs text-text-secondary flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-accent-purple-light flex-shrink-0 mt-0.5" />
                <span>
                  Ces 4 photos permettent à l&apos;IA de calculer ton pourcentage de masse grasse, ta recomposition corporelle et tes progrès de sèche chaque semaine.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={bypassCheckIn}
                  className="px-4 py-2.5 rounded-xl glass-card text-xs font-semibold text-text-muted hover:text-text-primary cursor-pointer"
                >
                  Passer exceptionnellement
                </button>
                <button
                  type="button"
                  onClick={submitCheckInPhotos}
                  disabled={
                    uploadingPhotos ||
                    !photoFiles.face ||
                    !photoFiles.profilGauche ||
                    !photoFiles.profilDroit ||
                    !photoFiles.dos
                  }
                  className="px-6 py-2.5 rounded-xl bg-accent-purple hover:bg-accent-purple-light text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingPhotos ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {uploadingPhotos
                    ? "Enregistrement..."
                    : "Valider les 4 photos & Démarrer"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
