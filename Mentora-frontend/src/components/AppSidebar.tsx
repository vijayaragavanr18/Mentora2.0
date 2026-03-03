import { 
  Home, Users, Brain, CalendarDays, Bot, FolderOpen, Trophy, User, 
  BookOpen, Flame, LogOut, Settings, Sparkles, FlaskConical, BarChart3, Target, Puzzle, RefreshCw
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
  SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ("teacher" | "student")[];
}

const mainItems: NavItem[] = [
  { title: "Home", url: "/", icon: Home },
  { title: "Study Rooms", url: "/rooms", icon: Users },
  { title: "Quizzes", url: "/quizzes", icon: Brain, roles: ["student"] },
  { title: "Puzzles", url: "/puzzles", icon: Puzzle, roles: ["student"] },
  { title: "Planner", url: "/planner", icon: CalendarDays },
  { title: "AI Assistant", url: "/assistant", icon: Bot },
  { title: "Materials", url: "/materials", icon: FolderOpen },
  { title: "Leaderboard", url: "/leaderboard", icon: Trophy, roles: ["student"] },
  { title: "Animations", url: "/animations", icon: Sparkles },
  { title: "Experiments", url: "/experiments", icon: FlaskConical },
  { title: "Teacher Hub", url: "/teacher", icon: BarChart3, roles: ["teacher"] },
  { title: "Level Quiz", url: "/levels", icon: Target, roles: ["student"] },
];

const bottomItems: NavItem[] = [
  { title: "Profile", url: "/profile", icon: User },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isTeacher, isStudent, selectedClass, selectClass, selectedTeacherClass } = useAuth();

  // Filter menu items based on user role
  const filteredMainItems = mainItems.filter((item) => {
    if (!item.roles) return true; // No role restriction
    if (!user) return false; // Not logged in
    return item.roles.includes(user.role);
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSwitchClass = () => {
    selectClass(null);
    navigate("/class-select");
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md gradient-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-base font-bold text-sidebar-primary">Mentora</h1>
              <p className="text-[10px] text-sidebar-foreground/60 tracking-wider uppercase">
                {user ? (isTeacher ? "Teacher Portal" : "Student Portal") : "Learning Platform"}
              </p>
            </div>
          )}
        </div>
        
        {/* Selected Class Indicator for Teachers */}
        {isTeacher && selectedClass && !collapsed && (
          <div className="mt-3 p-2.5 rounded-md bg-sidebar-accent/50 border border-sidebar-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                  {selectedClass === "all" ? "A" : selectedTeacherClass?.name?.charAt(0) || "?"}
                </div>
                <div>
                  <p className="text-xs font-semibold text-sidebar-foreground">
                    {selectedClass === "all" ? "All Classes" : selectedTeacherClass?.name || "Class"}
                  </p>
                  <p className="text-[9px] text-sidebar-foreground/60">
                    {selectedClass === "all" ? `${user?.teachingClasses?.length || 0} classes` : `${selectedTeacherClass?.grade} • ${selectedTeacherClass?.section}`}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 rounded-md hover:bg-sidebar-accent"
                onClick={handleSwitchClass}
                title="Switch Class"
              >
                <RefreshCw className="w-3.5 h-3.5 text-sidebar-foreground/60" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Collapsed view for selected class */}
        {isTeacher && selectedClass && collapsed && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="mt-2 w-9 h-9 rounded-md bg-sidebar-accent/50"
            onClick={handleSwitchClass}
            title={selectedClass === "all" ? "All Classes - Click to switch" : `${selectedTeacherClass?.name} - Click to switch`}
          >
            <RefreshCw className="w-4 h-4 text-sidebar-foreground/60" />
          </Button>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="w-[18px] h-[18px] shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 pb-4">
        <SidebarMenu>
          {bottomItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <NavLink
                  to={item.url}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                >
                  <item.icon className="w-[18px] h-[18px] shrink-0" />
                  {!collapsed && <span className="text-sm">{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          
          {/* Logout Button */}
          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Logout">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 w-full"
                >
                  <LogOut className="w-[18px] h-[18px] shrink-0" />
                  {!collapsed && <span className="text-sm">Logout</span>}
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {!collapsed && user && !isTeacher && (
            <div className="mt-3 mx-3 p-3 rounded-md bg-sidebar-accent/50 border border-sidebar-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                  {user.name.charAt(0)}
                </div>
                <span className="text-xs font-semibold text-sidebar-foreground truncate">{user.name}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-accent" />
                <span className="text-xs font-semibold text-sidebar-foreground">7 Day Streak!</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-sidebar-border">
                <div className="w-3/4 h-full rounded-full bg-accent" />
              </div>
              <p className="text-[10px] text-sidebar-foreground/50 mt-1.5">1,240 / 2,000 XP</p>
            </div>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
