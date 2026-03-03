import { motion } from "framer-motion";
import { GraduationCap, Users, BookOpen, ArrowRight, MapPin, Calendar, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function ClassSelect() {
  const { user, selectClass, teacherClasses } = useAuth();
  const navigate = useNavigate();

  const handleSelectClass = (classId: string) => {
    selectClass(classId);
    navigate(`/teacher/class/${classId}/dashboard`);
  };

  const handleViewAll = () => {
    selectClass("all");
    navigate("/");
  };

  const totalStudents = teacherClasses.reduce((sum, c) => sum + c.studentCount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-5xl"
      >
        {/* Header */}
        <motion.div variants={item} className="text-center mb-8">
          <div className="w-16 h-16 rounded-lg gradient-primary flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Select a class to manage your students and materials.
          </p>
        </motion.div>

        {/* Classes Grid */}
        <motion.div variants={item} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {teacherClasses.map((teacherClass) => (
            <Card
              key={teacherClass.id}
              className="rounded-lg shadow-card border-border/50 hover:shadow-card-hover hover:border-primary/30 group overflow-hidden"
            >
              <CardContent className="p-0">
                {/* Card Header with Subject Color */}
                <div className="p-4 gradient-primary">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-primary-foreground">
                        {teacherClass.name}
                      </h3>
                      <p className="text-primary-foreground/80 text-sm">
                        {teacherClass.grade} • {teacherClass.section}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-md bg-white/20 flex items-center justify-center text-primary-foreground font-bold">
                      {teacherClass.name.charAt(0)}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  {/* Subject Badge */}
                  <Badge variant="secondary" className="mb-3">
                    {teacherClass.subject}
                  </Badge>

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-primary" />
                      <span className="font-semibold">{teacherClass.studentCount}</span>
                      <span className="text-muted-foreground">students</span>
                    </div>
                  </div>

                  {/* Schedule & Room */}
                  <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                    {teacherClass.schedule && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{teacherClass.schedule}</span>
                      </div>
                    )}
                    {teacherClass.room && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{teacherClass.room}</span>
                      </div>
                    )}
                  </div>

                  {/* Enter Button */}
                  <Button 
                    className="w-full rounded-md group-hover:bg-primary"
                    variant="outline"
                    onClick={() => handleSelectClass(teacherClass.id)}
                  >
                    Enter Class
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* View All Option */}
        <motion.div variants={item}>
          <Card
            className="rounded-lg shadow-card border-border/50 border-dashed hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
            onClick={handleViewAll}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg text-foreground">View All Classes</h3>
                  <p className="text-sm text-muted-foreground">
                    See combined dashboard for all {teacherClasses.length} classes
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats Footer */}
        <motion.div variants={item} className="mt-8 text-center">
          <div className="inline-flex items-center gap-6 px-6 py-3 rounded-md bg-muted/50">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                <strong className="text-foreground">{totalStudents}</strong> total students
              </span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                <strong className="text-foreground">{teacherClasses.length}</strong> classes
              </span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">
                <strong className="text-foreground">{teacherClasses.length}</strong> active
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
