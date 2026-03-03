import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, BookOpen, Trophy, Flame, Zap, Award, Edit, Camera, GraduationCap, Users, FileText, Clock, Star, Calendar, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useTeacherStudents } from "@/contexts/AuthContext";
import { getGamificationProfile, getLeaderboard, type GamificationProfile, type LeaderboardEntry } from "@/lib/api";

// Student badges
const studentBadges = [
  { name: "Quick Learner", icon: "⚡", earned: true },
  { name: "Quiz Master", icon: "🧠", earned: true },
  { name: "Study Streak", icon: "🔥", earned: true },
  { name: "Team Player", icon: "🤝", earned: true },
  { name: "Scholar", icon: "📚", earned: false },
  { name: "Mentor", icon: "🎓", earned: false },
];

// Teacher achievements
const teacherAchievements = [
  { name: "Inspiring Educator", icon: "🌟", earned: true, description: "Rated 4.8+ by students" },
  { name: "Course Master", icon: "📚", earned: true, description: "Created 10+ courses" },
  { name: "Top Mentor", icon: "🏆", earned: true, description: "Helped 100+ students" },
  { name: "Quick Responder", icon: "⚡", earned: true, description: "Avg response < 1 hour" },
  { name: "Innovation Award", icon: "💡", earned: false, description: "Use AI tools effectively" },
  { name: "Community Leader", icon: "👥", earned: false, description: "Lead 5+ study rooms" },
];

const studentStats = [
  { label: "Quizzes Taken", value: "34" },
  { label: "Study Hours", value: "128h" },
  { label: "Rooms Joined", value: "8" },
  { label: "Materials Read", value: "67" },
];

