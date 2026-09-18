/**
 * Schedule Engine - Routine Officielle et Fixe de Mohamed (Med) & Riyad (Riri)
 *
 * Routine immuable (PPL + Cardio + Lower/Upper) :
 * - Lundi : REPOS & Récupération (les deux)
 * - Mardi : Push (Pecs, Épaules, Triceps) — Med 18h (Solo) / Riri 16h (Solo)
 * - Mercredi : Pull (Dos, Arrière d'épaule, Biceps) — Med 18h (Solo) / Riri 16h (Solo)
 * - Jeudi : Legs (Quadriceps, Ischios, Mollets) — Med 18h (Solo) / Riri 16h (Solo)
 * - Vendredi : Full Cardio (Objectif 800 kcal 🔥) — EN DUO À 18h (Med & Riri ensemble)
 * - Samedi : Lower Body (Bas du corps) — EN DUO À 10h
 * - Dimanche : Upper Body (Haut du corps) — EN DUO À 10h
 */

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type SplitType =
  | "push"
  | "pull"
  | "legs"
  | "upper"
  | "lower"
  | "cardio"
  | "hypertrophy_full"
  | "rest";

export type TrainingMode = "solo" | "partner";

export interface DaySchedule {
  day: DayOfWeek;
  dayLabel: string;
  isRestDay: boolean;
  splitType: SplitType;
  trainingMode: TrainingMode;
  medSchedule: {
    startTime: string;
    available: boolean;
    splitType: SplitType;
  };
  ririSchedule: {
    startTime: string;
    available: boolean;
    splitType: SplitType;
  };
}

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

export const FIXED_WEEKLY_SCHEDULE: Record<
  DayOfWeek,
  {
    splitType: SplitType;
    isRestDay: boolean;
    trainingMode: TrainingMode;
    medTime: string;
    ririTime: string;
    medSplit?: SplitType;
    ririSplit?: SplitType;
  }
> = {
  monday: {
    splitType: "rest",
    isRestDay: true,
    trainingMode: "solo",
    medTime: "-",
    ririTime: "-",
  },
  tuesday: {
    splitType: "push",
    isRestDay: false,
    trainingMode: "solo",
    medTime: "18:00",
    ririTime: "16:00",
  },
  wednesday: {
    splitType: "pull",
    isRestDay: false,
    trainingMode: "solo",
    medTime: "18:00",
    ririTime: "16:00",
  },
  thursday: {
    splitType: "legs",
    isRestDay: false,
    trainingMode: "solo",
    medTime: "18:00",
    ririTime: "16:00",
  },
  friday: {
    splitType: "cardio",
    isRestDay: false,
    trainingMode: "partner", // DUO à 18h
    medTime: "18:00",
    ririTime: "18:00",
  },
  saturday: {
    splitType: "lower",
    isRestDay: false,
    trainingMode: "partner", // DUO à 10h
    medTime: "10:00",
    ririTime: "10:00",
  },
  sunday: {
    splitType: "upper",
    isRestDay: false,
    trainingMode: "partner", // DUO à 10h
    medTime: "10:00",
    ririTime: "10:00",
  },
};

export function generateWeeklySchedule(
  _userGoal?: "perte_poids_muscle" | "prise_masse"
): DaySchedule[] {
  const days: DayOfWeek[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  return days.map((day) => {
    const config = FIXED_WEEKLY_SCHEDULE[day];
    return {
      day,
      dayLabel: DAY_LABELS[day],
      isRestDay: config.isRestDay,
      splitType: config.splitType,
      trainingMode: config.trainingMode,
      medSchedule: {
        startTime: config.medTime,
        available: !config.isRestDay,
        splitType: config.medSplit || config.splitType,
      },
      ririSchedule: {
        startTime: config.ririTime,
        available: !config.isRestDay,
        splitType: config.ririSplit || config.splitType,
      },
    };
  });
}

export function getSplitLabel(split: SplitType): string {
  const labels: Record<SplitType, string> = {
    push: "Push (Pecs, Épaules, Triceps)",
    pull: "Pull (Dos, Arrière d'épaule, Biceps)",
    legs: "Legs (Quadriceps, Ischios, Mollets)",
    upper: "Upper Body (Haut du corps)",
    lower: "Lower Body (Bas du corps)",
    cardio: "Full Cardio (800 kcal 🔥)",
    hypertrophy_full: "Hypertrophie Full Body",
    rest: "Repos & Récupération",
  };
  return labels[split] || split;
}

export function getSplitEmoji(split: SplitType): string {
  const emojis: Record<SplitType, string> = {
    push: "🏋️",
    pull: "🪢",
    legs: "🦵",
    upper: "💪",
    lower: "🦿",
    cardio: "🔥",
    hypertrophy_full: "⚡",
    rest: "😴",
  };
  return emojis[split] || "🏋️";
}

export function getTodaySchedule(
  userGoal?: "perte_poids_muscle" | "prise_masse"
): DaySchedule {
  const days: DayOfWeek[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const today = days[new Date().getDay()];
  const schedule = generateWeeklySchedule(userGoal);
  return schedule.find((d) => d.day === today)!;
}
