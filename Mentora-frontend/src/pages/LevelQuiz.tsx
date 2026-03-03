import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, Lock, Unlock, CheckCircle2, XCircle, Clock, Trophy,
  ArrowRight, RotateCcw, ChevronRight, Star, Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { awardPoints } from "@/lib/api";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

interface Level {
  id: number;
  name: string;
  topic: string;
  unlocked: boolean;
  completed: boolean;
  score?: number;
  materials: number;
  questions: number;
}

const levels: Level[] = [
  { id: 1, name: "Level 1", topic: "Introduction to Physics", unlocked: true, completed: true, score: 85, materials: 3, questions: 10 },
  { id: 2, name: "Level 2", topic: "Newton's Laws of Motion", unlocked: true, completed: true, score: 78, materials: 4, questions: 12 },
  { id: 3, name: "Level 3", topic: "Work, Energy & Power", unlocked: true, completed: false, materials: 5, questions: 15 },
  { id: 4, name: "Level 4", topic: "Thermodynamics", unlocked: false, completed: false, materials: 4, questions: 15 },
  { id: 5, name: "Level 5", topic: "Waves & Optics", unlocked: false, completed: false, materials: 6, questions: 18 },
  { id: 6, name: "Level 6", topic: "Electromagnetism", unlocked: false, completed: false, materials: 5, questions: 20 },
];

const defaultSampleQuestions = [
  { q: "What is the SI unit of force?", options: ["Newton", "Joule", "Watt", "Pascal"], correct: 0 },
  { q: "F = m × a is known as Newton's _____ law.", options: ["First", "Second", "Third", "Fourth"], correct: 1 },
  { q: "Which quantity is a vector?", options: ["Mass", "Temperature", "Velocity", "Energy"], correct: 2 },
  { q: "The rate of change of velocity is called?", options: ["Speed", "Displacement", "Acceleration", "Momentum"], correct: 2 },
  { q: "Work done is measured in?", options: ["Watts", "Joules", "Newtons", "Pascals"], correct: 1 },
];

type SampleQuestion = { q: string; options: string[]; correct: number };

type RawQuestion =
  | { question: string; choices: { text: string; is_correct: boolean }[] }           // old mock format
  | { question: string; choices: { label: string; text: string }[]; answer: string }; // backend format

function loadQuestionsFromSession(): SampleQuestion[] {
  try {
    const raw = sessionStorage.getItem("mentora_quiz_questions");
    if (!raw) return defaultSampleQuestions;
    const parsed: RawQuestion[] = JSON.parse(raw);
    if (!parsed || parsed.length === 0) return defaultSampleQuestions;
    return parsed.map((q) => {
      // Backend format: choices have {label, text} and answer is a letter like "A"
      if (q.choices.length > 0 && "label" in q.choices[0]) {
        const backendQ = q as { question: string; choices: { label: string; text: string }[]; answer: string };
        const answerLabel = backendQ.answer?.toUpperCase();
        const correct = backendQ.choices.findIndex((c) => c.label.toUpperCase() === answerLabel);
        return {
          q: backendQ.question,
          options: backendQ.choices.map((c) => c.text),
          correct: correct >= 0 ? correct : 0,
        };
      }
      // Old mock format: {text, is_correct}
      const oldQ = q as { question: string; choices: { text: string; is_correct: boolean }[] };
      return {
        q: oldQ.question,
        options: oldQ.choices.map((c) => c.text),
        correct: oldQ.choices.findIndex((c) => c.is_correct),
      };
    });
  } catch {
    return defaultSampleQuestions;
  }
}

type View = "levels" | "quiz" | "result";

