import { NextRequest, NextResponse } from "next/server";
import { genAI } from "@/lib/gemini";

const MOHAMED_SECRET_PROMPT = `
Tu es mon assistant personnel intelligent et mon coach d'élite. Ton rôle est de m'accompagner au quotidien en tenant compte de mon profil, de mes objectifs stricts et de mes projets. Voici l'intégralité de mon contexte à mémoriser et à utiliser pour toutes tes futures réponses :

# 1. IDENTITÉ & PROFIL ACADÉMIQUE
- Je m'appelle Mohamed Douazi, j'ai 16 ans (né fin février 2010).
- Je suis lycéen en classe de 1ère générale au Lycée Jean Rostand (Villepinte).
- Mes spécialités sont : Mathématiques, Physique-Chimie et NSI (Numérique et Sciences Informatiques).
- Je co-gère un club scientifique au lycée avec mon ami Riyad Jeffali. Nous préparons des concours de maths, de physique et d'éloquence.
- Je suis polyglotte : Français (maternel), Arabe, Anglais, Espagnol, et j'étudie le Japonais.

# 2. OBJECTIF PHYSIQUE & NUTRITION (Priorité Actuelle)
- Objectif : Sèche agressive pour atteindre un poids cible de 70 kg d'ici février.
- Budget calorique strict : 1 500 kcal / jour.
- Objectif Protéines : 130 à 140 g / jour.
- Stratégie diététique : 
  * Je garde les repas plaisir (fast-food, nems, etc.) mais je les intègre toujours mathématiquement dans mes calories en coupant les glucides ou le gras sur le reste de la journée.
  * Mes "hacks" protéines quotidiens : Le bol géant de fromage blanc 0% (300g) + 1 scoop de whey (50g prot / ~250 kcal), la glace maison au Ninja Creami (Skyr 0% + Whey), et l'utilisation du Air Fryer (ex: tenders de poulet maison).
  * Les bases de mes repas propres : Riz, viande hachée (5%), blanc de poulet, beaucoup de légumes verts pour le volume.

# 3. ENTRAÎNEMENT & MUSCULATION
- Salle : Basic-Fit / Fitness Park.
- Programme actuel (Routine fixe PPL + Upper/Lower) :
  * Lundi : Repos & Récupération
  * Mardi : Push (Pecs, Épaules, Triceps) - Med 18h / Riri 16h (Solo)
  * Mercredi : Pull (Dos, Arrière d'épaule, Biceps) - Med 18h / Riri 16h (Solo)
  * Jeudi : Legs (Quadriceps, Ischios, Mollets) - Med 18h / Riri 16h (Solo)
  * Vendredi : Full Cardio (objectif brûler 800 kcal) - DUO À 18h avec Riri (les deux ensemble) !
  * Samedi : Lower Body (Bas du corps) - DUO À 10h avec Riri
  * Dimanche : Upper body (Haut du corps) - DUO À 10h avec Riri
- Niveau & Perfs (à mettre à jour) : Je valide 50 kg au développé couché (3x5 reps propres) et je travaille lourd sur le dos (Rowing haltère à 22-24 kg, Tirage poitrine à 50-55 kg). Focus absolu sur l'exécution, le contrôle et la surcharge progressive.

# 4. GAMING & LOISIRS
- Jeux actuels : Valorant, Red Dead Redemption 2, Roblox, Fortnite.
- Autre : Super Smash Bros Ultimate (via émulateur Yuzu).

# DIRECTIVES DE RÉPONSE POUR L'IA :
- Sois direct, carré et orienté résultats. Pas de grandes phrases inutiles.
- Quand on parle de musculation ou de diète, sois mathématique et stratégique. Rappelle-moi mon budget de 1 500 kcal si je propose un repas trop lourd.
- Agis comme un partenaire d'entraînement (coach sportif) et un pair en développement informatique.
- Ne confonds jamais mon identité (Mohamed) avec celle de mes amis (Riyad).
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messages,
      userProfile,
      dayOfWeek,
      recentLogs,
      image,
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Le tableau de messages est requis." },
        { status: 400 }
      );
    }

    const isMohamed =
      userProfile?.email?.toLowerCase() === "mohamed.douazi@outlook.com" ||
      userProfile?.firstName?.toLowerCase().includes("med") ||
      userProfile?.firstName?.toLowerCase().includes("mohamed");

    const currentWeight = Number(userProfile?.weight || 83.7);

    const dayLabels: Record<string, string> = {
      monday: "Lundi (Repos)",
      tuesday: "Mardi (Push - Pecs, Épaules, Triceps)",
      wednesday: "Mercredi (Pull - Dos, Arrière d'épaule, Biceps)",
      thursday: "Jeudi (Legs - Quadriceps, Ischios, Mollets)",
      friday: "Vendredi (Full Cardio 800 kcal 🔥 - DUO 18h)",
      saturday: "Samedi (Lower Body - DUO 10h)",
      sunday: "Dimanche (Upper Body - DUO 10h)",
    };

    const currentDayLabel = dayLabels[dayOfWeek || "friday"] || "Jour d'entraînement";

    let baseInstructions = isMohamed
      ? MOHAMED_SECRET_PROMPT
      : `Tu es le "Coach FitPark IA", un coach d'élite pour athlètes en salle de sport.
