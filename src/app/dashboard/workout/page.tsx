"use client";

import { useState } from "react";
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
} from "lucide-react";

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
  const [error, setError] = useState("");
  const [fatigueLevel, setFatigueLevel] = useState(5);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  const [completedSets, setCompletedSets] = useState<Record<string, number>>({});

  const generateWorkout = async () => {
    if (!userProfile) return;
    setLoading(true);
    setError("");

    try {
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const dayOfWeek = days[new Date().getDay()];

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
    } catch (err) {
      console.error(err);
      setError("Impossible de générer le programme. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSet = (exerciseIndex: number) => {
    const key = `ex-${exerciseIndex}`;
    setCompletedSets((prev) => {
      const current = prev[key] || 0;
      const maxSets = workout?.exercises[exerciseIndex]?.sets || 4;
      return {
        ...prev,
        [key]: current >= maxSets ? 0 : current + 1,
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-black">
          Programme du{" "}
          <span className="gradient-text-purple">Jour</span>
        </h1>
        <p className="text-text-secondary mt-1">
          Votre séance personnalisée par l&apos;IA
        </p>
      </motion.div>

      {/* Fatigue Level */}
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
            onClick={generateWorkout}
            disabled={loading}
            className="w-full mt-6 py-4 bg-gradient-to-r from-accent-purple to-accent-purple-light rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 shadow-lg shadow-accent-purple/25 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            {loading ? "Génération en cours..." : "Générer ma séance"}
          </motion.button>

          {error && (
            <p className="text-accent-rose text-sm mt-3 text-center">{error}</p>
          )}
        </motion.div>
      )}

      {/* Generated Workout */}
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
                  <h2 className="text-xl font-bold">{workout.title}</h2>
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
                    💬 <span className="font-medium text-accent-purple-light">Coach IA :</span>{" "}
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
                    <li key={i} className="text-sm text-text-secondary flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-accent-amber/10 text-accent-amber flex items-center justify-center text-xs">
                        {i + 1}
                      </span>
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Exercises */}
            {workout.exercises?.map((exercise, index) => {
              const completed = completedSets[`ex-${index}`] || 0;
              const isExpanded = expandedExercise === index;

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
                  <button
                    onClick={() =>
                      setExpandedExercise(isExpanded ? null : index)
                    }
                    className="w-full p-5 flex items-center gap-4 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center text-accent-purple-light font-bold text-sm flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="font-semibold text-text-primary">
                        {exercise.name}
                      </h4>
                      <p className="text-xs text-text-muted mt-0.5">
                        {exercise.muscleGroup} • {exercise.sets}×{exercise.reps} • Repos {exercise.restSeconds}s
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Set counter */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSet(index);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          completed >= exercise.sets
                            ? "bg-accent-emerald/20 text-accent-emerald"
                            : "bg-white/5 text-text-secondary hover:bg-white/10"
                        }`}
                      >
                        {completed >= exercise.sets ? (
                          <CheckCircle2 className="w-4 h-4 inline" />
                        ) : (
                          `${completed}/${exercise.sets}`
                        )}
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-text-muted" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-text-muted" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 space-y-3">
                          {exercise.weight && (
                            <div className="flex items-center gap-2 text-sm">
                              <Dumbbell className="w-4 h-4 text-text-muted" />
                              <span className="text-text-secondary">
                                Charge : <span className="text-text-primary font-medium">{exercise.weight}</span>
                              </span>
                            </div>
                          )}
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
                                Alternatives (si machine prise) :
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
                    <li key={i} className="text-sm text-text-secondary flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-accent-cyan/10 text-accent-cyan flex items-center justify-center text-xs">
                        {i + 1}
                      </span>
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Regenerate Button */}
            <button
              onClick={() => {
                setWorkout(null);
                setCompletedSets({});
              }}
              className="w-full py-3 glass-card text-text-secondary hover:text-text-primary text-sm font-medium transition-colors cursor-pointer"
              style={{ borderRadius: "12px" }}
            >
              🔄 Régénérer une nouvelle séance
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
