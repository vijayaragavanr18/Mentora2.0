import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Clock, Trophy, Play, BarChart3, Users, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { generateQuiz } from "@/lib/api";

const quizzes = [
  { title: "Thermodynamics Basics", subject: "Physics", questions: 15, duration: "20 min", difficulty: "Medium", attempts: 45 },
  { title: "Integral Calculus", subject: "Mathematics", questions: 20, duration: "30 min", difficulty: "Hard", attempts: 32 },
  { title: "Cell Biology", subject: "Biology", questions: 10, duration: "15 min", difficulty: "Easy", attempts: 78 },
  { title: "Organic Chemistry", subject: "Chemistry", questions: 25, duration: "35 min", difficulty: "Hard", attempts: 21 },
  { title: "World History", subject: "History", questions: 12, duration: "18 min", difficulty: "Medium", attempts: 56 },
  { title: "Data Structures", subject: "CS", questions: 18, duration: "25 min", difficulty: "Medium", attempts: 64 },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const difficultyColor: Record<string, string> = {
  Easy: "bg-primary/10 text-primary",
  Medium: "bg-accent/20 text-accent-foreground",
  Hard: "bg-destructive/10 text-destructive",
};

export default function Quizzes() {
  const navigate = useNavigate();
  const [selectedQuiz, setSelectedQuiz] = useState<typeof quizzes[0] | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [generateTopic, setGenerateTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const handleStartQuiz = (quiz: typeof quizzes[0]) => {
    setSelectedQuiz(quiz);
    setIsConfirmOpen(true);
  };

  const handleConfirmStart = async () => {
    setIsConfirmOpen(false);
    if (selectedQuiz) {
      setIsGenerating(true);
      try {
        const data = await generateQuiz(selectedQuiz.title);
        sessionStorage.setItem("mentora_quiz_questions", JSON.stringify(data.questions));
        sessionStorage.setItem("mentora_quiz_topic", data.topic || selectedQuiz.title);
      } catch {
        // fall back to sample questions
      } finally {
        setIsGenerating(false);
      }
    }
    navigate('/levels');
  };

  const handleGenerateQuiz = async () => {
    if (!generateTopic.trim()) return;
    setIsGenerating(true);
    setGenerateError("");
    try {
      const data = await generateQuiz(generateTopic.trim());
      sessionStorage.setItem("mentora_quiz_questions", JSON.stringify(data.questions));
      sessionStorage.setItem("mentora_quiz_topic", data.topic || generateTopic.trim());
      setIsGenerateOpen(false);
      navigate('/levels');
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : "Failed to generate quiz");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto">
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary" /> Quizzes
          </h1>
          <p className="text-muted-foreground text-sm">Test your knowledge with timed assessments.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => setIsGenerateOpen(true)} variant="outline" className="rounded-md">
            <Sparkles className="w-4 h-4 mr-2" /> Generate AI Quiz
          </Button>
          <Button onClick={() => navigate('/leaderboard')} className="gradient-primary text-primary-foreground rounded-md">
            <Trophy className="w-4 h-4 mr-2" /> View Leaderboard
          </Button>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quizzes.map((quiz, i) => (
          <Card key={i} className="rounded-lg shadow-card border-border/50 hover:shadow-card-hover group">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider rounded-lg">{quiz.subject}</Badge>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${difficultyColor[quiz.difficulty]}`}>
                  {quiz.difficulty}
                </span>
              </div>
              <h3 className="font-semibold text-foreground mb-3">{quiz.title}</h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <Brain className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs font-medium text-foreground">{quiz.questions}</p>
                  <p className="text-[10px] text-muted-foreground">Qs</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <Clock className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs font-medium text-foreground">{quiz.duration}</p>
                  <p className="text-[10px] text-muted-foreground">Time</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <Users className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs font-medium text-foreground">{quiz.attempts}</p>
                  <p className="text-[10px] text-muted-foreground">Taken</p>
                </div>
              </div>
              <Button onClick={() => handleStartQuiz(quiz)} className="w-full gradient-primary text-primary-foreground rounded-md">
                <Play className="w-4 h-4 mr-2" /> Start Quiz
              </Button>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Quiz Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Quiz</DialogTitle>
            <DialogDescription>
              You are about to start "{selectedQuiz?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Subject</span>
              <Badge variant="secondary">{selectedQuiz?.subject}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Questions</span>
              <span className="text-sm font-medium">{selectedQuiz?.questions}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Duration</span>
              <span className="text-sm font-medium">{selectedQuiz?.duration}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Difficulty</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${difficultyColor[selectedQuiz?.difficulty || 'Medium']}`}>
                {selectedQuiz?.difficulty}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmStart} className="gradient-primary text-primary-foreground" disabled={isGenerating}>
              {isGenerating ? "Generating..." : <><Play className="w-4 h-4 mr-2" /> Begin Quiz</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate AI Quiz Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate AI Quiz</DialogTitle>
            <DialogDescription>Enter any topic and Mentora will create a custom quiz for you.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Input
              placeholder="e.g. Photosynthesis, World War II, Machine Learning..."
              value={generateTopic}
              onChange={(e) => setGenerateTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerateQuiz()}
            />
            {generateError && <p className="text-xs text-destructive">{generateError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerateQuiz} className="gradient-primary text-primary-foreground" disabled={!generateTopic.trim() || isGenerating}>
              {isGenerating ? "Generating..." : <><Sparkles className="w-4 h-4 mr-2" /> Generate</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
