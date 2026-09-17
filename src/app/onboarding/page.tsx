"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { updateUserProfile, completeOnboarding } from "@/lib/firestore";
import { uploadOnboardingPhoto } from "@/lib/storage";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
  Dumbbell,
  User,
  Ruler,
  Target,
  HeartPulse,
  Wrench,
  Camera,
  Brain,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Upload,
  X,
  Loader2,
  Sparkles,
  AlertCircle,
} from "lucide-react";

// ==================== Types ====================

interface OnboardingData {
  firstName: string;
  lastName: string;
  age: number | "";
  weight: number | "";
  height: number | "";
  goal: "" | "perte_poids_muscle" | "prise_masse";
  injuries: string;
  equipment: string[];
  photos: {
    face: File | null;
    profil_gauche: File | null;
    profil_droit: File | null;
    dos: File | null;
  };
}

type PhotoPosition = "face" | "profil_gauche" | "profil_droit" | "dos";

const PHOTO_LABELS: Record<PhotoPosition, string> = {
  face: "Face",
  profil_gauche: "Profil Gauche",
  profil_droit: "Profil Droit",
  dos: "Dos",
};

const FITNESS_PARK_EQUIPMENT = [
  "Presse à cuisses (Technogym)",
  "Smith Machine",
  "Poulie haute / basse",
  "Cable Crossover",
  "Banc développé couché (Hammer Strength)",
  "Banc incliné / décliné",
  "Rack à squat",
  "Haltères (1-50 kg)",
  "Barres olympiques",
  "Leg Extension / Leg Curl",
  "Machine Pec Deck / Butterfly",
  "Tirage vertical (Lat Pulldown)",
  "Rowing machine",
  "Presse épaules (Shoulder Press)",
  "Hip Thrust machine",
  "Tapis de course",
  "Vélo elliptique",
  "Rameur",
  "Corde à sauter",
  "Banc d'abdominaux",
];

const STEPS = [
  { icon: <User className="w-5 h-5" />, label: "Identité" },
  { icon: <Ruler className="w-5 h-5" />, label: "Mensurations" },
  { icon: <Target className="w-5 h-5" />, label: "Objectif" },
  { icon: <HeartPulse className="w-5 h-5" />, label: "Santé" },
  { icon: <Wrench className="w-5 h-5" />, label: "Équipement" },
  { icon: <Camera className="w-5 h-5" />, label: "Photos" },
  { icon: <Brain className="w-5 h-5" />, label: "Analyse IA" },
];

