# 💻 Tech Job Hunters — Frontend Application

A modern, responsive, and reactive web application built with **React 19**, **Vite**, **TypeScript**, and **Tailwind CSS**. Designed specifically for software engineers, developers, and tech professionals to hunt positions across 7 major job platforms, analyze live skill demand, and measure their resume alignment mathematically.

---

## 🏛️ Application & Component Architecture

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                App Shell & AuthGuard                              │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            ▼                             ▼                             ▼
   ┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
   │   Landing Page  │           │   Sign In Page  │           │   Sign Up Page  │
   │  (Hero & Intro) │           │  (JWT Session)  │           │  (New Account)  │
   └─────────────────┘           └─────────────────┘           └─────────────────┘
                                          │
                                          ▼ Authenticated
┌───────────────────────────────────────────────────────────────────────────────────┐
│                             Main Dashboard Workspace                             │
│                                                                                   │
│  ┌───────────────────────┐  ┌──────────────────────────────────────────────────┐  │
│  │   Collapsible Sidebar │  │                   Active Views                   │  │
│  │                       │  │                                                  │  │
│  │  • Discover Jobs      │  │  1. Discover Jobs View:                          │  │
│  │  • Market Analytics   │  │     • Query & City Inputs                        │  │
│  │  • Resume Profile     │  │     • Advanced Controls Bar (Sort/Filter/Min %)  │  │
│  │  • Saved Jobs         │  │     • 7 Source Filter Pills                      │  │
│  │  • Visited Jobs       │  │     • Interactive Job Cards with Match Badges    │  │
│  │  • Logout             │  │     • Matched vs Missing Skill Chips (Filterable)│  │
│  │                       │  │     • Export to CSV & JSON Buttons               │  │
│  │                       │  │                                                  │  │
│  │                       │  │  2. Market Analytics View:                       │  │
│  │                       │  │     • Metric Cards (Total, Match %, Pay Count)   │  │
│  │                       │  │     • Top Demanded Tech Skills & Frequency Bars  │  │
│  │                       │  │                                                  │  │
│  │                       │  │  3. Resume Profile View:                         │  │
│  │                       │  │     • Drag-and-drop PDF CV Upload                │  │
│  │                       │  │     • Structured Skill Tag Cloud & Work History  │  │
│  └───────────────────────┘  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │
                                          ▼ Axios Interceptor (Auto-JWT & Expiry)
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           FastAPI Backend (Port 1776)                             │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Capabilities

1. **Multi-Source Job Aggregation**:
   - Filter listings across 7 major tech hiring sources: **LinkedIn, Indeed, Naukri, Workable, Greenhouse, Wellfound, Lever**.
2. **Mathematical Match Scoring & Skill Chips**:
   - Real mathematical percentage match $\left(100 \times \frac{\text{matched}}{\text{demanded}}\right)$.
   - Interactive skill chips: Click any matched or missing skill to filter all active job listings instantly.
   - Unscorable position badge: Gracefully displays `Cannot score: description not visible` when portal descriptions are blocked.
3. **Market Intelligence Dashboard**:
   - Aggregates all searched positions in real time.
   - Computes percentage demand for top frameworks, databases, languages, and tools.
   - Tracks total disclosed compensation packages.
4. **Advanced Filter Controls**:
   - **Sort Options**: Mathematical % Match, Newest Posting, Company (A–Z).
   - **Pay Filter**: Show only jobs with disclosed salary (LPA / INR / USD).
   - **Content Filter**: Hide unscorable positions without readable job descriptions.
   - **Score Threshold**: Filter positions by minimum match rate ($\ge 40\%$, $\ge 60\%$, $\ge 80\%$).
5. **Data Export**:
   - One-click export of current search results to **CSV** or **JSON** for offline spreadsheet analysis or ATS tracking.
6. **AI Resume Profile Extractor**:
   - Upload your existing PDF resume to automatically parse your skills, past roles, and projects.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 3](https://tailwindcss.com/)
- **UI Components & Icons**: [Lucide React](https://lucide.dev/), [Sonner](https://sonner.emilkowal.ski/)
- **State & HTTP**: [Zustand](https://github.com/pmndrs/zustand), [Axios](https://axios-http.com/)
- **Auth**: JWT decoding (`jwt-decode`) with automatic session expiration checks

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `>= 18.0.0` (LTS recommended)
- **npm**: `>= 9.0.0`

---

### 2. Clone the Repository
```bash
git clone https://github.com/Anurag666-dev/ai-job-hunter-frontend.git
cd ai-job-hunter-frontend
```

---

### 3. Install Dependencies
```bash
npm install
```

---

### 4. Configure Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure the backend API URL matches your running FastAPI instance:
```env
VITE_API_BASE_URL=http://localhost:1776/api/v1
```

---

### 5. Start Development Server

```bash
npm run dev
```

Open your browser at:
👉 **[http://localhost:5173](http://localhost:5173)**

---

### 6. Build for Production

To create an optimized production build in `dist/`:
```bash
npm run build
```

To preview the production build locally:
```bash
npm run preview
```

---

## 📁 Project Structure

```text
frontend/
├── src/
│   ├── api/
│   │   └── client.ts            # Axios client with JWT & 401 interceptors
│   ├── components/
│   │   ├── ui/                  # Reusable UI primitives (Buttons, Cards, Inputs)
│   │   └── AuthGuard.tsx        # Route protection wrapper
│   ├── pages/
│   │   ├── Dashboard.tsx        # Main search, market analytics & profile view
│   │   ├── Landing.tsx          # Public landing / introduction page
│   │   ├── SignIn.tsx           # Authentication sign-in form
│   │   └── SignUp.tsx           # User account creation form
│   ├── store/
│   │   └── useAuthStore.ts      # Zustand persistent auth state
│   ├── App.tsx                  # Application route registry
│   └── main.tsx                 # React DOM mount point
├── .env.example                 # Environment configuration template
├── package.json                 # Project dependencies & scripts
├── tailwind.config.js           # Tailwind design tokens & plugins
└── vite.config.ts               # Vite bundler configuration
```
