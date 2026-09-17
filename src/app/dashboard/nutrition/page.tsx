"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { Utensils, Loader2, Sparkles, Droplets, Pill, Flame } from "lucide-react";

interface Meal {
  name: string;
  time: string;
  foods: { item: string; quantity: string; calories: number; protein: number }[];
  totalCalories: number;
}

interface NutritionPlan {
  dailyCalories: number;
  macros: {
    protein: { grams: number; percentage: number };
    carbs: { grams: number; percentage: number };
    fat: { grams: number; percentage: number };
  };
  meals: Meal[];
  hydration: string;
  supplements: string[];
  coachNote: string;
}

export default function NutritionPage() {
  const { userProfile } = useAuth();
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generatePlan = async () => {
    if (!userProfile) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/nutrition-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: userProfile }),
      });

      if (!response.ok) throw new Error("Erreur API");
      const data = await response.json();
      setPlan(data.nutritionPlan);
    } catch {
      setError("Impossible de générer le plan nutritionnel.");
    } finally {
      setLoading(false);
    }
  };

  const macroColors = {
    protein: { bar: "bg-accent-cyan", text: "text-accent-cyan", label: "Protéines" },
    carbs: { bar: "bg-accent-amber", text: "text-accent-amber", label: "Glucides" },
    fat: { bar: "bg-accent-rose", text: "text-accent-rose", label: "Lipides" },
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black">
          Plan <span className="gradient-text-purple">Nutritionnel</span>
        </h1>
        <p className="text-text-secondary mt-1">
          {userProfile?.goal === "perte_poids_muscle"
            ? "Stratégie déficit calorique — Recomposition"
            : "Stratégie surplus calorique — Prise de masse"}
        </p>
      </motion.div>

      {!plan && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 text-center">
          <Utensils className="w-12 h-12 text-accent-purple-light mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Générer votre plan du jour</h3>
          <p className="text-sm text-text-secondary mb-6">
            L&apos;IA calculera vos macros et préparera vos repas en fonction de votre objectif et de votre séance du jour.
          </p>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={generatePlan} disabled={loading}
            className="px-8 py-4 bg-gradient-to-r from-accent-emerald to-accent-cyan rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 mx-auto shadow-lg disabled:opacity-50 cursor-pointer">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? "Calcul en cours..." : "Générer mon plan"}
          </motion.button>
          {error && <p className="text-accent-rose text-sm mt-3">{error}</p>}
        </motion.div>
      )}

      {plan && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Calories Total */}
          <div className="glass-card p-6 gradient-border text-center">
            <p className="text-text-muted text-sm">Calories quotidiennes</p>
            <p className="text-4xl font-black gradient-text-purple mt-1">{plan.dailyCalories}</p>
            <p className="text-text-muted text-sm">kcal / jour</p>
          </div>

          {/* Macros */}
          <div className="grid grid-cols-3 gap-4">
            {(["protein", "carbs", "fat"] as const).map((macro) => (
              <div key={macro} className="glass-card p-4 text-center">
                <p className={`text-2xl font-black ${macroColors[macro].text}`}>
                  {plan.macros[macro].grams}g
                </p>
                <p className="text-xs text-text-muted mt-1">{macroColors[macro].label}</p>
                <div className="h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
                  <div className={`h-full rounded-full ${macroColors[macro].bar}`} style={{ width: `${plan.macros[macro].percentage}%` }} />
                </div>
                <p className="text-[10px] text-text-muted mt-1">{plan.macros[macro].percentage}%</p>
              </div>
            ))}
          </div>

          {/* Meals */}
          <h3 className="font-bold text-lg mt-2">🍽️ Repas du jour</h3>
          {plan.meals?.map((meal, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">{meal.name}</h4>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span>🕐 {meal.time}</span>
                  <span className="flex items-center gap-1 text-accent-amber">
                    <Flame className="w-3 h-3" /> {meal.totalCalories} kcal
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {meal.foods?.map((food, j) => (
                  <div key={j} className="flex items-center justify-between text-sm py-1.5 border-b border-border-default last:border-0">
                    <div>
                      <span className="text-text-primary">{food.item}</span>
                      <span className="text-text-muted ml-2 text-xs">{food.quantity}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-text-muted">
                      <span>{food.calories} kcal</span>
                      <span className="text-accent-cyan">{food.protein}g P</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* Hydration & Supplements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-4">
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Droplets className="w-4 h-4 text-accent-cyan" /> Hydratation
              </h4>
              <p className="text-sm text-text-secondary">{plan.hydration}</p>
            </div>
            {plan.supplements?.length > 0 && (
              <div className="glass-card p-4">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <Pill className="w-4 h-4 text-accent-emerald" /> Suppléments
                </h4>
                <ul className="space-y-1">
                  {plan.supplements.map((s, i) => (
                    <li key={i} className="text-sm text-text-secondary">• {s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Coach Note */}
          {plan.coachNote && (
            <div className="glass-card p-4">
              <p className="text-sm text-text-secondary">
                💬 <span className="font-medium text-accent-purple-light">Coach IA :</span> {plan.coachNote}
              </p>
            </div>
          )}

          <button onClick={() => setPlan(null)}
            className="w-full py-3 glass-card text-text-secondary hover:text-text-primary text-sm font-medium transition-colors cursor-pointer" style={{ borderRadius: "12px" }}>
            🔄 Régénérer le plan
          </button>
        </motion.div>
      )}
    </div>
  );
}
