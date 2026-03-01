"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { env } from "../config/env";
import { chatJSON, getChatDetail, getChats, type ChatMessage, podcastStart, type CitationItem } from "../lib/api";

function wsURL(path: string) {
  const u = new URL(env.backend);
  const proto = u.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${u.host}${path}`;
}
import MarkdownView from "../components/Chat/MarkdownView";
import ActionRow from "../components/Chat/ActionRow";
import SelectionPopup from "../components/Chat/SelectionPopup";
import Composer from "../components/Chat/Composer";
import LoadingIndicator from "../components/Chat/LoadingIndicator";
import SourcesPanel from "../components/Chat/SourcesPanel";
import { useCompanion } from "../components/Companion/CompanionProvider";

type ChatMessageWithCitations = ChatMessage & { citations?: CitationItem[] };

function extractFirstJsonObject(s: string): string {
  let depth = 0, start = -1;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") { if (depth === 0) start = i; depth++; }
    else if (ch === "}") { depth--; if (depth === 0 && start !== -1) return s.slice(start, i + 1); }
  }
  return "";
}

function normalizePayload(payload: unknown): { md: string; topic?: string } {
  if (typeof payload === "string") {
    const s = payload.trim();
    if (s.startsWith("{") && s.endsWith("}")) {
      try { const obj = JSON.parse(s); return { md: String(obj?.answer || ""), topic: typeof obj?.topic === "string" ? obj.topic : undefined }; } catch { }
    }
    const inner = extractFirstJsonObject(s);
    if (inner) {
      try { const obj = JSON.parse(inner); return { md: String(obj?.answer || ""), topic: typeof obj?.topic === "string" ? obj.topic : undefined }; } catch { }
    }
    return { md: s };
  }
  if (payload && typeof payload === "object") {
    const o = payload as any;
    return { md: String(o?.answer || o?.html || ""), topic: typeof o?.topic === "string" ? o.topic : undefined };
  }
  return { md: "" };
}

function deriveTopicFromMarkdown(md: string): string {
  const m = md.match(/^\s*#{1,6}\s+(.+?)\s*$/m);
  return m ? m[1].trim() : "";
}

function CitationsBlock({ citations }: { citations: import('../lib/api').CitationItem[] }) {
  const [open, setOpen] = useState(false);
  if (!citations || citations.length === 0) return null;
  return (
    <div className="mt-4 border-t border-stone-800 pt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`size-3 transition-transform ${open ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        {citations.length} source{citations.length > 1 ? "s" : ""} referenced
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {citations.map((c, i) => (
            <div key={i} className="rounded-lg bg-stone-900/60 border border-stone-800 px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] text-stone-500 font-medium">Source {c.index ?? i + 1}</span>
                <span className="text-[10px] text-emerald-500">score {(c.score ?? 0).toFixed(2)}</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed italic">"{c.text}"</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Chat() {
  const search = useSearchParams();
  const router = useRouter();
  const location = { pathname: usePathname() } as any;
  const state = (location?.state || {}) as {
    chatId?: string;
    q?: string;
    answer?: string | { html?: string; answer?: string; topic?: string };
  };

  const initialChatId = search.get("chatId") || state.chatId || "";
  const initialQuestion = search.get("q") || state.q || "";
  const initialDocId = search.get("doc_id") || null; // legacy single doc_id from URL

  const [chatId, setChatId] = useState(initialChatId);
  const [messages, setMessages] = useState<ChatMessageWithCitations[] | undefined>([]);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [activeDocIds, setActiveDocIds] = useState<string[]>(initialDocId ? [`doc_${initialDocId.startsWith("doc_") ? initialDocId.slice(4) : initialDocId}`] : []);
  const [selected, setSelected] = useState<{ text: string; x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [connecting, setConnecting] = useState<boolean>(!!(initialChatId || initialQuestion));
  const [awaitingAnswer, setAwaitingAnswer] = useState<boolean>(false);
  const [topic, setTopic] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { setDocument } = useCompanion();

  const selPopupRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasSentInitialRef = useRef(false);
  const wsReadyRef = useRef<boolean>(false);         // true after "connected" from backend
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const streamBufferRef = useRef<string>("");        // accumulates live token stream
  const citationBufferRef = useRef<CitationItem[]>([]); // accumulates citations for current stream
  const [streamingContent, setStreamingContent] = useState<string>("");

  useEffect(() => {
    if (!initialChatId && !initialQuestion) {
      (async () => {
        try {
          setConnecting(true);
          const res = await getChats();
          const list = Array.isArray(res?.chats) ? res.chats : [];
          if (list.length) {
            const latest = [...list].sort((a: any, b: any) => (b.at || 0) - (a.at || 0))[0];
            if (latest?.id) {
              setChatId(latest.id);
              router.replace(`/chat?chatId=${encodeURIComponent(latest.id)}`);
            } else {
              // No chats exist yet, stay here but maybe clear params
              // navigate("/", { replace: true });
            }
          } else {
            // navigate("/", { replace: true });
          }
        } catch (e: any) {
          console.error("Failed to load initial chat:", e);
          // navigate("/", { replace: true });
        }
      })();
    }
  }, [initialChatId, initialQuestion, router]);

  useEffect(() => {
    const cid = search.get("chatId") || state.chatId || "";
    setChatId(cid);
    if (state.answer) {
      const init = normalizePayload(state.answer);
      const seed: ChatMessage[] = [];
      if (initialQuestion) seed.push({ role: "user", content: initialQuestion, at: Date.now() });
      if (init.md) seed.push({ role: "assistant", content: init.md, at: Date.now() });
      if (seed.length) setMessages(seed);
      if (init.topic) setTopic(init.topic || "");
      else if (init.md) setTopic(deriveTopicFromMarkdown(init.md));
    } else {
      // initialQuestion is handled by a separate useEffect below sendFollowup
    }
  }, [search, state.chatId, state.answer, initialQuestion]);

  useEffect(() => {
    if (!chatId) return;
    getChatDetail(chatId)
      .then((res) => {
        if (res?.ok && Array.isArray(res.messages)) {
          const normalized = res.messages.map((m) =>
            m.role === "assistant" ? { ...m, content: normalizePayload((m as any).content).md } : m
          );
          setMessages(normalized);
          for (let i = normalized.length - 1; i >= 0; i--) {
            const raw = (res.messages[i] as any)?.content;
            if (normalized[i].role === "assistant") {
              const n = normalizePayload(raw);
              if (n.topic) setTopic(n.topic);
              else if (n.md) setTopic(deriveTopicFromMarkdown(n.md));
              break;
            }
          }
        }
      })
      .catch((err) => {
        console.error("Failed to fetch chat history:", err);
        setError("Failed to load chat history. The chat may not exist.");
      });
  }, [chatId]);

  // ── WebSocket lifecycle: streaming + heartbeat + auto-reconnect ─────────────
  const connectWs = (cid: string, attempt = 0) => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    wsReadyRef.current = false;

    const ws = new WebSocket(wsURL(`/ws/chat?chatId=${encodeURIComponent(cid)}`));
    wsRef.current = ws;
    console.log(`[Chat] WS connecting attempt=${attempt} chatId=${cid}`);

    ws.onopen = () => {
      console.log("[Chat] WS onopen");
      reconnectAttemptsRef.current = 0;
      setConnecting(false);
      // Heartbeat every 20 s to keep connection alive
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 20_000);
    };

    ws.onerror = (err) => {
      console.error("[Chat] WS error:", err);
    };

    ws.onclose = (event) => {
      console.warn("[Chat] WS closed code=%d reason=%s", event.code, event.reason);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      wsReadyRef.current = false;
      setConnecting(false);
      // Auto-reconnect with exponential backoff — max 5 attempts
      if (event.code !== 1000 && event.code !== 1001 && attempt < 5) {
        const delay = Math.min(1000 * 2 ** attempt, 16_000);
        console.log(`[Chat] Reconnecting in ${delay}ms (attempt ${attempt + 1}/5)`);
        setTimeout(() => connectWs(cid, attempt + 1), delay);
      } else if (attempt >= 5) {
        setError("Connection to server failed after 5 attempts. Please refresh.");
        setAwaitingAnswer(false);
        setBusy(false);
      }
    };

    ws.onmessage = (ev) => {
      try {
        const m = JSON.parse(ev.data as string);

        switch (m?.type) {
          // Backend is alive — safe to send messages now
          case "connected":
            wsReadyRef.current = true;
            console.log("[Chat] Backend ready");
            break;

          // Streaming starts
          case "start":
            streamBufferRef.current = "";
            citationBufferRef.current = [];
            setStreamingContent("");
            setAwaitingAnswer(true);
            break;

          // Incremental token
          case "token": {
            const tok: string = m.content ?? m.data ?? "";
            streamBufferRef.current += tok;
            setStreamingContent(streamBufferRef.current);
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 0);
            break;
          }

          // Stream complete
          case "done": {
            const finalContent = streamBufferRef.current;
            const finalCitations = citationBufferRef.current;
            streamBufferRef.current = "";
            citationBufferRef.current = [];
            setStreamingContent("");
            if (finalContent) {
              setMessages((prev) => [
                ...(Array.isArray(prev) ? prev : []),
                { role: "assistant", content: finalContent, at: Date.now(), citations: finalCitations.length ? finalCitations : undefined },
              ]);
              setTopic((t) => t || deriveTopicFromMarkdown(finalContent));
            }
            setAwaitingAnswer(false);
            setBusy(false);
            if (m.xp_earned) console.log("[Chat] XP earned:", m.xp_earned);
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 0);
            break;
          }

          // Legacy full-answer (non-streaming fallback)
          case "answer": {
            const norm = normalizePayload(m.answer);
            setMessages((prev) => [
              ...(Array.isArray(prev) ? prev : []),
              { role: "assistant", content: norm.md, at: Date.now() },
            ]);
            if (norm.topic) setTopic(norm.topic);
            else if (norm.md) setTopic((t) => t || deriveTopicFromMarkdown(norm.md));
            setStreamingContent("");
            setAwaitingAnswer(false);
            setBusy(false);
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 0);
            break;
          }

          // Citations from RAG pipeline
          case "citation":
            if (Array.isArray(m.data)) {
              citationBufferRef.current = m.data as CitationItem[];
            }
            break;

          // Heartbeat pong
          case "pong":
            console.log("[Chat] Pong received");
            break;

          // Error from backend
          case "error":
            console.error("[Chat] Server error:", m.message || m.error);
            setError(m.message || m.error || "Unknown server error");
            setStreamingContent("");
            streamBufferRef.current = "";
            setAwaitingAnswer(false);
            setBusy(false);
            break;

          default:
            console.log("[Chat] Unhandled WS msg type:", m?.type);
        }
      } catch (err) {
        console.error("[Chat] Failed to parse WS message:", err);
      }
    };
  };

  useEffect(() => {
    if (!chatId) return;
    connectWs(chatId);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      try {
        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
          wsRef.current.close(1000, "component unmount");
        }
      } catch { }
      wsRef.current = null;
      wsReadyRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) { setSelected(null); return; }
      const r = sel.getRangeAt(0);
      const rect = r.getBoundingClientRect();
      if (!rect || !r.toString().trim()) return;
      setSelected({ text: r.toString().trim(), x: rect.left + rect.width / 2 - 60 + window.scrollX, y: rect.bottom + window.scrollY });
    };
    const onDocClick = (e: any) => {
      const n = e.target as Node;
      if (selPopupRef.current && !selPopupRef.current.contains(n) && !window.getSelection()?.toString().trim()) setSelected(null);
    };
    document.addEventListener("mouseup", onSel);
    document.addEventListener("keyup", onSel);
    document.addEventListener("click", onDocClick);
    return () => {
      document.removeEventListener("mouseup", onSel);
      document.removeEventListener("keyup", onSel);
      document.removeEventListener("click", onDocClick);
    };
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 0);
  }, [Array.isArray(messages) ? messages.length : 0]);

  // Sources panel toggle (triggered by Sidebar icon via custom event)
  useEffect(() => {
    const h = () => setSourcesOpen((o) => !o);
    window.addEventListener("sources:toggle", h);
    return () => window.removeEventListener("sources:toggle", h);
  }, []);

  // Broadcast sources state to Sidebar for icon badge/active styling
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("sources:ui-state", {
      detail: { open: sourcesOpen, count: activeDocIds.length },
    }));
  }, [sourcesOpen, activeDocIds.length]);

  const sendFollowup = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    setError(null);
    setMessages((prev) => ([...(Array.isArray(prev) ? prev : []), { role: "user", content: text, at: Date.now() }]));
    setAwaitingAnswer(true);
    setBusy(true);
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 0);

    try {
      // Poll until WS is open AND backend sent "connected" signal (max 8 s)
      await new Promise<void>((resolve, reject) => {
        if (wsRef.current?.readyState === WebSocket.OPEN && wsReadyRef.current) {
          resolve(); return;
        }
        const start = Date.now();
        const poll = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN && wsReadyRef.current) {
            clearInterval(poll); resolve();
          } else if (Date.now() - start > 8_000) {
            clearInterval(poll);
            reject(new Error("WebSocket not ready — check backend is running on port 5000"));
          }
        }, 100);
      });

      const payload = { type: "message", question: text, doc_ids: activeDocIds.length > 0 ? activeDocIds : undefined };
      wsRef.current!.send(JSON.stringify(payload));
      console.log("[Chat] Sent:", payload);
    } catch (error: any) {
      console.error("[Chat] Error sending message:", error);
      setError(error.message || "Failed to send message");
      setAwaitingAnswer(false);
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initialQuestion && !state.answer && !hasSentInitialRef.current) {
      hasSentInitialRef.current = true;
      sendFollowup(initialQuestion);
    }
  }, [initialQuestion, state.answer]);

  const latestAssistantContent = useMemo(() => {
    const arr = Array.isArray(messages) ? messages : [];
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].role === "assistant") return arr[i].content;
    }
    return "";
  }, [messages]);

  useEffect(() => {
    if (latestAssistantContent) {
      const docTitle = topic || deriveTopicFromMarkdown(latestAssistantContent) || "Study Topic";
      const docId = chatId ? `chat:${chatId}` : "chat:current";
      setDocument({
        id: docId,
        title: docTitle,
        text: latestAssistantContent,
      });
    } else {
      setDocument(null);
    }
  }, [chatId, latestAssistantContent, setDocument, topic]);

  useEffect(() => {
    return () => setDocument(null);
  }, [setDocument]);

  const list = Array.isArray(messages) ? messages : [];

  return (
    <div className="flex flex-col min-h-screen w-full px-4 lg:pl-28 lg:pr-4">
      <div className="mt-20 lg:mt-6 mb-16">
        <div className="flex-1">
          <div className="w-full max-w-5xl mx-auto p-4 pt-2 pb-28">
            <div className="space-y-6">
              {list.map((m, i) => {
                const userBubble = "inline-block max-w-[85%] bg-stone-900/70 border border-zinc-800 rounded-2xl px-4 py-3";
                if (m.role === "assistant") {
                  const hasCitations = Array.isArray((m as ChatMessageWithCitations).citations) && (m as ChatMessageWithCitations).citations!.length > 0;
                  return (
                    <div key={i} className="w-full flex justify-start">
                      <div className="w-full mx-auto rounded-3xl bg-stone-950/90 border border-zinc-900 shadow-[0_10px_30px_rgba(0,0,0,0.45)] ring-1 ring-black/10 backdrop-blur px-6 md:px-8 py-6 md:py-8 max-w-[min(100%,1000px)]">
                        <div className="animate-[fadeIn_300ms_ease-out] leading-7 md:leading-8">
                          <MarkdownView md={m.content} />
                        </div>
                        {hasCitations && (
                          <CitationsBlock citations={(m as ChatMessageWithCitations).citations!} />
                        )}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={i} className="w-full flex justify-start">
                    <div className={userBubble}>
                      <div className="text-stone-200 whitespace-pre-wrap leading-relaxed">{m.content}</div>
                    </div>
                  </div>
                );
              })}
              {/* Live streaming bubble — visible while backend sends tokens */}
              {streamingContent && (
                <div className="w-full flex justify-start">
                  <div className="w-full mx-auto rounded-3xl bg-stone-950/90 border border-zinc-900 shadow-[0_10px_30px_rgba(0,0,0,0.45)] ring-1 ring-black/10 backdrop-blur px-6 md:px-8 py-6 md:py-8 max-w-[min(100%,1000px)]">
                    <div className="animate-[fadeIn_300ms_ease-out] leading-7 md:leading-8">
                      <MarkdownView md={streamingContent} />
                    </div>
                    <span className="inline-block w-1 h-4 bg-sky-400 ml-1 animate-pulse" />
                  </div>
                </div>
              )}
              {(connecting || (awaitingAnswer && !streamingContent)) && (
                <div className="w-full flex justify-start">
                  <LoadingIndicator label={connecting ? "Connecting…" : "Thinking…"} />
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {latestAssistantContent && !awaitingAnswer && (
              <ActionRow
                disabled={busy}
                onSummarize={() => sendFollowup("Summarize the previous answer into 5–7 concise bullet points with bolded keywords.")}
                onLearnMore={() => sendFollowup("Go deeper into this topic with advanced details, real-world examples, and a short analogy.")}
                onStartQuiz={() => {
                  const t = topic || deriveTopicFromMarkdown(latestAssistantContent) || "General";
                  router.push(`/quiz?topic=${encodeURIComponent(t)}`);
                }}
                onCreatePodcast={async () => {
                  try {
                    const topicContent = latestAssistantContent || topic || "Generated from chat";
                    const response = await podcastStart({ topic: topicContent });
                    router.push(`/tools?podcastPid=${encodeURIComponent(response.pid)}&podcastTopic=${encodeURIComponent(topicContent)}`);
                  } catch (error) {
                    console.error("Failed to create podcast:", error);
                  }
                }}
                onDebate={() => {
                  const t = topic || deriveTopicFromMarkdown(latestAssistantContent) || "General";
                  router.push("/debate");
                }}
              />
            )}
          </div>
        </div>

      </div>

      <SelectionPopup
        selected={selected}
        popupRef={selPopupRef}
        addNote={() => setSelected(null)}
        askDoubt={(text) => { const v = text.trim(); if (v) sendFollowup(v); setSelected(null); }}
      />

      <Composer
        disabled={busy}
        onSend={sendFollowup}
        onUploadClick={() => setSourcesOpen(true)}
        activeDocCount={activeDocIds.length}
      />
      <SourcesPanel
        open={sourcesOpen}
        onClose={() => setSourcesOpen(false)}
        activeDocIds={activeDocIds}
        onChangeDocIds={setActiveDocIds}
      />
      {error && (
        <div className="fixed bottom-24 right-6 bg-red-900/90 border border-red-700 rounded-xl p-4 text-red-200 shadow-lg max-w-md animate-[slideInUp_0.3s_ease-out] z-50">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1 font-medium">{error}</div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-200 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
