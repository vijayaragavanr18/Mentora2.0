import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Puzzle, Brain, Trophy, Clock, Star, Lock, ChevronRight, 
  Lightbulb, Target, Zap, CheckCircle2 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { generateQuiz, awardPoints } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

interface PuzzleItem {
  id: number;
  title: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  points: number;
  timeLimit: string;
  completed: boolean;
  locked: boolean;
  description: string;
}

const puzzles: PuzzleItem[] = [
  { id: 1, title: "Number Sequence", category: "Logic", difficulty: "Easy", points: 50, timeLimit: "5 min", completed: true, locked: false, description: "Find the pattern in the sequence" },
  { id: 2, title: "Word Scramble", category: "Language", difficulty: "Easy", points: 50, timeLimit: "3 min", completed: true, locked: false, description: "Unscramble the scientific terms" },
  { id: 3, title: "Chemical Balance", category: "Chemistry", difficulty: "Medium", points: 100, timeLimit: "10 min", completed: false, locked: false, description: "Balance the chemical equations" },
  { id: 4, title: "Physics Puzzle", category: "Physics", difficulty: "Medium", points: 100, timeLimit: "8 min", completed: false, locked: false, description: "Solve force and motion problems" },
  { id: 5, title: "Math Maze", category: "Mathematics", difficulty: "Medium", points: 100, timeLimit: "12 min", completed: false, locked: false, description: "Navigate through mathematical operations" },
  { id: 6, title: "Biology Match", category: "Biology", difficulty: "Easy", points: 50, timeLimit: "5 min", completed: false, locked: false, description: "Match organs to their functions" },
  { id: 7, title: "Code Breaker", category: "Logic", difficulty: "Hard", points: 200, timeLimit: "15 min", completed: false, locked: true, description: "Decrypt the coded message" },
  { id: 8, title: "Memory Matrix", category: "Memory", difficulty: "Hard", points: 200, timeLimit: "10 min", completed: false, locked: true, description: "Remember and recall patterns" },
  { id: 9, title: "Ultimate Challenge", category: "Mixed", difficulty: "Expert", points: 500, timeLimit: "30 min", completed: false, locked: true, description: "Master all subjects combined" },
];

const categories = ["All", "Logic", "Language", "Chemistry", "Physics", "Mathematics", "Biology", "Memory"];

const difficultyColors = {
  Easy: "bg-primary/10 text-primary",
  Medium: "bg-yellow-500/10 text-yellow-600",
  Hard: "bg-orange-500/10 text-orange-600",
  Expert: "bg-red-500/10 text-red-600",
};

