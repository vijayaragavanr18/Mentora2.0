import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, Circle, Flame, Target, TrendingUp, Plus, Clock, Users, BookOpen, FileText, Video, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useTeacherStudents } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { listTasks, createTask, updateTask, type PlannerTask } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const streakDays = [true, true, true, true, true, true, false];

// Student data
const initialStudentTasks = [
  { id: 1, title: "Physics: Thermodynamics Ch.4", done: true, subject: "Physics" },
  { id: 2, title: "Math: Practice Integration", done: true, subject: "Math" },
  { id: 3, title: "Biology: Read Cell Division", done: false, subject: "Biology" },
  { id: 4, title: "Chemistry: Lab Report", done: false, subject: "Chemistry" },
  { id: 5, title: "CS: Implement BST", done: false, subject: "CS" },
];

const weeklyStats = [
  { day: "Mon", hours: 4.5 },
  { day: "Tue", hours: 3.2 },
  { day: "Wed", hours: 5.1 },
  { day: "Thu", hours: 2.8 },
  { day: "Fri", hours: 4.0 },
  { day: "Sat", hours: 6.2 },
  { day: "Sun", hours: 0 },
];

// Teacher data
const teacherSchedule = [
  { time: "9:00 AM", title: "Physics 101 - Lecture", type: "lecture", duration: "1h", room: "Room 101" },
  { time: "11:00 AM", title: "Office Hours", type: "office", duration: "2h", room: "Office 305" },
  { time: "2:00 PM", title: "Chemistry - Lab Session", type: "lab", duration: "2h", room: "Lab B" },
  { time: "4:30 PM", title: "Biology - Review Session", type: "review", duration: "1h", room: "Room 102" },
];

// upcomingDeadlines moved to initialDeadlines with state management

