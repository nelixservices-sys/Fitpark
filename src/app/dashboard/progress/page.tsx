"use client";

import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { TrendingUp, Scale, Dumbbell, Camera, Target } from "lucide-react";

export default function ProgressPage() {
  const { userProfile } = useAuth();

  if (!userProfile) return null;

  // Mock data for demonstration — will be replaced with real Firestore data
  const weightHistory = [
    { week: "S1", weight: Number(userProfile.weight) },
    { week: "S2", weight: Number(userProfile.weight) - 0.3 },
    { week: "S3", weight: Number(userProfile.weight) - 0.7 },
    { week: "S4", weight: Number(userProfile.weight) - 1.1 },
  ];

  const benchmarkLifts = [
    { name: "Squat", current: "80 kg", previous: "72.5 kg", change: "+10.3%" },
    { name: "Développé couché", current: "60 kg", previous: "55 kg", change: "+9.1%" },
    { name: "Soulevé de terre", current: "100 kg", previous: "90 kg", change: "+11.1%" },
    { name: "Rowing barre", current: "65 kg", previous: "57.5 kg", change: "+13%" },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black">
          <span className="gradient-text-purple">Progrès</span> & Évolution
        </h1>
        <p className="text-text-secondary mt-1">
          Suivez votre transformation semaine après semaine
        </p>
      </motion.div>

      {/* Current Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Scale className="w-5 h-5" />, label: "Poids actuel", value: `${userProfile.weight} kg`, color: "text-accent-cyan" },
          { icon: <Target className="w-5 h-5" />, label: "Objectif", value: userProfile.goal === "perte_poids_muscle" ? "Recompo" : "Masse", color: "text-accent-purple-light" },
          { icon: <Dumbbell className="w-5 h-5" />, label: "Séances", value: "0", color: "text-accent-emerald" },
          { icon: <TrendingUp className="w-5 h-5" />, label: "Streak", value: "0 jours", color: "text-accent-amber" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-2 text-text-muted mb-2">
              {stat.icon}
              <span className="text-xs">{stat.label}</span>
            </div>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Weight Chart (simplified) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Scale className="w-5 h-5 text-accent-cyan" />
          Évolution du poids
        </h3>
        <div className="flex items-end gap-4 h-40">
          {weightHistory.map((point, i) => {
            const minWeight = Math.min(...weightHistory.map((p) => p.weight)) - 1;
            const maxWeight = Math.max(...weightHistory.map((p) => p.weight)) + 1;
            const height =
              ((point.weight - minWeight) / (maxWeight - minWeight)) * 100;

            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs text-text-secondary font-medium">
                  {point.weight} kg
                </span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                  className="w-full bg-gradient-to-t from-accent-cyan to-accent-purple rounded-t-lg min-h-[20px]"
                />
                <span className="text-xs text-text-muted">{point.week}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-text-muted text-center mt-4">
          📊 Les données seront automatiquement mises à jour avec vos pesées
        </p>
      </motion.div>

      {/* Strength Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6"
      >
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-accent-purple-light" />
          Surcharge Progressive
        </h3>
        <div className="space-y-4">
          {benchmarkLifts.map((lift, i) => (
            <motion.div
              key={lift.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.05 }}
              className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-border-default"
            >
              <div>
                <p className="font-semibold text-sm text-text-primary">
                  {lift.name}
                </p>
                <p className="text-xs text-text-muted">
                  Précédent : {lift.previous}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-text-primary">{lift.current}</p>
                <p className="text-xs text-accent-emerald font-medium">
                  {lift.change} ↑
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Photo Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6"
      >
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Camera className="w-5 h-5 text-accent-amber" />
          Photos de progression
        </h3>
        <div className="text-center py-8">
          <Camera className="w-12 h-12 text-text-muted/30 mx-auto mb-3" />
          <p className="text-text-secondary text-sm mb-4">
            Ajoutez des photos régulières pour suivre votre transformation
          </p>
          <button className="px-6 py-3 glass-card text-accent-purple-light font-medium text-sm hover:bg-white/5 transition-colors cursor-pointer" style={{ borderRadius: "12px" }}>
            📸 Ajouter des photos
          </button>
        </div>
      </motion.div>
    </div>
  );
}
