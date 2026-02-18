import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, FileSearch, Zap, BookOpen, ArrowRight, Upload, MessageSquare, Brain, CheckCircle2 } from "lucide-react";

const features = [
  { icon: Upload, title: "Multi-PDF Upload", description: "Drag & drop lectures, textbooks, papers. We parse and index every page instantly.", gradient: "from-violet-500 to-purple-500" },
  { icon: Brain, title: "RAG-Powered Search", description: "Your documents are chunked, embedded, and stored in a vector database for semantic search.", gradient: "from-indigo-500 to-blue-500" },
  { icon: FileSearch, title: "Cross-Document Queries", description: "Compare definitions across multiple files and get cited answers.", gradient: "from-purple-500 to-pink-500" },
  { icon: Zap, title: "Groq-Powered Speed", description: "Answers in under 2 seconds using LLaMA 3.3 70B on Groq's lightning-fast inference.", gradient: "from-amber-500 to-orange-500" },
];

const steps = [
  { step: "01", title: "Upload", desc: "Drop your PDFs into ScholarSync" },
  { step: "02", title: "Index", desc: "AI parses, chunks & embeds every page" },
  { step: "03", title: "Ask", desc: "Query across all your documents at once" },
  { step: "04", title: "Learn", desc: "Get cited answers with page references" },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card mb-8">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-white/60">Powered by Groq LLaMA 3.3 70B</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            Your PDFs.<br /><span className="gradient-text">One Brilliant Mind.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-white/40 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            Upload your lecture notes, textbooks, and papers. Ask questions across all of them.
            Get <span className="text-white/70 font-medium">cited answers</span> with page numbers in seconds.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/dashboard"
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-lg hover:from-violet-500 hover:to-indigo-500 transition-all shadow-2xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02]">
              <BookOpen className="w-5 h-5" /> Start Studying
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#features"
              className="flex items-center gap-2 px-6 py-4 rounded-2xl glass-card text-white/60 font-medium hover:text-white/80 hover:bg-white/5 transition-all">
              <MessageSquare className="w-5 h-5" /> See How It Works
            </a>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }}
            className="max-w-4xl mx-auto mt-20">
            <div className="glass-card rounded-3xl p-1 shadow-2xl shadow-violet-500/10">
              <div className="rounded-[22px] bg-[#0a0a1a]/90 p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                  <span className="ml-4 text-xs text-white/20 font-mono">scholarsync / dashboard</span>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <div className="bg-violet-600/40 border border-violet-500/30 rounded-2xl px-5 py-3 max-w-md">
                      <p className="text-sm text-white/80">Compare the definition of "pointers" in lecture_notes.pdf vs textbook.pdf</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="glass-card rounded-2xl px-5 py-4 max-w-lg">
                      <p className="text-sm text-white/70 leading-relaxed">Based on your documents, here's the comparison:</p>
                      <p className="text-sm text-white/50 mt-2"><strong className="text-white/80">lecture_notes.pdf (p.12):</strong> Defines pointers as "variables that store memory addresses"...</p>
                      <div className="flex gap-2 mt-3">
                        <span className="text-[10px] px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300">lecture_notes.pdf p.12</span>
                        <span className="text-[10px] px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300">textbook.pdf p.45</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-center mb-16">
            How it <span className="gradient-text">works</span>
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div key={step.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass-card glass-card-hover rounded-2xl p-6 text-center group">
                <div className="text-4xl font-black text-white/5 group-hover:text-violet-500/20 transition-colors mb-3">{step.step}</div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-white/40">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Built for <span className="gradient-text">serious students</span>
          </motion.h2>
          <p className="text-center text-white/40 mb-16 max-w-xl mx-auto">Every feature designed to help you study smarter, not harder.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <motion.div key={feature.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass-card glass-card-hover rounded-2xl p-8 group">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="glass-card rounded-3xl p-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to study <span className="gradient-text">smarter</span>?</h2>
            <p className="text-white/40 mb-8 max-w-md mx-auto">Upload your first PDF and experience AI-powered studying.</p>
            <Link to="/dashboard"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-lg hover:from-violet-500 hover:to-indigo-500 transition-all shadow-2xl shadow-violet-500/25 hover:shadow-violet-500/40">
              <CheckCircle2 className="w-5 h-5" /> Launch ScholarSync <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-sm text-white/20">2025 ScholarSync</span>
          <span className="text-sm text-white/20 font-mono">v1.0.0</span>
        </div>
      </footer>
    </div>
  );
}