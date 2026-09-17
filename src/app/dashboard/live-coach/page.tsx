"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Radio, Mic, MicOff, VideoIcon, VideoOff, MessageSquare, Send, Loader2 } from "lucide-react";

export default function LiveCoachPage() {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Salut ! Je suis ton coach IA en direct. Active ta caméra et pose-moi tes questions pendant ta séance. Je peux analyser ta posture, proposer des alternatives si une machine est prise, et te motiver ! 💪" },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const startSession = async () => {
    setIsActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "⚠️ Impossible d'accéder à la caméra. Vérifie les permissions du navigateur. Tu peux quand même m'écrire tes questions !" },
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
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    setInputText("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setIsTyping(true);

    // Simulated AI response (will be replaced by Gemini Live API)
    setTimeout(() => {
      const responses = [
        "Bonne question ! Pour cet exercice, assure-toi de bien contrôler la phase excentrique. Descends lentement sur 3 secondes, puis pousse explosif. 🔥",
        "Si la presse est prise, tu peux faire des squats bulgares avec haltères — même activation des quadriceps, plus de stabilité à travailler !",
        "Ton exécution a l'air correcte d'ici. N'oublie pas de garder les omoplates rétractées et la poitrine haute tout au long du mouvement.",
        "Tu as déjà fait 3 séries, c'est très bien ! Pour la prochaine, augmente de 2.5kg si tu as réussi toutes les reps proprement.",
        "Pour ta récupération entre les séries, 90 secondes c'est parfait pour l'hypertrophie. Si tu fais du lourd (force), monte à 2-3 minutes.",
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setMessages((prev) => [...prev, { role: "ai", text: randomResponse }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black">
          Live <span className="gradient-text-purple">AI Coach</span>
        </h1>
        <p className="text-text-secondary mt-1">
          Coach en temps réel via caméra — Propulsé par Gemini
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Video Feed */}
        <div className="space-y-4">
          <div className="glass-card overflow-hidden aspect-[4/3] relative bg-black/40">
            {isActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!isVideoOn ? "hidden" : ""}`}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <Radio className="w-16 h-16 text-accent-purple/30 mb-4" />
                <p className="text-text-muted text-sm">Caméra désactivée</p>
              </div>
            )}

            {!isVideoOn && isActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <VideoOff className="w-16 h-16 text-text-muted/30" />
              </div>
            )}

            {/* Live indicator */}
            {isActive && (
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-rose/90 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-bold text-white">LIVE</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-4 rounded-full transition-all cursor-pointer ${
                isMuted
                  ? "bg-accent-rose/20 text-accent-rose"
                  : "glass-card text-text-primary hover:bg-white/10"
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isActive ? stopSession : startSession}
              className={`px-8 py-4 rounded-full font-bold text-white flex items-center gap-2 shadow-lg cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-accent-rose to-accent-amber"
                  : "bg-gradient-to-r from-accent-purple to-accent-purple-light shadow-accent-purple/25"
              }`}
            >
              <Radio className="w-5 h-5" />
              {isActive ? "Terminer" : "Démarrer la session"}
            </motion.button>

            <button
              onClick={() => setIsVideoOn(!isVideoOn)}
              className={`p-4 rounded-full transition-all cursor-pointer ${
                !isVideoOn
                  ? "bg-accent-rose/20 text-accent-rose"
                  : "glass-card text-text-primary hover:bg-white/10"
              }`}
            >
              {isVideoOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Chat */}
        <div className="glass-card flex flex-col h-[500px] lg:h-auto">
          <div className="p-4 border-b border-border-default">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-accent-purple-light" />
              Chat Coach IA
            </h3>
          </div>

          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === "user"
                      ? "bg-accent-purple/20 text-text-primary rounded-br-md"
                      : "bg-white/5 text-text-secondary rounded-bl-md border border-border-default"
                  }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 text-text-muted text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Coach IA tape...
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border-default">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Pose ta question au coach..."
                className="flex-1 px-4 py-3 bg-white/5 border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-all"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={sendMessage}
                className="p-3 bg-accent-purple rounded-xl text-white cursor-pointer hover:bg-accent-purple-light transition-colors"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="glass-card p-4 border-accent-amber/20 bg-accent-amber/5">
        <p className="text-sm text-accent-amber">
          💡 <strong>WebRTC + Gemini Live</strong> : Le mode voix/vidéo en temps réel sera activé
          avec l&apos;intégration de l&apos;API Gemini Multimodal Live. En attendant, utilisez le chat texte
          pour dialoguer avec votre coach IA.
        </p>
      </div>
    </div>
  );
}
