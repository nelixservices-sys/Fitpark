"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  MessageSquare,
  Send,
  Loader2,
  Camera,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  Flame,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getDailyCoachMessages,
  saveDailyCoachMessage,
  updateUserProfile,
  saveWeighIn,
  saveBenchmarkLift,
  getExerciseLogs,
} from "@/lib/firestore";
import { DayOfWeek } from "@/lib/schedule-engine";

const DAYS_LIST: { key: DayOfWeek; label: string; icon: string; split: string }[] = [
  { key: "monday", label: "Lun", icon: "😴", split: "Repos" },
  { key: "tuesday", label: "Mar", icon: "🏋️", split: "Push" },
  { key: "wednesday", label: "Mer", icon: "🪢", split: "Pull" },
  { key: "thursday", label: "Jeu", icon: "🦵", split: "Legs" },
  { key: "friday", label: "Ven", icon: "🔥", split: "Cardio Duo" },
  { key: "saturday", label: "Sam", icon: "🦿", split: "Lower Duo" },
  { key: "sunday", label: "Dim", icon: "💪", split: "Upper Duo" },
];

function getWelcomeMessage(day: DayOfWeek, name: string): string {
  switch (day) {
    case "monday":
      return `Salut ${name} ! C'est lundi : journée de repos & récupération. Hydratation, mobilité et respect strict des 1 500 kcal. Des questions sur ta diète ?`;
    case "tuesday":
      return `Salut ${name} ! C'est mardi : séance Push (Pecs, Épaules, Triceps). Objectif : 50 kg au développé couché (3x5) propre et contrôlé. Dis-moi quand tu démarres !`;
    case "wednesday":
      return `Salut ${name} ! C'est mercredi : séance Pull (Dos, Arrière d'épaules, Biceps). Focus dos lourd : rowing haltère 22-24 kg et tirage poitrine 50-55 kg !`;
    case "thursday":
      return `Salut ${name} ! C'est jeudi : séance Legs (Quadriceps, Ischios, Mollets). Intensité maximale sous la barre. Prêt pour les cuisses ?`;
    case "friday":
      return `Salut ${name} ! C'est vendredi : séance FULL CARDIO en DUO à 18h00 avec Riri ! Objectif strict : brûler 800+ kcal (HIIT, rameur, tapis incliné). On lâche rien ! 🔥`;
    case "saturday":
      return `Salut ${name} ! C'est samedi : séance Lower Body en DUO à 10h00 avec Riri. Focus contrôle moteur et surcharge progressive !`;
    case "sunday":
      return `Salut ${name} ! C'est dimanche : séance Upper Body en DUO à 10h00 avec Riri. On explose les pecs, le dos et les bras pour boucler la semaine !`;
    default:
      return `Salut ${name} ! Je suis ton coach IA personnel. Pose-moi toutes tes questions ou annonce-moi tes résultats !`;
  }
}

