-- Mentora Database Schema
-- Run: psql -U mentora_user -d mentora -f schema.sql

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Schools ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    board VARCHAR(50),   -- CBSE | ICSE | State
    city VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'student',  -- student | teacher | parent | admin
    grade VARCHAR(20),
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ── Documents ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(500) NOT NULL,
    original_name VARCHAR(500),
    subject VARCHAR(100),
    grade VARCHAR(20),
    title VARCHAR(500),
    page_count INTEGER DEFAULT 0,
    file_size_kb INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'processing',  -- processing | ready | failed
    chroma_collection_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ── Chat History ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chat_id VARCHAR(255) NOT NULL,
    doc_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL,   -- user | assistant
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- ── Migrations (idempotent column additions) ──────────────────────────────────
ALTER TABLE documents ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT '[]';

-- ── Chats (sessions) ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chats (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500),
    doc_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ── Quizzes ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    doc_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    topic VARCHAR(500),
    questions JSONB NOT NULL DEFAULT '[]',
    difficulty VARCHAR(20) DEFAULT 'medium',
    num_questions INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    answers JSONB DEFAULT '[]',
    score INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    completed_at TIMESTAMP DEFAULT NOW()
);

-- ── Flashcards ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    doc_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    tag VARCHAR(255) DEFAULT '',
    difficulty VARCHAR(20) DEFAULT 'medium',
    next_review TIMESTAMP,
    review_count INTEGER DEFAULT 0,
    created BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ── Debates ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debate_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    doc_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    topic TEXT NOT NULL,
    position VARCHAR(20) DEFAULT 'for',       -- user position: for | against
    history JSONB DEFAULT '[]',
    winner VARCHAR(20),                        -- user | ai | draw
    analysis JSONB,
    status VARCHAR(50) DEFAULT 'active',       -- active | completed | user_surrendered | ai_conceded
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ── Exams ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    sections JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id VARCHAR(255) UNIQUE NOT NULL,
    exam_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    questions JSONB NOT NULL DEFAULT '[]',
    answers JSONB DEFAULT '[]',
    score INTEGER,
    grade VARCHAR(5),
    duration_minutes INTEGER DEFAULT 60,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- ── Planner Tasks ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planner_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    course VARCHAR(100),
    type VARCHAR(50) DEFAULT 'task',
    notes TEXT,
    due_at BIGINT,
    est_mins INTEGER DEFAULT 60,
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    status VARCHAR(20) DEFAULT 'todo',   -- todo | doing | done | blocked
    tags JSONB DEFAULT '[]',
    steps JSONB DEFAULT '[]',
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
    updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
);

CREATE TABLE IF NOT EXISTS planner_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    start_time BIGINT NOT NULL,
    end_time BIGINT NOT NULL,
    kind VARCHAR(20) DEFAULT 'focus',   -- focus | review | buffer
    done BOOLEAN DEFAULT FALSE
);

-- ── Smart Notes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS smart_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    doc_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    format VARCHAR(50) DEFAULT 'bullet',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ── Gamification ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_gamification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    badges JSONB DEFAULT '[]',
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_active DATE,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ── Podcasts ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS podcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pid VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    doc_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    topic TEXT,
    script TEXT,
    audio_url VARCHAR(500),
    duration_seconds INTEGER,
    style VARCHAR(50) DEFAULT 'educational',
    status VARCHAR(50) DEFAULT 'generating',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ── Transcriptions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transcriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(500),
    transcript TEXT,
    study_materials JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
