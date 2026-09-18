import { NextRequest, NextResponse } from "next/server";
import { genAI } from "@/lib/gemini";

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

    const isMohamed =
      profile.email?.toLowerCase() === "mohamed.douazi@outlook.com" ||
      profile.firstName?.toLowerCase().includes("med") ||
      profile.firstName?.toLowerCase().includes("mohamed");

    const mohamedCustomDiet = isMohamed
      ? `
CADRE NUTRITIONNEL STRICT DE MOHAMED DOUAZI (Priorité Absolue) :
- Objectif : Sèche agressive pour atteindre 70 kg d'ici février.
- Budget calorique STRICT : exactement 1 500 kcal / jour (NE PAS DÉPASSER).
- Objectif Protéines : 130 à 140 g / jour.
- Hacks protéines quotidiens obligatoires dans la journée :
  1. Le bol géant de fromage blanc 0% (300g) + 1 scoop de whey (~50g prot / ~250 kcal)
  2. Glace maison au Ninja Creami (Skyr 0% + Whey)
  3. Utilisation de l'Air Fryer (ex: tenders de poulet maison panés légers ou épicés)
  4. Repas propres réguliers : Riz, steak haché 5% ou blanc de poulet, gros volume de légumes verts pour la satiété.
  5. S'il y a un repas plaisir, compenser mathématiquement sur le reste de la journée pour rester sous 1 500 kcal.`
      : "";

    const strategy = isMohamed
      ? "SÈCHE STRICTE 1500 KCAL. Déficit calorique agressif maîtrisé, 130-140g protéines, maintien du muscle."
      : profile.goal === "perte_poids_muscle"
      ? "DÉFICIT CALORIQUE (-300 à -500 kcal). Focus : protéines élevées pour préserver le muscle, glucides modérés autour de l'entraînement, lipides essentiels."
      : "SURPLUS CALORIQUE (+300 à +500 kcal). Focus : surplus propre, protéines élevées pour l'anabolisme, glucides abondants pour l'énergie et la récupération.";

    const prompt = `Tu es un nutritionniste du sport expert et pragmatique.
Tu génères un plan nutritionnel sur mesure pour la journée.

PROFIL DE L'ATHLÈTE :
- Prénom : ${profile.firstName}
- Âge : ${profile.age} ans
- Poids actuel : ${currentWeight || profile.weight} kg
- Taille : ${profile.height} cm
- Objectif : ${profile.goal === "perte_poids_muscle" ? "Recomposition corporelle (sèche)" : "Prise de masse"}
${mohamedCustomDiet}

STRATÉGIE NUTRITIONNELLE : ${strategy}

ENTRAÎNEMENT DU JOUR : ${todayWorkout ? JSON.stringify(todayWorkout) : "Séance de musculation / cardio"}

Format JSON requis :

{
  "dailyCalories": ${isMohamed ? 1500 : "<nombre>"},
  "macros": {
    "protein": { "grams": ${isMohamed ? 135 : "<nombre>"}, "percentage": <nombre> },
    "carbs": { "grams": <nombre>, "percentage": <nombre> },
    "fat": { "grams": <nombre>, "percentage": <nombre> }
  },
  "meals": [
    {
      "name": "Nom du repas",
      "time": "Heure (ex: 8h00, 13h00, 17h00...)",
      "foods": [
        { "item": "Aliment", "quantity": "Quantité en g", "calories": <nombre>, "protein": <nombre> }
      ],
      "totalCalories": <nombre>
    }
  ],
  "hydration": "recommandation hydratation en litres (ex: 2.5 - 3L)",
  "supplements": ["Créatine", "Whey", "Vitamines"],
  "coachNote": "message direct et carré sur le respect de la diète"
}

RÈGLES :
- Somme des calories = exactement ${isMohamed ? "1500 kcal" : "dailyCalories"}.
- Somme des protéines = ${isMohamed ? "130 à 140 g" : "adaptée au profil"}.
- Réponds UNIQUEMENT avec le JSON valide.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let nutritionPlan;
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonString = jsonMatch ? jsonMatch[1].trim() : text.trim();
      nutritionPlan = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error("JSON parse error:", text);
      return NextResponse.json(
        { error: "Erreur de format de la réponse IA." },
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
