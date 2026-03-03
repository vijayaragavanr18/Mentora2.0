import { motion } from "framer-motion";
import { 
  Users, 
  BookOpen, 
  FileText, 
  Calendar, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Upload,
  ClipboardList,
  GraduationCap,
  ArrowLeft,
  MoreVertical,
  Search,
  File
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, mockTeacherClasses } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// Mock student data for this class
const mockClassStudents = [
  { id: "s1", name: "Aisha Patel", email: "aisha@student.edu", attendance: 95, avgGrade: 88, lastActive: "2 hours ago", status: "online" },
  { id: "s2", name: "Ravi Kumar", email: "ravi@student.edu", attendance: 92, avgGrade: 76, lastActive: "1 day ago", status: "offline" },
  { id: "s3", name: "Priya Sharma", email: "priya@student.edu", attendance: 88, avgGrade: 92, lastActive: "5 mins ago", status: "online" },
  { id: "s4", name: "Arjun Singh", email: "arjun@student.edu", attendance: 78, avgGrade: 65, lastActive: "3 days ago", status: "offline" },
  { id: "s5", name: "Neha Gupta", email: "neha@student.edu", attendance: 98, avgGrade: 94, lastActive: "1 hour ago", status: "online" },
  { id: "s6", name: "Vikram Mehta", email: "vikram@student.edu", attendance: 85, avgGrade: 72, lastActive: "4 hours ago", status: "away" },
];

// Mock assignments
const mockAssignments = [
  { id: "a1", title: "Chapter 5 - Motion Laws", dueDate: "Mar 5, 2026", submissions: 28, total: 32, status: "active" },
  { id: "a2", title: "Lab Report: Pendulum", dueDate: "Mar 8, 2026", submissions: 15, total: 32, status: "active" },
  { id: "a3", title: "Quiz: Force & Acceleration", dueDate: "Feb 28, 2026", submissions: 32, total: 32, status: "completed" },
];

// Mock announcements
const mockAnnouncements = [
  { id: "n1", title: "Lab session rescheduled", date: "Feb 28, 2026", preview: "The lab session on Friday has been moved to..." },
  { id: "n2", title: "Extra credit opportunity", date: "Feb 25, 2026", preview: "Students can earn extra credit by completing..." },
];