const weeklyTeachingHours = [
  { day: "Mon", hours: 6 },
  { day: "Tue", hours: 4 },
  { day: "Wed", hours: 5 },
  { day: "Thu", hours: 7 },
  { day: "Fri", hours: 4 },
  { day: "Sat", hours: 0 },
  { day: "Sun", hours: 0 },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

// Initial teacher deadlines (with IDs for state management)
const initialDeadlines = [
  { id: 1, title: "Grade Physics Quiz 5", dueDate: "Today", submissions: 24, total: 28, urgent: true, done: false },
  { id: 2, title: "Prepare Chemistry Midterm", dueDate: "Tomorrow", submissions: 0, total: 0, urgent: false, done: false },
  { id: 3, title: "Review Lab Reports", dueDate: "Mar 3", submissions: 18, total: 22, urgent: false, done: false },
  { id: 4, title: "Submit Course Materials", dueDate: "Mar 5", submissions: 0, total: 0, urgent: false, done: false },
];

export default function Planner() {
  const { user, isTeacher } = useAuth();
  const assignedStudents = useTeacherStudents();
  const { toast } = useToast();
  
  // State for student tasks — seeded from backend
  const [studentTasks, setStudentTasks] = useState(initialStudentTasks);
  const [backendTasks, setBackendTasks] = useState<PlannerTask[]>([]);
  const [teacherDeadlines, setTeacherDeadlines] = useState(initialDeadlines);
  
  // Dialog state
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventType, setNewEventType] = useState("lecture");
  
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalSubject, setNewGoalSubject] = useState("");

  // Load tasks from backend on mount
  useEffect(() => {
    listTasks().then((tasks) => {
      setBackendTasks(tasks);
      if (tasks.length > 0) {
        const mapped = tasks.map((t) => ({
          id: t.id as unknown as number,
          title: t.title,
          done: t.status === "done",
          subject: t.subject || "General",
          _backendId: t.id,
        }));
        setStudentTasks(mapped as typeof initialStudentTasks);
      }
    }).catch(() => {});
  }, []);

  const doneCount = studentTasks.filter(t => t.done).length;

  // Toggle student task
  const toggleStudentTask = async (taskId: number | string) => {
    const task = studentTasks.find(t => (t as unknown as { _backendId?: string })._backendId === taskId || t.id === taskId);
    const newDone = task ? !task.done : false;
    setStudentTasks(prev => prev.map(t =>
      ((t as unknown as { _backendId?: string })._backendId === taskId || t.id === taskId) ? { ...t, done: newDone } : t
    ));
    const backendId = (task as unknown as { _backendId?: string })?._backendId || String(taskId);
    try {
      await updateTask(backendId, { status: newDone ? "done" : "pending" });
    } catch {}
    toast({ title: "Task updated!", description: "Your progress has been saved." });
  };

  // Toggle teacher deadline
  const toggleDeadline = (deadlineId: number) => {
    setTeacherDeadlines(prev => prev.map(d => 
      d.id === deadlineId ? { ...d, done: !d.done } : d
    ));
    toast({
      title: "Task marked complete!",
      description: "Great job finishing this task.",
    });
  };

  // Add new event (for teachers)
  const handleAddEvent = () => {
    if (!newEventTitle || !newEventTime) return;
    toast({
      title: "Event added!",
      description: `"${newEventTitle}" has been added to your schedule.`,
    });
    setNewEventTitle("");
    setNewEventTime("");
    setIsAddEventOpen(false);
  };

  // Add new goal (for students)
  const handleAddGoal = async () => {
    if (!newGoalTitle) return;
    const optimistic = {
      id: Date.now(),
      title: newGoalTitle,
      done: false,
      subject: newGoalSubject || "General",
      _backendId: undefined as string | undefined,
    };
    setStudentTasks(prev => [...prev, optimistic as unknown as typeof initialStudentTasks[0]]);
    toast({ title: "Goal added!", description: `"${newGoalTitle}" has been added to your tasks.` });
    setNewGoalTitle("");
    setNewGoalSubject("");
    setIsAddGoalOpen(false);
    try {
      const created = await createTask({ title: newGoalTitle, subject: newGoalSubject || undefined });
      // Update the optimistic entry with the real backend id
      setStudentTasks(prev => prev.map(t =>
        t.id === optimistic.id ? { ...t, id: created.id as unknown as number, _backendId: created.id } as unknown as typeof initialStudentTasks[0] : t
      ));
    } catch {}
  };

  if (isTeacher) {
    const totalTeachingHours = weeklyTeachingHours.reduce((acc, d) => acc + d.hours, 0);
    const pendingGrades = teacherDeadlines.filter(d => d.submissions > 0).reduce((acc, d) => acc + d.submissions, 0);
    
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto">
        <motion.div variants={item} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="w-7 h-7 text-primary" /> Teaching Schedule
            </h1>
            <p className="text-muted-foreground text-sm">Manage your classes, office hours, and deadlines.</p>
          </div>
          <Button onClick={() => setIsAddEventOpen(true)} className="gradient-primary text-primary-foreground rounded-md">
            <Plus className="w-4 h-4 mr-2" /> Add Event
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Schedule */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="rounded-lg shadow-card border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Today's Schedule
                </CardTitle>
                <Badge variant="secondary">March 1, 2026</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {teacherSchedule.map((session, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors">
                    <div className="text-center min-w-[70px]">
                      <p className="text-sm font-bold text-foreground">{session.time}</p>
                      <p className="text-xs text-muted-foreground">{session.duration}</p>
                    </div>
                    <div className="w-1 h-12 rounded-full gradient-primary" />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{session.title}</p>
                      <p className="text-xs text-muted-foreground">{session.room}</p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        session.type === 'lecture' ? 'text-primary border-primary/30' :
                        session.type === 'lab' ? 'text-green-600 border-green-600/30' :
                        session.type === 'office' ? 'text-amber-600 border-amber-600/30' :
                        'text-purple-600 border-purple-600/30'
                      }`}
                    >
                      {session.type}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Stats */}
          <motion.div variants={item}>
            <Card className="rounded-lg shadow-card border-border/50 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" /> This Week
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-md bg-primary/10 text-center">
                  <p className="text-3xl font-bold text-primary">{totalTeachingHours}h</p>
                  <p className="text-xs text-muted-foreground">Teaching Hours</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-md bg-muted/50 text-center">
                    <p className="text-xl font-bold text-foreground">{assignedStudents.length}</p>
                    <p className="text-[10px] text-muted-foreground">Students</p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50 text-center">
                    <p className="text-xl font-bold text-foreground">{user?.teachingCourses?.length || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Courses</p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50 text-center">
                    <p className="text-xl font-bold text-amber-600">{pendingGrades}</p>
                    <p className="text-[10px] text-muted-foreground">To Grade</p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50 text-center">
                    <p className="text-xl font-bold text-foreground">4</p>
                    <p className="text-[10px] text-muted-foreground">Classes Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Upcoming Deadlines */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="rounded-lg shadow-card border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" /> Upcoming Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {teacherDeadlines.map((deadline) => (
                  <div key={deadline.id} onClick={() => toggleDeadline(deadline.id)} className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${deadline.done ? 'bg-primary-light' : deadline.urgent ? 'bg-destructive/10' : 'bg-muted/40 hover:bg-muted/60'}`}>
                    <div className="flex items-center gap-3">
                      {deadline.done ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <Circle className={`w-5 h-5 ${deadline.urgent ? 'text-destructive' : 'text-muted-foreground/40'}`} />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">{deadline.title}</p>
                        {deadline.submissions > 0 && (
                          <p className="text-xs text-muted-foreground">{deadline.submissions}/{deadline.total} submissions</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {deadline.urgent && <Badge variant="destructive" className="text-[10px]">Urgent</Badge>}
                      <Badge variant="secondary" className="text-xs">{deadline.dueDate}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Weekly Teaching Hours */}
          <motion.div variants={item}>
            <Card className="rounded-lg shadow-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" /> Teaching Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-2 h-32">
                  {weeklyTeachingHours.map((stat, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{stat.hours}h</span>
                      <div className="w-full rounded-t-lg gradient-primary" style={{ height: `${(stat.hours / 8) * 100}%`, minHeight: stat.hours > 0 ? 8 : 4, opacity: stat.hours > 0 ? 1 : 0.2 }} />
                      <span className="text-[10px] text-muted-foreground">{stat.day}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Your Courses */}
          <motion.div variants={item} className="lg:col-span-3">
            <Card className="rounded-lg shadow-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" /> Your Courses This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {user?.teachingCourses?.map((course, i) => {
                    const courseStudents = assignedStudents.filter(s => 
                      s.enrolledCourses.some(c => c.id === course.id)
                    ).length;
                    return (
                      <div key={i} className="p-4 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-md gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                            {course.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground">{course.name}</p>
                            <p className="text-xs text-muted-foreground">{course.code}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" /> {courseStudents} students
                          </span>
                          <Badge variant="outline" className="text-[10px]">3 classes/wk</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Add Event Dialog */}
        <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="event-title">Event Title</Label>
                <Input 
                  id="event-title" 
                  placeholder="Enter event title..." 
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-time">Time</Label>
                <Input 
                  id="event-time" 
                  placeholder="e.g., 9:00 AM" 
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-type">Type</Label>
                <Select value={newEventType} onValueChange={setNewEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lecture">Lecture</SelectItem>
                    <SelectItem value="lab">Lab Session</SelectItem>
                    <SelectItem value="office">Office Hours</SelectItem>
                    <SelectItem value="review">Review Session</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddEventOpen(false)}>Cancel</Button>
              <Button onClick={handleAddEvent} className="gradient-primary text-primary-foreground">Add Event</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    );
  }

  // Student view (original)
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-primary" /> Study Planner
          </h1>
          <p className="text-muted-foreground text-sm">Organize and track your daily learning goals.</p>
        </div>
        <Button onClick={() => setIsAddGoalOpen(true)} className="gradient-primary text-primary-foreground rounded-md">
          <Plus className="w-4 h-4 mr-2" /> Add Goal
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Streak */}
        <motion.div variants={item}>
          <Card className="rounded-lg shadow-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Flame className="w-5 h-5 text-accent" /> Weekly Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-4">
                {weekDays.map((day, i) => (
                  <div key={day} className="flex flex-col items-center gap-1.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                      streakDays[i] ? 'gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {streakDays[i] ? <Flame className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{day}</span>
                  </div>
                ))}
              </div>
              <div className="text-center p-3 rounded-md bg-primary-light">
                <p className="text-2xl font-bold text-primary">6</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Today's Tasks */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="rounded-lg shadow-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" /> Today's Tasks
              </CardTitle>
              <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">{doneCount}/{studentTasks.length}</span>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress value={(doneCount / studentTasks.length) * 100} className="h-2 rounded-full mb-3" />
              {studentTasks.map((task) => (
                <div key={task.id} onClick={() => toggleStudentTask(task.id)} className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${task.done ? 'bg-primary-light' : 'bg-muted/40 hover:bg-muted/60'}`}>
                  {task.done ? (
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={`text-sm flex-1 ${task.done ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}`}>
                    {task.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{task.subject}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Weekly Study Hours */}
        <motion.div variants={item} className="lg:col-span-3">
          <Card className="rounded-lg shadow-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> Weekly Study Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-3 h-40">
                {weeklyStats.map((stat, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{stat.hours}h</span>
                    <div className="w-full rounded-t-lg gradient-primary" style={{ height: `${(stat.hours / 7) * 100}%`, minHeight: stat.hours > 0 ? 8 : 4, opacity: stat.hours > 0 ? 1 : 0.2 }} />
                    <span className="text-[10px] text-muted-foreground">{stat.day}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Add Goal Dialog */}
      <Dialog open={isAddGoalOpen} onOpenChange={setIsAddGoalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="goal-title">Goal Title</Label>
              <Input 
                id="goal-title" 
                placeholder="Enter goal..." 
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-subject">Subject</Label>
              <Select value={newGoalSubject} onValueChange={setNewGoalSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Physics">Physics</SelectItem>
                  <SelectItem value="Mathematics">Mathematics</SelectItem>
                  <SelectItem value="Chemistry">Chemistry</SelectItem>
                  <SelectItem value="Biology">Biology</SelectItem>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddGoalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddGoal} className="gradient-primary text-primary-foreground">Add Goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
