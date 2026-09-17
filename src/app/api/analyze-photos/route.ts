import { NextRequest, NextResponse } from "next/server";
import { geminiVision } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, photoUrls, profile } = body;

    if (!userId || !photoUrls || photoUrls.length < 4 || !profile) {
      return NextResponse.json(
        { error: "Données manquantes : userId, 4 photoUrls et profile sont requis." },
        { status: 400 }
      );
    }

    // Fetch all images and convert to base64
    const imageParts = await Promise.all(
      photoUrls.map(async (url: string) => {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const mimeType = response.headers.get("content-type") || "image/jpeg";
        return {
          inlineData: {
            data: base64,
            mimeType,
          },
        };
      })
    );

    // Construct the analysis prompt
    const goalDescription =
      profile.goal === "perte_poids_muscle"
        ? "Perte de poids tout en construisant du muscle (recomposition corporelle)"
        : "Prise de masse musculaire maximale (bulk)";

    const prompt = `Tu es un coach sportif certifié et un expert en biomécanique avec 15 ans d'expérience. Tu travailles avec des athlètes en salle de musculation Fitness Park.

Voici les informations de l'athlète :
- Prénom : ${profile.firstName}
- Âge : ${profile.age} ans
- Poids : ${profile.weight} kg
- Taille : ${profile.height} cm
- Objectif principal : ${goalDescription}
- Blessures / Limitations : ${profile.injuries || "Aucune blessure signalée"}

J'ai fourni 4 photos de cet athlète prises sous 4 angles différents :
1. Vue de face
2. Vue de profil gauche
3. Vue de profil droit
4. Vue de dos

Analyse ces photos en détail et fournis une réponse JSON structurée avec EXACTEMENT ces champs :

{
  "estimatedBodyFatPercentage": <nombre entre 5 et 45>,
  "muscleBalance": {
    "strengths": ["liste des groupes musculaires bien développés"],
    "weaknesses": ["liste des groupes musculaires en retard"]
  },
  "posturalAnalysis": "description détaillée de la posture : épaules, bassin, colonne, déséquilibres visibles",
  "priorityMuscleGroups": ["les 3-5 groupes musculaires à prioriser dans le programme"],
  "athleticProfile": "description complète du profil athlétique actuel de la personne en 3-4 phrases",
  "recommendations": [
    "5 recommandations personnalisées et actionnables pour atteindre l'objectif"
  ]
}

IMPORTANT :
- Sois précis et honnête dans ton analyse, mais reste bienveillant et motivant.
- Base ton estimation de masse grasse sur les repères visuels (définition musculaire, veines visibles, plis cutanés apparents).
- Les recommandations doivent être spécifiques aux machines Fitness Park (Technogym, Hammer Strength, poulies, poids libres).
- Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;

    // Call Gemini Vision
    const result = await geminiVision.generateContent([prompt, ...imageParts]);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    let analysis;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonString = jsonMatch ? jsonMatch[1].trim() : text.trim();
      analysis = JSON.parse(jsonString);
    } catch {
      // If JSON parsing fails, create a structured response from the text
      analysis = {
        estimatedBodyFatPercentage: 20,
        muscleBalance: {
          strengths: ["Analyse visuelle en cours de traitement"],
          weaknesses: ["Données en cours d'évaluation"],
        },
        posturalAnalysis: text.substring(0, 500),
        priorityMuscleGroups: ["Dos", "Épaules", "Jambes"],
        athleticProfile:
          "L'analyse détaillée sera disponible après examen approfondi des photos. Les données de base ont été enregistrées.",
        recommendations: [
          "Commencez par un programme PPL (Push/Pull/Legs) adapté à votre niveau",
          "Focalisez-vous sur les mouvements composés : squat, développé couché, soulevé de terre",
          "Assurez un apport protéique suffisant (1.6-2.2g/kg de poids de corps)",
          "Dormez au minimum 7-8 heures par nuit pour optimiser la récupération",
          "Hydratez-vous correctement : minimum 2.5L d'eau par jour",
        ],
      };
    }

    return NextResponse.json({
      success: true,
      analysis,
      userId,
    });
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'analyse IA. Veuillez réessayer." },
      { status: 500 }
    );
  }
}
