import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Flame, Zap, Target, Users, Brain, TrendingUp, BookOpen, 
  ArrowRight, Clock, Star, CheckCircle2, Sparkles, GraduationCap,
  FileText, BarChart3, AlertTriangle, Calendar, MessageSquare, Upload
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, useTeacherStudents } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

// Student data
const initialStudentGoals = [
  { id: 1, title: "Complete Physics Ch.4", done: true },
  { id: 2, title: "Solve 20 Math Problems", done: true },
  { id: 3, title: "Read Biology Notes", done: false },
  { id: 4, title: "Review Chemistry Lab", done: false },
];

const recentActivity = [
  { text: "Scored 92% in Math Quiz", time: "2h ago", icon: Star },
  { text: "Joined 'Physics 101' Room", time: "3h ago", icon: Users },
  { text: "Completed Daily Streak", time: "5h ago", icon: Flame },
  { text: "Uploaded Biology Notes", time: "1d ago", icon: BookOpen },
];

const activeRooms = [
  { id: "phy101", name: "Physics 101", members: 12, topic: "Thermodynamics" },
  { id: "mth401", name: "Math Advanced", members: 8, topic: "Calculus" },
  { id: "bio201", name: "Biology Lab", members: 15, topic: "Cell Division" },
];

// Teacher data
const initialTeacherTasks = [
  { id: 1, title: "Grade Chemistry Lab Reports", done: false, urgent: true, count: 12 },
  { id: 2, title: "Prepare Physics Quiz", done: false, urgent: false },
  { id: 3, title: "Review student submissions", done: true, urgent: false, count: 8 },
  { id: 4, title: "Update course materials", done: false, urgent: false },
];

