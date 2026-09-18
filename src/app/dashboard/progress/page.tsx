"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Scale,
  Dumbbell,
  Camera,
  Target,
  Plus,
  Loader2,
  Calendar,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Sparkles,
} from "lucide-react";
import {
  getWeighIns,
  saveWeighIn,
  getBenchmarkLifts,
  saveBenchmarkLift,
  getProgressPhotos,
  saveProgressPhotoGroup,
  getExerciseLogs,
  updateUserProfile,
  WeighIn,
  BenchmarkLift,
  ProgressPhotoGroup,
} from "@/lib/firestore";
import { uploadProgressPhotoWithFallback } from "@/lib/storage";

export default function ProgressPage() {
  const { userProfile, refreshProfile } = useAuth();

  const [weighIns, setWeighIns] = useState<WeighIn[]>([]);
  const [benchmarkLifts, setBenchmarkLifts] = useState<BenchmarkLift[]>([]);
  const [photoGroups, setPhotoGroups] = useState<ProgressPhotoGroup[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showWeighInModal, setShowWeighInModal] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [newWeighInDate, setNewWeighInDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [newWeighInNote, setNewWeighInNote] = useState("");
  const [savingWeighIn, setSavingWeighIn] = useState(false);

  const [showLiftModal, setShowLiftModal] = useState(false);
  const [liftName, setLiftName] = useState("");
  const [liftWeight, setLiftWeight] = useState("");
  const [liftReps, setLiftReps] = useState("3x5");
  const [savingLift, setSavingLift] = useState(false);

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotoDateIdx, setSelectedPhotoDateIdx] = useState(0);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);

  const [photoFiles, setPhotoFiles] = useState<{
    face: File | null;
    profilGauche: File | null;
    profilDroit: File | null;
    dos: File | null;
  }>({
    face: null,
    profilGauche: null,
    profilDroit: null,
    dos: null,
  });

  const [photoPreviews, setPhotoPreviews] = useState<{
    face: string | null;
    profilGauche: string | null;
    profilDroit: string | null;
    dos: string | null;
  }>({
    face: null,
    profilGauche: null,
    profilDroit: null,
    dos: null,
  });

  const fileInputRefs = {
    face: useRef<HTMLInputElement>(null),
    profilGauche: useRef<HTMLInputElement>(null),
    profilDroit: useRef<HTMLInputElement>(null),
    dos: useRef<HTMLInputElement>(null),
  };

  const loadAllProgressData = async () => {
    if (!userProfile?.uid) return;
    try {
      const [weights, lifts, photos, logs] = await Promise.all([
        getWeighIns(userProfile.uid),
        getBenchmarkLifts(userProfile.uid),
        getProgressPhotos(userProfile.uid),
        getExerciseLogs(userProfile.uid),
      ]);

      // If no weigh-in exists yet, create the baseline with current user weight
      if (weights.length === 0 && userProfile.weight) {
        const initialPoint: WeighIn = {
          date: new Date().toISOString().split("T")[0],
          weight: Number(userProfile.weight),
          note: "Point de départ",
        };
        await saveWeighIn(userProfile.uid, initialPoint);
        setWeighIns([initialPoint]);
      } else {
        setWeighIns(weights);
      }

      // Default Mohamed lifts if none exist
      if (lifts.length === 0) {
        const defaultLifts = [
          { name: "Développé couché", currentWeight: 50, previousWeight: 47.5, reps: "3x5", date: "Initial" },
          { name: "Rowing haltère", currentWeight: 24, previousWeight: 22, reps: "4x8", date: "Initial" },
          { name: "Tirage poitrine", currentWeight: 55, previousWeight: 50, reps: "4x10", date: "Initial" },
        ];
        for (const dl of defaultLifts) {
          await saveBenchmarkLift(userProfile.uid, dl);
        }
        setBenchmarkLifts(defaultLifts);
      } else {
        setBenchmarkLifts(lifts);
      }

      setPhotoGroups(photos);
      setTotalSessions(logs.length);
    } catch (err) {
      console.warn("Failed loading progress data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllProgressData();
  }, [userProfile?.uid]);

  const handleAddWeighIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(newWeight);
    if (!w || !userProfile?.uid) return;

    setSavingWeighIn(true);
    try {
      await saveWeighIn(userProfile.uid, {
        date: newWeighInDate,
        weight: w,
        note: newWeighInNote,
      });
      await updateUserProfile(userProfile.uid, { weight: w });
      await refreshProfile();
      await loadAllProgressData();
      setShowWeighInModal(false);
      setNewWeight("");
      setNewWeighInNote("");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement de la pesée.");
    } finally {
      setSavingWeighIn(false);
    }
  };

  const handleAddLift = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(liftWeight);
    if (!liftName.trim() || isNaN(w) || !userProfile?.uid) return;

    setSavingLift(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      await saveBenchmarkLift(userProfile.uid, {
        name: liftName.trim(),
        currentWeight: w,
        reps: liftReps.trim() || "3x5",
        date: todayStr,
      });
      await loadAllProgressData();
      setShowLiftModal(false);
      setLiftName("");
      setLiftWeight("");
      setLiftReps("3x5");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement du record.");
    } finally {
      setSavingLift(false);
    }
  };

  const handlePhotoSelect = (
    pos: "face" | "profilGauche" | "profilDroit" | "dos",
    file: File
  ) => {
    setPhotoFiles((prev) => ({ ...prev, [pos]: file }));
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreviews((prev) => ({ ...prev, [pos]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleUploadPhotos = async () => {
    if (
      !photoFiles.face ||
      !photoFiles.profilGauche ||
      !photoFiles.profilDroit ||
      !photoFiles.dos ||
      !userProfile?.uid
    ) {
      alert("Merci de sélectionner les 4 photos (Face, Profil Gauche, Profil Droit, Dos) !");
      return;
    }

    setUploadingPhotos(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const [faceUrl, gaucheUrl, droitUrl, dosUrl] = await Promise.all([
        uploadProgressPhotoWithFallback(userProfile.uid, photoFiles.face, "face"),
        uploadProgressPhotoWithFallback(userProfile.uid, photoFiles.profilGauche, "profil_gauche"),
        uploadProgressPhotoWithFallback(userProfile.uid, photoFiles.profilDroit, "profil_droit"),
        uploadProgressPhotoWithFallback(userProfile.uid, photoFiles.dos, "dos"),
      ]);

      await saveProgressPhotoGroup(userProfile.uid, {
        date: todayStr,
        sessionDay: "Galerie Progrès",
        photos: {
          face: faceUrl,
          profilGauche: gaucheUrl,
          profilDroit: droitUrl,
          dos: dosUrl,
        },
        notes: "Ajout manuel depuis l'onglet Progrès",
      });

      await loadAllProgressData();
      setShowPhotoModal(false);
      setPhotoFiles({ face: null, profilGauche: null, profilDroit: null, dos: null });
      setPhotoPreviews({ face: null, profilGauche: null, profilDroit: null, dos: null });
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'upload des photos.");
    } finally {
      setUploadingPhotos(false);
    }
  };

  if (!userProfile) return null;

  const currentWeightNum = Number(userProfile.weight || 83.7);
  const startWeightNum = weighIns[0]?.weight || currentWeightNum;
  const weightDiff = currentWeightNum - startWeightNum;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black">
          <span className="gradient-text-purple">Progrès</span> & Évolution Réelle
        </h1>
        <p className="text-text-secondary mt-1">
          Données réelles de pesées, surcharge progressive et photos d&apos;angles
        </p>
      </motion.div>

      {/* Current Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: <Scale className="w-5 h-5" />,
            label: "Poids actuel",
            value: `${currentWeightNum} kg`,
            color: "text-accent-cyan",
            sub: weightDiff !== 0 ? `${weightDiff > 0 ? "+" : ""}${weightDiff.toFixed(1)} kg depuis le début` : "Poids de départ",
          },
          {
            icon: <Target className="w-5 h-5" />,
            label: "Objectif strict",
            value: "70.0 kg",
            color: "text-accent-purple-light",
            sub: `${Math.max(0, currentWeightNum - 70).toFixed(1)} kg restants`,
          },
          {
            icon: <Dumbbell className="w-5 h-5" />,
            label: "Séries validées",
            value: totalSessions.toString(),
            color: "text-accent-emerald",
            sub: "Historique en salle",
          },
          {
            icon: <Camera className="w-5 h-5" />,
            label: "Check-ins 4 Angles",
            value: `${photoGroups.length} sessions`,
            color: "text-accent-amber",
            sub: "Photos enregistrées",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-2 text-text-muted mb-2">
              {stat.icon}
              <span className="text-xs">{stat.label}</span>
            </div>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[11px] text-text-muted mt-1">{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Weight History & Real Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Scale className="w-5 h-5 text-accent-cyan" />
              Évolution du poids (Pesées réelles)
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Mises à jour manuelles ou directes via le Coach IA
            </p>
          </div>
          <button
            onClick={() => setShowWeighInModal(true)}
            className="px-4 py-2 rounded-xl bg-accent-cyan/15 hover:bg-accent-cyan/25 border border-accent-cyan/30 text-accent-cyan text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Ajouter une pesée
          </button>
        </div>

        {/* Real Dynamic Weight Bar Chart */}
        {weighIns.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-end gap-3 h-44 pt-6 pb-2 overflow-x-auto">
              {weighIns.map((point, i) => {
                const weightsArray = weighIns.map((p) => p.weight);
                const minWeight = Math.min(...weightsArray) - 1;
                const maxWeight = Math.max(...weightsArray) + 1;
                const heightPercent = Math.max(
                  15,
                  ((point.weight - minWeight) / (maxWeight - minWeight || 1)) * 100
                );

                return (
                  <div
                    key={i}
                    className="flex-1 min-w-[65px] flex flex-col items-center gap-2 h-full justify-end"
                  >
                    <span className="text-xs font-bold text-text-primary">
                      {point.weight} kg
                    </span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercent}%` }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      className="w-full bg-gradient-to-t from-accent-cyan/80 to-accent-purple rounded-t-lg min-h-[25px] hover:brightness-125 transition-all cursor-pointer relative group"
                    >
                      {point.note && (
                        <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black/90 text-white text-[10px] p-1.5 rounded whitespace-nowrap z-20">
                          {point.note}
                        </div>
                      )}
                    </motion.div>
                    <span className="text-[10px] text-text-muted truncate w-full text-center">
                      {point.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-text-muted text-center">
              💡 Dis simplement au Coach IA : &laquo; oe j&apos;ai perdu 2 kilo &raquo; pour mettre à jour instantanément ton poids !
            </p>
          </div>
        ) : (
          <div className="text-center py-8 text-text-muted text-sm">
            Aucune pesée enregistrée pour le moment.
          </div>
        )}
      </motion.div>

      {/* Strength Progress / Progressive Overload */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-accent-purple-light" />
              Surcharge Progressive & Max
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Enregistré automatiquement à la validation des séries en séance
            </p>
          </div>
          <button
            onClick={() => setShowLiftModal(true)}
            className="px-4 py-2 rounded-xl bg-accent-purple/15 hover:bg-accent-purple/25 border border-accent-purple/30 text-accent-purple-light text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Ajouter / Modifier un record
          </button>
        </div>

        <div className="space-y-3">
          {benchmarkLifts.map((lift, i) => {
            const diff =
              lift.previousWeight && lift.currentWeight > lift.previousWeight
                ? lift.currentWeight - lift.previousWeight
                : 0;

            return (
              <motion.div
                key={lift.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-3.5 rounded-xl bg-white/3 border border-border-default hover:border-accent-purple/30 transition-all"
              >
                <div>
                  <p className="font-semibold text-sm text-text-primary">
                    {lift.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    Format : {lift.reps || "3x5"} • {lift.date || "Récemment"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-base text-text-primary">
                    {lift.currentWeight} kg
                  </p>
                  {diff > 0 ? (
                    <p className="text-xs text-accent-emerald font-semibold flex items-center justify-end gap-0.5">
                      <ArrowUpRight className="w-3.5 h-3.5" /> +{diff} kg
                    </p>
                  ) : (
                    <p className="text-xs text-text-muted">Validé</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* 4-Angle Photo Progress Gallery */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Camera className="w-5 h-5 text-accent-amber" />
              Photos de Progression (4 Angles)
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Face, Profil Gauche, Profil Droit, Dos
            </p>
          </div>
          <button
            onClick={() => setShowPhotoModal(true)}
            className="px-4 py-2 rounded-xl bg-accent-amber/15 hover:bg-accent-amber/25 border border-accent-amber/30 text-accent-amber text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Ajouter les 4 photos
          </button>
        </div>

        {photoGroups.length > 0 ? (
          <div className="space-y-4">
            {/* Date tabs for photo sessions */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {photoGroups.map((pg, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPhotoDateIdx(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedPhotoDateIdx === idx
                      ? "bg-accent-amber text-black"
                      : "glass-card text-text-secondary hover:text-text-primary"
                  }`}
                >
                  📅 {pg.date} {pg.sessionDay ? `(${pg.sessionDay})` : ""}
                </button>
              ))}
            </div>

            {/* 4 Angles Grid for selected session */}
            {photoGroups[selectedPhotoDateIdx] && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Face", src: photoGroups[selectedPhotoDateIdx].photos?.face },
                  { label: "Profil Gauche", src: photoGroups[selectedPhotoDateIdx].photos?.profilGauche },
                  { label: "Profil Droit", src: photoGroups[selectedPhotoDateIdx].photos?.profilDroit },
                  { label: "Dos", src: photoGroups[selectedPhotoDateIdx].photos?.dos },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => item.src && setEnlargedPhoto(item.src)}
                    className="glass-card overflow-hidden rounded-xl border border-border-default cursor-pointer group hover:border-accent-purple/50 transition-all"
                  >
                    <div className="aspect-[3/4] relative bg-black/40">
                      {item.src ? (
                        <img
                          src={item.src}
                          alt={item.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
                          Aucune image
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-center">
                        <span className="text-xs font-bold text-white">
                          {item.label}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10">
            <Camera className="w-12 h-12 text-text-muted/30 mx-auto mb-3" />
            <p className="text-text-secondary text-sm mb-4">
              Aucune photo enregistrée. Les photos prises au début des séances apparaîtront ici sous leurs 4 angles.
            </p>
            <button
              onClick={() => setShowPhotoModal(true)}
              className="px-6 py-2.5 rounded-xl bg-accent-purple hover:bg-accent-purple-light text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter mes premières photos
            </button>
          </div>
        )}
      </motion.div>

      {/* Modal: Ajouter une pesée */}
      <AnimatePresence>
        {showWeighInModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 max-w-md w-full border border-border-default space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border-default pb-3">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Scale className="w-5 h-5 text-accent-cyan" />
                  Nouvelle Pesée
                </h3>
                <button
                  onClick={() => setShowWeighInModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              </div>

              <form onSubmit={handleAddWeighIn} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1">
                    Poids (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="ex: 81.7"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-border-default text-text-primary focus:outline-none focus:border-accent-cyan"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1">
                    Date de pesée
                  </label>
                  <input
                    type="date"
                    value={newWeighInDate}
                    onChange={(e) => setNewWeighInDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-border-default text-text-primary focus:outline-none focus:border-accent-cyan"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1">
                    Note / Contexte (optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Pesée à jeun après séance cardio"
                    value={newWeighInNote}
                    onChange={(e) => setNewWeighInNote(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-border-default text-text-primary focus:outline-none focus:border-accent-cyan"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWeighInModal(false)}
                    className="px-4 py-2 rounded-xl glass-card text-xs font-semibold text-text-secondary cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={savingWeighIn}
                    className="px-5 py-2 rounded-xl bg-accent-cyan text-black text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {savingWeighIn ? "Enregistrement..." : "Enregistrer la pesée"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Ajouter un record de force */}
      <AnimatePresence>
        {showLiftModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 max-w-md w-full border border-border-default space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border-default pb-3">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-accent-purple-light" />
                  Nouveau Record / Exercice
                </h3>
                <button
                  onClick={() => setShowLiftModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              </div>

              <form onSubmit={handleAddLift} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1">
                    Nom de l&apos;exercice *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Développé couché, Squat, Rowing..."
                    value={liftName}
                    onChange={(e) => setLiftName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-border-default text-text-primary focus:outline-none focus:border-accent-purple"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1">
                    Charge validée (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="ex: 52.5"
                    value={liftWeight}
                    onChange={(e) => setLiftWeight(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-border-default text-text-primary focus:outline-none focus:border-accent-purple"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1">
                    Format de séries / reps
                  </label>
                  <input
                    type="text"
                    placeholder="ex: 3x5 ou 4x8"
                    value={liftReps}
                    onChange={(e) => setLiftReps(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-border-default text-text-primary focus:outline-none focus:border-accent-purple"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLiftModal(false)}
                    className="px-4 py-2 rounded-xl glass-card text-xs font-semibold text-text-secondary cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={savingLift}
                    className="px-5 py-2 rounded-xl bg-accent-purple text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {savingLift ? "Enregistrement..." : "Enregistrer la perf"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Ajouter 4 photos de progression */}
      <AnimatePresence>
        {showPhotoModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="glass-card p-6 max-w-2xl w-full border border-border-default space-y-5 my-8"
            >
              <div className="flex items-center justify-between border-b border-border-default pb-3">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Camera className="w-5 h-5 text-accent-amber" />
                  Ajouter les 4 Photos de Progression
                </h3>
                <button
                  onClick={() => setShowPhotoModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: "face", label: "Face" },
                  { key: "profilGauche", label: "Profil Gauche" },
                  { key: "profilDroit", label: "Profil Droit" },
                  { key: "dos", label: "Dos" },
                ].map((item) => {
                  const k = item.key as
                    | "face"
                    | "profilGauche"
                    | "profilDroit"
                    | "dos";
                  const preview = photoPreviews[k];

                  return (
                    <div
                      key={k}
                      onClick={() => fileInputRefs[k].current?.click()}
                      className="aspect-[3/4] rounded-xl border border-dashed border-border-default hover:border-accent-amber bg-white/3 flex flex-col items-center justify-center p-2 relative overflow-hidden cursor-pointer group transition-all"
                    >
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRefs[k]}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoSelect(k, file);
                        }}
                        className="hidden"
                      />

                      {preview ? (
                        <>
                          <img
                            src={preview}
                            alt={item.label}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-white">
                            Modifier
                          </div>
                        </>
                      ) : (
                        <div className="text-center">
                          <Camera className="w-6 h-6 text-text-muted mx-auto mb-2 group-hover:text-accent-amber" />
                          <p className="text-xs font-semibold text-text-primary">
                            {item.label}
                          </p>
                          <span className="text-[10px] text-text-muted mt-1 block">
                            Sélectionner
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  className="px-4 py-2 rounded-xl glass-card text-xs font-semibold text-text-secondary cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleUploadPhotos}
                  disabled={
                    uploadingPhotos ||
                    !photoFiles.face ||
                    !photoFiles.profilGauche ||
                    !photoFiles.profilDroit ||
                    !photoFiles.dos
                  }
                  className="px-5 py-2 rounded-xl bg-accent-amber text-black text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {uploadingPhotos ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours...
                    </span>
                  ) : (
                    "Valider les 4 photos"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enlarged Photo Lightbox */}
      <AnimatePresence>
        {enlargedPhoto && (
          <div
            onClick={() => setEnlargedPhoto(null)}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={enlargedPhoto}
              alt="Photo agrandie"
              className="max-w-full max-h-[90vh] rounded-2xl object-contain"
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
