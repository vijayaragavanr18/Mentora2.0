import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Search, TrendingUp, Clock, Flame, Mail, Phone,
  BarChart3, Award, AlertTriangle, BookOpen, GraduationCap, ChevronRight,
  Eye, FileText, Calendar, CheckCircle2, XCircle, MessageSquare, Download,
  Filter, ArrowUpDown, MoreHorizontal, UserCheck, Activity, PieChart
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useAuth, useTeacherStudents } from "@/contexts/AuthContext";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

interface StudentProgress {
  id: string;
  name: string;
  email: string;
  phone: string;
  level: number;
  quizAttempts: number;
  quizzesPassed: number;
  passRate: number;
  avgScore: number;
  streak: number;
  totalTimeSpent: string;
  lastActive: string;
  joinedDate: string;
  completedMaterials: number;
  totalMaterials: number;
  assignments: { name: string; score: number; maxScore: number; submitted: string; status: "graded" | "pending" }[];
  quizHistory: { name: string; score: number; date: string; passed: boolean }[];
  weakAreas: string[];
  strongAreas: string[];
  status: "online" | "offline" | "away";
  courses: string[];
  notes: string;
}

const studentProgressData: Record<string, Omit<StudentProgress, 'id' | 'name' | 'email' | 'courses'>> = {
  "student1": { 
    phone: "+1 555-0123",
    level: 5, 
    quizAttempts: 23, 
    quizzesPassed: 20,
    passRate: 87, 
    avgScore: 82, 
    streak: 12, 
    totalTimeSpent: "48h 20m",
    lastActive: "2 hours ago",
    joinedDate: "Jan 15, 2026",
    completedMaterials: 18,
    totalMaterials: 22,
    assignments: [
      { name: "Chemistry Lab Report", score: 88, maxScore: 100, submitted: "Feb 28, 2026", status: "graded" },
      { name: "Organic Compounds Essay", score: 92, maxScore: 100, submitted: "Feb 25, 2026", status: "graded" },
      { name: "Periodic Table Quiz", score: 0, maxScore: 50, submitted: "Mar 1, 2026", status: "pending" },
    ],
    quizHistory: [
      { name: "Atomic Structure", score: 95, date: "Feb 28, 2026", passed: true },
      { name: "Chemical Bonds", score: 88, date: "Feb 25, 2026", passed: true },
      { name: "Organic Chemistry Basics", score: 72, date: "Feb 20, 2026", passed: true },
      { name: "Thermodynamics", score: 65, date: "Feb 15, 2026", passed: false },
    ],
    weakAreas: ["Organic Chemistry"],
    strongAreas: ["Atomic Structure", "Chemical Bonds"],
    status: "online",
    notes: "Excellent student, very engaged in class discussions."
  },
  "student2": { 
    phone: "+1 555-0456",
    level: 4, 
    quizAttempts: 18, 
    quizzesPassed: 13,
    passRate: 72, 
    avgScore: 71, 
    streak: 5, 
    totalTimeSpent: "32h 45m",
    lastActive: "5 hours ago",
    joinedDate: "Jan 20, 2026",
    completedMaterials: 14,
    totalMaterials: 22,
    assignments: [
      { name: "Calculus Problem Set", score: 75, maxScore: 100, submitted: "Feb 27, 2026", status: "graded" },
      { name: "Vector Analysis", score: 68, maxScore: 100, submitted: "Feb 24, 2026", status: "graded" },
    ],
    quizHistory: [
      { name: "Derivatives", score: 78, date: "Feb 27, 2026", passed: true },
      { name: "Integration", score: 65, date: "Feb 22, 2026", passed: false },
      { name: "Vectors Basics", score: 70, date: "Feb 18, 2026", passed: true },
    ],
    weakAreas: ["Calculus", "Vectors"],
    strongAreas: ["Algebra"],
    status: "away",
    notes: "Needs extra support with calculus concepts."
  },
  "student-default": { 
    phone: "+1 555-0789",
    level: 3, 
    quizAttempts: 10, 
    quizzesPassed: 7,
    passRate: 70, 
    avgScore: 68, 
    streak: 3, 
    totalTimeSpent: "18h 30m",
    lastActive: "1 day ago",
    joinedDate: "Feb 1, 2026",
    completedMaterials: 8,
    totalMaterials: 22,
    assignments: [
      { name: "Introduction Essay", score: 80, maxScore: 100, submitted: "Feb 26, 2026", status: "graded" },
    ],
    quizHistory: [
      { name: "Basic Concepts", score: 75, date: "Feb 26, 2026", passed: true },
    ],
    weakAreas: [],
    strongAreas: ["Basic Concepts"],
    status: "offline",
    notes: ""
  },
};