export default function Puzzles() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPuzzle, setSelectedPuzzle] = useState<PuzzleItem | null>(null);
  const [startingId, setStartingId] = useState<number | null>(null);
  const [completedIds, setCompletedIds] = useState<number[]>([1, 2]);

  const filteredPuzzles = puzzles.filter(
    (p) => selectedCategory === "All" || p.category === selectedCategory
  );

  const isCompleted = (p: PuzzleItem) => completedIds.includes(p.id) || p.completed;
  const completedCount = puzzles.filter(isCompleted).length;
  const totalPoints = puzzles.filter(isCompleted).reduce((sum, p) => sum + p.points, 0);

  const handleStartPuzzle = async (puzzle: PuzzleItem) => {
    if (puzzle.locked || startingId !== null) return;
    setStartingId(puzzle.id);
    try {
      const data = await generateQuiz(puzzle.title + " " + puzzle.category, { num_questions: 5 });
      sessionStorage.setItem("mentora_quiz_questions", JSON.stringify(data.questions));
      sessionStorage.setItem("mentora_quiz_topic", data.topic || puzzle.title);
    } catch {
      // Use fallback sample questions
      sessionStorage.removeItem("mentora_quiz_questions");
      sessionStorage.setItem("mentora_quiz_topic", puzzle.title);
    }
    try { await awardPoints("puzzle_start", 5); } catch { /* ignore */ }
    setStartingId(null);
    navigate("/levels");
  };

  const handleDailyChallenge = async () => {
    setStartingId(-1);
    try {
      const data = await generateQuiz("Mixed Science and Math Daily Challenge", { num_questions: 8 });
      sessionStorage.setItem("mentora_quiz_questions", JSON.stringify(data.questions));
      sessionStorage.setItem("mentora_quiz_topic", "Daily Challenge");
    } catch {
      sessionStorage.setItem("mentora_quiz_topic", "Daily Challenge");
    }
    try { await awardPoints("daily_challenge", 30); } catch { /* ignore */ }
    toast({ title: "🎉 Daily Challenge!", description: "Good luck! Bonus points awarded." });
    setStartingId(null);
    navigate("/levels");
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Puzzle className="w-7 h-7 text-primary" /> Puzzles
          </h1>
          <p className="text-muted-foreground text-sm">Challenge your mind with educational puzzles</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="font-semibold">{totalPoints} pts</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="font-semibold">{completedCount}/{puzzles.length}</span>
          </div>
        </div>
      </motion.div>

      {/* Progress Card */}
      <motion.div variants={item}>
        <Card className="rounded-lg shadow-card border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-semibold">Overall Progress</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {Math.round((completedCount / puzzles.length) * 100)}%
              </span>
            </div>
            <Progress value={(completedCount / puzzles.length) * 100} className="h-2" />
            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
              <span>{completedCount} completed</span>
              <span>{puzzles.length - completedCount} remaining</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Category Filter */}
      <motion.div variants={item} className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            className={`rounded-md ${
              selectedCategory === category
                ? "gradient-primary text-primary-foreground"
                : ""
            }`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Button>
        ))}
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-lg shadow-card border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-md bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Daily Streak</p>
              <p className="text-lg font-bold text-foreground">7 days</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-card border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-md bg-yellow-500/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Best Score</p>
              <p className="text-lg font-bold text-foreground">98%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-card border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-md bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Time</p>
              <p className="text-lg font-bold text-foreground">4:32</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-card border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-md bg-purple-500/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">IQ Boost</p>
              <p className="text-lg font-bold text-foreground">+12</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Puzzles Grid */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPuzzles.map((puzzle) => (
          <Card
            key={puzzle.id}
            className={`rounded-lg shadow-card border-border/50 cursor-pointer group ${
              puzzle.locked
                ? "opacity-60"
                : "hover:shadow-card-hover"
            } ${isCompleted(puzzle) ? "bg-primary/5" : ""}`}
            onClick={() => !puzzle.locked && !isCompleted(puzzle) && handleStartPuzzle(puzzle)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 rounded-md flex items-center justify-center ${
                  puzzle.completed
                    ? "bg-primary/20 text-primary"
                    : puzzle.locked
                    ? "bg-muted text-muted-foreground"
                    : "gradient-primary text-primary-foreground"
                }`}>
                  {puzzle.locked ? (
                    <Lock className="w-5 h-5" />
                  ) : isCompleted(puzzle) ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Puzzle className="w-5 h-5" />
                  )}
                </div>
                <Badge className={difficultyColors[puzzle.difficulty]}>
                  {puzzle.difficulty}
                </Badge>
              </div>
              
              <h3 className="font-semibold text-foreground mb-1">{puzzle.title}</h3>
              <p className="text-xs text-muted-foreground mb-3">{puzzle.description}</p>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {puzzle.timeLimit}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" /> {puzzle.points} pts
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {puzzle.category}
                </Badge>
              </div>

              {!puzzle.locked && !isCompleted(puzzle) && (
                <Button
                  className="w-full mt-4 gradient-primary text-primary-foreground rounded-md"
                  size="sm"
                  disabled={startingId !== null}
                  onClick={(e) => { e.stopPropagation(); handleStartPuzzle(puzzle); }}
                >
                  {startingId === puzzle.id ? "Generating..." : (<>Start Puzzle <ChevronRight className="w-4 h-4 ml-1" /></>)}
                </Button>
              )}

              {isCompleted(puzzle) && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-primary">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Completed</span>
                </div>
              )}

              {puzzle.locked && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span>Complete previous puzzles to unlock</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Daily Challenge */}
      <motion.div variants={item}>
        <Card className="rounded-lg shadow-card border-border/50 bg-gradient-to-br from-primary/10 to-accent/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg gradient-primary flex items-center justify-center">
                <Lightbulb className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-foreground">Daily Challenge</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Complete today's special puzzle for bonus points!
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-yellow-600">
                    <Star className="w-4 h-4" /> 300 bonus pts
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-4 h-4" /> 12h remaining
                  </span>
                </div>
              </div>
              <Button
                className="gradient-primary text-primary-foreground rounded-md"
                disabled={startingId === -1}
                onClick={handleDailyChallenge}
              >
                {startingId === -1 ? "Generating..." : "Play Now"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