export default function LiveCoachPage() {
  const { userProfile, refreshProfile } = useAuth();

  const getInitialDay = (): DayOfWeek => {
    const map: DayOfWeek[] = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    return map[new Date().getDay()];
  };

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getInitialDay());
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; text: string; actionSummary?: string }[]
  >([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isAnalyzingPose, setIsAnalyzingPose] = useState(false);
  const [actionNotification, setActionNotification] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Load chat messages when selectedDay changes
  useEffect(() => {
    if (!userProfile?.uid) return;

    let isMounted = true;
    const loadDayChat = async () => {
      try {
        const saved = await getDailyCoachMessages(userProfile.uid, selectedDay);
        if (isMounted) {
          if (saved && saved.length > 0) {
            setMessages(
              saved.map((s) => ({
                role: s.role,
                text: s.text,
                actionSummary: s.actionSummary,
              }))
            );
          } else {
            const welcome = getWelcomeMessage(
              selectedDay,
              userProfile.firstName || "Mohamed"
            );
            setMessages([{ role: "ai", text: welcome }]);
          }
        }
      } catch (err) {
        console.warn("Error loading day chat:", err);
        if (isMounted) {
          const welcome = getWelcomeMessage(
            selectedDay,
            userProfile.firstName || "Mohamed"
          );
          setMessages([{ role: "ai", text: welcome }]);
        }
      }
    };

    loadDayChat();
    return () => {
      isMounted = false;
    };
  }, [selectedDay, userProfile?.uid, userProfile?.firstName]);

  // Text-to-speech for AI answers
  const speakText = useCallback(
    (text: string) => {
      if (
        isMuted ||
        typeof window === "undefined" ||
        !("speechSynthesis" in window)
      )
        return;
      try {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/[\u{1F600}-\u{1F6FF}]/gu, "");
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "fr-FR";
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error("Speech synthesis error:", e);
      }
    },
    [isMuted]
  );

  // Initialize Web Speech API for voice dictation
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "fr-FR";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            sendMessage(transcript);
          }
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(
        "La reconnaissance vocale n'est pas supportée sur ce navigateur. Tu peux utiliser le clavier !"
      );
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Mic start error:", err);
      }
    }
  };

  const startSession = async () => {
    setIsActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "⚠️ Impossible d'accéder à la caméra. Vérifie les autorisations de ton navigateur. Tu peux quand même m'écrire ou parler au micro !",
        },
      ]);
    }
  };

  const stopSession = () => {
    setIsActive(false);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7);
  };

  const analyzePostureFromCamera = async () => {
    if (!isActive || !isVideoOn) {
      alert("Active ta caméra en cliquant sur 'Démarrer la session' pour analyser ta posture !");
      return;
    }

    const frame = captureFrame();
    if (!frame) {
      alert("Impossible de capturer la caméra. Vérifie que ton flux vidéo est actif.");
      return;
    }

    setIsAnalyzingPose(true);
    const userMsg = "📸 [Analyse Posture] Regarde ma posture sur cette image et donne-moi tes corrections biomécaniques.";
    const updatedMessages = [...messages, { role: "user" as const, text: userMsg }];
    setMessages(updatedMessages);
    setIsTyping(true);

    try {
      if (userProfile?.uid) {
        await saveDailyCoachMessage(userProfile.uid, selectedDay, {
          role: "user",
          text: userMsg,
        });
      }

      const response = await fetch("/api/live-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          userProfile,
          dayOfWeek: selectedDay,
          image: frame,
        }),
      });

      const data = await response.json();
      if (data.text) {
        setMessages((prev) => [...prev, { role: "ai", text: data.text }]);
        if (userProfile?.uid) {
          await saveDailyCoachMessage(userProfile.uid, selectedDay, {
            role: "ai",
            text: data.text,
          });
        }
        speakText(data.text);
      }
    } catch (err) {
      console.error("Posture analysis error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Erreur lors de l'analyse visuelle. Réessaie avec un meilleur éclairage." },
      ]);
    } finally {
      setIsTyping(false);
      setIsAnalyzingPose(false);
    }
  };

  const sendMessage = async (customText?: string) => {
    const userMsg = (customText || inputText).trim();
    if (!userMsg || isTyping) return;

    if (!customText) setInputText("");

    const updatedMessages = [...messages, { role: "user" as const, text: userMsg }];
    setMessages(updatedMessages);
    setIsTyping(true);

    if (userProfile?.uid) {
      await saveDailyCoachMessage(userProfile.uid, selectedDay, {
        role: "user",
        text: userMsg,
      });
    }

    try {
      // Fetch recent logs for context
      let recentLogs: any = null;
      if (userProfile?.uid) {
        try {
          recentLogs = await getExerciseLogs(userProfile.uid);
        } catch {
          // ignore
        }
      }

      const response = await fetch("/api/live-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          userProfile,
          dayOfWeek: selectedDay,
          recentLogs: recentLogs?.slice(0, 5),
        }),
      });

      const data = await response.json();

      // Process automated actions from AI
      let actionSummaryText: string | null = null;
      if (data.actions && Array.isArray(data.actions) && data.actions.length > 0 && userProfile?.uid) {
        for (const act of data.actions) {
          if (act.type === "UPDATE_WEIGHT" && act.newWeight) {
            const todayStr = new Date().toISOString().split("T")[0];
            await updateUserProfile(userProfile.uid, { weight: Number(act.newWeight) });
            await saveWeighIn(userProfile.uid, {
              date: todayStr,
              weight: Number(act.newWeight),
              note: act.summary || "Mis à jour automatiquement via le Coach IA",
            });
            await refreshProfile();
            actionSummaryText = act.summary || `Poids mis à jour : ${act.newWeight} kg`;
            setActionNotification(actionSummaryText);
          } else if (act.type === "LOG_LIFT" && act.name && act.weight) {
            const todayStr = new Date().toISOString().split("T")[0];
            await saveBenchmarkLift(userProfile.uid, {
              name: act.name,
              currentWeight: Number(act.weight),
              reps: act.reps || "3x5",
              date: todayStr,
            });
            actionSummaryText = act.summary || `Performance enregistrée : ${act.name} ${act.weight} kg`;
            setActionNotification(actionSummaryText);
          }
        }
      }

      if (data.text) {
        setMessages((prev) => [
          ...prev,
          { role: "ai", text: data.text, actionSummary: actionSummaryText || undefined },
        ]);
        if (userProfile?.uid) {
          await saveDailyCoachMessage(userProfile.uid, selectedDay, {
            role: "ai",
            text: data.text,
            actionSummary: actionSummaryText || undefined,
          });
        }
        speakText(data.text);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "ai", text: "Désolé, une petite erreur est survenue. Peux-tu reformuler ?" },
        ]);
      }
    } catch (error) {
      console.error("Coach fetch error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Erreur de connexion au serveur. Vérifie ta connexion." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden canvas for capturing video frames */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-black">
            Coach <span className="gradient-text-purple">IA Hebdomadaire</span>
          </h1>
          <p className="text-text-secondary mt-1">
            7 fils dédiés par jour avec modification automatique de tes données
          </p>
        </div>

        {/* Audio Output Toggle */}
        <button
          onClick={() => {
            const nextMuted = !isMuted;
            setIsMuted(nextMuted);
            if (nextMuted && typeof window !== "undefined" && "speechSynthesis" in window) {
              window.speechSynthesis.cancel();
            }
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
            isMuted
              ? "bg-white/5 border-border-default text-text-muted hover:text-text-primary"
              : "bg-accent-purple/10 border-accent-purple/30 text-accent-purple-light"
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span>{isMuted ? "Voix IA coupée" : "Voix IA active"}</span>
        </button>
      </motion.div>

      {/* 7 Days Selector Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {DAYS_LIST.map((item) => {
          const isSelected = selectedDay === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setSelectedDay(item.key)}
              className={`flex-1 min-w-[100px] p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                isSelected
                  ? "bg-accent-purple/20 border-accent-purple text-text-primary shadow-lg shadow-accent-purple/15"
                  : "glass-card border-border-default text-text-secondary hover:border-white/20 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {item.label}
                </span>
                <span className="text-base">{item.icon}</span>
              </div>
              <p
                className={`text-xs mt-1 font-bold truncate ${
                  isSelected ? "text-accent-purple-light" : "text-text-muted"
                }`}
              >
                {item.split}
              </p>
            </button>
          );
        })}
      </div>

      {/* Action Notification Banner */}
      <AnimatePresence>
        {actionNotification && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-xl bg-accent-emerald/15 border border-accent-emerald/30 text-accent-emerald text-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent-emerald flex-shrink-0" />
              <span className="font-semibold">{actionNotification}</span>
            </div>
            <button
              onClick={() => setActionNotification(null)}
              className="text-xs text-text-muted hover:text-text-primary cursor-pointer"
            >
              Fermer
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Video Feed */}
        <div className="space-y-4">
          <div className="glass-card overflow-hidden aspect-[4/3] relative bg-black/50 border border-border-default flex items-center justify-center">
            {isActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform -scale-x-100 ${
                    !isVideoOn ? "hidden" : ""
                  }`}
                />
                {isVideoOn && (
                  <div className="absolute inset-0 pointer-events-none border border-white/10 grid grid-cols-3 grid-rows-3">
                    <div className="border-r border-b border-white/5" />
                    <div className="border-r border-b border-white/5" />
                    <div className="border-b border-white/5" />
                    <div className="border-r border-b border-white/5" />
                    <div className="border-r border-b border-white/5" />
                    <div className="border-b border-white/5" />
                    <div className="border-r border-b border-white/5" />
                    <div className="border-r border-b border-white/5" />
                    <div />
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-accent-purple/10 flex items-center justify-center mb-3">
                  <Radio className="w-8 h-8 text-accent-purple-light" />
                </div>
                <h4 className="font-bold text-base mb-1">Caméra en attente</h4>
                <p className="text-text-muted text-xs max-w-xs">
                  Active la caméra pour vérifier ta posture en direct ou poser une question vocale.
                </p>
              </div>
            )}

            {!isVideoOn && isActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <VideoOff className="w-12 h-12 text-text-muted" />
              </div>
            )}

            {isActive && (
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-rose/90 backdrop-blur-md shadow-lg">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-bold text-white tracking-wider">EN DIRECT</span>
              </div>
            )}

            {isActive && isVideoOn && (
              <div className="absolute bottom-4 inset-x-4 flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={analyzePostureFromCamera}
                  disabled={isAnalyzingPose || isTyping}
                  className="px-4 py-2 rounded-full bg-accent-purple/90 hover:bg-accent-purple text-white text-xs font-bold flex items-center gap-2 backdrop-blur-md shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {isAnalyzingPose ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  {isAnalyzingPose ? "Analyse en cours..." : "Analyser ma posture 📸"}
                </motion.button>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={toggleListening}
              title={isListening ? "Arrêter d'écouter" : "Parler au micro"}
              className={`p-4 rounded-full transition-all cursor-pointer relative ${
                isListening
                  ? "bg-accent-rose text-white shadow-lg shadow-accent-rose/30 animate-pulse"
                  : "glass-card text-text-primary hover:bg-white/10"
              }`}
            >
              {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 text-text-muted" />}
            </button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={isActive ? stopSession : startSession}
              className={`px-8 py-4 rounded-full font-bold text-white flex items-center gap-2 shadow-lg cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-accent-rose to-accent-amber shadow-accent-rose/25"
                  : "bg-gradient-to-r from-accent-purple to-accent-purple-light shadow-accent-purple/25"
              }`}
            >
              <Radio className="w-5 h-5" />
              {isActive ? "Arrêter la caméra" : "Démarrer la caméra"}
            </motion.button>

            <button
              onClick={() => setIsVideoOn(!isVideoOn)}
              disabled={!isActive}
              title={isVideoOn ? "Couper la vidéo" : "Réactiver la vidéo"}
              className={`p-4 rounded-full transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                !isVideoOn
                  ? "bg-accent-rose/20 text-accent-rose"
                  : "glass-card text-text-primary hover:bg-white/10"
              }`}
            >
              {isVideoOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Chat Section */}
        <div className="glass-card flex flex-col h-[560px] border border-border-default">
          <div className="p-4 border-b border-border-default flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <MessageSquare className="w-4 h-4 text-accent-purple-light" />
              <span>
                Chat Séance du{" "}
                <span className="text-accent-purple-light capitalize font-bold">
                  {DAYS_LIST.find((d) => d.key === selectedDay)?.label} (
                  {DAYS_LIST.find((d) => d.key === selectedDay)?.split})
                </span>
              </span>
            </h3>
            {isListening && (
              <span className="text-xs text-accent-rose font-medium flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-accent-rose" /> Micro actif...
              </span>
            )}
          </div>

          {/* Messages list */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-accent-purple/20 text-text-primary rounded-br-md border border-accent-purple/30"
                      : "bg-white/5 text-text-secondary rounded-bl-md border border-border-default"
                  }`}
                >
                  {msg.text}
                </div>
                {msg.actionSummary && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-1 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald text-xs font-semibold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {msg.actionSummary}
                  </motion.div>
                )}
              </motion.div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 text-text-muted text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-accent-purple-light" />
                Coach IA prépare sa réponse...
              </div>
            )}
          </div>

          {/* Prompt chips & Input */}
          <div className="p-4 border-t border-border-default space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
              {[
                "oe j'ai perdu 2 kilo 📉",
                "j'ai validé 50kg au bench (3x5) 🏋️",
                "Alternative machine occupée 🔄",
                "Conseil diète 1500 kcal 🥩",
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendMessage(suggestion)}
                  disabled={isTyping}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-border-default text-text-secondary hover:text-text-primary hover:bg-white/10 hover:border-accent-purple/50 whitespace-nowrap transition-all cursor-pointer disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder={
                  isListening
                    ? "Parle maintenant..."
                    : "Dis à l'IA de modifier ton poids, tes perfs ou pose ta question..."
                }
                disabled={isTyping}
                className="flex-1 px-4 py-3 bg-white/5 border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-all disabled:opacity-50"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => sendMessage()}
                disabled={isTyping || !inputText.trim()}
                className="p-3 bg-accent-purple rounded-xl text-white cursor-pointer hover:bg-accent-purple-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
