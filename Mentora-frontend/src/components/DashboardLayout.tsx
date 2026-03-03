import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, Search, ChevronDown, GraduationCap, Check, BookOpen, Brain, Users, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Mock notifications
const notifications = [
  { id: 1, title: "New quiz available", description: "Physics: Thermodynamics Quiz", time: "5 min ago", unread: true },
  { id: 2, title: "Assignment graded", description: "Your Chemistry Lab Report scored 92%", time: "1 hour ago", unread: true },
  { id: 3, title: "Room invite", description: "Dr. Smith invited you to Physics Study Room", time: "2 hours ago", unread: false },
  { id: 4, title: "Reminder", description: "Math homework due tomorrow", time: "3 hours ago", unread: false },
];

// Search suggestions
const searchSuggestions = [
  { type: "course", name: "Physics 101", icon: BookOpen, path: "/materials" },
  { type: "quiz", name: "Thermodynamics Quiz", icon: Brain, path: "/quizzes" },
  { type: "room", name: "Physics Study Room", icon: Users, path: "/rooms" },
  { type: "material", name: "Calculus Notes", icon: FileText, path: "/materials" },
  { type: "event", name: "Lab Session", icon: Calendar, path: "/planner" },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isTeacher, selectedClass, selectClass, selectedTeacherClass, teacherClasses } = useAuth();
  const navigate = useNavigate();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Filter suggestions based on query
  const filteredSuggestions = searchQuery.length > 0 
    ? searchSuggestions.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : searchSuggestions;
  
  const handleSearchSelect = (suggestion: typeof searchSuggestions[0]) => {
    setSearchQuery("");
    setIsSearchFocused(false);
    navigate(suggestion.path);
  };

  const handleSwitchClass = (classId: string) => {
    selectClass(classId);
    if (classId === "all") {
      navigate("/");
    } else {
      navigate(`/teacher/class/${classId}/dashboard`);
    }
  };

  const handleBackToClassSelect = () => {
    selectClass(null);
    navigate("/class-select");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between border-b border-border px-4 lg:px-6 bg-card/80 backdrop-blur-sm sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              
              {/* Class Switcher for Teachers */}
              {isTeacher && selectedClass && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="rounded-md gap-2 h-9 px-3">
                      <div className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                        {selectedClass === "all" ? "A" : selectedTeacherClass?.name?.charAt(0) || "?"}
                      </div>
                      <span className="font-medium text-sm max-w-[120px] truncate">
                        {selectedClass === "all" ? "All Classes" : selectedTeacherClass?.name || "Class"}
                      </span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 rounded-md">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Class</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleSwitchClass("all")}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                          <GraduationCap className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">All Classes</p>
                          <p className="text-xs text-muted-foreground">{teacherClasses.length} classes</p>
                        </div>
                      </div>
                      {selectedClass === "all" && <Check className="w-4 h-4 text-primary" />}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {teacherClasses.map((tc) => (
                      <DropdownMenuItem 
                        key={tc.id}
                        onClick={() => handleSwitchClass(tc.id)}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                            {tc.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{tc.name}</p>
                            <p className="text-xs text-muted-foreground">{tc.grade} • {tc.section}</p>
                          </div>
                        </div>
                        {selectedClass === tc.id && <Check className="w-4 h-4 text-primary" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleBackToClassSelect}
                      className="text-muted-foreground cursor-pointer"
                    >
                      Back to Class Selection
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Popover open={isSearchFocused && filteredSuggestions.length > 0}>
                <PopoverTrigger asChild>
                  <div className="hidden md:flex items-center gap-2 bg-muted rounded-md px-3 py-1.5 w-72">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <input
                      placeholder="Search courses, rooms, quizzes..."
                      className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/60"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2 rounded-md" align="start">
                  <div className="space-y-1">
                    {filteredSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.name}
                        onClick={() => handleSearchSelect(suggestion)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <suggestion.icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{suggestion.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{suggestion.type}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative rounded-md text-muted-foreground hover:text-foreground">
                    <Bell className="w-[18px] h-[18px]" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 rounded-md" align="end">
                  <div className="p-3 border-b">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">Notifications</h3>
                      <Badge variant="secondary" className="text-[10px]">{notifications.filter(n => n.unread).length} new</Badge>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${notification.unread ? 'bg-primary/5' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${notification.unread ? 'bg-primary' : 'bg-transparent'}`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="text-xs text-muted-foreground">{notification.description}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t">
                    <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={() => navigate('/settings')}>
                      View all notifications
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <div className="w-9 h-9 rounded-md gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                {user?.name?.charAt(0) || "U"}
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
