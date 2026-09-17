"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Dumbbell, Brain, TrendingUp, Zap } from "lucide-react";

export default function Home() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user && userProfile?.onboardingComplete) {
        router.push("/dashboard");
      } else if (user && !userProfile?.onboardingComplete) {
        router.push("/onboarding");
      }
    }
  }, [user, userProfile, loading, router]);

  if (loading) {
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

  const features = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: "Coach IA Personnel",
      description: "Gemini analyse votre physique et crée des programmes 100% personnalisés",
    },
    {
      icon: <Dumbbell className="w-8 h-8" />,
      title: "Fitness Park Optimisé",
      description: "Programmes adaptés aux machines Technogym et Hammer Strength",
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Surcharge Progressive",
      description: "L'IA impose une progression automatique semaine après semaine",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Analyse en Temps Réel",
      description: "Correction de posture en direct via votre caméra",
    },
  ];

  return (
    <div className="min-h-screen gradient-bg-main relative overflow-hidden">
      {/* Background Orbs */}
      <div className="bg-orb bg-orb-purple" />
      <div className="bg-orb bg-orb-cyan" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-4xl mx-auto mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8"
          >
            <Dumbbell className="w-5 h-5 text-accent-purple-light" />
            <span className="text-sm font-medium text-text-secondary">
              Powered by Google Gemini AI
            </span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight">
            <span className="gradient-text-purple">FitPark</span>{" "}
            <span className="text-text-primary">AI</span>
          </h1>

          <p className="text-xl md:text-2xl text-text-secondary mb-8 max-w-2xl mx-auto leading-relaxed">
            Votre coach fitness personnel propulsé par l&apos;intelligence artificielle.
            Programmes sur-mesure pour{" "}
            <span className="text-accent-purple-light font-semibold">Fitness Park</span>.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/register")}
              className="px-8 py-4 bg-gradient-to-r from-accent-purple to-accent-purple-light rounded-xl font-bold text-lg text-white shadow-lg shadow-accent-purple/25 hover:shadow-accent-purple/40 transition-shadow cursor-pointer"
            >
              Commencer Maintenant
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/login")}
              className="px-8 py-4 glass-card font-semibold text-lg text-text-primary hover:bg-white/10 transition-colors cursor-pointer"
              style={{ borderRadius: "12px" }}
            >
              Se Connecter
            </motion.button>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="glass-card glass-card-hover p-6 text-center"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent-purple/10 text-accent-purple-light mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold mb-2 text-text-primary">
                {feature.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
