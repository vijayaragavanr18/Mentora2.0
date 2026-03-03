import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  authLogin,
  authRegister,
  authMe,
  setToken,
  getToken,
  clearToken,
} from "@/lib/api";

export type UserRole = "teacher" | "student";

export interface Course {
  id: string;
  name: string;
  code: string;
  subject: string;
}

export interface TeacherClass {
  id: string;
  name: string;
  grade: string;
  section: string;
  subject: string;
  studentCount: number;
  studentIds: string[];
  schedule?: string;
  room?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  enrolledCourses: Course[];
  teachingCourses?: Course[];
  teachingClasses?: TeacherClass[];
  assignedTeacherId?: string;
  assignedClassId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  signup: (name: string, email: string, password: string, role: UserRole, selectedCourses: string[]) => Promise<void>;
  logout: () => void;
  isTeacher: boolean;
  isStudent: boolean;
  selectedClass: string | null;
  selectClass: (classId: string | null) => void;
  selectedCourse: Course | null;
  selectedTeacherClass: TeacherClass | null;
  teacherClasses: TeacherClass[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const availableCourses: Course[] = [
  { id: "phy101", name: "Physics 101", code: "PHY-2024", subject: "Physics" },
  { id: "mth401", name: "Math Advanced", code: "MTH-401", subject: "Mathematics" },
  { id: "bio201", name: "Biology Lab", code: "BIO-LAB", subject: "Biology" },
  { id: "chm301", name: "Chemistry Org", code: "CHM-301", subject: "Chemistry" },
  { id: "his202", name: "History Group", code: "HIS-202", subject: "History" },
  { id: "cs101", name: "CS Study", code: "CS-DSA", subject: "Computer Science" },
  { id: "com101", name: "Commerce Basics", code: "COM-101", subject: "Commerce" },
  { id: "eco201", name: "Economics", code: "ECO-201", subject: "Economics" },
];

export const mockTeacherClasses: TeacherClass[] = [
  {
    id: "class-phy-10a",
    name: "Physics",
    grade: "10th Grade",
    section: "Section A",
    subject: "Physics",
    studentCount: 32,
    studentIds: [],
    schedule: "Mon, Wed, Fri - 9:00 AM",
    room: "Room 101",
  },
];

function backendToUser(au: { id: string; name: string; email: string }, role: UserRole, selectedCourseIds: string[] = []): User {
  const enrolledCourses = availableCourses.filter((c) => selectedCourseIds.includes(c.id));
  return {
    id: au.id,
    name: au.name,
    email: au.email,
    role,
    enrolledCourses: enrolledCourses.length ? enrolledCourses : [availableCourses[0]],
    ...(role === "teacher" ? { teachingCourses: [], teachingClasses: mockTeacherClasses } : {}),
  };
}

function makeMockUser(name: string, email: string, role: UserRole, selectedCourseIds: string[] = []): User {
  const enrolledCourses = availableCourses.filter((c) => selectedCourseIds.includes(c.id));
  return {
    id: `mock-${Date.now()}`,
    name,
    email,
    role,
    enrolledCourses: enrolledCourses.length ? enrolledCourses : [availableCourses[0]],
    ...(role === "teacher" ? { teachingCourses: [], teachingClasses: mockTeacherClasses } : {}),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      authMe()
        .then((au) => {
          const role = (localStorage.getItem("mentora_role") as UserRole) || "student";
          const courses = JSON.parse(localStorage.getItem("mentora_courses") || "[]") as string[];
          const u = backendToUser(au, role, courses);
          setUser(u);
          localStorage.setItem("mentora_mock_user", JSON.stringify(u));
        })
        .catch(() => {
          clearToken();
          const saved = localStorage.getItem("mentora_mock_user");
          if (saved) { try { setUser(JSON.parse(saved)); } catch {} }
        })
        .finally(() => {
          setIsLoading(false);
          const savedClass = localStorage.getItem("mentora_class");
          if (savedClass) setSelectedClass(savedClass);
        });
    } else {
      const saved = localStorage.getItem("mentora_mock_user");
      if (saved) {
        try {
          setUser(JSON.parse(saved));
          const savedClass = localStorage.getItem("mentora_class");
          if (savedClass) setSelectedClass(savedClass);
        } catch { /* ignore */ }
      }
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, role: UserRole): Promise<void> => {
    try {
      const data = await authLogin(email, password);
      setToken(data.access_token);
      localStorage.setItem("mentora_role", role);
      const courses = JSON.parse(localStorage.getItem("mentora_courses") || "[]") as string[];
      const u = backendToUser(data.user, role, courses);
      localStorage.setItem("mentora_mock_user", JSON.stringify(u));
      setUser(u);
    } catch {
      // Backend unavailable — use mock
      const name = email.split("@")[0] || "User";
      const u = makeMockUser(name, email, role);
      localStorage.setItem("mentora_mock_user", JSON.stringify(u));
      setUser(u);
    }
  };

  const signup = async (name: string, email: string, password: string, role: UserRole, selectedCourses: string[]): Promise<void> => {
    try {
      const data = await authRegister(name || email.split("@")[0] || "User", email, password);
      setToken(data.access_token);
      localStorage.setItem("mentora_role", role);
      localStorage.setItem("mentora_courses", JSON.stringify(selectedCourses));
      const u = backendToUser(data.user, role, selectedCourses);
      localStorage.setItem("mentora_mock_user", JSON.stringify(u));
      setUser(u);
    } catch {
      // Backend unavailable — use mock
      const u = makeMockUser(name || email.split("@")[0] || "User", email, role, selectedCourses);
      localStorage.setItem("mentora_mock_user", JSON.stringify(u));
      setUser(u);
    }
  };

  const logout = () => {
    clearToken();
    localStorage.removeItem("mentora_mock_user");
    localStorage.removeItem("mentora_role");
    localStorage.removeItem("mentora_courses");
    localStorage.removeItem("mentora_class");
    setUser(null);
    setSelectedClass(null);
  };

  const selectClass = (classId: string | null) => {
    setSelectedClass(classId);
    if (classId) localStorage.setItem("mentora_class", classId);
    else localStorage.removeItem("mentora_class");
  };

  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  const selectedCourse = user?.enrolledCourses?.[0] ?? null;
  const selectedTeacherClass =
    isTeacher && selectedClass
      ? (user?.teachingClasses?.find((c) => c.id === selectedClass) ??
          mockTeacherClasses.find((c) => c.id === selectedClass) ?? null)
      : null;
  const teacherClasses = user?.teachingClasses ?? [];

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, isTeacher, isStudent, selectedClass, selectClass, selectedCourse, selectedTeacherClass, teacherClasses }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function useTeacherStudents() {
  return [];
}

export function getTeacherForCourse(_courseId: string): User | undefined {
  return undefined;
}

export function getStudentsInCourse(_courseId: string): User[] {
  return [];
}