function ScoreBar({ value, max = 100, showLabel = false }: { value: number; max?: number; showLabel?: boolean }) {
  const pct = (value / max) * 100;
  const color = pct >= 80 ? "bg-primary" : pct >= 60 ? "bg-amber-500" : "bg-destructive";
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-muted">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      {showLabel && <span className="text-xs font-medium w-10 text-right">{Math.round(pct)}%</span>}
    </div>
  );
}

function StatusIndicator({ status }: { status: "online" | "offline" | "away" }) {
  const colors = {
    online: "bg-green-500",
    away: "bg-amber-500", 
    offline: "bg-gray-400"
  };
  return (
    <span className={`w-2.5 h-2.5 rounded-full ${colors[status]} inline-block`} />
  );
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const assignedStudents = useTeacherStudents();
  const [sortBy, setSortBy] = useState("name");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<StudentProgress | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const studentsWithProgress: StudentProgress[] = assignedStudents.map((student) => {
    const progress = studentProgressData[student.id] || studentProgressData["student-default"];
    return {
      id: student.id,
      name: student.name,
      email: student.email,
      courses: student.enrolledCourses.map((c) => c.name),
      ...progress,
    };
  });

  const filtered = studentsWithProgress
    .filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           s.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCourse = selectedCourse === "all" || s.courses.some((c) => c.toLowerCase().includes(selectedCourse.toLowerCase()));
      return matchesSearch && matchesCourse;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "score") return b.avgScore - a.avgScore;
      if (sortBy === "progress") return (b.completedMaterials / b.totalMaterials) - (a.completedMaterials / a.totalMaterials);
      if (sortBy === "activity") return a.lastActive.localeCompare(b.lastActive);
      return 0;
    });

  const totalStudents = studentsWithProgress.length;
  const onlineStudents = studentsWithProgress.filter((s) => s.status === "online").length;
  const avgScore = totalStudents > 0 
    ? Math.round(studentsWithProgress.reduce((a, s) => a + s.avgScore, 0) / totalStudents) 
    : 0;
  const atRisk = studentsWithProgress.filter((s) => s.passRate < 60).length;
  const pendingAssignments = studentsWithProgress.reduce((acc, s) => 
    acc + s.assignments.filter(a => a.status === "pending").length, 0);

  const courseStats = user?.teachingCourses?.map(course => {
    const courseStudents = studentsWithProgress.filter(s => s.courses.includes(course.name));
    return {
      ...course,
      studentCount: courseStudents.length,
      avgScore: courseStudents.length > 0 
        ? Math.round(courseStudents.reduce((a, s) => a + s.avgScore, 0) / courseStudents.length)
        : 0,
      completionRate: courseStudents.length > 0
        ? Math.round(courseStudents.reduce((a, s) => a + (s.completedMaterials / s.totalMaterials) * 100, 0) / courseStudents.length)
        : 0
    };
  }) || [];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg gradient-primary flex items-center justify-center shadow-lg">
            <GraduationCap className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Teacher Dashboard</h1>
            <p className="text-muted-foreground text-sm">
              Welcome back, {user?.name?.split(' ')[0]}. Here's your class overview.
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="rounded-md text-sm gap-2">
            <Download className="w-4 h-4" /> Export Report
          </Button>
          <Button className="rounded-md text-sm gap-2 gradient-primary text-primary-foreground">
            <MessageSquare className="w-4 h-4" /> Message All
          </Button>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="rounded-lg shadow-card border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-primary" />
              <Badge variant="secondary" className="text-[10px]">Total</Badge>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalStudents}</p>
            <p className="text-xs text-muted-foreground">Students Enrolled</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-card border-border/50 bg-gradient-to-br from-green-500/5 to-green-500/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <UserCheck className="w-5 h-5 text-green-600" />
              <Badge className="text-[10px] bg-green-500/20 text-green-700 border-0">{onlineStudents} online</Badge>
            </div>
            <p className="text-2xl font-bold text-foreground">{Math.round((onlineStudents / totalStudents) * 100) || 0}%</p>
            <p className="text-xs text-muted-foreground">Active Rate</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-card border-border/50 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-5 h-5 text-amber-600" />
              <Badge variant="secondary" className="text-[10px]">Average</Badge>
            </div>
            <p className="text-2xl font-bold text-foreground">{avgScore}%</p>
            <p className="text-xs text-muted-foreground">Class Score</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-card border-border/50 bg-gradient-to-br from-destructive/5 to-destructive/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <Badge variant="destructive" className="text-[10px]">Needs Help</Badge>
            </div>
            <p className="text-2xl font-bold text-foreground">{atRisk}</p>
            <p className="text-xs text-muted-foreground">At-Risk Students</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-card border-border/50 bg-gradient-to-br from-purple-500/5 to-purple-500/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-5 h-5 text-purple-600" />
              <Badge className="text-[10px] bg-purple-500/20 text-purple-700 border-0">To Grade</Badge>
            </div>
            <p className="text-2xl font-bold text-foreground">{pendingAssignments}</p>
            <p className="text-xs text-muted-foreground">Pending Reviews</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content Tabs */}
      <motion.div variants={item}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/50 rounded-md p-1">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-background">
              <PieChart className="w-4 h-4 mr-2" /> Overview
            </TabsTrigger>
            <TabsTrigger value="students" className="rounded-lg data-[state=active]:bg-background">
              <Users className="w-4 h-4 mr-2" /> Students
            </TabsTrigger>
            <TabsTrigger value="courses" className="rounded-lg data-[state=active]:bg-background">
              <BookOpen className="w-4 h-4 mr-2" /> Courses
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Recent Activity */}
              <Card className="rounded-lg shadow-card border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" /> Recent Student Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {studentsWithProgress.slice(0, 5).map((student) => (
                    <div key={student.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                            {student.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                            student.status === "online" ? "bg-green-500" : student.status === "away" ? "bg-amber-500" : "bg-gray-400"
                          }`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{student.lastActive}</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-lg"
                        onClick={() => setSelectedStudent(student)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* At-Risk Students */}
              <Card className="rounded-lg shadow-card border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" /> Students Needing Attention
                  </CardTitle>
                  <CardDescription className="text-xs">Students with pass rate below 70%</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {studentsWithProgress.filter(s => s.passRate < 70).length > 0 ? (
                    studentsWithProgress.filter(s => s.passRate < 70).map((student) => (
                      <div key={student.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center text-destructive font-semibold text-xs">
                            {student.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{student.name}</p>
                            <div className="flex gap-1 mt-1">
                              {student.weakAreas.slice(0, 2).map(area => (
                                <Badge key={area} variant="outline" className="text-[9px] text-destructive border-destructive/30">
                                  {area}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-destructive">{student.passRate}%</p>
                          <p className="text-[10px] text-muted-foreground">pass rate</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">All students are performing well!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Course Performance Summary */}
            <Card className="rounded-lg shadow-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" /> Course Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courseStats.map((course) => (
                    <div key={course.id} className="p-4 rounded-md bg-muted/30 border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-sm">{course.name}</p>
                          <p className="text-xs text-muted-foreground">{course.code}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">{course.studentCount} students</Badge>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Avg Score</span>
                            <span className="font-medium">{course.avgScore}%</span>
                          </div>
                          <ScoreBar value={course.avgScore} />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Completion</span>
                            <span className="font-medium">{course.completionRate}%</span>
                          </div>
                          <ScoreBar value={course.completionRate} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-4">
            {/* Search & Filter Bar */}
            <Card className="rounded-lg shadow-card border-border/50">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2 flex-1">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/60"
                    />
                  </div>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger className="w-44 rounded-md">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      {user?.teachingCourses?.map((course) => (
                        <SelectItem key={course.id} value={course.name}>{course.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-44 rounded-md">
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="score">Average Score</SelectItem>
                      <SelectItem value="progress">Progress</SelectItem>
                      <SelectItem value="activity">Last Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Students Table */}
            <Card className="rounded-lg shadow-card border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Student</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Progress</TableHead>
                    <TableHead className="font-semibold">Avg Score</TableHead>
                    <TableHead className="font-semibold">Quizzes</TableHead>
                    <TableHead className="font-semibold">Last Active</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="font-medium text-foreground">No students found</p>
                        <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((student) => (
                      <TableRow key={student.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedStudent(student)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                                {student.name.split(" ").map(n => n[0]).join("")}
                              </div>
                              <StatusIndicator status={student.status} />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{student.name}</p>
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={student.status === "online" ? "default" : "secondary"} className="text-xs capitalize">
                            {student.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="w-32">
                            <div className="flex justify-between text-xs mb-1">
                              <span>{student.completedMaterials}/{student.totalMaterials}</span>
                              <span>{Math.round((student.completedMaterials / student.totalMaterials) * 100)}%</span>
                            </div>
                            <Progress value={(student.completedMaterials / student.totalMaterials) * 100} className="h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${student.avgScore >= 80 ? "text-green-600" : student.avgScore >= 60 ? "text-amber-600" : "text-destructive"}`}>
                              {student.avgScore}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-sm">{student.quizzesPassed}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-sm">{student.quizAttempts}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{student.lastActive}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="rounded-lg" onClick={(e) => { e.stopPropagation(); setSelectedStudent(student); }}>
                            <Eye className="w-4 h-4 mr-1" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              {courseStats.map((course) => (
                <Card key={course.id} className="rounded-lg shadow-card border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-md gradient-primary flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{course.name}</CardTitle>
                          <CardDescription>{course.code}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary">{course.studentCount} students</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 rounded-md bg-muted/30">
                        <p className="text-2xl font-bold text-primary">{course.avgScore}%</p>
                        <p className="text-xs text-muted-foreground">Avg Score</p>
                      </div>
                      <div className="p-3 rounded-md bg-muted/30">
                        <p className="text-2xl font-bold text-foreground">{course.completionRate}%</p>
                        <p className="text-xs text-muted-foreground">Completion</p>
                      </div>
                      <div className="p-3 rounded-md bg-muted/30">
                        <p className="text-2xl font-bold text-foreground">{course.studentCount}</p>
                        <p className="text-xs text-muted-foreground">Enrolled</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Top Performers</p>
                      <div className="space-y-2">
                        {studentsWithProgress
                          .filter(s => s.courses.includes(course.name))
                          .sort((a, b) => b.avgScore - a.avgScore)
                          .slice(0, 3)
                          .map((student, idx) => (
                            <div key={student.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                                  idx === 0 ? "bg-yellow-500 text-white" : idx === 1 ? "bg-gray-400 text-white" : "bg-amber-700 text-white"
                                }`}>{idx + 1}</span>
                                <span className="text-sm">{student.name}</span>
                              </div>
                              <span className="text-sm font-semibold text-primary">{student.avgScore}%</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Student Detail Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedStudent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                      {selectedStudent.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${
                      selectedStudent.status === "online" ? "bg-green-500" : selectedStudent.status === "away" ? "bg-amber-500" : "bg-gray-400"
                    }`} />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedStudent.name}</DialogTitle>
                    <DialogDescription className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {selectedStudent.email}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selectedStudent.phone}</span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-3 my-4">
                <div className="p-3 rounded-md bg-primary/10 text-center">
                  <p className="text-2xl font-bold text-primary">{selectedStudent.avgScore}%</p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                </div>
                <div className="p-3 rounded-md bg-muted text-center">
                  <p className="text-2xl font-bold">{selectedStudent.passRate}%</p>
                  <p className="text-xs text-muted-foreground">Pass Rate</p>
                </div>
                <div className="p-3 rounded-md bg-muted text-center">
                  <p className="text-2xl font-bold">{selectedStudent.totalTimeSpent}</p>
                  <p className="text-xs text-muted-foreground">Total Time</p>
                </div>
              </div>

              <Separator />

              <div className="grid lg:grid-cols-2 gap-4 mt-4">
                {/* Courses */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Enrolled Courses
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStudent.courses.map(course => (
                      <Badge key={course} variant="secondary">{course}</Badge>
                    ))}
                  </div>
                </div>

                {/* Materials Progress */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Materials Progress
                  </h4>
                  <div className="flex items-center gap-3">
                    <Progress value={(selectedStudent.completedMaterials / selectedStudent.totalMaterials) * 100} className="flex-1 h-2" />
                    <span className="text-sm font-medium">{selectedStudent.completedMaterials}/{selectedStudent.totalMaterials}</span>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-4 mt-4">
                {/* Strong Areas */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-4 h-4" /> Strong Areas
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStudent.strongAreas.length > 0 ? selectedStudent.strongAreas.map(area => (
                      <Badge key={area} className="bg-green-500/10 text-green-700 border-green-500/30">{area}</Badge>
                    )) : <span className="text-sm text-muted-foreground">No data yet</span>}
                  </div>
                </div>

                {/* Weak Areas */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-destructive">
                    <XCircle className="w-4 h-4" /> Areas to Improve
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStudent.weakAreas.length > 0 ? selectedStudent.weakAreas.map(area => (
                      <Badge key={area} variant="destructive" className="bg-destructive/10 text-destructive border-destructive/30">{area}</Badge>
                    )) : <span className="text-sm text-muted-foreground">No weak areas identified</span>}
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Recent Quiz History */}
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Recent Quiz Results
                </h4>
                <div className="space-y-2">
                  {selectedStudent.quizHistory.map((quiz, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                      <div className="flex items-center gap-3">
                        {quiz.passed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{quiz.name}</p>
                          <p className="text-xs text-muted-foreground">{quiz.date}</p>
                        </div>
                      </div>
                      <span className={`font-bold ${quiz.passed ? "text-green-600" : "text-destructive"}`}>
                        {quiz.score}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assignments */}
              <div className="mt-4">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Assignments
                </h4>
                <div className="space-y-2">
                  {selectedStudent.assignments.map((assignment, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          assignment.status === "graded" ? "bg-green-500/10" : "bg-amber-500/10"
                        }`}>
                          {assignment.status === "graded" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{assignment.name}</p>
                          <p className="text-xs text-muted-foreground">Submitted: {assignment.submitted}</p>
                        </div>
                      </div>
                      {assignment.status === "graded" ? (
                        <span className="font-bold text-foreground">{assignment.score}/{assignment.maxScore}</span>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-500/30">Pending Review</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedStudent.notes && (
                <div className="mt-4 p-4 rounded-md bg-primary/5 border border-primary/20">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Teacher Notes
                  </h4>
                  <p className="text-sm text-muted-foreground">{selectedStudent.notes}</p>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button className="flex-1 rounded-md gap-2">
                  <MessageSquare className="w-4 h-4" /> Send Message
                </Button>
                <Button variant="outline" className="flex-1 rounded-md gap-2">
                  <Download className="w-4 h-4" /> Export Report
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
