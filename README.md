# 🎓 AI Study Companion (স্মার্ট স্টাডি অ্যাসিস্ট্যান্ট)

> A modern, production-ready, full-stack AI learning companion and exam preparation platform designed for university and college students. Features multi-format document ingestion, RAG-grounded question answering with live SSE streaming, spaced repetition flashcards (SM-2), timed mock exam simulators, multi-level summarization, and complete English & Bangla bilingual localization.

---

## 🌟 Key Highlights

- **Mathematical & Scientific LaTeX Engine (KaTeX)**:
  - Full mathematical typesetting for inline equations (e.g. `$E=mc^2$`) and block equations (e.g. `$$\int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$`).
  - Dark-mode code blocks with syntax highlighting, language badges, and 1-click copy to clipboard.
  - Enhanced markdown tables, academic blockquotes, and definition callouts across Notes, Ask AI, and Summaries.
- **Academic Export Suite (Anki, PDF, Markdown, Mock Exam Paper)**:
  - **Anki Flashcard Export**: Tab-separated `.txt` export with `#separator:tab` headers ready for 1-click import into Anki decks.
  - **Printable A4 PDF Documents**: Custom-styled printable view (`@page { size: A4; margin: 18mm }`) for lecture notes, summaries, and revision guides.
  - **University-Style Mock Exam Sheets**: 1-click printable exam sheets complete with student header, ID/Roll boxes, bubble answer sheets `(A) [ ] (B) [ ]`, and a separate page-break answer key with conceptual explanations.
  - **Markdown Export**: Direct `.md` file downloads for personal obsidian or note-taking vaults.
- **Multimodal Note & Blackboard Ingestion (OCR)**:
  - Upload photos of whiteboards, handwritten class notes, diagram sketches, and slide captures (`.png, .jpg, .jpeg, .webp`).
  - Multimodal OCR powered by Gemini 3.8 Flash converts handwriting and math diagrams into clean, structured Markdown and LaTeX formulas.
  - Visual image preview cards with zoom controls in study materials.
- **Voice Assistant & Audio Study Mode (STT & TTS)**:
  - **Speech-to-Text (STT) Voice Dictation**: Hands-free voice questioning in Ask AI using the Web Speech Recognition API with real-time audio waveform indicators.
  - **Text-to-Speech (TTS) Read-Aloud**: Auditory study mode on Flashcards (Front/Back), AI chat answers, and Course Material Summaries with bilingual voice selection (English and Bangla) and intelligent sanitization of markdown/LaTeX tokens.
- **Containerization & CI/CD Pipeline**:
  - Production multi-stage `Dockerfile` (Node 22 Alpine) serving API endpoints, uploads, and static React SPA bundle in a single container.
  - `docker-compose.yml` with volume persistence for SQLite database (`study_companion_data`) and student files (`study_companion_uploads`).
  - Automated GitHub Actions CI workflow (`.github/workflows/ci.yml`) validating TypeScript compilation and executing the test suite on push/pull request.

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

### 5. Run with Docker & Docker Compose (Production Setup)

Spin up the containerized full-stack service with SQLite volume persistence:

```bash
# 1. Build and launch container in background
docker compose up -d --build

# 2. Check health and running status
docker compose ps

# 3. View live server logs
docker compose logs -f

# 4. Stop containers
docker compose down
```

The production container will be live at **`http://localhost:5000`**.

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