export default function ClassDashboard() {
  const { selectedTeacherClass, selectClass } = useAuth();
  const navigate = useNavigate();
  const { classId } = useParams();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Upload dialog state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFileType, setUploadFileType] = useState<"PDF" | "Video" | "Document">("PDF");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadFileName) setUploadFileName(file.name);
      if (file.type.includes('pdf')) setUploadFileType('PDF');
      else if (file.type.includes('video')) setUploadFileType('Video');
      else setUploadFileType('Document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleUploadMaterial = () => {
    if (!selectedFile || !uploadFileName) return;
    toast({
      title: "Material uploaded!",
      description: `"${uploadFileName}" has been uploaded to ${classInfo?.name}.`,
    });
    setIsUploadOpen(false);
    setSelectedFile(null);
    setUploadFileName("");
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Get class info either from context or by ID lookup
  const classInfo = selectedTeacherClass || mockTeacherClasses.find(c => c.id === classId);

  const handleBackToClasses = () => {
    selectClass(null);
    navigate("/class-select");
  };

  if (!classInfo) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Class not found</h2>
          <p className="text-muted-foreground mb-4">The class you're looking for doesn't exist.</p>
          <Button onClick={handleBackToClasses}>Back to Classes</Button>
        </div>
      </div>
    );
  }

  const filteredStudents = mockClassStudents.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const avgAttendance = Math.round(mockClassStudents.reduce((sum, s) => sum + s.attendance, 0) / mockClassStudents.length);
  const avgGrade = Math.round(mockClassStudents.reduce((sum, s) => sum + s.avgGrade, 0) / mockClassStudents.length);
  const onlineStudents = mockClassStudents.filter(s => s.status === "online").length;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mt-1 rounded-md"
            onClick={handleBackToClasses}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-foreground">{classInfo.name}</h1>
              <Badge variant="secondary">{classInfo.grade}</Badge>
              <Badge variant="outline">{classInfo.section}</Badge>
            </div>
            <p className="text-muted-foreground">
              {classInfo.subject} • {classInfo.room} • {classInfo.schedule}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsUploadOpen(true)} variant="outline" className="rounded-md">
            <Upload className="w-4 h-4 mr-2" />
            Upload Material
          </Button>
          <Button className="rounded-md gradient-primary text-primary-foreground">
            <ClipboardList className="w-4 h-4 mr-2" />
            New Assignment
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-lg shadow-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <Badge variant="secondary" className="text-xs">{onlineStudents} online</Badge>
            </div>
            <p className="text-2xl font-bold">{classInfo.studentCount}</p>
            <p className="text-sm text-muted-foreground">Total Students</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-md bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">{avgAttendance}%</p>
            <p className="text-sm text-muted-foreground">Avg Attendance</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-md bg-amber-500/10 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">{avgGrade}%</p>
            <p className="text-sm text-muted-foreground">Class Average</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">{mockAssignments.filter(a => a.status === "active").length}</p>
            <p className="text-sm text-muted-foreground">Active Assignments</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item}>
        <Tabs defaultValue="students" className="space-y-4">
          <TabsList className="bg-muted/50 p-1 rounded-md">
            <TabsTrigger value="students" className="rounded-lg data-[state=active]:bg-background">
              <Users className="w-4 h-4 mr-2" />
              Students
            </TabsTrigger>
            <TabsTrigger value="assignments" className="rounded-lg data-[state=active]:bg-background">
              <ClipboardList className="w-4 h-4 mr-2" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="materials" className="rounded-lg data-[state=active]:bg-background">
              <BookOpen className="w-4 h-4 mr-2" />
              Materials
            </TabsTrigger>
            <TabsTrigger value="announcements" className="rounded-lg data-[state=active]:bg-background">
              <FileText className="w-4 h-4 mr-2" />
              Announcements
            </TabsTrigger>
          </TabsList>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card className="rounded-lg shadow-card border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Student Roster</CardTitle>
                  <div className="flex items-center gap-2 w-64 bg-muted/50 rounded-md px-3 py-1.5">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search students..."
                      className="border-0 bg-transparent h-auto p-0 focus-visible:ring-0"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary font-semibold">
                            {student.name.charAt(0)}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                            student.status === "online" ? "bg-green-500" : 
                            student.status === "away" ? "bg-amber-500" : "bg-muted-foreground"
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="font-semibold">{student.attendance}%</p>
                          <p className="text-xs text-muted-foreground">Attendance</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">{student.avgGrade}%</p>
                          <p className="text-xs text-muted-foreground">Grade</p>
                        </div>
                        <div className="text-right w-24">
                          <p className="text-sm text-muted-foreground">{student.lastActive}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="rounded-lg">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments">
            <Card className="rounded-lg shadow-card border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Assignments</CardTitle>
                  <Button className="rounded-md" size="sm">
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Create Assignment
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-4 rounded-md border border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
                          assignment.status === "completed" ? "bg-green-500/10" : "bg-primary/10"
                        }`}>
                          {assignment.status === "completed" ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <ClipboardList className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{assignment.title}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Due: {assignment.dueDate}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">{assignment.submissions}/{assignment.total}</p>
                          <p className="text-xs text-muted-foreground">submitted</p>
                        </div>
                        <Progress 
                          value={(assignment.submissions / assignment.total) * 100} 
                          className="w-24 h-2"
                        />
                        <Badge variant={assignment.status === "completed" ? "secondary" : "default"}>
                          {assignment.status === "completed" ? "Completed" : "Active"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials">
            <Card className="rounded-lg shadow-card border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Course Materials</CardTitle>
                  <Button onClick={() => setIsUploadOpen(true)} className="rounded-md" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Material
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { title: "Chapter 5 - Newton's Laws", type: "PDF", size: "2.4 MB", date: "Feb 25, 2026" },
                    { title: "Lab Safety Guidelines", type: "PDF", size: "1.1 MB", date: "Feb 20, 2026" },
                    { title: "Motion Simulation", type: "Interactive", size: "5.2 MB", date: "Feb 15, 2026" },
                    { title: "Practice Problems Set 3", type: "PDF", size: "890 KB", date: "Feb 10, 2026" },
                  ].map((material, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-md border border-border/50 hover:bg-muted/30 transition-colors">
                      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{material.title}</p>
                        <p className="text-xs text-muted-foreground">{material.type} • {material.size}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{material.date}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements">
            <Card className="rounded-lg shadow-card border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Announcements</CardTitle>
                  <Button className="rounded-md" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    New Announcement
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockAnnouncements.map((announcement) => (
                    <div key={announcement.id} className="p-4 rounded-md border border-border/50 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{announcement.title}</h4>
                        <span className="text-xs text-muted-foreground">{announcement.date}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{announcement.preview}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Upload Material Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Material</DialogTitle>
            <DialogDescription>
              Upload study materials for {classInfo?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* File Input */}
            <div className="space-y-2">
              <Label>Select File</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.avi"
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-md p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <File className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to select a file</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOC, PPT, or Video</p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="uploadFileName">Display Name</Label>
              <Input
                id="uploadFileName"
                placeholder="e.g., Chapter 5 Notes.pdf"
                value={uploadFileName}
                onChange={(e) => setUploadFileName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="uploadFileType">File Type</Label>
              <Select value={uploadFileType} onValueChange={(v) => setUploadFileType(v as "PDF" | "Video" | "Document")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDF">PDF Document</SelectItem>
                  <SelectItem value="Video">Video</SelectItem>
                  <SelectItem value="Document">Other Document</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadMaterial} disabled={!selectedFile}>
              <Upload className="w-4 h-4 mr-2" /> Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
