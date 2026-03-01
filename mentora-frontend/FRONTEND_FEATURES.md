# PageLM – Frontend Features Documentation

## Overview

**PageLM (Mentora)** is a Next.js 16 AI-powered learning platform. The frontend is a single Next.js app (`localhost:3000`) that communicates with a separate AI backend (`localhost:5000`) via REST API and WebSockets. Without the backend running, all AI features will show a NetworkError.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.6 (App Router + Turbopack) |
| Language | TypeScript 5.9 |
| UI | React 19 + Tailwind CSS 4 |
| Markdown | react-markdown + remark-gfm + remark-math + rehype-katex + rehype-highlight |
| Routing | Next.js App Router (`useRouter`, `useSearchParams`) |
| Real-time | WebSocket (for streaming AI responses) |
| Charts/Graph | d3-force (planner mindmap) |

---

## Project Structure

```
pagelm/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # → Landing
│   ├── chat/page.tsx           # → Chat view
│   ├── quiz/page.tsx           # → Quiz view
│   ├── debate/page.tsx         # → Debate view
│   ├── exam/page.tsx           # → Exam Lab view
│   ├── planner/page.tsx        # → Planner view
│   ├── cards/page.tsx          # → Flash Cards view
│   └── tools/page.tsx          # → Tools view
├── src/
│   ├── views/                  # Full-page view components
│   ├── components/             # Reusable UI components
│   │   ├── Chat/               # Chat sub-components
│   │   ├── Companion/          # AI companion dock
│   │   ├── Landing/            # Landing page pieces
│   │   ├── planner/            # Planner + mindmap
│   │   ├── Quiz/               # Quiz sub-components
│   │   └── Tools/              # Tool panels
│   ├── lib/api.ts              # All backend API calls
│   └── config/env.ts           # Environment config
```

---

## Pages & Features

### 1. Landing Page (`/`)

**File:** `src/views/Landing.tsx`

The home screen where users start their learning session.

**Features:**
- **Prompt Box** – Text input to type any learning question
- **Prompt Mode Toggle** – Switch between `Chat` mode and `Quiz` mode before sending
- **Response Length** – Choose `Short` / `Medium` / `Long` AI responses
- **File Upload** – Attach a file (PDF, image, etc.) to your prompt via click or drag-and-drop
- **Prompt Rail** – Scrolling carousel of pre-made prompt suggestions (auto-cycles every 3.5s); click one to instantly start a chat
- **Explore Topics** – Visual topic cards (History, Geography, Music, Art, Technology, Philosophy) — click any card to start a lesson on that topic
- **Error Toast** – Shows connection error if the backend is unreachable

**API calls:** `POST /chat` (text or multipart)

---

### 2. Chat (`/chat`)

**File:** `src/views/Chat.tsx`

The main AI conversation interface with real-time streaming responses.

**Features:**
- **Streaming answers** – AI response streams in real-time via WebSocket (`/ws/chat`)
- **Chat history** – Loads previous messages for an existing chat session
- **Follow-up actions** (appear after each AI answer):
  - **Summarize** – Ask AI to condense the previous answer into 5–7 bullet points
  - **Learn More** – Ask AI for deeper/advanced details
  - **Start Quiz** – Jump to Quiz page on the current topic
  - **Create Podcast** – Generate an audio podcast from the chat content
  - **Debate** – Start a debate on the topic
- **Flash Cards** – AI-generated flashcards appear inline below the AI answer; add them to your Learning Bag
- **Selection Popup** – Highlight any text in the AI response to get options (e.g. save as note)
- **Learning Bag** – A drawer (FAB button) to collect saved flashcards and notes across sessions
- **File upload in chat** – Attach files when sending a follow-up message
- **Composer** – Auto-resizing textarea with keyboard shortcut (`Enter` to send, `Shift+Enter` for newline)
- **Loading indicator** – Shown while AI is generating
- **Companion integration** – Sets the current document context for the AI Companion dock

**API calls:** `POST /chat`, `GET /chats`, `GET /chats/:id`, `WS /ws/chat`, `POST /flashcards`, `GET /flashcards`, `DELETE /flashcards/:id`, `POST /podcast`

---

### 3. Quiz (`/quiz`)

**File:** `src/views/Quiz.tsx`

AI-generated multiple-choice quizzes on any topic.

