import { NextRequest, NextResponse } from "next/server";
import { geminiPro } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profile, currentWeight, todayWorkout } = body;

    if (!profile) {
      return NextResponse.json(
        { error: "Profil utilisateur requis." },
        { status: 400 }
      );
    }

    const strategy =
      profile.goal === "perte_poids_muscle"
        ? "DÉFICIT CALORIQUE (-300 à -500 kcal). Focus : protéines élevées pour préserver le muscle, glucides modérés autour de l'entraînement, lipides essentiels."
        : "SURPLUS CALORIQUE (+300 à +500 kcal). Focus : surplus propre, protéines élevées pour l'anabolisme, glucides abondants pour l'énergie et la récupération.";

    const prompt = `Tu es un nutritionniste sportif expert travaillant avec des adolescents/jeunes adultes sportifs.

PROFIL :
- Prénom : ${profile.firstName}
- Âge : ${profile.age} ans
- Poids actuel : ${currentWeight || profile.weight} kg
- Taille : ${profile.height} cm
- Objectif : ${profile.goal === "perte_poids_muscle" ? "Recomposition corporelle (sèche)" : "Prise de masse"}

STRATÉGIE NUTRITIONNELLE : ${strategy}

ENTRAÎNEMENT DU JOUR : ${todayWorkout ? JSON.stringify(todayWorkout) : "Jour de repos"}

Calcule les besoins et génère le plan nutritionnel au format JSON :

{
  "dailyCalories": <nombre>,
  "macros": {
    "protein": { "grams": <nombre>, "percentage": <nombre> },
    "carbs": { "grams": <nombre>, "percentage": <nombre> },
    "fat": { "grams": <nombre>, "percentage": <nombre> }
  },
  "meals": [
    {
      "name": "Petit-déjeuner",
      "time": "7h30",
      "foods": [
        { "item": "nom de l'aliment", "quantity": "quantité", "calories": <nombre>, "protein": <nombre> }
      ],
      "totalCalories": <nombre>
    }
  ],
  "hydration": "recommandation hydratation en litres",
  "supplements": ["supplément recommandé si pertinent"],
  "coachNote": "conseil nutritionnel du jour"
}

RÈGLES :
- Repas adaptés à un budget étudiant français (pas de repas exotiques ou trop chers).
- 4-5 repas par jour incluant des collations pré/post-entraînement.
- Sources de protéines variées (poulet, thon, œufs, fromage blanc, whey).
- Glucides complexes autour de l'entraînement (riz, pâtes, patate douce, flocons d'avoine).
- Réponds UNIQUEMENT avec le JSON.`;

    const result = await geminiPro.generateContent(prompt);
    const text = result.response.text();

    let nutritionPlan;
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonString = jsonMatch ? jsonMatch[1].trim() : text.trim();
      nutritionPlan = JSON.parse(jsonString);
    } catch {
      return NextResponse.json(
        { error: "Erreur de parsing de la réponse IA." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, nutritionPlan });
  } catch (error) {
    console.error("Nutrition plan error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du plan nutritionnel." },
      { status: 500 }
    );
  }
}
