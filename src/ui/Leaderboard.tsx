import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useT } from "../i18n";
import { Trophy, Target, User, Loader2, Medal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tier = "micro" | "baixa" | "media" | "alta";

interface LeaderboardEntry {
  nickname: string;
  points: number;
  isHero?: boolean;
  rank: number;
}

export function Leaderboard() {
  const { t: tr } = useT();
  const [activeTab, setActiveTab] = useState<"tourney" | "mission">("tourney");
  const [activeTier, setActiveTier] = useState<Tier>("micro");
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  
  // Dados de exemplo (fallback) baseados na landing page
  const mockEntries: Record<string, LeaderboardEntry[]> = {
    tourney: [
      { rank: 1, nickname: "Muralha_99", points: 1250 },
      { rank: 2, nickname: "PokerKing", points: 980 },
      { rank: 3, nickname: "FoldMaster", points: 870 },
      { rank: 4, nickname: "AllInMind", points: 720 },
      { rank: 5, nickname: "Bluff_BR", points: 610 },
    ],
    mission: [
      { rank: 1, nickname: "ReaperHunter", points: 9 },
      { rank: 2, nickname: "GhostFace", points: 7 },
      { rank: 3, nickname: "AceHigh", points: 6 },
      { rank: 4, nickname: "GrinderPT", points: 4 },
      { rank: 5, nickname: "NoLimit_Joe", points: 3 },
    ]
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // @ts-ignore - verificando se o supabaseUrl existe no objeto cliente
        if (!supabase.supabaseUrl) {
          // Se nao houver URL do Supabase, usa mocks
          setEntries(mockEntries[activeTab]);
          setLoading(false);
          return;
        }

        if (activeTab === "tourney") {
          const { data, error } = await supabase
            .from("tournament_scores")
            .select(`
              points,
              players (nickname)
            `)
            .eq("tier", activeTier)
            .order("points", { ascending: false })
            .limit(10);

          if (error) throw error;
          
          const formatted = data.map((d: any, i: number) => ({
            rank: i + 1,
            nickname: d.players?.nickname || "Jogador Anonimo",
            points: d.points
          }));
          setEntries(formatted.length > 0 ? formatted : mockEntries.tourney);
        } else {
          const { data, error } = await supabase
            .from("mission_progress")
            .select(`
              stages_cleared,
              players (nickname)
            `)
            .order("stages_cleared", { ascending: false })
            .limit(10);

          if (error) throw error;
          
          const formatted = data.map((d: any, i: number) => ({
            rank: i + 1,
            nickname: d.players?.nickname || "Jogador Anonimo",
            points: d.stages_cleared
          }));
          setEntries(formatted.length > 0 ? formatted : mockEntries.mission);
        }
      } catch (err) {
        console.error("Erro ao carregar ranking:", err);
        setEntries(mockEntries[activeTab]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [activeTab, activeTier]);

  return (
    <div className="leaderboard-view p-4 max-w-2xl mx-auto">
      <header className="text-center mb-8">
        <h2 className="text-3xl font-serif text-gold-bright mb-2">
          {activeTab === "tourney" ? tr("tab.ranking") + " de Torneios" : tr("tab.ranking") + " 1×1 · Missão"}
        </h2>
        <p className="text-text-dim text-sm italic">
          {activeTab === "tourney" 
            ? "A elite dos feltros virtuais por categoria." 
            : "Quem domina a arena contra O Ceifador."}
        </p>
      </header>

      {/* Tabs Principais */}
      <div className="flex gap-2 mb-6 bg-black/40 p-1 rounded-xl border border-white/5">
        <button
          onClick={() => setActiveTab("tourney")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all",
            activeTab === "tourney" ? "bg-gold-grad text-black font-bold" : "text-text-dim hover:text-white"
          )}
        >
          <Trophy size={18} />
          <span>Torneios</span>
        </button>
        <button
          onClick={() => setActiveTab("mission")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all",
            activeTab === "mission" ? "bg-gold-grad text-black font-bold" : "text-text-dim hover:text-white"
          )}
        >
          <Target size={18} />
          <span>Missões</span>
        </button>
      </div>

      {/* Tiers para Torneios */}
      {activeTab === "tourney" && (
        <div className="grid grid-cols-4 gap-2 mb-6">
          {(["micro", "baixa", "media", "alta"] as Tier[]).map((tier) => (
            <button
              key={tier}
              onClick={() => setActiveTier(tier)}
              className={cn(
                "py-2 px-1 text-[10px] uppercase font-bold tracking-wider border rounded-md transition-all",
                activeTier === tier 
                  ? "border-gold text-gold bg-gold/10 shadow-[0_0_10px_rgba(230,196,84,0.2)]" 
                  : "border-white/10 text-text-dim hover:border-white/20"
              )}
            >
              {tier}
            </button>
          ))}
        </div>
      )}

      {/* Lista de Ranking */}
      <div className="bg-black/60 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-gold" size={32} />
            <span className="text-gold-dim animate-pulse">Consultando oráculo...</span>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            <AnimatePresence mode="wait">
              {entries.map((entry, idx) => (
                <motion.div
                  key={`${entry.nickname}-${idx}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    "flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group",
                    entry.isHero && "bg-gold/5 border-l-4 border-gold"
                  )}
                >
                  <div className="w-8 flex justify-center">
                    {entry.rank <= 3 ? (
                      <Medal 
                        className={cn(
                          entry.rank === 1 ? "text-gold-bright" : 
                          entry.rank === 2 ? "text-gray-300" : "text-amber-600"
                        )} 
                        size={24} 
                      />
                    ) : (
                      <span className="text-text-dim font-serif text-lg">{entry.rank}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-gold/50 transition-colors">
                      <User size={20} className="text-text-dim group-hover:text-gold" />
                    </div>
                    <div>
                      <div className="font-bold text-white group-hover:text-gold transition-colors">
                        {entry.nickname}
                      </div>
                      <div className="text-[10px] text-text-dim uppercase tracking-tighter">
                        Jogador Recreativo
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-serif text-gold-bright">
                      {entry.points}
                    </div>
                    <div className="text-[10px] text-text-dim uppercase">
                      {activeTab === "tourney" ? "Pontos" : "Estágios"}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <footer className="mt-8 p-4 bg-gold/5 border border-gold/20 rounded-xl text-center">
        <p className="text-[11px] text-gold-soft leading-relaxed italic">
          "A glória parece distante, mas a decisão que muda tudo está exatamente agora nas suas mãos."
        </p>
        <div className="mt-2 text-[9px] text-text-dim uppercase tracking-widest flex items-center justify-center gap-2">
          <div className="w-8 h-[1px] bg-white/10" />
          sem dinheiro real · só estudo
          <div className="w-8 h-[1px] bg-white/10" />
        </div>
      </footer>
    </div>
  );
}