**Features:**
- **Topic input** – Enter any subject to generate a quiz
- **AI-generated questions** – Streamed via WebSocket (`/ws/quiz`); each question has 4 options, a hint, and an explanation
- **Hint system** – Reveal a hint before answering
- **Instant feedback** – After answering, shows whether you were correct + full explanation
- **Progress tracking** – Question counter and running score displayed at top
- **Results panel** – On completion shows:
  - Score percentage with visual rating (🏆 Excellent / 🎉 Great / 📚 Good / 💪 Keep going)
  - Option to Retake, Review answers, or start a New Topic
- **Review modal** – Full breakdown of every question: your answer vs correct answer + explanation
- **URL persistence** – Topic is saved in URL query string so the page is shareable/refreshable

**API calls:** `POST /quiz`, `WS /ws/quiz`

---

### 4. Debate (`/debate`)

**File:** `src/views/Debate.tsx`

Structured AI debate where the user argues against an AI opponent.

**Features:**
- **Topic input** – Enter any debatable topic
- **Side selection** – Choose to argue "For" or "Against" (AI takes the opposite side)
- **Real-time streaming** – AI counter-arguments stream in via WebSocket
- **Turn-based arguing** – Submit your argument, AI responds, repeat
- **Auto-scroll** – Chat scrolls to latest message automatically
- **Surrender option** – User can concede the debate at any time
- **Post-debate analysis** – AI generates a full analysis including:
  - Winner declaration (User / AI / Draw)
  - User strengths & weaknesses
  - AI strengths & weaknesses
  - Key moments in the debate
  - Overall assessment
- **New Debate** – Start a fresh debate after finishing

**API calls:** `POST /debate/start`, `POST /debate/:id/argue`, `GET /debate/:id`, `POST /debate/:id/surrender`, `POST /debate/:id/analyze`, `WS /ws/debate`

---

### 5. Exam Lab (`/exam`)

**File:** `src/views/examlab.tsx`

Timed exam simulations based on real exam formats.

**Features:**
- **Exam selection** – Browse available exams (fetched from backend)
- **Exam runner** – Streams exam questions via WebSocket (`/ws/exams`)
- **Multiple choice questions** – Same UI as Quiz (hint, explanation, progress)
- **Results panel** – Score + review modal (reuses Quiz components)
- **Back navigation** – Return to exam list

**API calls:** `GET /exams`, `POST /exam`, `WS /ws/exams`

---

### 6. Planner (`/planner`)

**File:** `src/views/Planner.tsx` + `src/components/planner/`

AI-powered study task planner with a visual mindmap.

**Sub-components:**

#### Planner List (`Planner.tsx`)
- **Task list** – Shows all study tasks with title, course, due date, priority, status
- **Status filters** – Filter by `todo` / `doing` / `done` / `blocked`
- **Task cards** – Each shows priority badge, due date, estimated time, tags
- **CRUD** – Create, update, delete tasks
- **Mindmap toggle** – Switch to interactive mindmap view

#### Quick Add (`QuickAdd.tsx`)
- Natural language task creation (e.g. "Study calculus chapter 3 by Friday")
- File attachment support when creating tasks
- AI parses the text into a structured task

#### Today's Focus (`TodayFocus.tsx`)
- Shows tasks due today or overdue
- Fetches from backend filtered by due date

#### Planner Mindmap (`PlannerMindmap.tsx`)
- Interactive force-directed graph (d3-force) showing task relationships
- Nodes represent tasks; edges show dependencies/connections
- Animated physics simulation
- Click node to focus on a task

**API calls:** `GET /tasks`, `POST /tasks`, `PATCH /tasks/:id`, `DELETE /tasks/:id`, `POST /tasks/:id/plan`, `POST /planner/weekly`, `POST /tasks/:id/materials`, `POST /tasks/:id/files`, `DELETE /tasks/:id/files/:fileId`, `POST /tasks/ingest`, `WS /ws/planner`

---

### 7. Flash Cards (`/cards`)

**File:** `src/views/FlashCards.tsx`

Personal learning bag — a collection of all saved flashcards.

**Features:**
- **Card list** – All saved flashcards sorted by newest first
- **Question / Answer display** – Each card shows Q and A
- **Tag display** – Cards are tagged by topic
- **Delete card** – Remove individual cards
- **Back navigation** – Return to previous page