Prénom: ${userProfile?.firstName || "Athlète"}
Objectif: ${userProfile?.goal || "Recomposition"}
Poids actuel: ${currentWeight} kg.
Sois concis, motivant, précis et direct.`;

    const actionInstructions = `
RÈGLE CRITIQUE - ACTIONS ET MODIFICATIONS SUR LE SITE :
Quand l'athlète te donne une nouvelle information pour mettre à jour son profil ou ses perfs (exemples :
- "oe j'ai perdu 2 kilo" -> nouveau poids = ${currentWeight} - 2 = ${currentWeight - 2} kg
- "je pèse 81.5 kg" -> nouveau poids = 81.5 kg
- "j'ai validé 52.5 kg au bench", "j'ai pris 24kg au rowing", "55kg au tirage" -> log exercice
- "change mon objectif"),
tu dois TOUJOURS confirmer directement dans ton message et AJOUTER à la toute fin de ta réponse un bloc JSON balisé comme ceci :

\`\`\`action
[
  { "type": "UPDATE_WEIGHT", "newWeight": ${currentWeight - 2}, "summary": "Poids mis à jour : ${(currentWeight - 2).toFixed(1)} kg" }
]
\`\`\`
ou pour un exercice :
\`\`\`action
[
  { "type": "LOG_LIFT", "name": "Développé couché", "weight": 52.5, "reps": "3x5", "summary": "Record Développé couché mis à jour à 52.5 kg" }
]
\`\`\`
Calcule précisément la nouvelle valeur si l'athlète dit "j'ai perdu X kg" (poids actuel : ${currentWeight} kg).
Ne mets le bloc \`\`\`action que si une modification concrète a été demandée ou annoncée.`;

    const systemInstruction = `
${baseInstructions}

CONTEXTE ACTUEL :
- Aujourd'hui dans ce chat : ${currentDayLabel}
- Poids actuel enregistré : ${currentWeight} kg
- Historique récent des séances : ${recentLogs ? JSON.stringify(recentLogs) : "Aucun historique particulier"}

${actionInstructions}
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction,
    });

    const conversation = messages
      .filter((m: { text?: string }) => m.text && m.text.trim().length > 0)
      .map((m: { role: string; text: string }) => {
        const speaker = m.role === "user" ? (isMohamed ? "Mohamed" : "Athlète") : "Coach IA";
        return `${speaker}: ${m.text}`;
      })
      .join("\n\n");

    const finalPrompt = `Voici la conversation en cours pour la session du ${currentDayLabel} :

${conversation}

Coach IA (réponds directement, concis et carré) :`;

    const contents: any[] = [finalPrompt];
    if (image && typeof image === "string" && image.startsWith("data:image/")) {
      const match = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        contents.push({
          inlineData: {
            mimeType: `image/${match[1] === "jpg" ? "jpeg" : match[1]}`,
            data: match[2],
          },
        });
      }
    }

    const result = await model.generateContent(contents);
    const rawText = result.response.text();

    // Parse out potential actions
    let actions: any[] = [];
    let cleanText = rawText;

    const actionMatch = rawText.match(/```action\s*([\s\S]*?)\s*```/);
    if (actionMatch) {
      try {
        actions = JSON.parse(actionMatch[1].trim());
        cleanText = rawText.replace(/```action[\s\S]*?```/, "").trim();
      } catch (err) {
        console.warn("Failed to parse action block:", err);
      }
    }

    return NextResponse.json({
      success: true,
      text: cleanText,
      actions,
    });
  } catch (error: any) {
    console.error("Live coach API error:", error?.message || error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erreur serveur",
        text: "Désolé, une erreur technique est survenue. Vérifie ta connexion ou ta clé Gemini.",
      },
      { status: 500 }
    );
  }
}
