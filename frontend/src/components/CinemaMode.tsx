import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Pause, Play, Maximize2, Sparkles, TrendingUp, Target, AlertTriangle, Lightbulb, CheckCircle } from "lucide-react";

const ICONS: Record<string, any> = { fact: Sparkles, idea: Target, metric: TrendingUp, alert: AlertTriangle, quote: CheckCircle, insight: Lightbulb };
const GRADIENT: Record<string, string> = { blue: "from-blue-600 to-indigo-700", green: "from-emerald-600 to-teal-700", purple: "from-purple-600 to-pink-700", amber: "from-amber-600 to-orange-700", red: "from-red-600 to-rose-700", teal: "from-teal-600 to-cyan-700", default: "from-violet-600 to-purple-700" };

export default function CinemaMode({ cards, activeTab, onClose }: { cards: any[]; activeTab: string; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  const card = cards[index];
  const total = cards.length;

  useEffect(() => {
    if (paused || total === 0) return;
    let start = Date.now();
    const duration = 6000;
    const animate = () => {
      const elapsed = Date.now() - start;
      setProgress(Math.min((elapsed / duration) * 100, 100));
      if (elapsed < duration) {
        progressRef.current = setTimeout(animate, 50);
      }
    };
    animate();
    timerRef.current = setTimeout(() => { setIndex(i => (i + 1) % total); setProgress(0); }, duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); if (progressRef.current) clearTimeout(progressRef.current); };
  }, [index, paused, total]);

  const goNext = () => { setIndex(i => (i + 1) % total); setProgress(0); };
  const goPrev = () => { setIndex(i => (i - 1 + total) % total); setProgress(0); };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === " ") { e.preventDefault(); setPaused(p => !p); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, total]);

  if (!card) return null;
  const Icon = ICONS[card.type] || Sparkles;
  const typeLabels: Record<string, string> = { fact: "Факт", idea: "Идея", metric: "Метрика", alert: "Риск", quote: "Совет", insight: "Инсайт" };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      {/* Progress bar top */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10">
        <div className="h-full bg-violet-500 transition-all duration-100 linear" style={{ width: `${progress}%` }} />
      </div>

      {/* Close button */}
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all z-10">
        <X className="w-5 h-5" />
      </button>

      {/* Top info */}
      <div className="absolute top-4 left-4 flex items-center gap-2 text-white/50 text-xs">
        <Maximize2 className="w-4 h-4" />
        <span>Режим кино</span>
        <span className="text-white/20">|</span>
        <span>{index + 1} / {total}</span>
        <span className="text-white/20">|</span>
        <span>{typeLabels[activeTab] || activeTab}</span>
      </div>

      {/* Navigation */}
      <button onClick={goPrev} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all">
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button onClick={goNext} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all">
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Card content */}
      <div className="w-full max-w-3xl mx-8 animate-in zoom-in-95 fade-in duration-500">
        {card.type === "metric" ? (
          <div className={`bg-gradient-to-br ${GRADIENT[card.color || "default"]} rounded-3xl p-12 text-white shadow-2xl`}>
            <div className="absolute inset-0 bg-white/5 rounded-3xl" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)" }} />
            <div className="relative z-10">
              <p className="text-sm font-medium text-white/60 uppercase tracking-[0.2em] mb-4">{card.label}</p>
              <p className="text-7xl font-black tracking-tight">{card.value}</p>
              {card.sub && <p className="text-xl text-white/70 mt-6 leading-relaxed max-w-xl">{card.sub}</p>}
            </div>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur rounded-3xl p-12 border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-white/80" />
                </div>
                <div>
                  <span className="text-xs font-medium text-white/40 uppercase tracking-wider">{typeLabels[card.type] || "Факт"}</span>
                  {card.severity && <span className={`ml-2 text-xs font-bold ${card.severity === "danger" ? "text-red-400" : "text-amber-400"}`}>{card.severity}</span>}
                </div>
              </div>
              {card.title && <h2 className="text-3xl font-bold text-white mb-4 leading-tight">{card.title}</h2>}
              {card.content && <p className="text-lg text-white/60 leading-relaxed max-w-2xl">{card.content}</p>}
              {card.sub && <p className="text-base text-white/40 mt-4 leading-relaxed max-w-2xl border-l-2 border-white/20 pl-4">{card.sub}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-8 flex items-center gap-4">
        <button onClick={() => setPaused(p => !p)} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all">
          {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
        </button>
        <div className="flex gap-1.5">
          {cards.slice(0, Math.min(total, 12)).map((_, i) => (
            <button key={i} onClick={() => { setIndex(i); setProgress(0); }}
              className={`w-2 h-2 rounded-full transition-all ${i === index ? "bg-white w-6" : "bg-white/30 hover:bg-white/50"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
