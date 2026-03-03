import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { chatJSON, uploadDocument, listDocuments, generateQuiz, generateFlashcards, generateSmartNotes, generateContent, generatePodcast, type Citation } from "@/lib/api";
import { 
  Bot, Send, Sparkles, BookOpen, Brain, FileText, Upload, Plus, 
  Youtube, Globe, FileUp, Mic, Headphones, ListChecks, MessageSquare,
  ClipboardList, Clock, HelpCircle, Lightbulb, Trash2, X, ChevronRight,
  Volume2, Pause, Play, Download, Copy, BookMarked, StickyNote, Link2,
  PanelLeftClose, PanelLeft, Quote, Check, CheckSquare2, Square, Loader2,
  FileImage, FileSpreadsheet, Presentation, Music
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";

type Message = { role: "user" | "assistant"; content: string; citations?: Citation[] };

interface Source {
  id: string;
  name: string;
  type: "pdf" | "youtube" | "website" | "audio" | "document" | "text";
  icon: React.ComponentType<{ className?: string }>;
  addedAt: string;
  size?: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  sourceId?: string;
}

const initialSources: Source[] = [];

const initialNotes: Note[] = [];

const sampleMessages: Message[] = [
  { role: "assistant", content: "Hello! I'm your Mentora AI Assistant. Upload documents using the Sources panel, then ask me anything about your content or generate study materials!" },
];

const suggestedQuestions = [
  "What are the main concepts covered in these sources?",
  "Explain the relationship between heat and work",
  "What are the key equations I should memorize?",
  "Compare different thermodynamic processes",
  "What topics should I focus on for the exam?",
];

const outputTypes = [
  { id: "summary", name: "Summary", icon: FileText, description: "Condensed overview of sources" },
  { id: "study-guide", name: "Study Guide", icon: BookOpen, description: "Comprehensive learning material" },
  { id: "faq", name: "FAQ", icon: HelpCircle, description: "Common questions & answers" },
  { id: "briefing", name: "Briefing Doc", icon: ClipboardList, description: "Executive summary format" },
  { id: "timeline", name: "Timeline", icon: Clock, description: "Chronological events" },
  { id: "quiz", name: "Quiz", icon: Brain, description: "Test your knowledge" },
  { id: "flashcards", name: "Flashcards", icon: ListChecks, description: "Memory cards for review" },
  { id: "outline", name: "Outline", icon: BookMarked, description: "Structured topic outline" },
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>(sampleMessages);
  const [input, setInput] = useState("");
  const [sources, setSources] = useState<Source[]>(initialSources);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState("sources");
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [sourceType, setSourceType] = useState<"file" | "youtube" | "website" | "text">("file");
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState("");
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeChatId, setActiveChatId] = useState<string | undefined>(undefined);
  const [activeDocIds, setActiveDocIds] = useState<string[]>([]);
  const [podcastScript, setPodcastScript] = useState<string | null>(null);
  const [podcastLoading, setPodcastLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load uploaded documents from backend on mount — auto-select all
  useEffect(() => {
    listDocuments().then((docs) => {
      const backendSources: Source[] = docs.map((d) => ({
        id: d.chroma_collection_id || `doc_${d.id}`,   // ChromaDB collection ID
        name: d.original_name || d.filename,
        type: "pdf" as const,
        icon: FileText,
        addedAt: new Date(d.created_at).toLocaleDateString(),
        size: d.file_size_kb ? `${(d.file_size_kb / 1024).toFixed(1)} MB` : undefined,
      }));
      if (backendSources.length > 0) {
        setSources(backendSources);
        setActiveDocIds(backendSources.map(s => s.id)); // auto-select all
      }
    }).catch(() => {});
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Toggle a source in/out of activeDocIds
  const toggleSource = useCallback((id: string) => {
    setActiveDocIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  }, []);

  // Copy text to clipboard with visual feedback
  const copyToClipboard = useCallback(async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch { /* ignore */ }
  }, []);

  // Save an AI message as a note
  const saveAsNote = useCallback((content: string) => {
    const title = content.split("\n")[0].replace(/[#*]/g, "").trim().slice(0, 50) || "AI Note";
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title,
      content,
      createdAt: new Date().toLocaleTimeString(),
    };
    setNotes(prev => [newNote, ...prev]);
    setActiveTab("notes");
  }, [setActiveTab]);

  // Simple inline markdown → JSX renderer
  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (/^#{1,3}\s/.test(line)) {
        const lvl = (line.match(/^#+/) || [""])[0].length;
        const t = line.replace(/^#+\s*/, "");
        const cls = lvl === 1 ? "text-base font-bold mt-3 mb-1" : lvl === 2 ? "text-sm font-semibold mt-2 mb-0.5" : "text-sm font-medium mt-1";
        return <div key={i} className={cls}>{t}</div>;
      }
      if (/^\s*[-*]\s/.test(line)) {
        const t = line.replace(/^\s*[-*]\s*/, "");
        return <div key={i} className="flex gap-1.5 my-0.5"><span className="text-primary mt-0.5 shrink-0">•</span><span>{inlineFormat(t)}</span></div>;
      }
      if (/^\s*\d+\.\s/.test(line)) {
        const num = (line.match(/^\s*(\d+)\./) || ["",""])[1];
        const t = line.replace(/^\s*\d+\.\s*/, "");
        return <div key={i} className="flex gap-1.5 my-0.5"><span className="text-primary shrink-0 font-mono text-xs mt-0.5">{num}.</span><span>{inlineFormat(t)}</span></div>;
      }
      if (line.trim() === "") return <div key={i} className="h-1.5" />;
      return <div key={i} className="my-0.5">{inlineFormat(line)}</div>;
    });
  };

  const inlineFormat = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((p, i) => {
      if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2,-2)}</strong>;
      if (p.startsWith("*") && p.endsWith("*")) return <em key={i}>{p.slice(1,-1)}</em>;
      if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="bg-muted-foreground/20 rounded px-1 font-mono text-xs">{p.slice(1,-1)}</code>;
      return p;
    });
  };

  const mockReply = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes("hello") || lower.includes("hi")) return "Hello! I'm Mentora AI. How can I help you study today?";
    if (lower.includes("explain") || lower.includes("what is")) return `Great question! Here's a concise explanation: **${msg.replace(/explain|what is/gi, "").trim()}** is a key concept in your study material. It involves understanding the core principles and applying them to real-world scenarios. Would you like more details or examples?`;
    if (lower.includes("help")) return "I'm here to help! You can ask me to explain concepts, generate quizzes, create flashcards, or summarize your study materials. What would you like to explore?";
    if (lower.includes("quiz")) return "I can generate a quiz for you! Use the **Generate Output** button and select 'Quiz' to create practice questions from your materials.";
    if (lower.includes("summary") || lower.includes("summarize")) return "To get a summary, click **Generate Output** → **Summary**. I'll analyze your uploaded documents and create a concise overview.";
    return `That's an interesting topic! Based on your study materials, here's what I can share: **${msg.slice(0, 40)}...** relates to key concepts in your curriculum. I'd recommend reviewing the relevant sections and practicing with quizzes. Want me to generate some practice questions?`;
  };

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setIsSending(true);
    setMessages(prev => [...prev, { role: "assistant", content: "⏳ Thinking..." }]);
    try {
      const data = await chatJSON(userMsg, {
        doc_ids: activeDocIds.length > 0 ? activeDocIds : undefined,
        chat_id: activeChatId,
      });
      setActiveChatId(data.chat_id);
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: "assistant", content: data.reply || "(No response)", citations: data.citations },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: "assistant", content: `❌ Error: ${msg}` },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateOutput = async (type: string) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGeneratingType(type);
    const topic = sources.filter(s => activeDocIds.includes(s.id)).map(s => s.name).join(", ")
                  || sources.map(s => s.name).join(", ")
                  || "general study";

    // Add a placeholder while generating
    setMessages(prev => [...prev, { role: "assistant", content: `⏳ Generating ${type}...` }]);
    try {
      const data = await generateContent(type, activeDocIds, topic);
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: "assistant", content: data.content },
      ]);
    } catch {
      // Fallback: quiz/flashcards through old routes, others mock
      try {
        let content = "";
        if (type === "quiz") {
          const data = await generateQuiz(topic, { doc_id: activeDocIds[0] });
          content = data.questions.map((q, i) =>
            `**Q${i + 1}:** ${q.question}\n${q.choices.map((c, j) => `- ${String.fromCharCode(65+j)}) ${c.text}${q.answer?.toUpperCase() === String.fromCharCode(65+j) ? " ✓" : ""}`).join("\n")}`
          ).join("\n\n");
        } else if (type === "flashcards") {
          const data = await generateFlashcards(topic);
          content = data.flashcards.map((f, i) => `**Card ${i + 1}**\nQ: ${f.question}\nA: ${f.answer}`).join("\n\n");
        } else {
          content = `**${type.charAt(0).toUpperCase() + type.slice(1)} — ${topic}**\n\n📌 **Overview:** This ${type} covers the essential aspects of ${topic}.\n\n📚 **Key Points:**\n- Core concepts and definitions\n- Important theories and frameworks\n- Practical applications\n- Common exam topics\n\n💡 **Tip:** Focus on understanding relationships between concepts.`;
        }
        setMessages(prev => [...prev.slice(0, -1), { role: "assistant", content }]);
      } catch (e) {
        setMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: `❌ Failed to generate ${type}: ${e instanceof Error ? e.message : "Unknown error"}` }]);
      }
    } finally {
      setIsGenerating(false);
      setGeneratingType("");
    }
  };

  const handleGeneratePodcast = async () => {
    if (podcastLoading) return;
    setPodcastLoading(true);
    setPodcastScript(null);
    const topic = sources.filter(s => activeDocIds.includes(s.id)).map(s => s.name).join(", ") || "study material";
    try {
      const data = await generatePodcast(topic, { doc_ids: activeDocIds });
      setPodcastScript(data.script || "Podcast script generated.");
      setAudioPlaying(false);
    } catch {
      setPodcastScript(`🎙️ **Podcast Overview — ${topic}**\n\nWelcome to your Mentora audio overview. In this episode, we explore the key concepts from your uploaded materials...\n\n*(Audio generation requires TTS service — script saved)*`);
    } finally {
      setPodcastLoading(false);
    }
  };

  const handleAddSource = async () => {
    if (sourceType === "file") {
      fileInputRef.current?.click();
      return;
    }
    const newSource: Source = {
      id: `source-${Date.now()}`,
      name: sourceType === "youtube" ? urlInput || "YouTube Video" : sourceType === "website" ? urlInput : "Pasted Text",
      type: sourceType === "youtube" ? "youtube" : sourceType === "website" ? "website" : "text",
      icon: sourceType === "youtube" ? Youtube : sourceType === "website" ? Globe : StickyNote,
      addedAt: "Just now",
    };
    setSources([...sources, newSource]);
    setIsAddSourceOpen(false);
    setUrlInput("");
    setTextInput("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const doc = await uploadDocument(file);
      const chromaId = doc.chroma_collection_id || `doc_${doc.id}`;
      const newSource: Source = {
        id: chromaId,                        // ChromaDB collection ID for RAG
        name: doc.original_name || doc.filename,
        type: "pdf",
        icon: FileText,
        addedAt: "Just now",
        size: doc.file_size_kb ? `${(doc.file_size_kb / 1024).toFixed(1)} MB` : undefined,
      };
      setSources(prev => [...prev, newSource]);
      setActiveDocIds(prev => [...prev, chromaId]); // auto-select new upload
      setIsAddSourceOpen(false);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploadingFile(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleAddNote = () => {
    if (!newNoteTitle.trim()) return;
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: newNoteTitle,
      content: newNoteContent,
      createdAt: "Just now",
    };
    setNotes([...notes, newNote]);
    setIsAddNoteOpen(false);
    setNewNoteTitle("");
    setNewNoteContent("");
  };

  const removeSource = (id: string) => {
    setSources(sources.filter(s => s.id !== id));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-6rem)] flex gap-4">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bot className="w-7 h-7 text-primary" /> AI Assistant
            </h1>
            <p className="text-muted-foreground text-sm">
              {sources.length > 0
                ? `${activeDocIds.length} of ${sources.length} sources active • Ask questions or generate content`
                : "Upload sources then ask questions or generate study materials"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
          </Button>
        </div>

        {/* Output Generation Tools */}
        <Card className="rounded-lg shadow-card border-border/50 mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Generate from Sources</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {outputTypes.map((type) => (
                <Button
                  key={type.id}
                  variant="outline"
                  size="sm"
                  className="flex-col h-auto py-3 rounded-md hover:border-primary hover:bg-primary/5"
                  onClick={() => handleGenerateOutput(type.id)}
                  disabled={isGenerating}
                >
                  <type.icon className="w-4 h-4 mb-1 text-primary" />
                  <span className="text-[10px]">{type.name}</span>
                </Button>
              ))}
            </div>
            {isGenerating && (
              <div className="mt-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Generating {generatingType}...
                </div>
                <Progress value={65} className="h-1 mt-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audio Overview Card */}
        <Card className="rounded-lg shadow-card border-border/50 mb-4 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-md gradient-primary flex items-center justify-center">
                  <Headphones className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Audio Overview</h3>
                  <p className="text-xs text-muted-foreground">
                    {podcastScript ? "Script ready" : activeDocIds.length > 0 ? "Generate a podcast-style summary" : "Add sources first"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-md"
                  onClick={handleGeneratePodcast}
                  disabled={podcastLoading || activeDocIds.length === 0}
                >
                  {podcastLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : podcastScript ? <Play className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  <span className="ml-1 text-xs">{podcastLoading ? "Generating..." : podcastScript ? "View" : "Generate"}</span>
                </Button>
                {podcastScript && (
                  <Button variant="outline" size="sm" className="rounded-md" onClick={() => copyToClipboard(podcastScript, -1)}>
                    <Download className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            {podcastScript && (
              <div className="mt-3 text-xs text-muted-foreground bg-muted/40 rounded-md p-3 max-h-32 overflow-auto whitespace-pre-wrap">
                {podcastScript}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 rounded-lg shadow-card border-border/50 flex flex-col overflow-hidden">
          <CardContent className="flex-1 overflow-auto p-4 space-y-4">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] ${msg.role === "user" ? "" : ""}`}>
                    <div className={`p-3.5 rounded-lg text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "gradient-primary text-primary-foreground rounded-br-md whitespace-pre-wrap"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}>
                      {msg.role === "assistant" && msg.content !== "⏳ Thinking..."
                        ? <div className="space-y-0.5">{renderMarkdown(msg.content)}</div>
                        : msg.content}
                    </div>
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {msg.citations.map((cite, idx) => (
                          <Badge key={idx} variant="outline" className="text-[10px] gap-1 max-w-xs truncate">
                            <Quote className="w-2.5 h-2.5 shrink-0" />
                            {cite.page ? `p.${cite.page} — ` : ""}{cite.text?.slice(0, 60)}{cite.text?.length > 60 ? "…" : ""}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {msg.role === "assistant" && i > 0 && msg.content !== "⏳ Thinking..." && (
                      <div className="mt-2 flex gap-1">
                        <Button
                          variant="ghost" size="sm" className="h-7 text-xs rounded-lg"
                          onClick={() => copyToClipboard(msg.content, i)}
                        >
                          {copiedIdx === i ? <Check className="w-3 h-3 mr-1 text-green-500" /> : <Copy className="w-3 h-3 mr-1" />}
                          {copiedIdx === i ? "Copied!" : "Copy"}
                        </Button>
                        <Button
                          variant="ghost" size="sm" className="h-7 text-xs rounded-lg"
                          onClick={() => saveAsNote(msg.content)}
                        >
                          <StickyNote className="w-3 h-3 mr-1" /> Save as Note
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />

            {/* Suggested Questions */}
            {messages.length <= 2 && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" /> Suggested questions based on your sources
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="rounded-md text-xs h-auto py-2"
                      onClick={() => setInput(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="Ask about your sources..."
                className="flex-1 bg-muted rounded-md px-4 py-3 text-sm outline-none border border-transparent focus:border-primary/30 transition-colors placeholder:text-muted-foreground/60"
              />
              <Button onClick={handleSend} className="gradient-primary text-primary-foreground rounded-md px-4" disabled={!input.trim() || isSending}>
                {isSending ? <span className="animate-spin">⏳</span> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            {/* Hidden file input for document upload */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.doc,.pptx,.txt,.md,.csv,.xlsx"
              onChange={handleFileUpload}
            />
          </div>
        </Card>
      </div>

      {/* Sidebar - Sources & Notes */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden lg:block"
          >
            <Card className="h-full rounded-lg shadow-card border-border/50 flex flex-col">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="mx-4 mt-4 grid w-auto grid-cols-2">
                  <TabsTrigger value="sources" className="text-xs">
                    <FileUp className="w-3.5 h-3.5 mr-1" /> Sources ({sources.length})
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs">
                    <StickyNote className="w-3.5 h-3.5 mr-1" /> Notes ({notes.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="sources" className="flex-1 flex flex-col m-0 p-4 pt-2">
                  {/* Add Source Button */}
                  <Dialog open={isAddSourceOpen} onOpenChange={setIsAddSourceOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full mb-3 gradient-primary text-primary-foreground rounded-md">
                        <Plus className="w-4 h-4 mr-2" /> Add Source
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add a Source</DialogTitle>
                        <DialogDescription>
                          Import content for the AI to analyze and reference.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="grid grid-cols-4 gap-2 py-4">
                        <Button
                          variant={sourceType === "file" ? "default" : "outline"}
                          className="flex-col h-auto py-3 rounded-md"
                          onClick={() => setSourceType("file")}
                        >
                          <FileUp className="w-5 h-5 mb-1" />
                          <span className="text-xs">File</span>
                        </Button>
                        <Button
                          variant={sourceType === "youtube" ? "default" : "outline"}
                          className="flex-col h-auto py-3 rounded-md"
                          onClick={() => setSourceType("youtube")}
                        >
                          <Youtube className="w-5 h-5 mb-1" />
                          <span className="text-xs">YouTube</span>
                        </Button>
                        <Button
                          variant={sourceType === "website" ? "default" : "outline"}
                          className="flex-col h-auto py-3 rounded-md"
                          onClick={() => setSourceType("website")}
                        >
                          <Globe className="w-5 h-5 mb-1" />
                          <span className="text-xs">Website</span>
                        </Button>
                        <Button
                          variant={sourceType === "text" ? "default" : "outline"}
                          className="flex-col h-auto py-3 rounded-md"
                          onClick={() => setSourceType("text")}
                        >
                          <StickyNote className="w-5 h-5 mb-1" />
                          <span className="text-xs">Paste</span>
                        </Button>
                      </div>

                      {sourceType === "file" && (
                        <div
                          className="border-2 border-dashed border-border rounded-md p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {uploadingFile
                            ? <><Loader2 className="w-10 h-10 text-primary mx-auto mb-2 animate-spin" /><p className="text-sm text-muted-foreground">Uploading...</p></>
                            : <><FileUp className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                               <p className="text-sm text-muted-foreground">Click to upload a file</p>
                               <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, PPTX, TXT, CSV, images & more</p></>}
                        </div>
                      )}

                      {(sourceType === "youtube" || sourceType === "website") && (
                        <div className="space-y-2">
                          <Label>{sourceType === "youtube" ? "YouTube URL" : "Website URL"}</Label>
                          <Input
                            placeholder={sourceType === "youtube" ? "https://youtube.com/watch?v=..." : "https://..."}
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                          />
                        </div>
                      )}

                      {sourceType === "text" && (
                        <div className="space-y-2">
                          <Label>Paste your content</Label>
                          <Textarea
                            placeholder="Paste notes, text, or any content here..."
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            className="min-h-[150px]"
                          />
                        </div>
                      )}

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddSourceOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddSource} className="gradient-primary text-primary-foreground">
                          Add Source
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Sources List */}
                  <div className="flex-1 overflow-auto space-y-2">
                    {sources.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileUp className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-xs">No sources yet — add a file to get started</p>
                      </div>
                    )}
                    {sources.map((source) => {
                      const isSelected = activeDocIds.includes(source.id);
                      return (
                        <div
                          key={source.id}
                          onClick={() => toggleSource(source.id)}
                          className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors group border ${
                            isSelected
                              ? "bg-primary/10 border-primary/40"
                              : "bg-muted/50 border-transparent hover:bg-muted"
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-primary/20" : "bg-primary/10"}`}>
                            <source.icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-primary/70"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{source.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {source.addedAt} {source.size && `• ${source.size}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isSelected
                              ? <CheckSquare2 className="w-4 h-4 text-primary" />
                              : <Square className="w-4 h-4 text-muted-foreground opacity-40 group-hover:opacity-70" />}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-6 h-6 opacity-0 group-hover:opacity-100"
                              onClick={(e) => { e.stopPropagation(); removeSource(source.id); setActiveDocIds(prev => prev.filter(d => d !== source.id)); }}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {sources.length > 0 && (
                      <p className="text-[10px] text-muted-foreground text-center pt-1">
                        {activeDocIds.length} of {sources.length} selected for context
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="flex-1 flex flex-col m-0 p-4 pt-2">
                  {/* Add Note Button */}
                  <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full mb-3 gradient-primary text-primary-foreground rounded-md">
                        <Plus className="w-4 h-4 mr-2" /> Add Note
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create a Note</DialogTitle>
                        <DialogDescription>
                          Save important information for later reference.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            placeholder="Note title..."
                            value={newNoteTitle}
                            onChange={(e) => setNewNoteTitle(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Content</Label>
                          <Textarea
                            placeholder="Write your note..."
                            value={newNoteContent}
                            onChange={(e) => setNewNoteContent(e.target.value)}
                            className="min-h-[150px]"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddNoteOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddNote} className="gradient-primary text-primary-foreground">
                          Save Note
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Notes List */}
                  <div className="flex-1 overflow-auto space-y-2">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      >
                        <p className="text-sm font-medium">{note.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {note.content}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          {note.createdAt}
                        </p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