**API calls:** `GET /flashcards`, `DELETE /flashcards/:id`

---

### 8. Tools (`/tools`)

**File:** `src/views/Tools.tsx` + `src/components/Tools/`

A collection of AI-powered study utilities.

#### Podcast Generator (`PodcastGenerator.tsx`)
- Enter a topic to generate a full AI narrated podcast
- Real-time phase updates via WebSocket (`/ws/podcast`): script → audio generation → ready
- Download the generated `.mp3` file
- Supports being pre-loaded with a topic passed from Chat page

#### Smart Notes (`SmartNotes.tsx`)
- Input a topic or paste notes
- AI generates structured smart notes via WebSocket stream (`/ws/smartnotes`)
- Phases: outline → content → formatting

#### Transcriber (`Transcriber.tsx`)
- Upload an audio file (lecture recording, voice memo, etc.)
- AI transcribes it and generates study materials:
  - Summary
  - Key points
  - Topics list
  - Study guide (main concepts, important terms, practice questions, takeaways)
  - Timestamped content markers

#### Coming Soon (`ComingSoon.tsx`)
- Placeholder cards for future tools

**API calls:** `POST /podcast`, `WS /ws/podcast`, `POST /smartnotes`, `WS /ws/smartnotes`, `POST /transcriber`

---

## Persistent UI Components

### Sidebar (`Sidebar.tsx`)
- Always visible navigation with icons for all routes: Home, Chat, Quiz, Debate, Exam, Planner, Cards, Tools
- Highlights active route
- Responsive: collapses on mobile

### AI Companion Dock (`CompanionDock.tsx`)
- Floating panel available on every page
- Contextual AI assistant that knows the current document/topic being viewed
- Chat history within the session
- Can answer questions about the current page content

### CompanionProvider (`CompanionProvider.tsx`)
- React context that tracks what document/topic is currently active
- Used by views to tell the Companion what context to use

### Error Boundary (`ErrorBoundary.tsx`)
- Wraps all pages and the root layout
- Catches JS runtime errors and shows a fallback instead of a blank screen

### Mobile Header (`MobileHeader.tsx`)
- Top navigation bar shown on small screens

### Model Toolbar (`ModelToolbar.tsx`)
- AI model selector / settings bar shown in chat-like views
- Lets user pick file and configure model options

---

## API Communication

All backend communication is in `src/lib/api.ts`.

### REST (HTTP)
Used for: starting sessions, CRUD operations, fetching lists.

### WebSocket (Real-time Streaming)
Used for: streaming AI responses as they generate.

| WebSocket Endpoint | Used For |
|---|---|
| `WS /ws/chat` | Streaming chat answers |
| `WS /ws/quiz` | Streaming quiz questions |
| `WS /ws/exams` | Streaming exam questions |
| `WS /ws/debate` | Streaming debate responses |
| `WS /ws/podcast` | Streaming podcast generation |
| `WS /ws/smartnotes` | Streaming smart note generation |
| `WS /ws/planner` | Planner real-time task events |

---

## Environment Configuration

**File:** `src/config/env.ts`

```ts
export const env = {
  backend: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000",
  timeout: Number(process.env.NEXT_PUBLIC_TIMEOUT || 90000),
}
```

To point at a different backend, create a `.env.local` file:

```env
NEXT_PUBLIC_BACKEND_URL=http://your-backend-host:5000
NEXT_PUBLIC_TIMEOUT=90000
```

---

## Routes Summary

| Route | View | Description |
|---|---|---|
| `/` | Landing | Home / prompt entry |
| `/chat` | Chat | AI conversation |
| `/quiz` | Quiz | Multiple choice quiz |
| `/debate` | Debate | Structured AI debate |
| `/exam` | ExamLab | Timed exam simulation |
| `/planner` | Planner | Study task planner + mindmap |
| `/cards` | FlashCards | Saved flashcard library |
| `/tools` | Tools | Podcast, Smart Notes, Transcriber |

---

## Known Limitations (Without Backend)

All AI features require the backend server running on `localhost:5000`. Without it:

- Every button that triggers AI will throw `NetworkError when attempting to fetch resource`
- Static UI (sidebar, navigation, layout) works fine
- No data is persisted (no database on frontend)
