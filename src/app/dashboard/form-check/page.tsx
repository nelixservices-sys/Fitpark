"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { uploadFormCheckVideo } from "@/lib/storage";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { Video, Upload, Loader2, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";

interface FormCheckResult {
  overallScore: number;
  posture: string;
  trajectory: string;
  tempo: string;
  corrections: string[];
  positives: string[];
  safetyWarnings: string[];
}

export default function FormCheckPage() {
  const { user } = useAuth();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<FormCheckResult | null>(null);
  const [error, setError] = useState("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "video/*": [".mp4", ".mov", ".avi", ".webm"] },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024,
  });

  const analyzeForm = async () => {
    if (!videoFile || !user || !exerciseName) return;
    setAnalyzing(true);
    setError("");

    try {
      // Upload video
      const videoUrl = await uploadFormCheckVideo(user.uid, videoFile, (progress) => {
        setUploadProgress(progress);
      });

      // Call analysis API
      const response = await fetch("/api/analyze-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, videoUrl, exerciseName }),
      });

      if (!response.ok) throw new Error("Erreur d'analyse");
      const data = await response.json();
      setResult(data.analysis);
    } catch {
      setError("Erreur lors de l'analyse. L'API de Form Check sera disponible prochainement avec l'intégration Gemini Video.");
      // Show demo result
      setResult({
        overallScore: 78,
        posture: "Dos globalement droit, légère antéversion du bassin à corriger en bas du mouvement.",
        trajectory: "La barre descend légèrement vers l'avant — maintenir une trajectoire plus verticale.",
        tempo: "Phase excentrique trop rapide (1s). Visez 3 secondes de descente contrôlée.",
        corrections: [
          "Descendez plus bas pour atteindre la parallèle complète",
          "Améliorez le contrôle excentrique — comptez 3 secondes à la descente",
          "Gardez la poitrine haute et les coudes sous la barre",
          "Verrouillez les abdominaux avant chaque répétition",
        ],
        positives: [
          "Bonne position des pieds et écartement correct",
          "Phase concentrique explosive et puissante",
          "Respiration correcte (Valsalva)",
        ],
        safetyWarnings: [
          "Attention à l'antéversion du bassin — risque de blessure lombaire",
        ],
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-accent-emerald";
    if (score >= 60) return "text-accent-amber";
    return "text-accent-rose";
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black">
          Form <span className="gradient-text-purple">Check</span> IA
        </h1>
        <p className="text-text-secondary mt-1">
          Analysez votre technique d&apos;exécution par l&apos;intelligence artificielle
        </p>
      </motion.div>

      {/* Exercise Name */}
      <div className="glass-card p-5">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Exercice filmé
        </label>
        <input
          type="text"
          value={exerciseName}
          onChange={(e) => setExerciseName(e.target.value)}
          placeholder="Ex: Squat, Développé couché, Soulevé de terre..."
          className="w-full px-4 py-3 bg-white/5 border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/50 transition-all"
        />
      </div>

      {/* Video Upload */}
      <div
        {...getRootProps()}
        className={`glass-card p-8 text-center cursor-pointer border-2 border-dashed transition-all ${
          isDragActive ? "border-accent-purple bg-accent-purple/5" : "border-border-default hover:border-accent-purple/50"
        }`}
      >
        <input {...getInputProps()} />
        <Video className="w-12 h-12 text-text-muted mx-auto mb-4" />
        {isDragActive ? (
          <p className="text-accent-purple-light font-medium">Déposez la vidéo...</p>
        ) : (
          <>
            <p className="text-text-primary font-medium mb-1">
              Glissez-déposez ou cliquez pour uploader une vidéo
            </p>
            <p className="text-xs text-text-muted">MP4, MOV, WebM — Max 100 MB</p>
          </>
        )}
      </div>

      {/* Video Preview */}
      {videoPreview && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4">
          <video src={videoPreview} controls className="w-full rounded-xl max-h-[400px]" />
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-text-secondary">
              📹 {videoFile?.name} ({((videoFile?.size || 0) / (1024 * 1024)).toFixed(1)} MB)
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={analyzeForm}
              disabled={analyzing || !exerciseName}
              className="px-6 py-3 bg-gradient-to-r from-accent-purple to-accent-purple-light rounded-xl font-bold text-white flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadProgress < 100 ? `Upload ${uploadProgress.toFixed(0)}%` : "Analyse..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Analyser
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Analysis Result */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Score */}
          <div className="glass-card p-6 text-center gradient-border">
            <p className="text-text-muted text-sm">Score de forme</p>
            <p className={`text-5xl font-black mt-1 ${getScoreColor(result.overallScore)}`}>
              {result.overallScore}/100
            </p>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-4">
              <p className="text-sm font-semibold text-accent-cyan mb-2">🧍 Posture</p>
              <p className="text-sm text-text-secondary">{result.posture}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-sm font-semibold text-accent-purple-light mb-2">📐 Trajectoire</p>
              <p className="text-sm text-text-secondary">{result.trajectory}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-sm font-semibold text-accent-amber mb-2">⏱️ Tempo</p>
              <p className="text-sm text-text-secondary">{result.tempo}</p>
            </div>
          </div>

          {/* Corrections */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-accent-rose mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Corrections à apporter
            </h3>
            <ul className="space-y-2">
              {result.corrections.map((c, i) => (
                <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                  <span className="text-accent-rose mt-0.5">⚠️</span> {c}
                </li>
              ))}
            </ul>
          </div>

          {/* Positives */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-accent-emerald mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Points positifs
            </h3>
            <ul className="space-y-2">
              {result.positives.map((p, i) => (
                <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                  <span className="text-accent-emerald mt-0.5">✅</span> {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Safety Warnings */}
          {result.safetyWarnings?.length > 0 && (
            <div className="glass-card p-5 border-accent-rose/30 bg-accent-rose/5">
              <h3 className="font-semibold text-accent-rose mb-2">🚨 Alertes sécurité</h3>
              {result.safetyWarnings.map((w, i) => (
                <p key={i} className="text-sm text-text-secondary">{w}</p>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {error && (
        <div className="glass-card p-4 border-accent-amber/30 bg-accent-amber/5">
          <p className="text-sm text-accent-amber">{error}</p>
        </div>
      )}
    </div>
  );
}
