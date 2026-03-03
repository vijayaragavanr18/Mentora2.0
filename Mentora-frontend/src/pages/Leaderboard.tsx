import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Crown, Flame, Zap, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const mockLeaderboard = [
  { name: "Sarah Chen", xp: 3420, streak: 14, rank: 1, badge: "Master" },
  { name: "Alex Kumar", xp: 3180, streak: 12, rank: 2, badge: "Scholar" },
  { name: "Maya Johnson", xp: 2950, streak: 10, rank: 3, badge: "Scholar" },
  { name: "You", xp: 1240, streak: 7, rank: 4, badge: "Learner", isYou: true },
  { name: "James Lee", xp: 1100, streak: 5, rank: 5, badge: "Learner" },
  { name: "Emily Park", xp: 980, streak: 4, rank: 6, badge: "Beginner" },
  { name: "David Kim", xp: 870, streak: 3, rank: 7, badge: "Beginner" },
  { name: "Lisa Wang", xp: 720, streak: 2, rank: 8, badge: "Beginner" },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-5 h-5 text-accent" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-muted-foreground" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-chart-5" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState(mockLeaderboard);

  useEffect(() => {
    getLeaderboard(20).then((entries: LeaderboardEntry[]) => {
      if (entries.length === 0) return;
      const mapped = entries.map((e, i) => ({
        name: e.name,
        xp: e.xp,
        streak: 0,
        rank: i + 1,
        badge: e.badge || (e.level >= 5 ? "Master" : e.level >= 3 ? "Scholar" : e.level >= 2 ? "Learner" : "Beginner"),
        isYou: user ? e.user_id === user.id : false,
      }));
      setLeaderboard(mapped);
    }).catch(() => {});
  }, [user]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-4xl mx-auto">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-7 h-7 text-primary" /> Leaderboard
        </h1>
        <p className="text-muted-foreground text-sm">See how you stack up against other learners.</p>
      </motion.div>

      {/* Top 3 Podium */}
      <motion.div variants={item} className="grid grid-cols-3 gap-4">
        {[leaderboard[1], leaderboard[0], leaderboard[2]].map((user, i) => (
          <Card key={i} className={`rounded-lg shadow-card border-border/50 ${i === 1 ? 'ring-2 ring-accent/50 -mt-2' : 'mt-4'}`}>
            <CardContent className="p-5 text-center">
              <div className={`w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center font-bold text-lg ${
                i === 1 ? 'gradient-primary text-primary-foreground' : 'bg-muted text-foreground'
              }`}>
                {user.name.charAt(0)}
              </div>
              <RankIcon rank={user.rank} />
              <h3 className="font-semibold text-foreground text-sm mt-2">{user.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{user.badge}</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <Zap className="w-3 h-3 text-accent" />
                <span className="text-sm font-bold text-foreground">{user.xp.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">XP</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Full List */}
      <motion.div variants={item}>
        <Tabs defaultValue="weekly">
          <TabsList className="rounded-md bg-muted p-1 mb-4">
            <TabsTrigger value="weekly" className="rounded-lg text-xs">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="rounded-lg text-xs">Monthly</TabsTrigger>
            <TabsTrigger value="alltime" className="rounded-lg text-xs">All Time</TabsTrigger>
          </TabsList>
          <TabsContent value="weekly">
            <Card className="rounded-lg shadow-card border-border/50">
              <CardContent className="p-2">
                {leaderboard.map((user, i) => (
                  <div key={i} className={`flex items-center gap-4 p-3 rounded-md transition-colors ${
                    (user as any).isYou ? 'bg-primary-light border border-primary/20' : 'hover:bg-muted/40'
                  }`}>
                    <RankIcon rank={user.rank} />
                    <div className={`w-10 h-10 rounded-md flex items-center justify-center font-semibold text-sm ${
                      (user as any).isYou ? 'gradient-primary text-primary-foreground' : 'bg-muted text-foreground'
                    }`}>
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {user.name} {(user as any).isYou && <span className="text-primary text-xs">(You)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.badge}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-accent" />
                        <span className="text-xs font-medium text-foreground">{user.streak}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-primary" />
                        <span className="text-sm font-bold text-foreground">{user.xp.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="monthly"><p className="text-center text-muted-foreground py-8">Monthly data coming soon</p></TabsContent>
          <TabsContent value="alltime"><p className="text-center text-muted-foreground py-8">All time data coming soon</p></TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
