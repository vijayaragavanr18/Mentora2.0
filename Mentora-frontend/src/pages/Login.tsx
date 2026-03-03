import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Users, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, UserRole, availableCourses } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";

type AuthMode = "login" | "signup";

export default function Login() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [role, setRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"role" | "credentials" | "courses">("role");

  const { login, signup, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setStep("credentials");
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || (mode === "signup" && !name)) {
      setError("Please fill in all fields");
      return;
    }

    if (mode === "signup") {
      setStep("courses");
    } else {
      try {
        await login(email, password, role!);
        navigate("/");
      } catch (err) {
        setError("Invalid credentials");
      }
    }
  };

  const handleSignupComplete = async () => {
    if (selectedCourses.length === 0) {
      setError("Please select at least one course");
      return;
    }

    try {
      await signup(name, email, password, role!, selectedCourses);
      navigate("/");
    } catch (err) {
      setError("Failed to create account");
    }
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourses((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-md"
      >
        {/* Logo */}
        <motion.div variants={item} className="text-center mb-8">
          <div className="w-16 h-16 rounded-lg gradient-primary flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Mentora</h1>
          <p className="text-muted-foreground text-sm">Your Learning Journey Starts Here</p>
        </motion.div>

        {/* Role Selection */}
        {step === "role" && (
          <motion.div variants={item} className="space-y-4">
            <Card className="rounded-lg shadow-card border-border/50">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">
                  {mode === "login" ? "Welcome Back!" : "Create Account"}
                </CardTitle>
                <CardDescription>
                  {mode === "login"
                    ? "Sign in to continue learning"
                    : "Join Mentora today"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground text-center mb-4">
                  I am a...
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-24 flex-col gap-2 rounded-md hover:border-primary hover:bg-primary/5"
                    onClick={() => handleRoleSelect("student")}
                  >
                    <GraduationCap className="w-8 h-8 text-primary" />
                    <span className="font-semibold">Student</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex-col gap-2 rounded-md hover:border-primary hover:bg-primary/5"
                    onClick={() => handleRoleSelect("teacher")}
                  >
                    <Users className="w-8 h-8 text-primary" />
                    <span className="font-semibold">Teacher</span>
                  </Button>
                </div>
                <div className="text-center pt-4">
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  >
                    {mode === "login"
                      ? "Don't have an account? Sign up"
                      : "Already have an account? Sign in"}
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Credentials Form */}
        {step === "credentials" && (
          <motion.div variants={item}>
            <Card className="rounded-lg shadow-card border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => {
                      setStep("role");
                      setRole(null);
                    }}
                  >
                    ← Back
                  </Button>
                </div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {role === "student" ? (
                    <GraduationCap className="w-5 h-5 text-primary" />
                  ) : (
                    <Users className="w-5 h-5 text-primary" />
                  )}
                  {mode === "login" ? "Sign In" : "Sign Up"} as{" "}
                  {role === "student" ? "Student" : "Teacher"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  {mode === "signup" && (
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="rounded-md"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="rounded-md"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="rounded-md pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive text-center">{error}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full gradient-primary text-primary-foreground rounded-md"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      "Please wait..."
                    ) : mode === "login" ? (
                      "Sign In"
                    ) : (
                      <>
                        Continue <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Course Selection (Signup only) */}
        {step === "courses" && (
          <motion.div variants={item}>
            <Card className="rounded-lg shadow-card border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setStep("credentials")}
                  >
                    ← Back
                  </Button>
                </div>
                <CardTitle className="text-lg">
                  {role === "student" ? "Select Your Courses" : "Courses You Teach"}
                </CardTitle>
                <CardDescription>
                  {role === "student"
                    ? "Choose the courses you're enrolled in"
                    : "Select the courses you'll be teaching"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                  {availableCourses.map((course) => (
                    <div
                      key={course.id}
                      className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer ${
                        selectedCourses.includes(course.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => toggleCourse(course.id)}
                    >
                      <Checkbox
                        checked={selectedCourses.includes(course.id)}
                        onCheckedChange={() => toggleCourse(course.id)}
                      />
                      <div>
                        <p className="text-sm font-medium">{course.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {course.subject} • {course.code}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}

                <Button
                  onClick={handleSignupComplete}
                  className="w-full gradient-primary text-primary-foreground rounded-md"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating Account..." : "Complete Sign Up"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
