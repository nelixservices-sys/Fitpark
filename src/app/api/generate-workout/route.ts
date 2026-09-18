import { NextRequest, NextResponse } from "next/server";
import { genAI } from "@/lib/gemini";

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

    const isMohamed =
      profile.email?.toLowerCase() === "mohamed.douazi@outlook.com" ||
      profile.firstName?.toLowerCase().includes("med") ||
      profile.firstName?.toLowerCase().includes("mohamed");

    const goalDescription =
      profile.goal === "perte_poids_muscle"
        ? "Perte de poids + construction musculaire (sèche agressive, 1500 kcal, maintien de la force)"
        : "Prise de masse musculaire (surplus calorique, hypertrophie maximale)";

    // Specific rules per day for Mohamed's routine
    let daySpecificRule = "";
    if (dayOfWeek === "friday") {
      daySpecificRule = `
RÈGLE OFFICIELLE VENDREDI : C'est une séance "Full Cardio" d'exactement 1 heure en DUO (18h00).
L'objectif STRICT est de brûler au minimum 800 calories (fractionné, HIIT, tapis de course incliné, rameur Concept2, SkiErg, vélo elliptique).
Pas de musculation lourde ce jour-là, pure intensité cardiovasculaire pour cramer 800 kcal.`;
    } else if (dayOfWeek === "sunday") {
      daySpecificRule = `
RÈGLE OFFICIELLE DIMANCHE : C'est une séance "Upper Body" (Haut du corps) en DUO (10h00).
Cible : Pectoraux, Dos lourd (Rowing / Tirages), Épaules et Bras (Biceps/Triceps).
Garde un programme fixe de référence basé sur des mouvements polyarticulaires solides.`;
    } else if (dayOfWeek === "saturday") {
      daySpecificRule = `
RÈGLE OFFICIELLE SAMEDI : C'est une séance "Lower Body" (Bas du corps) en DUO (10h00).
Cible : Quadriceps (Squat/Presse), Ischios (Leg curl/SDT roumain), Mollets.`;
    } else if (dayOfWeek === "tuesday") {
      daySpecificRule = `
RÈGLE MARDI : Séance "Push" (Pectoraux, Épaules ant/lat, Triceps).`;
    } else if (dayOfWeek === "wednesday") {
      daySpecificRule = `
RÈGLE MERCREDI : Séance "Pull" (Dos, Arrière d'épaules, Biceps). Focus sur le travail lourd au dos.`;
    } else if (dayOfWeek === "thursday") {
      daySpecificRule = `
RÈGLE JEUDI : Séance "Legs" (Quadriceps, Ischios, Mollets, Fessiers).`;
    } else if (dayOfWeek === "monday") {
      daySpecificRule = `
ATTENTION : Lundi est le jour de REPOS complet. Propose uniquement des étirements doux ou de la mobilité pour la récupération.`;
    }

    const mohamedPerfsContext = isMohamed
      ? `
PERFORMANCES ACTUELLES DE MOHAMED (À utiliser comme référence exacte pour les charges) :
- Développé couché : 50 kg (3x5 reps validées)
- Rowing haltère : 22 à 24 kg
- Tirage poitrine (lat pulldown) : 50 à 55 kg
- Focus absolu sur l'exécution contrôlée et la surcharge progressive.`
      : "";

    const prompt = `Tu es un coach de musculation expert pour les salles Fitness Park.
Tu conçois une routine d'entraînement fixe, éprouvée et solide pour un athlète régulier.

PROFIL DE L'ATHLÈTE :
- Prénom : ${profile.firstName}
- Âge : ${profile.age} ans
- Poids : ${profile.weight} kg
- Taille : ${profile.height} cm
- Objectif : ${goalDescription}
- Blessures : ${profile.injuries || "Aucune"}
- Niveau de fatigue : ${fatigueLevel || 5}/10
${mohamedPerfsContext}

JOUR DE LA SEMAINE : ${dayOfWeek}
${daySpecificRule}

MATÉRIEL DISPONIBLE : ${(availableEquipment || []).join(", ") || "Tout le matériel Fitness Park standard (poulies, haltères, barres olympiques, machines guidées)"}

HISTORIQUE RÉCENT :
${previousWorkouts ? JSON.stringify(previousWorkouts, null, 2) : "Création de la routine fixe de référence"}

INSTRUCTION CRUCIALE :
Génère une séance fixe, structurée et standardisée qui servira de routine permanente pour ce jour de la semaine.
Format JSON requis :

{
  "splitType": "push | pull | legs | upper | lower | cardio | rest",
  "title": "Titre précis de la séance",
  "targetMuscles": ["muscles ciblés"],
  "estimatedDuration": "durée en minutes (ex: 60 ou 75)",
  "estimatedCalories": "estimation kcal (ex: 800 pour le vendredi)",
  "warmup": {
    "duration": "5-10 min",
    "exercises": ["exercice échauffement 1", "exercice échauffement 2"]
  },
  "exercises": [
    {
      "name": "Nom précis de l'exercice Fitness Park",
      "muscleGroup": "groupe musculaire",
      "sets": 4,
      "reps": "6-8 ou 8-12",
      "restSeconds": 90,
      "weight": "charge recommandée (ex: 50 kg)",
      "technique": "consigne technique essentielle",
      "alternatives": ["alternative machine si occupée"]
    }
  ],
  "cooldown": {
    "duration": "5 min",
    "exercises": ["étirement 1", "étirement 2"]
  },
  "coachNote": "consigne directe et motivante du coach"
}

Réponds UNIQUEMENT avec le JSON valide.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let workout;
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonString = jsonMatch ? jsonMatch[1].trim() : text.trim();
      workout = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error("JSON parse error:", text);
      return NextResponse.json(
        { error: "Erreur de format de la réponse IA." },
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