export default function LevelQuiz() {
  const [view, setView] = useState<View>("levels");
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(120);
  const [quizLevel, setQuizLevel] = useState<Level | null>(null);
  const [sampleQuestions, setSampleQuestions] = useState<SampleQuestion[]>(defaultSampleQuestions);
  const [quizTopic, setQuizTopic] = useState("Quiz");

  // On mount, try to load real questions generated via Quizzes page
  useEffect(() => {
    const qs = loadQuestionsFromSession();
    setSampleQuestions(qs);
    const topic = sessionStorage.getItem("mentora_quiz_topic");
    if (topic) setQuizTopic(topic);
  }, []);

  // Award XP when quiz finishes
  useEffect(() => {
    if (view === "result") {
      const xpEarned = passed ? 50 : 10;
      awardPoints(passed ? "quiz_passed" : "quiz_attempted", xpEarned).catch(() => {});
    }
  }, [view]);

  const startQuiz = (level: Level) => {
    setQuizLevel(level);
    setView("quiz");
    setCurrentQ(0);
    setSelected(null);
    setAnswers([]);
    setTimeLeft(120);
  };

  const selectAnswer = (idx: number) => {
    setSelected(idx);
  };

  const nextQuestion = () => {
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);
    if (currentQ < sampleQuestions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setView("result");
    }
  };

  const score = answers.reduce((acc, a, i) => acc + (a === sampleQuestions[i]?.correct ? 1 : 0), 0);
  const pct = Math.round((score / sampleQuestions.length) * 100);
  const passed = pct >= 70;

  if (view === "quiz") {
    const question = sampleQuestions[currentQ];
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">{quizLevel?.topic}</h2>
            <p className="text-xs text-muted-foreground">Question {currentQ + 1} of {sampleQuestions.length}</p>
          </div>
          <Badge variant="outline" className="rounded-lg gap-1">
            <Clock className="w-3 h-3" /> {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
          </Badge>
        </div>

        <Progress value={((currentQ + 1) / sampleQuestions.length) * 100} className="h-2 rounded-full" />

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="rounded-lg shadow-card border-border/50">
              <CardContent className="p-6">
                <p className="text-base font-semibold text-foreground mb-6">{question.q}</p>
                <div className="grid gap-3">
                  {question.options.map((opt, i) => (
                    <motion.button
                      key={i}
                      onClick={() => selectAnswer(i)}
                      className={`p-4 rounded-md border-2 text-left text-sm font-medium ${
                        selected === i
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border/50 bg-muted/30 text-foreground hover:border-primary/30"
                      }`}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          selected === i ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        {opt}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-end">
          <Button
            onClick={nextQuestion}
            disabled={selected === null}
            className="gradient-primary text-primary-foreground rounded-md"
          >
            {currentQ < sampleQuestions.length - 1 ? "Next" : "Finish"} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    );
  }

  if (view === "result") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto space-y-6 text-center">
        <motion.div
          className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${passed ? "gradient-primary" : "bg-destructive/10"}`}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6 }}
        >
          {passed ? <Trophy className="w-10 h-10 text-primary-foreground" /> : <XCircle className="w-10 h-10 text-destructive" />}
        </motion.div>

        <h2 className="text-2xl font-bold text-foreground">{passed ? "Level Cleared! 🎉" : "Not Quite Yet"}</h2>
        <p className="text-muted-foreground text-sm">
          {passed ? "Great job! The next level has been unlocked." : "You need 70% to pass. Review the materials and try again."}
        </p>

        <Card className="rounded-lg shadow-card border-border/50">
          <CardContent className="p-6 grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold text-foreground">{pct}%</p>
              <p className="text-xs text-muted-foreground">Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{score}/{sampleQuestions.length}</p>
              <p className="text-xs text-muted-foreground">Correct</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">+{score * 20}</p>
              <p className="text-xs text-muted-foreground">XP</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-center">
          <Button variant="outline" className="rounded-md" onClick={() => setView("levels")}>
            Back to Levels
          </Button>
          {!passed && (
            <Button className="gradient-primary text-primary-foreground rounded-md" onClick={() => startQuiz(quizLevel!)}>
              <RotateCcw className="w-4 h-4 mr-2" /> Retry
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  // Levels view
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-4xl mx-auto">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Brain className="w-7 h-7 text-primary" /> Course: Physics Fundamentals
        </h1>
        <p className="text-muted-foreground text-sm">Complete each level's quiz (70%+) to unlock the next level.</p>
      </motion.div>

      {/* Progress overview */}
      <motion.div variants={item}>
        <Card className="rounded-lg shadow-card border-border/50 gradient-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-md gradient-primary flex items-center justify-center">
              <Star className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Progress: Level {levels.filter(l => l.completed).length} / {levels.length}</p>
              <Progress value={(levels.filter(l => l.completed).length / levels.length) * 100} className="h-2 mt-2 rounded-full" />
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground flex items-center gap-1"><Zap className="w-4 h-4 text-accent" /> 320 XP</p>
              <p className="text-[10px] text-muted-foreground">Total earned</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Level cards */}
      <motion.div variants={item} className="space-y-3">
        {levels.map((level, i) => (
          <motion.div key={level.id} variants={item}>
            <Card className={`rounded-lg shadow-card border-border/50 ${
              !level.unlocked ? "opacity-60" : "hover:shadow-card-hover"
            }`}>
              <CardContent className="p-4 flex items-center gap-4">
                {/* Status icon */}
                <div className={`w-12 h-12 rounded-md flex items-center justify-center shrink-0 ${
                  level.completed ? "gradient-primary" : level.unlocked ? "bg-accent/10" : "bg-muted"
                }`}>
                  {level.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
                  ) : level.unlocked ? (
                    <Unlock className="w-5 h-5 text-accent" />
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-foreground">{level.name}</h3>
                    {level.completed && level.score && (
                      <Badge className="text-[9px] bg-primary/10 text-primary border-0 rounded-md">{level.score}%</Badge>
                    )}
                    {!level.unlocked && (
                      <Badge variant="secondary" className="text-[9px] rounded-md">Locked</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{level.topic}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span>{level.materials} materials</span>
                    <span>•</span>
                    <span>{level.questions} questions</span>
                  </div>
                </div>

                {/* Action */}
                {level.unlocked && !level.completed && (
                  <Button
                    onClick={() => startQuiz(level)}
                    className="gradient-primary text-primary-foreground rounded-md"
                    size="sm"
                  >
                    Start Quiz <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                {level.completed && (
                  <Button variant="outline" size="sm" className="rounded-md text-xs" onClick={() => startQuiz(level)}>
                    Retake
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
