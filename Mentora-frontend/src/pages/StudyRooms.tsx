import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Search, Video, MessageSquare, FileText, Lock, GraduationCap, UserCircle, Send, X, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth, availableCourses, getStudentsInCourse, getTeacherForCourse } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getToken } from "@/lib/api";

interface StudyRoom {
  id: string;
  name: string;
  topic: string;
  members: number;
  active: boolean;
  code: string;
  courseId: string;
  teacherName?: string;
  subject: string;
}

// Generate study rooms from available courses
const allRooms: StudyRoom[] = availableCourses.map((course) => {
  const teacher = getTeacherForCourse(course.id);
  return {
    id: course.id,
    name: course.name,
    topic: `${course.subject} Discussion`,
    members: Math.floor(Math.random() * 15) + 5,
    active: Math.random() > 0.3,
    code: course.code,
    courseId: course.id,
    teacherName: teacher?.name,
    subject: course.subject,
  };
});

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isOwn: boolean;
}

const sampleChatMessages: ChatMessage[] = [
  { id: "1", sender: "Dr. Sarah Johnson", text: "Welcome to the study room! Today we'll discuss thermodynamics.", time: "10:00 AM", isOwn: false },
  { id: "2", sender: "Aisha Patel", text: "I have a question about entropy!", time: "10:05 AM", isOwn: false },
  { id: "3", sender: "You", text: "Can someone explain the second law?", time: "10:08 AM", isOwn: true },
  { id: "4", sender: "Dr. Sarah Johnson", text: "Great question! The second law states that entropy in an isolated system always increases.", time: "10:10 AM", isOwn: false },
];

