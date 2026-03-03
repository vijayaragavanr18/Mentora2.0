import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { FolderOpen, FileText, Video, Download, Upload, Search, MoreVertical, Plus, Trash2, Eye, Users, File, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadDocument, listDocuments, deleteDocument } from "@/lib/api";

interface MaterialFile {
  id: string;
  name: string;
  type: "PDF" | "Video" | "Document";
  size: string;
  date: string;
  downloads: number;
  courseId: string;
  courseName: string;
  uploadedBy?: string;
}

const initialFiles: MaterialFile[] = [];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Materials() {
  const { user, isTeacher } = useAuth();
  const [files, setFiles] = useState<MaterialFile[]>(initialFiles);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileType, setNewFileType] = useState<"PDF" | "Video" | "Document">("PDF");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, "pending" | "uploading" | "done" | "error">>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load documents from backend on mount
  useEffect(() => {
    listDocuments().then((docs) => {
      const mapped: MaterialFile[] = docs.map((d) => ({
        id: d.id,
        name: d.original_name || d.filename,
        type: (d.filename.endsWith(".mp4") || d.filename.endsWith(".mov")) ? "Video" : "PDF",
        size: d.file_size_kb ? `${(d.file_size_kb / 1024).toFixed(1)} MB` : "?",
        date: new Date(d.created_at).toLocaleDateString(),
        downloads: 0,
        courseId: d.subject || "general",
        courseName: d.subject || "General",
        uploadedBy: user?.name,
      }));
      setFiles(mapped);
    }).catch(() => {});
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length > 0) {
      setSelectedFiles(picked);
      setUploadProgress({});
      // Auto-fill display name for single file
      if (picked.length === 1 && !newFileName) setNewFileName(picked[0].name);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Show all files regardless of course association
  const userFiles = files;

  // All courses the user belongs to
  const allCourses = [
    ...(user?.teachingCourses || []),
    ...(user?.enrolledCourses || []),
  ];

  // Get folders from user's courses
  const folders = allCourses.map((course) => ({
    name: course.name,
    id: course.id,
    files: files.filter((f) => f.courseId === course.id).length,
    size: "Various",
    color: "bg-primary/10 text-primary",
  }));

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);

    // Set all to pending
    const init: Record<string, "pending" | "uploading" | "done" | "error"> = {};
    selectedFiles.forEach(f => { init[f.name] = "pending"; });
    setUploadProgress(init);

    const course = isTeacher
      ? user?.teachingCourses?.find((c) => c.id === selectedCourse)
      : user?.enrolledCourses.find((c) => c.id === selectedCourse);

    for (const file of selectedFiles) {
      setUploadProgress(prev => ({ ...prev, [file.name]: "uploading" }));
      try {
        const doc = await uploadDocument(file, {
          title: selectedFiles.length === 1 ? (newFileName || file.name) : file.name,
          subject: selectedCourse || undefined,
        });
        const newFile: MaterialFile = {
          id: doc.id,
          name: doc.original_name || doc.filename,
          type: file.type.includes("video") ? "Video" : file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "Document",
          size: doc.file_size_kb ? `${(doc.file_size_kb / 1024).toFixed(1)} MB` : formatFileSize(file.size),
          date: "Just now",
          downloads: 0,
          courseId: selectedCourse || "general",
          courseName: course?.name || "General",
          uploadedBy: user?.name,
        };
        setFiles(prev => [newFile, ...prev]);
        setUploadProgress(prev => ({ ...prev, [file.name]: "done" }));
      } catch {
        setUploadProgress(prev => ({ ...prev, [file.name]: "error" }));
      }
    }

    setIsUploading(false);
    // Auto-close after 1.5 s so user sees the green ticks
    setTimeout(() => {
      setSelectedFiles([]);
      setNewFileName("");
      setUploadProgress({});
      setSelectedCourse("");
      setIsUploadOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }, 1500);
  };

  const handleDelete = async (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    try {
      await deleteDocument(fileId);
    } catch {}
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto">
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="w-7 h-7 text-primary" /> Materials
          </h1>
          <p className="text-muted-foreground text-sm">
            Upload and manage your study materials.
          </p>
        </div>
        
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground rounded-md">
                <Upload className="w-4 h-4 mr-2" /> Upload Material
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload New Material</DialogTitle>
                <DialogDescription>
                  Add study materials for your students to access.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* File Input */}
                <div className="space-y-2">
                  <Label>Select Files</Label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.avi,.txt,.md,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.epub,.html"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-md p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  >
                    {selectedFiles.length > 0 ? (
                      <div className="space-y-1 max-h-40 overflow-y-auto text-left">
                        {selectedFiles.map((f) => (
                          <div key={f.name} className="flex items-center gap-2 px-2 py-1 rounded bg-muted/40">
                            <File className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="text-xs truncate flex-1">{f.name}</span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{formatFileSize(f.size)}</span>
                            {uploadProgress[f.name] === "uploading" && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                            {uploadProgress[f.name] === "done" && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                            {uploadProgress[f.name] === "error" && <XCircle className="w-3 h-3 text-destructive" />}
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground text-center pt-1 italic">Click to change selection</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to select files</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, DOC, PPT, images, spreadsheets &amp; more</p>
                      </>
                    )}
                  </div>
                </div>

                {selectedFiles.length <= 1 && (
                  <div className="space-y-2">
                    <Label htmlFor="fileName">Display Name</Label>
                    <Input
                      id="fileName"
                      placeholder="e.g., Chapter 5 Notes.pdf"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="fileType">File Type</Label>
                  <Select value={newFileType} onValueChange={(v) => setNewFileType(v as "PDF" | "Video" | "Document")}>
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
                <div className="space-y-2">
                  <Label htmlFor="course">Course <span className="text-muted-foreground">(optional)</span></Label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger>
                      <SelectValue placeholder="No course (General)" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCourses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} className="gradient-primary text-primary-foreground" disabled={selectedFiles.length === 0 || isUploading}>
                  {isUploading
                    ? `Uploading ${selectedFiles.filter(f => uploadProgress[f.name] === "done").length}/${selectedFiles.length}...`
                    : `Upload ${selectedFiles.length > 1 ? `${selectedFiles.length} Files` : "File"}`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </motion.div>

      {/* Storage - only show for teachers */}
      {isTeacher && (
        <motion.div variants={item}>
          <Card className="rounded-lg shadow-card border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Storage Used</span>
                <span className="text-xs text-muted-foreground">546 MB / 2 GB</span>
              </div>
              <Progress value={27} className="h-2 rounded-full" />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Folders */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {folders.map((folder, i) => (
          <Card key={i} className="rounded-lg shadow-card border-border/50 hover:shadow-card-hover cursor-pointer">
            <CardContent className="p-5 text-center">
              <div className={`w-14 h-14 rounded-lg ${folder.color} flex items-center justify-center mx-auto mb-3`}>
                <FolderOpen className="w-7 h-7" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">{folder.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{folder.files} files</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Recent Files */}
      <motion.div variants={item}>
        <Card className="rounded-lg shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              {isTeacher ? "Uploaded Materials" : "Recent Materials"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {userFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No materials uploaded yet.</p>
                <p className="text-sm mt-1">Upload a file to get started.</p>
              </div>
            ) : (
              userFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {file.type === "Video" ? (
                      <Video className="w-5 h-5 text-chart-4" />
                    ) : (
                      <FileText className="w-5 h-5 text-destructive" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{file.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{file.size}</span>
                        <span>•</span>
                        <span>{file.date}</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-[10px]">{file.courseName}</Badge>
                      </div>
                      {!isTeacher && file.uploadedBy && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Uploaded by {file.uploadedBy}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {file.downloads}
                    </span>
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-muted-foreground hover:text-primary">
                      <Download className="w-4 h-4" />
                    </Button>
                    {isTeacher && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(file.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
