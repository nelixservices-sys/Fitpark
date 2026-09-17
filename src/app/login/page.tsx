"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { Dumbbell, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      switch (firebaseError.code) {
        case "auth/user-not-found":
          setError("Aucun compte trouvé avec cet email.");
          break;
        case "auth/wrong-password":
          setError("Mot de passe incorrect.");
          break;
        case "auth/invalid-email":
          setError("Format d'email invalide.");
          break;
        case "auth/invalid-credential":
          setError("Email ou mot de passe incorrect.");
          break;
        case "auth/api-key-not-valid":
        case "auth/invalid-api-key":
          setError("Clé API Firebase invalide dans .env.local.");
          break;
        case "auth/operation-not-allowed":
          setError("L'authentification Email/Mot de passe n'est pas activée sur la console Firebase.");
          break;
        default:
          setError(
            firebaseError.code
              ? `Erreur Firebase (${firebaseError.code}). Vérifiez la configuration .env.local et la console Firebase.`
              : "Une erreur est survenue. Réessayez."
          );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg-main relative overflow-hidden flex items-center justify-center px-4">
      {/* Background Orbs */}
      <div className="bg-orb bg-orb-purple" />
      <div className="bg-orb bg-orb-cyan" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-purple to-accent-purple-light mb-4 shadow-lg shadow-accent-purple/30"
          >
            <Dumbbell className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-black">
            <span className="gradient-text-purple">FitPark</span>{" "}
            <span className="text-text-primary">AI</span>
          </h1>
          <p className="text-text-secondary mt-2">Connectez-vous à votre espace</p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-accent-rose/10 border border-accent-rose/20"
              >
                <AlertCircle className="w-5 h-5 text-accent-rose flex-shrink-0" />
                <p className="text-sm text-accent-rose">{error}</p>
              </motion.div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/50 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-accent-purple to-accent-purple-light rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 shadow-lg shadow-accent-purple/25 hover:shadow-accent-purple/40 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Dumbbell className="w-5 h-5" />
                </motion.div>
              ) : (
                <>
                  Se Connecter
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <p className="text-center text-text-secondary mt-6 text-sm">
            Pas encore de compte ?{" "}
            <Link
              href="/register"
              className="text-accent-purple-light font-semibold hover:underline"
            >
              Créer un compte
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
