import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, Database, Shield, Zap, Wallet, PieChart, LineChart } from 'lucide-react';

const Sparkles = () => {
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number; size: number; delay: number }[]>([]);

  useEffect(() => {
    const generateSparkles = () => {
      const newSparkles = Array.from({ length: 40 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        delay: Math.random() * 5,
      }));
      setSparkles(newSparkles);
    };
    generateSparkles();
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {sparkles.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          className="absolute rounded-full bg-blue-500/30"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: sparkle.size,
            height: sparkle.size,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            delay: sparkle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
      {/* Background Gradient Orbs */}
      <div className="absolute top-[20%] left-[10%] w-[40rem] h-[40rem] bg-blue-600/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-[128px] pointer-events-none" />
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, description, index }: { icon: any, title: string, description: string, index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1, duration: 0.5 }}
    className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors"
  >
    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-blue-400" />
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
    <p className="text-gray-400">{description}</p>
  </motion.div>
);

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Database,
      title: "Enterprise Ledger",
      description: "Bank-grade double-entry accounting system that ensures every cent is tracked perfectly."
    },
    {
      icon: LineChart,
      title: "Real-time Analytics",
      description: "Watch your wealth grow with beautiful, instantaneous charts and financial metrics."
    },
    {
      icon: Wallet,
      title: "Automated Budgeting",
      description: "Smart budget tracking that learns your habits and helps you save more effectively."
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized for speed. Your financial data loads instantly, no matter how much you have."
    },
    {
      icon: PieChart,
      title: "Multi-Currency",
      description: "Seamlessly manage accounts and transactions across different currencies with real-time conversion."
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your financial data is encrypted and securely stored. We never sell your personal information."
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white relative overflow-hidden">
      <Sparkles />
      
      {/* Navbar */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Keeper" className="w-8 h-8 drop-shadow-sm" />
          <span className="text-xl font-bold tracking-tight">Keeper</span>
        </div>
        <button 
          onClick={() => navigate('/login')}
          className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 font-medium transition-all hover:scale-105"
        >
          Sign in
        </button>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-8 font-medium text-sm">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            Introducing Keeper 2.0
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
            Track Smarter, <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
              Grow Faster.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Your personal finance manager to organize, track, and optimize your wealth effortlessly. 
            Built for those who demand precision and speed.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2 group shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.6)]"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 font-semibold transition-all hover:scale-105"
            >
              Explore Features
            </button>
          </div>
        </motion.div>

        {/* Dashboard Preview Image/Mockup (Optional but recommended for a landing page) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="mt-24 relative max-w-5xl mx-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-transparent to-transparent z-10 h-full w-full rounded-2xl" />
          <div className="rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-md overflow-hidden shadow-2xl">
             <div className="w-full h-8 bg-white/5 border-b border-white/10 flex items-center px-4 gap-2 rounded-t-xl">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
             </div>
             {/* Abstract Dashboard Representation */}
             <div className="h-[400px] w-full bg-[#111113] rounded-b-xl flex p-6 gap-6 relative overflow-hidden">
                {/* Sidebar mock */}
                <div className="w-48 h-full flex flex-col gap-4">
                  <div className="h-8 w-3/4 bg-white/5 rounded-md" />
                  <div className="h-4 w-1/2 bg-white/5 rounded-md mt-4" />
                  <div className="h-4 w-2/3 bg-white/5 rounded-md" />
                  <div className="h-4 w-3/4 bg-white/5 rounded-md" />
                </div>
                {/* Main content mock */}
                <div className="flex-1 flex flex-col gap-6">
                  {/* Cards */}
                  <div className="flex gap-4 h-32">
                    <div className="flex-1 bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col justify-end relative overflow-hidden">
                      <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-blue-500/20" />
                      <div className="h-4 w-1/2 bg-white/10 rounded" />
                    </div>
                    <div className="flex-1 bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col justify-end relative overflow-hidden">
                      <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-purple-500/20" />
                      <div className="h-4 w-1/2 bg-white/10 rounded" />
                    </div>
                    <div className="flex-1 bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col justify-end relative overflow-hidden">
                      <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-green-500/20" />
                      <div className="h-4 w-1/2 bg-white/10 rounded" />
                    </div>
                  </div>
                  {/* Chart area */}
                  <div className="flex-1 bg-white/5 rounded-xl border border-white/5 p-4 flex items-end justify-between px-12 pb-8">
                     {[40, 70, 45, 90, 65, 85, 110, 80, 100].map((h, i) => (
                       <motion.div 
                         key={i}
                         initial={{ height: 0 }}
                         animate={{ height: `${h}%` }}
                         transition={{ delay: 0.5 + (i * 0.1), duration: 0.8 }}
                         className="w-12 bg-gradient-to-t from-blue-500/20 to-blue-400 rounded-t-sm"
                       />
                     ))}
                  </div>
                </div>
             </div>
          </div>
        </motion.div>
      </main>

      {/* Features Section */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-32 border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Features You'll Love</h2>
          <p className="text-gray-400 text-lg">
            Everything you need to manage your finances, built with modern web technologies 
            to provide a seamless, lightning-fast experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} index={index} {...feature} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6 text-gray-400 text-sm">
          <div className="flex items-center gap-2 text-white">
            <img src="/logo.svg" alt="Keeper" className="w-5 h-5" />
            <span className="font-bold">Keeper</span>
          </div>
          <p>© 2026 Keeper. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
