"use client";

import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import {
  generateWeeklySchedule,
  getSplitLabel,
  getSplitEmoji,
  type DaySchedule,
} from "@/lib/schedule-engine";
import { Calendar, Users, User, Moon } from "lucide-react";

export default function SchedulePage() {
  const { userProfile } = useAuth();

  if (!userProfile) return null;

  const schedule = generateWeeklySchedule(
    userProfile.goal as "perte_poids_muscle" | "prise_masse"
  );

  const today = new Date().getDay();
  const dayIndexMap: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-black">
          <span className="gradient-text-purple">Planning</span> Hebdomadaire
        </h1>
        <p className="text-text-secondary mt-1">
          Programme de Med & Riri — Fitness Park
        </p>
      </motion.div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-emerald" />
          <span className="text-text-secondary">Duo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-amber" />
          <span className="text-text-secondary">Solo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-text-muted" />
          <span className="text-text-secondary">Repos</span>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="space-y-3">
        {schedule.map((day: DaySchedule, index: number) => {
          const isToday = dayIndexMap[day.day] === today;

          return (
            <motion.div
              key={day.day}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`glass-card p-5 transition-all ${
                isToday
                  ? "border-accent-purple/40 shadow-lg shadow-accent-purple/10 gradient-border"
                  : ""
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Day label */}
                <div className="w-20 flex-shrink-0">
                  <p
                    className={`font-bold ${
                      isToday ? "text-accent-purple-light" : "text-text-primary"
                    }`}
                  >
                    {day.dayLabel}
                  </p>
                  {isToday && (
                    <span className="text-[10px] font-medium text-accent-purple-light bg-accent-purple/10 px-2 py-0.5 rounded-full">
                      Aujourd&apos;hui
                    </span>
                  )}
                </div>

                {/* Split type */}
                <div className="flex-1">
                  {day.isRestDay ? (
                    <div className="flex items-center gap-2 text-text-muted">
                      <Moon className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Repos & Récupération
                      </span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {getSplitEmoji(day.splitType)}{" "}
                        {getSplitLabel(day.splitType)}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <span className="font-medium text-accent-cyan">Med</span>
                          {day.medSchedule.available
                            ? day.medSchedule.startTime
                            : "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-medium text-accent-amber">Riri</span>
                          {day.ririSchedule.available
                            ? day.ririSchedule.startTime
                            : "—"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mode badge */}
                {!day.isRestDay && (
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                      day.trainingMode === "partner"
                        ? "bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20"
                        : "bg-accent-amber/10 text-accent-amber border border-accent-amber/20"
                    }`}
                  >
                    {day.trainingMode === "partner" ? (
                      <>
                        <Users className="w-3.5 h-3.5" />
                        Duo
                      </>
                    ) : (
                      <>
                        <User className="w-3.5 h-3.5" />
                        Solo
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Key Sessions Rules Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-5"
      >
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-accent-purple-light" />
          Séances Clés de la Semaine
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 rounded-xl bg-accent-rose/5 border border-accent-rose/15">
            <p className="font-semibold text-sm text-accent-rose">🔥 Vendredi — Duo à 18h00 (Med & Riri)</p>
            <p className="text-xs text-text-secondary mt-1">
              Full Cardio 1h — Objectif strict : brûler 800+ kcal ensemble (HIIT, tapis incliné, rameur, skierg). Fin de semaine explosive.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-accent-cyan/5 border border-accent-cyan/15">
            <p className="font-semibold text-sm text-accent-cyan">💪 Dimanche — Duo à 10h00 (Upper Body)</p>
            <p className="text-xs text-text-secondary mt-1">
              Upper Body complet en duo — Pecs, Dos lourd (Rowing/Tirages), Épaules & Bras. Focus sur la surcharge progressive.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
