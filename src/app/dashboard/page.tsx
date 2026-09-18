"use client";

import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import {
  getTodaySchedule,
  getSplitLabel,
  getSplitEmoji,
} from "@/lib/schedule-engine";
import {
  Dumbbell,
  Flame,
  TrendingUp,
  Calendar,
  Utensils,
  ArrowRight,
  Zap,
  Clock,
  Target,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { userProfile } = useAuth();

  if (!userProfile) return null;

  const todaySchedule = getTodaySchedule(
    userProfile.goal as "perte_poids_muscle" | "prise_masse"
  );

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  const dayNames = [
    "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"
  ];
  const today = new Date();
  const dateString = `${dayNames[today.getDay()]} ${today.getDate()}/${today.getMonth() + 1}`;

  const quickStats = [
    {
      icon: <Dumbbell className="w-5 h-5" />,
      label: "Split du jour",
      value: todaySchedule.isRestDay
        ? "Repos 😴"
        : `${getSplitEmoji(todaySchedule.splitType)} ${
            todaySchedule.splitType === "cardio"
              ? "Full Cardio"
              : todaySchedule.splitType.charAt(0).toUpperCase() +
                todaySchedule.splitType.slice(1)
          }`,
      color: "from-accent-purple to-accent-purple-light",
    },
    {
      icon: <Target className="w-5 h-5" />,
      label: "Objectif",
      value:
        userProfile.goal === "perte_poids_muscle"
          ? "Recomposition"
          : "Prise de masse",
      color: "from-accent-cyan to-accent-emerald",
    },
    {
      icon: <Flame className="w-5 h-5" />,
      label: "Poids actuel",
      value: `${userProfile.weight} kg`,
      color: "from-accent-rose to-accent-amber",
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      label: "Semaine",
      value: `S${Math.ceil(
        (today.getTime() -
          new Date(today.getFullYear(), 0, 1).getTime()) /
          (7 * 24 * 60 * 60 * 1000)
      )}`,
      color: "from-accent-amber to-accent-emerald",
    },
  ];

  const quickActions = [
    {
      href: "/dashboard/workout",
      icon: <Dumbbell className="w-6 h-6" />,
      title: "Programme du jour",
      description: getSplitLabel(todaySchedule.splitType),
      gradient: "from-accent-purple/20 to-accent-purple-light/20",
      borderColor: "border-accent-purple/20",
    },
    {
      href: "/dashboard/nutrition",
      icon: <Utensils className="w-6 h-6" />,
      title: "Plan Nutritionnel",
      description:
        userProfile.goal === "perte_poids_muscle"
          ? "Déficit calorique"
          : "Surplus calorique",
      gradient: "from-accent-emerald/20 to-accent-cyan/20",
      borderColor: "border-accent-emerald/20",
    },
    {
      href: "/dashboard/schedule",
      icon: <Calendar className="w-6 h-6" />,
      title: "Planning Semaine",
      description: "Voir les 7 prochains jours",
      gradient: "from-accent-cyan/20 to-accent-purple/20",
      borderColor: "border-accent-cyan/20",
    },
    {
      href: "/dashboard/form-check",
      icon: <Zap className="w-6 h-6" />,
      title: "Form Check IA",
      description: "Analyser votre technique",
      gradient: "from-accent-amber/20 to-accent-rose/20",
      borderColor: "border-accent-amber/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-text-muted text-sm mb-1">{dateString}</p>
        <h1 className="text-3xl md:text-4xl font-black">
          {greeting()},{" "}
          <span className="gradient-text-purple">{userProfile.firstName}</span>{" "}
          👋
        </h1>
        <p className="text-text-secondary mt-2">
          {todaySchedule.isRestDay
            ? "Journée de repos — Récupération et mobilité"
            : `C'est jour de ${getSplitLabel(todaySchedule.splitType)} !`}
        </p>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {quickStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className="glass-card p-4 relative overflow-hidden"
          >
            <div
              className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${stat.color} opacity-10 rounded-bl-full`}
            />
            <div className="flex items-center gap-2 text-text-muted mb-2">
              {stat.icon}
              <span className="text-xs font-medium">{stat.label}</span>
            </div>
            <p className="text-lg font-bold text-text-primary">{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Today's Schedule Card */}
      {!todaySchedule.isRestDay && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 gradient-border"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent-purple-light" />
              Planning d&apos;aujourd&apos;hui
            </h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                todaySchedule.trainingMode === "partner"
                  ? "bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20"
                  : "bg-accent-amber/10 text-accent-amber border border-accent-amber/20"
              }`}
            >
              {todaySchedule.trainingMode === "partner"
                ? "🤝 Entraînement duo"
                : "🏃 Solo"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/3 border border-border-default">
              <p className="text-xs text-text-muted mb-1">Med</p>
              <p className="text-sm font-semibold text-text-primary">
                {todaySchedule.medSchedule.available
                  ? `${todaySchedule.medSchedule.startTime} — ${getSplitLabel(todaySchedule.medSchedule.splitType)}`
                  : "Repos"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/3 border border-border-default">
              <p className="text-xs text-text-muted mb-1">Riri</p>
              <p className="text-sm font-semibold text-text-primary">
                {todaySchedule.ririSchedule.available
                  ? `${todaySchedule.ririSchedule.startTime} — ${getSplitLabel(todaySchedule.ririSchedule.splitType)}`
                  : "Repos"}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-lg font-bold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.href}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.05 }}
            >
              <Link
                href={action.href}
                className={`glass-card glass-card-hover p-5 flex items-center gap-4 border ${action.borderColor} group block`}
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center text-text-primary`}
                >
                  {action.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary">
                    {action.title}
                  </h3>
                  <p className="text-sm text-text-secondary mt-0.5">
                    {action.description}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-accent-purple-light group-hover:translate-x-1 transition-all" />
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Motivation Quote */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-6 text-center"
      >
        <p className="text-lg italic text-text-secondary">
          &ldquo;La seule mauvaise séance est celle que tu n&apos;as pas faite.&rdquo;
        </p>
        <p className="text-sm text-text-muted mt-2">— FitPark AI Coach</p>
      </motion.div>
    </div>
  );
}
