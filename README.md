# 🎓 AI Study Companion (স্মার্ট স্টাডি অ্যাসিস্ট্যান্ট)

> A modern, production-ready, full-stack AI learning companion and exam preparation platform designed for university and college students. Features multi-format document ingestion, RAG-grounded question answering with live SSE streaming, spaced repetition flashcards (SM-2), timed mock exam simulators, multi-level summarization, and complete English & Bangla bilingual localization.

---

## 🌟 Key Highlights

- **Dual-Engine AI Intelligence**:
  - **Google Gemini Integration**: Built with the official `@google/genai` SDK utilizing `gemini-3.8-flash` and `gemini-embedding-001` for deep reasoning, fast responses, and rich vector embeddings.
  - **Zero-Config Offline Fallback NLP Engine**: No Gemini API key? No problem! The application includes an offline heuristic NLP engine that generates real RAG answers, multi-level summaries, high-yield questions, MCQs with distractors, and flashcards directly from extracted document text and TF-IDF cosine similarity.
- **RAG-Grounded "Ask AI" Chat**:
  - Semantic vector search with cosine similarity and sliding window chunking (500 tokens, 100-token overlap).
  - Real-time Server-Sent Events (**SSE**) streaming with low-latency token delivery.
  - Precise source citations with clickable document badges, page numbers, and similarity confidence scores.
  - Quick action prompts (*"Summarize key formulas"*, *"Predict 5 exam questions"*, *"Explain for Viva"*).
- **Multi-Level Summaries & High-Yield Questions**:
  - Multi-tier summaries: **Short (Executive)**, **Medium (Core Concepts)**, **Detailed (Comprehensive)**, and **Exam-Focused (Revision Bullet Points)**.
  - Exam question prediction categorized by priority (**⭐⭐⭐ Very Important**, **⭐⭐ Important**, **⭐ Practice**) and format (**Short**, **Conceptual**, **Descriptive**, **Definitions**, **Problem-Solving**, **Viva Voce**).
- **Interactive Quizzes & Timed Mock Exam Simulator**:
  - Instant Practice mode with immediate feedback, explanations, and distractor breakdowns.
  - Timed Mock Exam mode with real-time countdown timer, question palette navigation grid, flag-for-review markers, unanswered warnings, and auto-submit.
  - Score reports with accuracy percentages, XP awards, confetti celebrations, and question-by-question review.
- **Spaced Repetition Flashcards (SuperMemo SM-2)**:
  - Scientific SM-2 algorithm calculating repetition intervals, ease factors, and due dates based on 4 response grades (**Again**, **Hard**, **Good**, **Easy**).
  - 3D perspective flip card animations with complete keyboard shortcuts (`[Space]` to flip, `[1-4]` to grade, arrow keys to navigate).
- **Smart AI Study Planner**:
  - Calculates daily study targets based on exam date countdowns and available daily study hours.
  - Generates structured day-by-day study tasks with completion checkboxes that reward students with gamification XP.
- **Personal Notes with Live Markdown Editor**:
  - Clean split-screen/toggle Markdown editor with live preview, syntax highlighting, and formatting toolbar.
  - One-click AI conversion: Convert personal lecture notes directly into a Flashcard Deck or Practice Quiz.
- **Progress Tracking & Gamification**:
  - 7-day study time activity chart, quiz accuracy trends, and weak vs. strong subject breakdown.
  - Level progression system (XP-based), daily study streak flame counter, and unlockable achievement badges.
- **Admin & Telemetry Dashboard**:
  - Real-time AI token usage and estimated cost telemetry.
  - Storage consumption breakdown (PDFs, DOCX, PPTX).
  - User management table with role management and system status indicators.
- **Bilingual English & Bangla Support (দ্বিভাষিক সমর্থন)**:
  - Complete UI translation with instant 1-click toggle between English and বাংলা (`Hind Siliguri` typography).
  - Bilingual AI output generation: Students can request explanations in English, Bangla, or a bilingual mix.
- **Dark Mode & Responsive Design**:
  - Light, Dark, and System-preference themes.
  - Fully responsive layout for mobile, tablet, and desktop with a dedicated mobile bottom navigation bar.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide React, Canvas Confetti |
| **Backend** | Node.js 24, Express, TypeScript, Native `node:sqlite` (WAL Mode & Busy Timeout) |
| **AI / NLP** | `@google/genai` (`gemini-3.8-flash`, `gemini-embedding-001`), TF-IDF Cosine Vectorizer |
| **Document Parsers**| `pdf-parse`, `mammoth` (DOCX), `adm-zip` (PPTX slide XML extraction), UTF-8 text chunkers |
| **Testing** | Vitest, Supertest (12 Integration & Unit tests, 100% pass rate) |

---

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js**: v20.0.0 or higher (tested on Node.js v24)
- **npm**: v10.0.0 or higher

### 1. Installation

Clone or open the project folder and install all workspace dependencies:

```bash
cd "/media/mursalin/New Volume(D)/versity_file/project"
npm install
```

### 2. Seed Demo Data

Initialize the SQLite database with 21 normalized tables, pre-configured university courses (*Compiler Design & Automata*, *Artificial Intelligence*, *Computer Networks*), sample lecture notes, flashcard decks, study plans, and student analytics:

```bash
npm run seed
```

### 3. Environment Variables (Optional)

The application includes an automatic offline NLP engine that works out of the box with zero external configuration. If you wish to use Google Gemini for enhanced AI capabilities, copy `.env.example` in `server/` or set `GEMINI_API_KEY`:

```bash
# In server/.env
PORT=5000
JWT_SECRET=super_secret_jwt_key_university_2026
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run Development Servers

Start both the backend server (`http://localhost:5000`) and the Vite client (`http://localhost:5173`) with a single command:

```bash
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## 🔑 Demo Login Credentials

The seed script creates two ready-to-use accounts. You can type them manually or click the **"Demo Student"** / **"Demo Admin"** quick login buttons on the login screen:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Student** | `student@versity.edu` | `password123` | Full access to materials, Ask AI, flashcards, quizzes, study planner, notes, analytics |
| **Admin / Instructor** | `admin@versity.edu` | `admin123` | All student features + Admin Console, AI usage telemetry, storage monitoring, user table |

---

## 🧪 Testing & Verification

The project includes an automated test suite verifying authentication, JWT validation, RAG similarity search, SM-2 spaced repetition calculation, and quiz grading:

```bash
# Run server test suite (Vitest)
npm test

# Build both client and server for production
npm run build

# Start single-port production server (serves frontend + backend on port 5000)
npm start
```

---

## 📁 Project Architecture

```
project/
├── client/                     # Vite + React 19 Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI (Sidebar, Navbar, BottomNav, GlobalSearchModal, Layout)
│   │   ├── context/            # Global State (Auth, Theme, Language, Notifications)
│   │   ├── i18n/               # English & Bangla localization strings
│   │   ├── services/           # Typed API Client with SSE streaming handler
│   │   ├── types/              # TypeScript models matching backend schema
│   │   ├── views/              # 14 Full Page Views:
│   │   │   ├── DashboardView.tsx
│   │   │   ├── SubjectsView.tsx & SubjectDetailView.tsx
│   │   │   ├── MaterialsView.tsx & MaterialDetailView.tsx
│   │   │   ├── AskAIView.tsx
│   │   │   ├── FlashcardsView.tsx
│   │   │   ├── QuizzesView.tsx & QuizActiveView.tsx
│   │   │   ├── StudyPlannerView.tsx
│   │   │   ├── NotesView.tsx
│   │   │   ├── ProgressAnalyticsView.tsx
│   │   │   ├── AdminView.tsx
│   │   │   ├── LoginView.tsx & RegisterView.tsx
│   │   │   └── SettingsView.tsx
│   │   ├── App.tsx             # Routing table with role-based auth protection
│   │   └── main.tsx            # Root entry point
│   ├── package.json
│   └── vite.config.ts
│
├── server/                     # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── db/
│   │   │   ├── connection.ts   # Native node:sqlite in WAL mode with busy_timeout
│   │   │   ├── schema.ts       # 21 normalized tables with indexes
│   │   │   └── seed.ts         # Academic course seeding script
│   │   ├── middleware/         # Auth JWT verification & Error handlers
│   │   ├── routes/             # REST API & SSE streaming endpoints
│   │   │   ├── authRoutes.ts
│   │   │   ├── subjectRoutes.ts
│   │   │   ├── materialRoutes.ts
│   │   │   ├── aiRoutes.ts     # RAG chat, summaries, question generator
│   │   │   ├── quizRoutes.ts   # Quizzes and mock exam submission
│   │   │   ├── flashcardRoutes.ts # SM-2 spaced repetition updates
│   │   │   ├── studyPlanRoutes.ts
│   │   │   ├── noteRoutes.ts
│   │   │   ├── searchRoutes.ts # Unified search across notes, materials, courses
│   │   │   ├── analyticsRoutes.ts
│   │   │   └── adminRoutes.ts
│   │   ├── services/
│   │   │   ├── textExtractor.ts# PDF, DOCX, PPTX, TXT, MD parser
│   │   │   ├── chunker.ts      # Recursive chunker with section header extraction
│   │   │   ├── vectorStore.ts  # In-memory cosine similarity & TF-IDF indexer
│   │   │   ├── spacedRepetition.ts # SuperMemo SM-2 algorithm implementation
│   │   │   └── ai/
│   │   │       ├── aiInterface.ts
│   │   │       ├── geminiProvider.ts # Google GenAI SDK integration
│   │   │       ├── offlineFallbackProvider.ts # Heuristic local NLP engine
│   │   │       └── aiService.ts # Provider factory with automatic fallback
│   │   ├── index.ts            # Express server entry point & static SPA host
│   │   └── config.ts           # Centralized runtime configuration
│   ├── test/                   # Vitest unit & integration test suites
│   ├── package.json
│   └── tsconfig.json
│
└── package.json                # Monorepo workspaces & orchestration scripts
```

---

## 💡 Keyboard Shortcuts

- `Ctrl + K` or `Cmd + K`: Open Global Search modal from anywhere in the app.
- **Flashcard Study Mode**:
  - `[Space]` or `[Enter]`: Flip active flashcard between Question and Answer.
  - `[1]`: Grade card as **Again** (reset interval).
  - `[2]`: Grade card as **Hard** (shorter interval).
  - `[3]`: Grade card as **Good** (standard interval).
  - `[4]`: Grade card as **Easy** (longer interval).
  - `[←]` / `[→]`: Navigate to Previous / Next card.

---

## 🔒 Security & Performance Features

1. **Native SQLite Performance**: Leverages Node.js 24's native `node:sqlite` with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) and synchronous normal for ultra-fast concurrent reads and writes without binary gyp dependencies.
2. **Password Hashing**: `bcryptjs` salted password hashing with 10 salt rounds.
3. **Stateless JWT Authentication**: Secure HTTP Bearer tokens with configurable expiration and middleware verification.
4. **Resilient Vector Retrieval**: Precomputes chunk token counts and headings so students receive cited snippets with line-accurate reference points.
5. **Rate Limiting & Cost Safeguards**: AI usage telemetry logs prompt tokens, completion tokens, and model identifiers into the SQLite database for administrator auditing.

---

## 📄 License

MIT License. Designed with ❤️ for university and college students preparing for academic excellence.