// ==================== Main Component ====================

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<Record<string, unknown> | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [photoPreviews, setPhotoPreviews] = useState<Record<PhotoPosition, string>>({
    face: "",
    profil_gauche: "",
    profil_droit: "",
    dos: "",
  });

  const [data, setData] = useState<OnboardingData>({
    firstName: "",
    lastName: "",
    age: "",
    weight: "",
    height: "",
    goal: "",
    injuries: "",
    equipment: [],
    photos: {
      face: null,
      profil_gauche: null,
      profil_droit: null,
      dos: null,
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const updateData = (field: string, value: unknown) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return data.firstName.trim() !== "" && data.lastName.trim() !== "" && data.age !== "" && Number(data.age) > 0;
      case 1:
        return data.weight !== "" && data.height !== "" && Number(data.weight) > 0 && Number(data.height) > 0;
      case 2:
        return data.goal !== "";
      case 3:
        return true; // Injuries are optional
      case 4:
        return data.equipment.length > 0;
      case 5:
        return Object.values(data.photos).every((p) => p !== null);
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (currentStep === 5) {
      // Upload photos and analyze
      await handleSubmitOnboarding();
    } else if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSubmitOnboarding = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setAnalysisError("");

    try {
      // 1. Save profile data to Firestore
      await updateUserProfile(user.uid, {
        firstName: data.firstName,
        lastName: data.lastName,
        age: Number(data.age),
        weight: Number(data.weight),
        height: Number(data.height),
        goal: data.goal as "perte_poids_muscle" | "prise_masse",
        injuries: data.injuries,
        equipment: data.equipment,
      });

      // 2. Upload photos to Firebase Storage
      const photoUrls: Record<string, string> = {};
      const positions: PhotoPosition[] = ["face", "profil_gauche", "profil_droit", "dos"];

      for (const position of positions) {
        const file = data.photos[position];
        if (file) {
          const url = await uploadOnboardingPhoto(user.uid, file, position);
          photoUrls[position] = url;
        }
      }

      // 3. Call Gemini Vision API for analysis
      const response = await fetch("/api/analyze-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          photoUrls: Object.values(photoUrls),
          profile: {
            firstName: data.firstName,
            age: Number(data.age),
            weight: Number(data.weight),
            height: Number(data.height),
            goal: data.goal,
            injuries: data.injuries,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Échec de l'analyse IA");
      }

      const result = await response.json();
      setAnalysisResult(result.analysis);

      // 4. Mark onboarding as complete
      await completeOnboarding(user.uid);

      // 5. Move to analysis step
      setCurrentStep(6);
    } catch (err) {
      console.error("Onboarding error:", err);
      setAnalysisError("Une erreur est survenue lors de l'analyse. Vous pouvez continuer et réessayer plus tard.");
      await completeOnboarding(user!.uid);
      setCurrentStep(6);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    router.push("/dashboard");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg-main">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Dumbbell className="w-12 h-12 text-accent-purple" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg-main relative overflow-hidden">
      <div className="bg-orb bg-orb-purple" />
      <div className="bg-orb bg-orb-cyan" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 min-h-screen flex flex-col">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => (
              <div
                key={step.label}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    index < currentStep
                      ? "bg-accent-emerald text-white"
                      : index === currentStep
                        ? "bg-gradient-to-br from-accent-purple to-accent-purple-light text-white pulse-glow"
                        : "bg-white/5 text-text-muted border border-border-default"
                  }`}
                >
                  {index < currentStep ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium hidden sm:block ${
                    index <= currentStep
                      ? "text-text-primary"
                      : "text-text-muted"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-accent-purple to-accent-cyan rounded-full"
              animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <div className="glass-card p-8">
                {currentStep === 0 && (
                  <StepPersonalInfo data={data} updateData={updateData} />
                )}
                {currentStep === 1 && (
                  <StepMeasurements data={data} updateData={updateData} />
                )}
                {currentStep === 2 && (
                  <StepGoals data={data} updateData={updateData} />
                )}
                {currentStep === 3 && (
                  <StepInjuries data={data} updateData={updateData} />
                )}
                {currentStep === 4 && (
                  <StepEquipment data={data} updateData={updateData} />
                )}
                {currentStep === 5 && (
                  <StepPhotos
                    data={data}
                    setData={setData}
                    photoPreviews={photoPreviews}
                    setPhotoPreviews={setPhotoPreviews}
                  />
                )}
                {currentStep === 6 && (
                  <StepAnalysis
                    result={analysisResult}
                    error={analysisError}
                    firstName={data.firstName}
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 gap-4">
          {currentStep > 0 && currentStep < 6 ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="flex items-center gap-2 px-6 py-3 glass-card font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              style={{ borderRadius: "12px" }}
            >
              <ArrowLeft className="w-5 h-5" />
              Retour
            </motion.button>
          ) : (
            <div />
          )}

          {currentStep < 6 ? (
            <motion.button
              whileHover={{ scale: canProceed() ? 1.02 : 1 }}
              whileTap={{ scale: canProceed() ? 0.98 : 1 }}
              onClick={handleNext}
              disabled={!canProceed() || isSubmitting}
              className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-accent-purple to-accent-purple-light rounded-xl font-bold text-white shadow-lg shadow-accent-purple/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyse en cours...
                </>
              ) : currentStep === 5 ? (
                <>
                  <Sparkles className="w-5 h-5" />
                  Lancer l&apos;analyse IA
                </>
              ) : (
                <>
                  Suivant
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleFinish}
              className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-accent-emerald to-accent-cyan rounded-xl font-bold text-white shadow-lg cursor-pointer ml-auto"
            >
              Accéder au Dashboard
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== Step Components ====================

function StepPersonalInfo({
  data,
  updateData,
}: {
  data: OnboardingData;
  updateData: (field: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-purple/10 text-accent-purple-light mb-4">
          <User className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold">Qui êtes-vous ?</h2>
        <p className="text-text-secondary mt-1">
          Commençons par faire connaissance
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Prénom
          </label>
          <input
            type="text"
            value={data.firstName}
            onChange={(e) => updateData("firstName", e.target.value)}
            placeholder="Med"
            className="w-full px-4 py-3.5 bg-white/5 border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/50 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Nom
          </label>
          <input
            type="text"
            value={data.lastName}
            onChange={(e) => updateData("lastName", e.target.value)}
            placeholder="Votre nom"
            className="w-full px-4 py-3.5 bg-white/5 border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/50 transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Âge
        </label>
        <input
          type="number"
          value={data.age}
          onChange={(e) => updateData("age", e.target.value ? Number(e.target.value) : "")}
          placeholder="17"
          min={14}
          max={99}
          className="w-full px-4 py-3.5 bg-white/5 border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/50 transition-all"
        />
      </div>
    </div>
  );
}

function StepMeasurements({
  data,
  updateData,
}: {
  data: OnboardingData;
  updateData: (field: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-cyan/10 text-accent-cyan mb-4">
          <Ruler className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold">Vos mensurations</h2>
        <p className="text-text-secondary mt-1">
          Pour calibrer votre programme et vos macros
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Poids (kg)
          </label>
          <div className="relative">
            <input
              type="number"
              value={data.weight}
              onChange={(e) => updateData("weight", e.target.value ? Number(e.target.value) : "")}
              placeholder="75"
              min={30}
              max={250}
              step={0.1}
              className="w-full px-4 py-3.5 bg-white/5 border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/50 transition-all"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-sm">
              kg
            </span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Taille (cm)
          </label>
          <div className="relative">
            <input
              type="number"
              value={data.height}
              onChange={(e) => updateData("height", e.target.value ? Number(e.target.value) : "")}
              placeholder="178"
              min={100}
              max={250}
              className="w-full px-4 py-3.5 bg-white/5 border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/50 transition-all"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-sm">
              cm
            </span>
          </div>
        </div>
      </div>

      {data.weight && data.height ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-accent-purple/5 border border-accent-purple/20 text-center"
        >
          <p className="text-sm text-text-secondary">
            IMC estimé :{" "}
            <span className="text-accent-purple-light font-bold text-lg">
              {(Number(data.weight) / Math.pow(Number(data.height) / 100, 2)).toFixed(1)}
            </span>
          </p>
        </motion.div>
      ) : null}
    </div>
  );
}

function StepGoals({
  data,
  updateData,
}: {
  data: OnboardingData;
  updateData: (field: string, value: unknown) => void;
}) {
  const goals = [
    {
      value: "perte_poids_muscle",
      title: "Perte de poids + Muscle",
      description:
        "Sécher en préservant et construisant du muscle. Déficit calorique contrôlé avec entraînement intense.",
      icon: "🔥",
      color: "from-accent-rose to-accent-amber",
      borderColor: "border-accent-rose/30",
      bgColor: "bg-accent-rose/5",
    },
    {
      value: "prise_masse",
      title: "Prise de Masse",
      description:
        "Maximiser la construction musculaire avec un surplus calorique. Focus hypertrophie et force.",
      icon: "💪",
      color: "from-accent-cyan to-accent-emerald",
      borderColor: "border-accent-cyan/30",
      bgColor: "bg-accent-cyan/5",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-amber/10 text-accent-amber mb-4">
          <Target className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold">Votre objectif</h2>
        <p className="text-text-secondary mt-1">
          Choisissez votre voie de transformation
        </p>
      </div>

      <div className="space-y-4">
        {goals.map((goal) => (
          <motion.button
            key={goal.value}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => updateData("goal", goal.value)}
            className={`w-full text-left p-6 rounded-2xl border-2 transition-all cursor-pointer ${
              data.goal === goal.value
                ? `${goal.borderColor} ${goal.bgColor} shadow-lg`
                : "border-border-default bg-white/3 hover:bg-white/5"
            }`}
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">{goal.icon}</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-1">{goal.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {goal.description}
                </p>
              </div>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                  data.goal === goal.value
                    ? `${goal.borderColor} bg-gradient-to-r ${goal.color}`
                    : "border-text-muted"
                }`}
              >
                {data.goal === goal.value && (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function StepInjuries({
  data,
  updateData,
}: {
  data: OnboardingData;
  updateData: (field: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-rose/10 text-accent-rose mb-4">
          <HeartPulse className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold">Santé & Blessures</h2>
        <p className="text-text-secondary mt-1">
          Pour exclure les exercices dangereux pour vous
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Décrivez vos blessures, douleurs articulaires ou limitations
        </label>
        <textarea
          value={data.injuries}
          onChange={(e) => updateData("injuries", e.target.value)}
          placeholder="Ex: Douleur au genou droit, ancienne blessure à l'épaule gauche, mal de dos chronique..."
          rows={5}
          className="w-full px-4 py-3.5 bg-white/5 border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/50 transition-all resize-none"
        />
        <p className="text-xs text-text-muted mt-2">
          💡 L&apos;IA exclura automatiquement les exercices à risque et proposera des
          alternatives sûres. Laissez vide si aucune blessure.
        </p>
      </div>
    </div>
  );
}

function StepEquipment({
  data,
  updateData,
}: {
  data: OnboardingData;
  updateData: (field: string, value: unknown) => void;
}) {
  const toggleEquipment = (item: string) => {
    const current = data.equipment;
    if (current.includes(item)) {
      updateData(
        "equipment",
        current.filter((e) => e !== item)
      );
    } else {
      updateData("equipment", [...current, item]);
    }
  };

  const selectAll = () => {
    updateData("equipment", [...FITNESS_PARK_EQUIPMENT]);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-emerald/10 text-accent-emerald mb-4">
          <Wrench className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold">Matériel Fitness Park</h2>
        <p className="text-text-secondary mt-1">
          Cochez les machines disponibles dans votre salle
        </p>
      </div>

      <button
        onClick={selectAll}
        className="text-sm text-accent-purple-light hover:underline font-medium cursor-pointer"
      >
        ✅ Tout sélectionner
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2">
        {FITNESS_PARK_EQUIPMENT.map((item) => (
          <motion.button
            key={item}
            whileTap={{ scale: 0.97 }}
            onClick={() => toggleEquipment(item)}
            className={`flex items-center gap-3 p-3 rounded-xl text-left text-sm transition-all cursor-pointer ${
              data.equipment.includes(item)
                ? "bg-accent-purple/10 border border-accent-purple/30 text-text-primary"
                : "bg-white/3 border border-border-default text-text-secondary hover:bg-white/5"
            }`}
          >
            <div
              className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                data.equipment.includes(item)
                  ? "bg-accent-purple text-white"
                  : "border border-text-muted"
              }`}
            >
              {data.equipment.includes(item) && (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
            </div>
            <span className="leading-tight">{item}</span>
          </motion.button>
        ))}
      </div>

      <p className="text-xs text-text-muted text-center">
        {data.equipment.length} / {FITNESS_PARK_EQUIPMENT.length} sélectionnés
      </p>
    </div>
  );
}

function StepPhotos({
  data,
  setData,
  photoPreviews,
  setPhotoPreviews,
}: {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  photoPreviews: Record<PhotoPosition, string>;
  setPhotoPreviews: React.Dispatch<
    React.SetStateAction<Record<PhotoPosition, string>>
  >;
}) {
  const [activeSlot, setActiveSlot] = useState<PhotoPosition>("face");

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Set file in data
      setData((prev) => ({
        ...prev,
        photos: { ...prev.photos, [activeSlot]: file },
      }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreviews((prev) => ({
          ...prev,
          [activeSlot]: e.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);

      // Auto-advance to next empty slot
      const positions: PhotoPosition[] = ["face", "profil_gauche", "profil_droit", "dos"];
      const currentIndex = positions.indexOf(activeSlot);
      for (let i = 1; i <= positions.length; i++) {
        const nextSlot = positions[(currentIndex + i) % positions.length];
        if (!data.photos[nextSlot] && nextSlot !== activeSlot) {
          setActiveSlot(nextSlot);
          break;
        }
      }
    },
    [activeSlot, data.photos, setData, setPhotoPreviews]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removePhoto = (position: PhotoPosition) => {
    setData((prev) => ({
      ...prev,
      photos: { ...prev.photos, [position]: null },
    }));
    setPhotoPreviews((prev) => ({
      ...prev,
      [position]: "",
    }));
  };

  const positions: PhotoPosition[] = ["face", "profil_gauche", "profil_droit", "dos"];
  const filledCount = positions.filter((p) => data.photos[p]).length;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-purple/10 text-accent-purple-light mb-4">
          <Camera className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold">Photos du Physique</h2>
        <p className="text-text-secondary mt-1">
          4 photos requises pour l&apos;analyse IA complète
        </p>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {positions.map((position) => (
          <motion.button
            key={position}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveSlot(position)}
            className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
              activeSlot === position
                ? "border-accent-purple shadow-lg shadow-accent-purple/20"
                : photoPreviews[position]
                  ? "border-accent-emerald/50"
                  : "border-border-default border-dashed"
            }`}
          >
            {photoPreviews[position] ? (
              <>
                <img
                  src={photoPreviews[position]}
                  alt={PHOTO_LABELS[position]}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(position);
                  }}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center hover:bg-accent-rose/80 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-white/3 p-2">
                <Camera className="w-5 h-5 text-text-muted mb-1" />
              </div>
            )}
            <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm py-1 px-2">
              <p className="text-[10px] font-medium text-center text-white truncate">
                {PHOTO_LABELS[position]}
              </p>
            </div>
          </motion.button>
        ))}
      </div>

      <p className="text-center text-sm text-text-secondary">
        {filledCount}/4 photos ajoutées —{" "}
        <span className="text-accent-purple-light font-medium">
          Slot actif : {PHOTO_LABELS[activeSlot]}
        </span>
      </p>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? "border-accent-purple bg-accent-purple/5"
            : "border-border-default hover:border-accent-purple/50 hover:bg-white/3"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-10 h-10 text-text-muted mx-auto mb-3" />
        {isDragActive ? (
          <p className="text-accent-purple-light font-medium">
            Déposez la photo ici...
          </p>
        ) : (
          <div>
            <p className="text-text-primary font-medium mb-1">
              Glissez-déposez ou cliquez pour{" "}
              <span className="text-accent-purple-light">
                {PHOTO_LABELS[activeSlot]}
              </span>
            </p>
            <p className="text-xs text-text-muted">
              JPG, PNG ou WebP • Max 10 MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StepAnalysis({
  result,
  error,
  firstName,
}: {
  result: Record<string, unknown> | null;
  error: string;
  firstName: string;
}) {
  const analysis = result as {
    estimatedBodyFatPercentage?: number;
    muscleBalance?: { strengths?: string[]; weaknesses?: string[] };
    posturalAnalysis?: string;
    priorityMuscleGroups?: string[];
    athleticProfile?: string;
    recommendations?: string[];
  } | null;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-purple to-accent-cyan mb-4"
        >
          <Sparkles className="w-7 h-7 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold">
          Analyse IA de {firstName || "votre profil"}
        </h2>
        <p className="text-text-secondary mt-1">
          Voici votre profil athlétique initial
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-accent-amber/10 border border-accent-amber/20">
          <AlertCircle className="w-5 h-5 text-accent-amber flex-shrink-0 mt-0.5" />
          <p className="text-sm text-accent-amber">{error}</p>
        </div>
      )}

      {analysis ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* Body Fat */}
          {analysis.estimatedBodyFatPercentage && (
            <div className="p-4 rounded-xl bg-white/3 border border-border-default">
              <p className="text-sm text-text-secondary mb-1">
                Masse grasse estimée
              </p>
              <p className="text-3xl font-black gradient-text-purple">
                {analysis.estimatedBodyFatPercentage}%
              </p>
            </div>
          )}

          {/* Muscle Balance */}
          {analysis.muscleBalance && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-accent-emerald/5 border border-accent-emerald/20">
                <p className="text-sm font-semibold text-accent-emerald mb-2">
                  💪 Points forts
                </p>
                <ul className="space-y-1">
                  {analysis.muscleBalance.strengths?.map((s: string) => (
                    <li key={s} className="text-sm text-text-secondary">
                      • {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-xl bg-accent-amber/5 border border-accent-amber/20">
                <p className="text-sm font-semibold text-accent-amber mb-2">
                  ⚠️ À améliorer
                </p>
                <ul className="space-y-1">
                  {analysis.muscleBalance.weaknesses?.map((w: string) => (
                    <li key={w} className="text-sm text-text-secondary">
                      • {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Athletic Profile */}
          {analysis.athleticProfile && (
            <div className="p-4 rounded-xl bg-white/3 border border-border-default">
              <p className="text-sm font-semibold text-accent-purple-light mb-2">
                🏋️ Profil athlétique
              </p>
              <p className="text-sm text-text-secondary leading-relaxed">
                {analysis.athleticProfile}
              </p>
            </div>
          )}

          {/* Postural Analysis */}
          {analysis.posturalAnalysis && (
            <div className="p-4 rounded-xl bg-white/3 border border-border-default">
              <p className="text-sm font-semibold text-accent-cyan mb-2">
                🧍 Analyse posturale
              </p>
              <p className="text-sm text-text-secondary leading-relaxed">
                {analysis.posturalAnalysis}
              </p>
            </div>
          )}

          {/* Priority Muscle Groups */}
          {analysis.priorityMuscleGroups && (
            <div className="p-4 rounded-xl bg-white/3 border border-border-default">
              <p className="text-sm font-semibold text-accent-rose mb-2">
                🎯 Groupes musculaires prioritaires
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {analysis.priorityMuscleGroups.map((mg: string) => (
                  <span
                    key={mg}
                    className="px-3 py-1.5 rounded-lg bg-accent-purple/10 text-accent-purple-light text-xs font-medium"
                  >
                    {mg}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations && (
            <div className="p-4 rounded-xl bg-white/3 border border-border-default">
              <p className="text-sm font-semibold text-accent-emerald mb-2">
                📋 Recommandations
              </p>
              <ul className="space-y-2">
                {analysis.recommendations.map((r: string, i: number) => (
                  <li
                    key={i}
                    className="text-sm text-text-secondary flex items-start gap-2"
                  >
                    <span className="text-accent-emerald flex-shrink-0">
                      {i + 1}.
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      ) : (
        !error && (
          <div className="text-center py-12">
            <Loader2 className="w-10 h-10 text-accent-purple animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">Chargement de l&apos;analyse...</p>
          </div>
        )
      )}
    </div>
  );
}
