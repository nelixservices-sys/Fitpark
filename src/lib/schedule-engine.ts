/**
 * Schedule Engine - Gère la logique d'emploi du temps pour Med et Riri
 *
 * Règles :
 * - Lundi : REPOS pour les deux
 * - Mardi : Med finit à 18h → s'entraîne à 18h / Riri s'entraîne seul à 16h
 * - Mercredi : Les deux ensemble (partner day)
 * - Jeudi : Configurable
 * - Vendredi : Configurable
 * - Samedi : Partner day
 * - Dimanche : Med = Full Cardio 800 kcal / Riri = Hypertrophie jambes + full
 *
 * Split rotation sur 6 jours (Tue-Sun) :
 * Push → Pull → Legs → Upper → Lower → Spécial (dimanche)
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

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

// Default PPL rotation for 6 training days
const DEFAULT_SPLIT_ROTATION: SplitType[] = [
  "push",    // Mardi
  "pull",    // Mercredi
  "legs",    // Jeudi
  "upper",   // Vendredi
  "lower",   // Samedi
  // Dimanche = spécial (cardio pour Med, hypertrophy pour Riri)
];

export interface MedScheduleConfig {
  // Days where Med finishes school at 18h (trains at 18h, Riri trains solo at 16h)
  late_days: DayOfWeek[];
  // Days where Med finishes at 16h (Riri at 16h, Med at 18h)
  early_days: DayOfWeek[];
}

const DEFAULT_MED_SCHEDULE: MedScheduleConfig = {
  late_days: ["tuesday", "thursday"],   // Med finit à 18h
  early_days: ["wednesday", "friday"],   // Med finit à 16h
};

export function generateWeeklySchedule(
  userGoal: "perte_poids_muscle" | "prise_masse",
  medConfig: MedScheduleConfig = DEFAULT_MED_SCHEDULE,
  weekOffset: number = 0 // For rotating splits across weeks
): DaySchedule[] {
  const days: DayOfWeek[] = [
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
  ];

  // Rotate splits based on week offset
  const rotatedSplits = [...DEFAULT_SPLIT_ROTATION];
  for (let i = 0; i < weekOffset % rotatedSplits.length; i++) {
    const first = rotatedSplits.shift()!;
    rotatedSplits.push(first);
  }

  let splitIndex = 0;

  return days.map((day): DaySchedule => {
    // Monday = REST
    if (day === "monday") {
      return {
        day,
        dayLabel: DAY_LABELS[day],
        isRestDay: true,
        splitType: "rest",
        trainingMode: "solo",
        medSchedule: { startTime: "-", available: false, splitType: "rest" },
        ririSchedule: { startTime: "-", available: false, splitType: "rest" },
      };
    }

    // Sunday = Special
    if (day === "sunday") {
      const medSplit: SplitType = "cardio";
      const ririSplit: SplitType = "hypertrophy_full";

      return {
        day,
        dayLabel: DAY_LABELS[day],
        isRestDay: false,
        splitType: userGoal === "perte_poids_muscle" ? medSplit : ririSplit,
        trainingMode: "partner",
        medSchedule: { startTime: "10:00", available: true, splitType: medSplit },
        ririSchedule: { startTime: "10:00", available: true, splitType: ririSplit },
      };
    }

    // Training days (Tue-Sat)
    const currentSplit = rotatedSplits[splitIndex] || "push";
    splitIndex++;

    // Check schedule configuration
    const isLateDay = medConfig.late_days.includes(day);
    const isEarlyDay = medConfig.early_days.includes(day);
    const isSaturday = day === "saturday";

    let trainingMode: TrainingMode = "partner";
    let medTime = "16:00";
    let ririTime = "16:00";

    if (isLateDay) {
      // Med finishes at 18h → Riri trains solo at 16h, Med trains at 18h
      trainingMode = "solo";
      medTime = "18:00";
      ririTime = "16:00";
    } else if (isEarlyDay) {
      // Med finishes at 16h → Riri at 16h, Med at 18h
      trainingMode = "solo";
      ririTime = "16:00";
      medTime = "18:00";
    } else if (isSaturday) {
      trainingMode = "partner";
      medTime = "10:00";
      ririTime = "10:00";
    }

    return {
      day,
      dayLabel: DAY_LABELS[day],
      isRestDay: false,
      splitType: currentSplit,
      trainingMode,
      medSchedule: {
        startTime: medTime,
        available: true,
        splitType: currentSplit,
      },
      ririSchedule: {
        startTime: ririTime,
        available: true,
        splitType: currentSplit,
      },
    };
  });
}

export function getSplitLabel(split: SplitType): string {
  const labels: Record<SplitType, string> = {
    push: "Push (Pecs, Épaules, Triceps)",
    pull: "Pull (Dos, Biceps)",
    legs: "Legs (Quadriceps, Ischios, Mollets)",
    upper: "Upper Body (Haut du corps)",
    lower: "Lower Body (Bas du corps)",
    cardio: "Full Cardio (800 kcal 🔥)",
    hypertrophy_full: "Hypertrophie Full Body (Jambes focus)",
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
  userGoal: "perte_poids_muscle" | "prise_masse"
): DaySchedule {
  const days: DayOfWeek[] = [
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"
  ];
  const today = days[new Date().getDay()];
  const weekNumber = Math.floor(
    (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );
  const schedule = generateWeeklySchedule(userGoal, DEFAULT_MED_SCHEDULE, weekNumber);
  return schedule.find((d) => d.day === today)!;
}