export default function StudyRooms() {
  const { user, isTeacher } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<StudyRoom | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(sampleChatMessages);
  const [newMessage, setNewMessage] = useState("");
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Connect WebSocket when chat opens
  useEffect(() => {
    if (!isChatOpen || !selectedRoom) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }
    const token = getToken();
    const wsUrl = `${import.meta.env.VITE_WS_URL || "ws://localhost:5000"}/ws/chat?chatId=${selectedRoom.id}${token ? `&token=${token}` : ""}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "token" || data.type === "response" || data.reply) {
          const content = data.data || data.reply || data.content || "";
          if (!content) return;
          setChatMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.id === "streaming") {
              return [...prev.slice(0, -1), { ...last, text: last.text + content }];
            }
            return [...prev, {
              id: "streaming",
              sender: selectedRoom.teacherName || "AI Mentor",
              text: content,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              isOwn: false,
            }];
          });
        } else if (data.type === "done") {
          setChatMessages((prev) =>
            prev.map((m) => m.id === "streaming" ? { ...m, id: Date.now().toString() } : m)
          );
          setIsSendingMsg(false);
        }
      } catch { setIsSendingMsg(false); }
    };
    ws.onerror = () => setIsSendingMsg(false);
    return () => { ws.close(); };
  }, [isChatOpen, selectedRoom]);

  const handleEnterChat = (room: StudyRoom) => {
    setSelectedRoom(room);
    setChatMessages(sampleChatMessages);
    setIsChatOpen(true);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || isSendingMsg) return;
    const text = newMessage.trim();
    setNewMessage("");
    const message: ChatMessage = {
      id: Date.now().toString(),
      sender: "You",
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
    };
    setChatMessages(prev => [...prev, message]);
    setIsSendingMsg(true);
    // Try WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", message: text, question: text }));
    } else {
      // Fallback mock response
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: selectedRoom?.teacherName || "AI Mentor",
          text: `Good question about ${selectedRoom?.subject || 'this topic'}! Let me explain... ${text.endsWith('?') ? 'This is a common question. The key concept here involves understanding the fundamental principles.' : 'Here\'s a deeper look at this concept for your study session.'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOwn: false,
        }]);
        setIsSendingMsg(false);
      }, 1200);
    }
  };

  const handleVideoCall = (room: StudyRoom, e: React.MouseEvent) => {
    e.stopPropagation();
    toast({
      title: "Starting video call...",
      description: `Connecting to ${room.name} video session. Please allow camera access.`,
    });
  };

  // Filter rooms based on user's enrolled/teaching courses
  const userRooms = allRooms.filter((room) => {
    if (!user) return false;
    
    if (isTeacher) {
      // Teachers see rooms for courses they teach
      return user.teachingCourses?.some((c) => c.id === room.courseId);
    } else {
      // Students see rooms for courses they're enrolled in
      return user.enrolledCourses.some((c) => c.id === room.courseId);
    }
  });

  const filteredRooms = userRooms.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto">
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Study Rooms</h1>
          <p className="text-muted-foreground text-sm">
            {isTeacher 
              ? "Chat with your students in course-specific rooms."
              : "Collaborate with peers and teachers in your enrolled courses."}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-32 placeholder:text-muted-foreground/60"
            />
          </div>
        </div>
      </motion.div>

      {/* Info Banner */}
      <motion.div variants={item}>
        <Card className="rounded-lg shadow-card border-border/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
                {isTeacher ? <GraduationCap className="w-5 h-5 text-primary" /> : <Users className="w-5 h-5 text-primary" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isTeacher 
                    ? `You have access to ${userRooms.length} study rooms for your courses`
                    : `You're enrolled in ${userRooms.length} course study rooms`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isTeacher 
                    ? "Monitor discussions and assist your students"
                    : "Connect with teachers and classmates"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {filteredRooms.length === 0 ? (
        <motion.div variants={item}>
          <Card className="rounded-lg shadow-card border-border/50">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">No Study Rooms Available</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery 
                  ? "No rooms match your search query."
                  : isTeacher 
                    ? "You haven't been assigned any courses yet."
                    : "You're not enrolled in any courses. Contact your administrator to get enrolled."}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => (
            <Card key={room.id} className="rounded-lg shadow-card border-border/50 hover:shadow-card-hover cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-md gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                    {room.name.charAt(0)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {room.active && <div className="w-2 h-2 rounded-full bg-primary" />}
                    <span className="text-xs text-muted-foreground">{room.active ? "Live" : "Offline"}</span>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground text-base mb-1">{room.name}</h3>
                <p className="text-xs text-muted-foreground mb-2">{room.topic}</p>
                
                {/* Show teacher info for students */}
                {!isTeacher && room.teacherName && (
                  <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                    <UserCircle className="w-3.5 h-3.5" />
                    <span>Teacher: {room.teacherName}</span>
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" /> {room.members} members
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {room.subject}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button 
                    className="flex-1 gradient-primary text-primary-foreground rounded-md text-xs"
                    size="sm"
                    onClick={() => handleEnterChat(room)}
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1" /> Enter Chat
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="w-9 h-9 rounded-md"
                    onClick={(e) => handleVideoCall(room, e)}
                  >
                    <Video className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-mono tracking-wider">{room.code}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Chat Dialog */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] p-0 rounded-lg overflow-hidden">
          <DialogHeader className="p-4 gradient-primary">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-white/20 flex items-center justify-center text-white font-bold">
                  {selectedRoom?.name?.charAt(0)}
                </div>
                <div>
                  <DialogTitle className="text-white">{selectedRoom?.name}</DialogTitle>
                  <p className="text-xs text-white/70">{selectedRoom?.members} members • {selectedRoom?.topic}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
                onClick={(e) => selectedRoom && handleVideoCall(selectedRoom, e)}
              >
                <Phone className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          
          {/* Chat Messages */}
          <div className="flex-1 h-80 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${msg.isOwn ? 'order-2' : ''}`}>
                  {!msg.isOwn && (
                    <p className="text-xs text-muted-foreground mb-1">{msg.sender}</p>
                  )}
                  <div className={`p-3 rounded-lg ${
                    msg.isOwn 
                      ? 'bg-primary text-primary-foreground rounded-br-md' 
                      : 'bg-muted rounded-bl-md'
                  }`}>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                  <p className={`text-[10px] text-muted-foreground mt-1 ${msg.isOwn ? 'text-right' : ''}`}>
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          
          {/* Message Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="rounded-md"
                disabled={isSendingMsg}
              />
              <Button 
                className="rounded-md gradient-primary text-primary-foreground"
                onClick={handleSendMessage}
                disabled={isSendingMsg || !newMessage.trim()}
              >
                {isSendingMsg ? <span className="animate-spin text-xs">⏳</span> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
