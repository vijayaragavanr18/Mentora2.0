/**
 * Mentora API Service
 * All calls go to FastAPI backend on localhost:5000 (proxied through Vite)
 */

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:5000";

// ── Token helpers ──────────────────────────────────────────────────────────────
export function getToken(): string | null {
  return localStorage.getItem("mentora_token");
}

export function setToken(token: string) {
  localStorage.setItem("mentora_token", token);
}

export function clearToken() {
  localStorage.removeItem("mentora_token");
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function req<T>(
  url: string,
  opts: RequestInit & { timeout?: number } = {}
): Promise<T> {
  const { timeout = 300_000, ...fetchOpts } = opts;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...fetchOpts, signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      let detail = text;
      try {
        detail = JSON.parse(text)?.detail ?? text;
      } catch (_) { /* not JSON — use raw text */ }
      throw new Error(String(detail));
    }
    if (res.status === 204) return undefined as unknown as T;
    return res.json();
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface UploadedDocument {
  id: string;
  filename: string;
  original_name: string;
  subject?: string;
  grade?: string;
  title?: string;
  page_count: number;
  file_size_kb: number;
  status: string;
  chroma_collection_id?: string;   // "doc_<uuid>" — use this for RAG queries
  created_at: string;
  summary?: string;
  faq?: string[];
}

export interface QuizChoice {
  label: string;  // "A", "B", "C", "D"
  text: string;
}

export interface QuizQuestion {
  id: string;
  type: string;
  question: string;
  choices: QuizChoice[];
  answer: string;       // correct label, e.g. "A"
  explanation?: string;
  topic?: string;
}

export interface QuizResponse {
  quiz_id: string;
  topic: string;
  questions: QuizQuestion[];
}

export interface PlannerTask {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  due_date?: string;
  status: "pending" | "in_progress" | "done";
  priority?: string;
  created_at: string;
}

export interface FlashcardModel {
  id?: string;
  question: string;
  answer: string;
  tag: string;
  difficulty?: string;
}

export interface SavedFlashcard extends FlashcardModel {
  id: string;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  name: string;
  xp: number;
  level: number;
  badge?: string;
}

export interface GamificationProfile {
  user_id: string;
  xp: number;
  level: number;
  badges: string[];
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export async function authRegister(
  name: string,
  email: string,
  password: string
): Promise<TokenResponse> {
  return req<TokenResponse>(`${BACKEND}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
}

export async function authLogin(
  email: string,
  password: string
): Promise<TokenResponse> {
  return req<TokenResponse>(`${BACKEND}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function authMe(): Promise<AuthUser> {
  return req<AuthUser>(`${BACKEND}/api/auth/me`, {
    headers: authHeaders(),
  });
}

// ── Documents / Upload ─────────────────────────────────────────────────────────

export async function uploadDocument(
  file: File,
  opts: { subject?: string; grade?: string; title?: string } = {}
): Promise<UploadedDocument> {
  const form = new FormData();
  form.append("file", file, file.name);
  if (opts.subject) form.append("subject", opts.subject);
  if (opts.grade) form.append("grade", opts.grade);
  if (opts.title) form.append("title", opts.title || file.name);

  const token = getToken();
  const res = await fetch(`${BACKEND}/api/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json();
}

export async function listDocuments(): Promise<UploadedDocument[]> {
  return req<UploadedDocument[]>(`${BACKEND}/api/documents`, {
    headers: authHeaders(),
  });
}

export async function deleteDocument(docId: string): Promise<void> {
  return req<void>(`${BACKEND}/api/documents/${encodeURIComponent(docId)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

// ── Chat ───────────────────────────────────────────────────────────────────────

/**
 * Open a WebSocket chat session. Returns the WebSocket instance.
 * Usage:
 *   const ws = openChatWS();
 *   ws.send(JSON.stringify({ message: "hello", doc_id: "..." }));
 *   ws.onmessage = (e) => { ... }
 */
export function openChatWS(chatId?: string): WebSocket {
  const token = getToken();
  const params = new URLSearchParams();
  if (chatId) params.set("chat_id", chatId);
  if (token) params.set("token", token);
  const qs = params.toString();
  return new WebSocket(`${WS_BASE}/ws/chat${qs ? `?${qs}` : ""}`);
}

/**
 * Send a chat message via SSE streaming (returns the Response body stream).
 */
export async function chatSSE(
  message: string,
  opts: { doc_id?: string; chat_id?: string } = {}
): Promise<Response> {
  const token = getToken();
  return fetch(`${BACKEND}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, ...opts }),
  });
}

/**
 * Non-streaming JSON chat — returns the full assistant reply at once.
 */
export interface Citation {
  index: number;
  score: number;
  text: string;
  doc_id: string;
  page?: number;
}

export async function chatJSON(
  message: string,
  opts: { doc_id?: string; doc_ids?: string[]; chat_id?: string } = {}
): Promise<{ reply: string; chat_id: string; citations?: Citation[] }> {
  const raw = await req<{ reply?: string; response?: string; chat_id: string; citations?: Citation[] }>(`${BACKEND}/chats`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ message, ...opts }),
  });
  return { reply: raw.reply ?? raw.response ?? "", chat_id: raw.chat_id, citations: raw.citations ?? [] };
}

// ── Quiz ───────────────────────────────────────────────────────────────────────

export async function generateQuiz(
  topic: string,
  opts: { num_questions?: number; n?: number; doc_id?: string; difficulty?: string } = {}
): Promise<QuizResponse> {
  const { num_questions, ...rest } = opts;
  const payload = { topic, n: opts.n ?? num_questions ?? 10, ...rest };
  return req<QuizResponse>(`${BACKEND}/quiz`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

// ── Flashcards ─────────────────────────────────────────────────────────────────

export async function generateFlashcards(
  topic: string,
  n = 10
): Promise<{ ok: boolean; flashcards: FlashcardModel[] }> {
  return req<{ ok: boolean; flashcards: FlashcardModel[] }>(
    `${BACKEND}/flashcards`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ topic, n }),
    }
  );
}

export async function listFlashcards(): Promise<{
  ok: boolean;
  flashcards: SavedFlashcard[];
}> {
  return req<{ ok: boolean; flashcards: SavedFlashcard[] }>(
    `${BACKEND}/flashcards`,
    { headers: authHeaders() }
  );
}

export async function createFlashcard(card: {
  question: string;
  answer: string;
  tag: string;
}): Promise<{ ok: boolean; flashcard: SavedFlashcard }> {
  return req<{ ok: boolean; flashcard: SavedFlashcard }>(
    `${BACKEND}/flashcards`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(card),
    }
  );
}

export async function deleteFlashcard(id: string): Promise<void> {
  return req<void>(`${BACKEND}/flashcards/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

// ── Planner / Tasks ────────────────────────────────────────────────────────────

export async function listTasks(
  params: { status?: string } = {}
): Promise<PlannerTask[]> {
  const qs = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined)
    ) as Record<string, string>
  ).toString();
  return req<PlannerTask[]>(`${BACKEND}/tasks${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(),
  });
}

export async function createTask(data: {
  title: string;
  description?: string;
  subject?: string;
  due_date?: string;
  priority?: string;
}): Promise<PlannerTask> {
  return req<PlannerTask>(`${BACKEND}/tasks`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function updateTask(
  id: string,
  data: { title?: string; status?: string; done?: boolean }
): Promise<PlannerTask> {
  return req<PlannerTask>(`${BACKEND}/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function deleteTask(id: string): Promise<void> {
  return req<void>(`${BACKEND}/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export async function ingestTaskFromText(text: string): Promise<PlannerTask> {
  return req<PlannerTask>(`${BACKEND}/tasks/ingest`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ text }),
  });
}

// ── Gamification ───────────────────────────────────────────────────────────────

export async function getGamificationProfile(): Promise<GamificationProfile> {
  return req<GamificationProfile>(`${BACKEND}/api/gamification/profile`, {
    headers: authHeaders(),
  });
}

export async function getLeaderboard(
  limit = 20
): Promise<LeaderboardEntry[]> {
  return req<LeaderboardEntry[]>(
    `${BACKEND}/api/gamification/leaderboard?limit=${limit}`,
    { headers: authHeaders() }
  );
}

export async function awardPoints(
  action: string,
  xp = 10
): Promise<GamificationProfile> {
  return req<GamificationProfile>(`${BACKEND}/api/gamification/award`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ action, xp }),
  });
}

// ── Debate ─────────────────────────────────────────────────────────────────────

export async function startDebate(
  topic: string,
  stance: string
): Promise<{ debate_id: string; opening: string }> {
  return req<{ debate_id: string; opening: string }>(
    `${BACKEND}/debate/start`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ topic, stance }),
    }
  );
}

export async function argueDebate(
  debateId: string,
  argument: string
): Promise<{ response: string; analysis?: string }> {
  return req<{ response: string; analysis?: string }>(
    `${BACKEND}/debate/argue`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ debate_id: debateId, argument }),
    }
  );
}

// ── Tools ──────────────────────────────────────────────────────────────────────

export async function generateSmartNotes(
  topic: string,
  doc_id?: string
): Promise<{ notes: string }> {
  return req<{ notes: string }>(`${BACKEND}/smartnotes`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ topic, doc_id }),
  });
}

/**
 * NotebookLM-style content generation.
 * type: "summary" | "study-guide" | "faq" | "briefing" | "timeline" | "outline" | "quiz" | "flashcards"
 */
export async function generateContent(
  type: string,
  doc_ids: string[],
  topic?: string
): Promise<{ type: string; content: string }> {
  return req<{ type: string; content: string }>(`${BACKEND}/generate`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ type, doc_ids, topic }),
  });
}

export async function generatePodcast(
  topic: string,
  opts: { doc_ids?: string[]; doc_id?: string; style?: string } = {}
): Promise<{ audio_url: string; script?: string; podcast_id?: string }> {
  return req<{ audio_url: string; script?: string; podcast_id?: string }>(`${BACKEND}/podcast`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ topic, ...opts }),
  });
}

export async function transcribeAudio(
  file: File
): Promise<{ transcript: string }> {
  const form = new FormData();
  form.append("file", file, file.name);
  const token = getToken();
  const res = await fetch(`${BACKEND}/transcriber`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Exam ───────────────────────────────────────────────────────────────────────

export async function listExams(): Promise<
  { id: string; name: string; sections: unknown[] }[]
> {
  const data = await req<{
    ok: boolean;
    exams: { id: string; name: string; sections: unknown[] }[];
  }>(`${BACKEND}/exams`, { headers: authHeaders() });
  return data.exams ?? [];
}

export async function startExam(
  examId: string
): Promise<{ runId: string; stream: string }> {
  const data = await req<{ ok: boolean; runId: string; stream: string }>(
    `${BACKEND}/exam`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ examId }),
    }
  );
  return data;
}
