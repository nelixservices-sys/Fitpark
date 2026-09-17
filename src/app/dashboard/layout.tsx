"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Dumbbell,
  Home,
  Calendar,
  Utensils,
  Video,
  Radio,
  TrendingUp,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", icon: <Home className="w-5 h-5" />, label: "Accueil" },
  { href: "/dashboard/workout", icon: <Dumbbell className="w-5 h-5" />, label: "Programme" },
  { href: "/dashboard/schedule", icon: <Calendar className="w-5 h-5" />, label: "Planning" },
  { href: "/dashboard/nutrition", icon: <Utensils className="w-5 h-5" />, label: "Nutrition" },
  { href: "/dashboard/form-check", icon: <Video className="w-5 h-5" />, label: "Form Check" },
  { href: "/dashboard/live-coach", icon: <Radio className="w-5 h-5" />, label: "Live Coach" },
  { href: "/dashboard/progress", icon: <TrendingUp className="w-5 h-5" />, label: "Progrès" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading, signOut } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (!userProfile?.onboardingComplete) {
        router.push("/onboarding");
      }
    }
  }, [user, userProfile, loading, router]);

  if (loading || !user || !userProfile?.onboardingComplete) {
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

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-[260px] border-r border-border-default bg-bg-secondary/50 backdrop-blur-xl fixed h-screen z-20">
        {/* Logo */}
        <div className="p-6 border-b border-border-default">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-purple-light flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-lg">
                <span className="gradient-text-purple">FitPark</span> AI
              </h1>
              <p className="text-[11px] text-text-muted">Powered by Gemini</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-border-default">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center text-white font-bold text-sm">
              {userProfile.firstName?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {userProfile.firstName} {userProfile.lastName}
              </p>
              <p className="text-[11px] text-text-muted truncate">
                {userProfile.goal === "perte_poids_muscle"
                  ? "🔥 Recomposition"
                  : "💪 Prise de masse"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all group"
            >
              <span className="text-text-muted group-hover:text-accent-purple-light transition-colors">
                {item.icon}
              </span>
              {item.label}
              <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-50 transition-opacity" />
            </Link>
          ))}
        </nav>

        {/* Sign Out */}
        <div className="p-3 border-t border-border-default">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-muted hover:text-accent-rose hover:bg-accent-rose/5 transition-all w-full cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-bg-secondary/80 backdrop-blur-xl border-b border-border-default z-30 flex items-center px-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-purple to-accent-purple-light flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm">
            <span className="gradient-text-purple">FitPark</span> AI
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-white/5 cursor-pointer"
        >
          {sidebarOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 z-30"
        />
      )}

      {/* Mobile Sidebar */}
      <motion.aside
        initial={{ x: "-100%" }}
        animate={{ x: sidebarOpen ? 0 : "-100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="lg:hidden fixed left-0 top-0 bottom-0 w-[280px] bg-bg-secondary border-r border-border-default z-40 flex flex-col"
      >
        <div className="p-6 border-b border-border-default flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-purple-light flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-lg gradient-text-purple">FitPark AI</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-border-default">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-muted hover:text-accent-rose w-full cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-[260px] pt-16 lg:pt-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