// Flash recall questions
const flashRecallQuestions = [
  { question: "What is the first law of thermodynamics?", options: ["Energy conservation", "Entropy", "Heat transfer", "Work done"], correctIndex: 0, subject: "Physics", chapter: "Ch.4" },
  { question: "What is the derivative of sin(x)?", options: ["cos(x)", "-sin(x)", "-cos(x)", "tan(x)"], correctIndex: 0, subject: "Math", chapter: "Ch.7" },
  { question: "What organelle produces ATP?", options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi"], correctIndex: 2, subject: "Biology", chapter: "Ch.2" },
];

const teacherActivity = [
  { text: "Aisha submitted Quiz 5", time: "1h ago", icon: FileText },
  { text: "New question in Physics room", time: "2h ago", icon: MessageSquare },
  { text: "Ravi completed Level 4", time: "3h ago", icon: Star },
  { text: "3 students joined Biology Lab", time: "5h ago", icon: Users },
];

const Index = () => {
  const { user, isTeacher, selectedClass } = useAuth();
  const assignedStudents = useTeacherStudents();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State for interactive elements
  const [studentGoals, setStudentGoals] = useState(initialStudentGoals);
  const [teacherTasks, setTeacherTasks] = useState(initialTeacherTasks);
  const [currentFlashCard, setCurrentFlashCard] = useState(0);
  const [flashCardAnswered, setFlashCardAnswered] = useState(false);
  const [flashCardCorrect, setFlashCardCorrect] = useState<boolean | null>(null);
  
  const firstName = user?.name?.split(' ')[0] || (isTeacher ? 'Teacher' : 'Student');
  const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening';

  // Toggle goal completion
  const toggleGoal = (goalId: number) => {
    setStudentGoals(prev => prev.map(g => 
      g.id === goalId ? { ...g, done: !g.done } : g
    ));
    toast({
      title: "Goal updated!",
      description: "Your progress has been saved.",
    });
  };

  // Toggle task completion
  const toggleTask = (taskId: number) => {
    setTeacherTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, done: !t.done } : t
    ));
    toast({
      title: "Task updated!",
      description: "Your task list has been saved.",
    });
  };

  // Flash recall answer handler
  const handleFlashAnswer = (optionIndex: number) => {
    if (flashCardAnswered) return;
    const isCorrect = optionIndex === flashRecallQuestions[currentFlashCard].correctIndex;
    setFlashCardCorrect(isCorrect);
    setFlashCardAnswered(true);
    
    toast({
      title: isCorrect ? "Correct! 🎉" : "Not quite!",
      description: isCorrect ? "Great job! Keep it up!" : `The answer was: ${flashRecallQuestions[currentFlashCard].options[flashRecallQuestions[currentFlashCard].correctIndex]}`,
      variant: isCorrect ? "default" : "destructive",
    });

    // Auto-advance to next question after delay
    setTimeout(() => {
      setCurrentFlashCard(prev => (prev + 1) % flashRecallQuestions.length);
      setFlashCardAnswered(false);
      setFlashCardCorrect(null);
    }, 2000);
  };

  // Navigate to room
  const handleJoinRoom = (roomId: string) => {
    navigate("/rooms");
    toast({
      title: "Joining room...",
      description: "Redirecting to study rooms.",
    });
  };

  // Navigate to course (for teachers)
  const handleViewCourse = (courseId: string) => {
    if (selectedClass === "all") {
      navigate(`/teacher/class/${courseId}/dashboard`);
    } else {
      navigate("/teacher");
    }
  };

  // Teacher stats
  const totalStudents = assignedStudents.length;
  const onlineStudents = Math.floor(totalStudents * 0.6);
  const pendingGrades = teacherTasks.filter(t => !t.done && t.count).reduce((acc, t) => acc + (t.count || 0), 0);
  const coursesTeaching = user?.teachingCourses?.length || 0;

  if (isTeacher) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto">
        {/* Teacher Greeting */}
        <motion.div variants={item} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              {greeting}, {firstName}
            </h1>
            <p className="text-muted-foreground mt-1">Here's your teaching overview for today.</p>
          </div>
          <Link to="/teacher">
            <Button className="gradient-primary text-primary-foreground rounded-md hidden sm:flex">
              <BarChart3 className="w-4 h-4 mr-2" /> View Dashboard
            </Button>
          </Link>
        </motion.div>

        {/* Teacher Stats */}
        <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Students" value={String(totalStudents)} color="primary" />
          <StatCard icon={CheckCircle2} label="Active Now" value={String(onlineStudents)} color="chart-2" />
          <StatCard icon={FileText} label="Pending Grades" value={String(pendingGrades)} color="accent" />
          <StatCard icon={BookOpen} label="Courses" value={String(coursesTeaching)} color="chart-4" />
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Tasks */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="rounded-lg shadow-card border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" /> Today's Tasks
                </CardTitle>
                <span className="text-xs text-muted-foreground font-medium bg-muted px-2.5 py-1 rounded-lg">
                  {teacherTasks.filter(g => g.done).length}/{teacherTasks.length} done
                </span>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={(teacherTasks.filter(g => g.done).length / teacherTasks.length) * 100} className="h-2 rounded-full" />
                {teacherTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={`flex items-center justify-between p-3 rounded-md transition-colors cursor-pointer hover:opacity-80 ${task.done ? 'bg-primary-light' : task.urgent ? 'bg-destructive/10' : 'bg-muted/50'}`}
                    onClick={() => toggleTask(task.id)}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className={`w-5 h-5 shrink-0 ${task.done ? 'text-primary' : 'text-muted-foreground/40'}`} />
                      <span className={`text-sm ${task.done ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}`}>
                        {task.title}
                      </span>
                      {task.urgent && !task.done && (
                        <Badge variant="destructive" className="text-[10px]">Urgent</Badge>
                      )}
                    </div>
                    {task.count && (
                      <Badge variant="secondary" className="text-xs">{task.count} items</Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={item}>
            <Card className="rounded-lg shadow-card border-border/50 gradient-card h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" /> Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/materials">
                  <Button variant="outline" className="w-full justify-start rounded-md">
                    <Upload className="w-4 h-4 mr-2" /> Upload Materials
                  </Button>
                </Link>
                <Link to="/rooms">
                  <Button variant="outline" className="w-full justify-start rounded-md">
                    <MessageSquare className="w-4 h-4 mr-2" /> View Study Rooms
                  </Button>
                </Link>
                <Link to="/teacher">
                  <Button variant="outline" className="w-full justify-start rounded-md">
                    <BarChart3 className="w-4 h-4 mr-2" /> Student Reports
                  </Button>
                </Link>
                <Link to="/planner">
                  <Button variant="outline" className="w-full justify-start rounded-md">
                    <Calendar className="w-4 h-4 mr-2" /> Teaching Schedule
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Courses Overview */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="rounded-lg shadow-card border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" /> Your Courses
                </CardTitle>
                <Link to="/teacher">
                  <Button variant="ghost" size="sm" className="text-primary text-xs rounded-lg">
                    View All <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {user?.teachingCourses?.slice(0, 3).map((course, i) => {
                  const courseStudents = assignedStudents.filter(s => 
                    s.enrolledCourses.some(c => c.id === course.id)
                  ).length;
                  return (
                    <div 
                      key={i} 
                      className="flex items-center justify-between p-3 rounded-md bg-muted/40 hover:bg-muted/70 transition-colors group cursor-pointer"
                      onClick={() => handleViewCourse(course.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                          {course.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{course.name}</p>
                          <p className="text-xs text-muted-foreground">{course.code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{courseStudents} students</Badge>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={item}>
            <Card className="rounded-lg shadow-card border-border/50 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {teacherActivity.map((act, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center shrink-0 mt-0.5">
                      <act.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground">{act.text}</p>
                      <p className="text-xs text-muted-foreground">{act.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Student view (original)
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto">
      {/* Greeting */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            {greeting}, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1">Here's your learning overview for today.</p>
        </div>
        <Link to="/planner">
          <Button className="gradient-primary text-primary-foreground rounded-md hidden sm:flex">
            <Target className="w-4 h-4 mr-2" /> View Planner
          </Button>
        </Link>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Flame} label="Day Streak" value="7 Days" color="accent" />
        <StatCard icon={Zap} label="XP Points" value="1,240" color="primary" />
        <StatCard icon={CheckCircle2} label="Tasks Done" value="12 / 18" color="chart-2" />
        <StatCard icon={TrendingUp} label="Weekly Rank" value="#3" color="chart-4" />
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Goals */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="rounded-lg shadow-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" /> Today's Goals
              </CardTitle>
              <span className="text-xs text-muted-foreground font-medium bg-muted px-2.5 py-1 rounded-lg">
                {studentGoals.filter(g => g.done).length}/{studentGoals.length} done
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={(studentGoals.filter(g => g.done).length / studentGoals.length) * 100} className="h-2 rounded-full" />
              {studentGoals.map((goal) => (
                <div 
                  key={goal.id} 
                  className={`flex items-center gap-3 p-3 rounded-md transition-colors cursor-pointer hover:opacity-80 ${goal.done ? 'bg-primary-light' : 'bg-muted/50'}`}
                  onClick={() => toggleGoal(goal.id)}
                >
                  <CheckCircle2 className={`w-5 h-5 shrink-0 ${goal.done ? 'text-primary' : 'text-muted-foreground/40'}`} />
                  <span className={`text-sm ${goal.done ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}`}>
                    {goal.title}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Flash Recall */}
        <motion.div variants={item}>
          <Card className="rounded-lg shadow-card border-border/50 gradient-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" /> Flash Recall
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-md bg-card border border-border">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                  {flashRecallQuestions[currentFlashCard].subject} • {flashRecallQuestions[currentFlashCard].chapter}
                </p>
                <p className="text-sm font-medium text-foreground leading-relaxed">
                  {flashRecallQuestions[currentFlashCard].question}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {flashRecallQuestions[currentFlashCard].options.map((opt, i) => {
                  const isCorrectAnswer = i === flashRecallQuestions[currentFlashCard].correctIndex;
                  const showCorrect = flashCardAnswered && isCorrectAnswer;
                  const showWrong = flashCardAnswered && flashCardCorrect === false && !isCorrectAnswer;
                  
                  return (
                    <Button
                      key={i}
                      variant={showCorrect ? "default" : "outline"}
                      size="sm"
                      className={`rounded-md text-xs ${
                        showCorrect ? 'bg-green-500 hover:bg-green-500 text-white' : 
                        showWrong ? 'opacity-50' : ''
                      }`}
                      onClick={() => handleFlashAnswer(i)}
                      disabled={flashCardAnswered}
                    >
                      {opt}
                    </Button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Question {currentFlashCard + 1} of {flashRecallQuestions.length}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Rooms */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="rounded-lg shadow-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Active Study Rooms
              </CardTitle>
              <Link to="/rooms">
                <Button variant="ghost" size="sm" className="text-primary text-xs rounded-lg">
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeRooms.map((room) => (
                <div 
                  key={room.id} 
                  className="flex items-center justify-between p-3 rounded-md bg-muted/40 hover:bg-muted/70 transition-colors group cursor-pointer"
                  onClick={() => handleJoinRoom(room.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                      {room.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{room.name}</p>
                      <p className="text-xs text-muted-foreground">{room.topic}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{room.members} online</span>
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={item}>
          <Card className="rounded-lg shadow-card border-border/50 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.map((act, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center shrink-0 mt-0.5">
                    <act.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground">{act.text}</p>
                    <p className="text-xs text-muted-foreground">{act.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <Card className="rounded-lg shadow-card border-border/50 hover:shadow-card-hover transition-shadow">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-11 h-11 rounded-md bg-${color}/10 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 text-${color}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default Index;
