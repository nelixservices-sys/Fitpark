import { NextRequest, NextResponse } from "next/server";
import { geminiPro } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profile, dayOfWeek, fatigueLevel, previousWorkouts, availableEquipment } = body;

    if (!profile || !dayOfWeek) {
      return NextResponse.json(
        { error: "Profil et jour de la semaine requis." },
        { status: 400 }
      );
    }

    const goalDescription =
      profile.goal === "perte_poids_muscle"
        ? "Perte de poids + construction musculaire (recomposition corporelle, déficit calorique)"
        : "Prise de masse musculaire (surplus calorique, hypertrophie maximale)";

    // Determine Sunday-specific rules
    let sundayRule = "";
    if (dayOfWeek === "sunday") {
      if (profile.goal === "perte_poids_muscle") {
        sundayRule = `
RÈGLE DIMANCHE SPÉCIALE : C'est une séance "Full Cardio" d'exactement 1 heure.
L'objectif STRICT est de brûler au minimum 800 calories.
Structure la séance avec du HIIT, du cardio sur machines (tapis de course, vélo, rameur, elliptique) 
et des exercices au poids de corps à haute intensité. Pas de musculation lourde.`;
      } else {
        sundayRule = `
RÈGLE DIMANCHE SPÉCIALE : Séance d'hypertrophie MAXIMALE ciblant les JAMBES en priorité 
puis l'ensemble des muscles. Volume élevé, temps sous tension maximal, techniques d'intensification 
(drop sets, rest-pause, supersets). Durée : 1h30 minimum.`;
      }
    }

    const prompt = `Tu es un coach de musculation expert spécialisé dans les salles Fitness Park. 
Tu programmes des séances pour des athlètes adolescents/jeunes adultes.

PROFIL DE L'ATHLÈTE :
- Prénom : ${profile.firstName}
- Âge : ${profile.age} ans
- Poids : ${profile.weight} kg
- Taille : ${profile.height} cm
- Objectif : ${goalDescription}
- Blessures : ${profile.injuries || "Aucune"}
- Niveau de fatigue aujourd'hui : ${fatigueLevel || "Normal"}/10

JOUR : ${dayOfWeek}
${sundayRule}

${dayOfWeek === "monday" ? "ATTENTION : C'est le jour de REPOS. Propose uniquement des étirements/mobilité légers et des conseils de récupération." : ""}

MATÉRIEL DISPONIBLE : ${(availableEquipment || []).join(", ") || "Tout le matériel Fitness Park standard"}

HISTORIQUE RÉCENT (dernières séances) :
${previousWorkouts ? JSON.stringify(previousWorkouts, null, 2) : "Pas d'historique disponible"}

Génère le programme d'entraînement du jour au format JSON :

{
  "splitType": "push | pull | legs | upper | lower | cardio | rest | full_body",
  "title": "Titre court et motivant de la séance",
  "targetMuscles": ["muscles ciblés"],
  "estimatedDuration": "durée en minutes",
  "estimatedCalories": "estimation kcal brûlées",
  "warmup": {
    "duration": "5-10 min",
    "exercises": ["exercice 1", "exercice 2"]
  },
  "exercises": [
    {
      "name": "Nom de l'exercice",
      "muscleGroup": "groupe musculaire principal",
      "sets": 4,
      "reps": "8-12",
      "restSeconds": 90,
      "weight": "suggestion de charge ou % du max",
      "technique": "conseil d'exécution",
      "alternatives": ["alternative si machine prise"]
    }
  ],
  "cooldown": {
    "duration": "5-10 min",
    "exercises": ["étirement 1", "étirement 2"]
  },
  "coachNote": "message de motivation et conseil du jour"
}

RÈGLES :
- Applique la surcharge progressive si l'historique est disponible (+2.5% de charge ou +1-2 reps).
- Exclue les exercices dangereux pour les blessures signalées.
- Alterne les splits de façon optimale sur la semaine (Mardi-Dimanche, Lundi = repos).
- Chaque exercice doit utiliser du matériel Fitness Park spécifiquement.
- Réponds UNIQUEMENT avec le JSON.`;

    const result = await geminiPro.generateContent(prompt);
    const text = result.response.text();

    let workout;
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonString = jsonMatch ? jsonMatch[1].trim() : text.trim();
      workout = JSON.parse(jsonString);
    } catch {
      return NextResponse.json(
        { error: "Erreur de parsing de la réponse IA." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, workout });
  } catch (error) {
    console.error("Workout generation error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du programme." },
      { status: 500 }
    );
  }
}