export default function Profile() {
  const { user, isTeacher } = useAuth();
  const assignedStudents = useTeacherStudents();
  const { toast } = useToast();
  
  const [gamification, setGamification] = useState<GamificationProfile | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  
  useEffect(() => {
    getGamificationProfile().then(setGamification).catch(() => {});
    getLeaderboard(50).then((entries: LeaderboardEntry[]) => {
      if (!user) return;
      const idx = entries.findIndex((e) => e.user_id === user.id);
      if (idx !== -1) setUserRank(idx + 1);
    }).catch(() => {});
  }, [user]);
  
  const xp = gamification?.xp ?? 0;
  const level = gamification?.level ?? 1;
  const levelTitle = gamification?.level_title ?? "Beginner";
  const nextLevelXp = gamification?.next_level_xp ?? 200;
  const streak = gamification?.current_streak ?? 0;
  const xpProgress = nextLevelXp > 0 ? Math.min(100, Math.round((xp / nextLevelXp) * 100)) : 0;
  const backendBadges = gamification?.badges ?? [];
  
  // Merge backend badges with display badges
  const displayBadges = studentBadges.map((b) => ({
    ...b,
    earned: b.earned || backendBadges.includes(b.name),
  }));
  
  // State for edit profile dialog
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  
  const firstName = user?.name?.split(' ')[0] || 'User';
  const initials = user?.name?.split(' ').map(n => n[0]).join('') || 'U';

  // Handle photo upload
  const handlePhotoUpload = () => {
    toast({
      title: "Photo updated!",
      description: "Your profile photo has been updated successfully.",
    });
  };

  // Handle save profile
  const handleSaveProfile = () => {
    toast({
      title: "Profile saved!",
      description: "Your profile changes have been saved.",
    });
    setIsEditOpen(false);
  };

  if (isTeacher) {
    const totalStudents = assignedStudents.length;
    const coursesCount = user?.teachingCourses?.length || 0;
    
    const teacherStats = [
      { label: "Total Students", value: String(totalStudents), icon: Users },
      { label: "Courses Teaching", value: String(coursesCount), icon: BookOpen },
      { label: "Materials Uploaded", value: "24", icon: FileText },
      { label: "Years Teaching", value: "5+", icon: Calendar },
    ];

    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto">
        {/* Profile Header */}
        <Card className="rounded-lg shadow-card border-border/50 overflow-hidden">
          <div className="h-28 gradient-primary relative">
            <Badge className="absolute top-3 left-3 bg-white/20 text-white border-0">
              <GraduationCap className="w-3 h-3 mr-1" /> Educator
            </Badge>
            <Button onClick={() => setIsEditOpen(true)} variant="ghost" size="icon" className="absolute top-3 right-3 text-primary-foreground/70 hover:text-primary-foreground rounded-lg">
              <Edit className="w-4 h-4" />
            </Button>
          </div>
          <CardContent className="px-6 pb-6 -mt-12">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-lg gradient-primary border-4 border-card flex items-center justify-center text-primary-foreground text-3xl font-bold">
                  {initials}
                </div>
                <button onClick={handlePhotoUpload} className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
                  <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{user?.name || 'Teacher'}</h2>
                  <Badge variant="secondary" className="text-xs">Verified</Badge>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> {user?.email || 'teacher@mentora.com'}
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> Senior Educator • Science Department
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-primary">{totalStudents}</p>
                  <p className="text-xs text-muted-foreground">Students</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-accent">{coursesCount}</p>
                  <p className="text-xs text-muted-foreground">Courses</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">4.8</p>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teaching Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {teacherStats.map((s, i) => (
            <Card key={i} className="rounded-lg shadow-card border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Courses Teaching */}
        <Card className="rounded-lg shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Courses Teaching
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {user?.teachingCourses?.map((course, i) => {
                const courseStudents = assignedStudents.filter(s => 
                  s.enrolledCourses.some(c => c.id === course.id)
                ).length;
                return (
                  <div key={i} className="flex items-center justify-between p-4 rounded-md bg-muted/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                        {course.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{course.name}</p>
                        <p className="text-xs text-muted-foreground">{course.code}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{courseStudents} students</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="rounded-lg shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" /> Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {teacherAchievements.map((achievement, i) => (
                <div key={i} className={`p-4 rounded-md ${achievement.earned ? 'bg-primary-light' : 'bg-muted/50 opacity-40'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{achievement.icon}</span>
                    <p className="text-sm font-medium text-foreground">{achievement.name}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{achievement.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="rounded-lg shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" /> Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-md bg-green-500/10 text-center">
                <p className="text-2xl font-bold text-green-600">92%</p>
                <p className="text-xs text-muted-foreground">Student Satisfaction</p>
              </div>
              <div className="p-4 rounded-md bg-primary/10 text-center">
                <p className="text-2xl font-bold text-primary">156</p>
                <p className="text-xs text-muted-foreground">Questions Answered</p>
              </div>
              <div className="p-4 rounded-md bg-amber-500/10 text-center">
                <p className="text-2xl font-bold text-amber-600">24h</p>
                <p className="text-xs text-muted-foreground">Avg. Response Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input 
                  id="edit-name" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input 
                  id="edit-email" 
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveProfile} className="gradient-primary text-primary-foreground">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    );
  }

  // Student view (original)
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto">
      {/* Profile Header */}
      <Card className="rounded-lg shadow-card border-border/50 overflow-hidden">
        <div className="h-28 gradient-primary relative">
          <Button onClick={() => setIsEditOpen(true)} variant="ghost" size="icon" className="absolute top-3 right-3 text-primary-foreground/70 hover:text-primary-foreground rounded-lg">
            <Edit className="w-4 h-4" />
          </Button>
        </div>
        <CardContent className="px-6 pb-6 -mt-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-lg gradient-primary border-4 border-card flex items-center justify-center text-primary-foreground text-3xl font-bold">
                {initials}
              </div>
              <button onClick={handlePhotoUpload} className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
                <Camera className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{user?.name || 'Student Name'}</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> {user?.email || 'student@mentora.com'}
              </p>
            </div>
              <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{xp.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">XP</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-accent">{streak}</p>
                <p className="text-xs text-muted-foreground">Streak</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{userRank ? `#${userRank}` : `Lv.${level}`}</p>
                <p className="text-xs text-muted-foreground">{userRank ? 'Rank' : 'Level'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* XP Progress */}
      <Card className="rounded-lg shadow-card border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Level Progress</span>
            </div>
            <span className="text-xs text-muted-foreground">{levelTitle} → Next Level</span>
          </div>
          <Progress value={xpProgress} className="h-3 rounded-full" />
          <p className="text-xs text-muted-foreground mt-2">{xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP to next level</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {studentStats.map((s, i) => (
          <Card key={i} className="rounded-lg shadow-card border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Badges */}
      <Card className="rounded-lg shadow-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" /> Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {displayBadges.map((badge, i) => (
              <div key={i} className={`text-center p-3 rounded-md ${badge.earned ? 'bg-primary-light' : 'bg-muted/50 opacity-40'}`}>
                <span className="text-2xl">{badge.icon}</span>
                <p className="text-[10px] font-medium text-foreground mt-1">{badge.name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input 
                id="edit-name" 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input 
                id="edit-email" 
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProfile} className="gradient-primary text-primary-foreground">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
