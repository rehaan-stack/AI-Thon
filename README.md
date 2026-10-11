# 🧼 Tabulytix — Intelligent Data Cleaning & Normalization Studio

> **"Messy Data In. Meaningful Insights Out."**  
> A high-performance, 100% client-side data quality and normalization platform built for data scientists, analysts, and developers. Profile, clean, reconcile, and export tabular data with zero backend dependencies and complete privacy.

[![React](https://img.shields.io/badge/React-19.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Zustand](https://img.shields.io/badge/State-Zustand%205-brown?style=flat-square)](https://github.com/pmndrs/zustand)
[![Client-Side Privacy](https://img.shields.io/badge/Privacy-100%25%20Local%20(Zero%20Server)-success?style=flat-square&logo=shield)](https://github.com/rehaan-stack/AI-Thon)
[![Tests](https://img.shields.io/badge/Tests-Passing%20(Vitest)-brightgreen?style=flat-square&logo=vitest)](https://vitest.dev/)

---

## 📌 Executive Summary & Hackathon Overview

Data professionals spend upwards of **80% of their time cleaning and formatting messy data** rather than deriving insights. Existing tools either:
1. **Require uploading sensitive raw data to third-party cloud servers** (violating enterprise privacy, GDPR, or HIPAA rules),
2. **Depend on complex, error-prone manual Excel manipulations** (lack auditability, non-reproducible), or
3. **Require writing custom Python/Pandas scripts** for routine quality fixes.

**Tabulytix** bridges this gap by delivering a **zero-server, browser-native data wrangling studio**. It combines automated statistical diagnostics, declarative cleaning recipes, cell-level visual diffing, an interactive AI assistant, and audit report generation — all running in-memory on the client machine.

---

## 🚀 Quick Start (Under 60 Seconds)

### Prerequisites
- [Node.js](https://nodejs.org/) version 18 or higher
- [npm](https://www.npmjs.com/) version 9 or higher

### Installation & Launch
```bash
# 1. Clone the repository
git clone https://github.com/rehaan-stack/AI-Thon.git
cd AI-Thon

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open your browser at **`http://localhost:5173`** (or the port indicated in your terminal).

### Other Commands
```bash
# Run unit tests with Vitest
npm run test

# Typecheck and build for production
npm run build

# Preview production build locally
npm run preview
```

---

## 🏆 Evaluator's 3-Minute Walkthrough

Follow these steps to evaluate the end-to-end functionality of Tabulytix:

| Step | Action | What to Observe |
|---|---|---|
| **1. Load Sample Data** | Click **"Load Sample Dataset"** on the landing/upload view. | Instantly loads a messy customer CRM dataset containing intentional missing values, mixed date formats (`DD/MM/YYYY`, `YYYY-MM-DD`), duplicate rows, casing anomalies, and whitespace issues. |
| **2. Review Diagnostics** | Inspect the **Data Health Score** and column diagnostic cards. | Real-time calculation of overall quality (Completeness, Uniqueness, Consistency, Structural Hygiene) and identified issues. |
| **3. Run Smart Clean** | Click **"Auto-Clean Recommended"** or choose individual operations (Deduplicate, Trim Whitespace, Standardize Dates, Impute Missing). | Clean transformations execute in milliseconds in memory with non-destructive step history. |
| **4. Visual Diff Mode** | Switch to the **Diff View** tab. | Side-by-side or cell-level diff highlighting exactly what changed: green for normalized, amber for imputed, red for removed. |
| **5. AI Data Assistant** | Open the **AI Assistant** panel in the bottom right. | Ask questions like *"What columns have missing values?"* or *"How should I clean the date column?"* to see schema-aware intelligent guidance. |
| **6. Export & Audit Report**| Click **Export** in the top bar. | Export clean CSV, Excel (`.xlsx`), JSON, or download a formal **PDF Audit Summary** documenting every transformation applied for governance. |
| **7. Night Mode** | Toggle the **Dark/Light Theme** switch in the top header. | Flawless dark mode styling with accessible contrast ratios for night-time wrangling. |

---

## ✨ Core Features & Technical Capabilities

### 1. 📊 Deep Statistical Diagnostics & Profiling
- **Composite Quality Score (0–100%)**: Weighted algorithmic scoring across:
  - *Completeness (35%)*: Ratio of non-empty, non-null values.
  - *Uniqueness (25%)*: Duplicate row & primary key candidate evaluation.
  - *Consistency (25%)*: Data type uniformity and pattern adherence.
  - *Structural Hygiene (15%)*: Header syntax, trailing delimiters, whitespace anomalies.
- **Statistical Summaries**: Automatic detection of min, max, mean, median, standard deviation, and interquartile range (IQR).
- **Outlier Detection**: Automated Tukey IQR flagging ($Q_1 - 1.5 \times \text{IQR}$ and $Q_3 + 1.5 \times \text{IQR}$).
- **Missing Token Detection**: Identifies variations of nulls: `N/A`, `NaN`, `null`, `undefined`, `#N/A`, `-`, and blanks.

### 2. 🧹 Comprehensive Cleaning & Transformation Engine
- **Row-Level Operations**:
  - Deduplication (exact match or subset key matching).
  - Drop empty rows or rows missing critical columns.
- **Column-Level Normalization**:
  - String sanitization: Trim leading/trailing whitespace, collapse internal spaces, case conversion (`UPPER`, `lower`, `Title Case`, `camelCase`, `snake_case`).
  - Date normalization: Auto-detects 10+ standard formats and normalizes into ISO-8601 (`YYYY-MM-DD`).
  - Phone and postal formatting: Stripping non-numeric punctuation and regex standardizing.
  - Number parsing: Cleaning currency signs (`$`, `€`, `£`), commas, percentages, and scientific notation.
- **Smart Imputation**:
  - Impute missing numeric values via `Mean`, `Median`, or `Constant`.
  - Impute categorical fields via `Mode` (most frequent) or custom fallback.
  - Forward fill (`ffill`) and Backward fill (`bfill`).
- **Outlier Mitigation**:
  - Winsorization / IQR bounding (clamp outliers to valid percentiles).
  - Filter or flag outlier rows.

### 3. 🔍 Visual Diff & Reversible History
- **Cell-Level Diff Highlighting**: Color-coded badges indicating added, modified, removed, or imputed cells.
- **Step-by-Step Undo/Redo**: Full state snapshot history with the ability to revert individual transformations or rewind to any prior state.
- **Audit Log**: Chronological timeline of every operation executed with row/column impact counts.

### 4. 🤖 AI Data Assistant
- **Context-Aware Schema Understanding**: Queries the current dataset's column profile and statistical distributions.
- **Rule-Based & LLM Modes**: Works completely offline out-of-the-box using heuristic engines, with optional support for external LLM APIs (Gemini/OpenAI) if provided.
- **Proactive Cleaning Suggestions**: Detects anomalies and provides one-click action prompts.

### 5. 📤 Multi-Format Export & Governance PDF
- **CSV & TSV Export**: Standard RFC 4180 compliant CSV export with configurable delimiters.
- **Excel (.xlsx) Export**: Native spreadsheet generation using SheetJS.
- **JSON Export**: Formatted record array or schema-indexed object.
- **PDF Audit Report**: Generates an audit-ready executive PDF report detailing data health before vs. after, list of executed transformations, and remaining warnings using jsPDF & AutoTable.

### 6. 🌙 Dark / Night Mode Support
- Sleek modern dark mode with persistent user preference in `localStorage`.
- High contrast, eye-friendly palette designed for long data analysis sessions.

---

## 🔒 100% Local-First Privacy Guarantee

Unlike cloud-based data wrangling services, **Tabulytix operates entirely inside the user's browser**:
- **Zero Server Storage**: Your raw files and cleaned records never leave your local browser memory.
- **Air-Gap Capable**: Can be bundled, deployed on an offline intranet, or run locally without an internet connection.
- **Enterprise Compliant**: Safe for healthcare (HIPAA), financial (PCI/GLBA), and European (GDPR) datasets containing PII.

---

## 🏗️ Architecture & Technology Stack

```
Tabulytix Client-Side Architecture
┌────────────────────────────────────────────────────────┐
│                      UI Layer                          │
│  React 19 • Lucide Icons • TanStack React Table v9     │
├────────────────────────────────────────────────────────┤
│                 State & Pipeline                       │
│      Zustand Store (Snapshots, Undo/Redo, Theme)       │
├────────────────────────────────────────────────────────┤
│                   Core Engine                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────┐ │
│  │ Diagnostics &    │  │ Cleaning &       │  │ AI    │ │
│  │ Profiling Engine │  │ Recipes Engine   │  │ Engine│ │
│  └──────────────────┘  └──────────────────┘  └───────┘ │
├────────────────────────────────────────────────────────┤
│                 File I/O & Parsers                     │
│      PapaParse (CSV) • SheetJS (XLSX) • jsPDF (PDF)    │
└────────────────────────────────────────────────────────┘
```

| Technology | Purpose | Why Selected |
|---|---|---|
| **React 19** | UI Framework | Component-based, modern concurrency, high-performance rendering. |
| **TypeScript** | Type Safety | Strict typing prevents runtime data corruption and subtle type bugs. |
| **Vite 8** | Build Tool | Instant HMR development and optimized production asset bundling. |
| **Zustand 5** | State Management | Lightweight, decoupled state store with seamless time-travel history. |
| **TanStack Table v9** | Tabular Grid | High-performance virtualized sorting, filtering, and pagination. |
| **PapaParse** | CSV Engine | Robust RFC 4180 parsing with chunk streaming and malformed row tolerance. |
| **SheetJS (xlsx)** | Excel Parsing/Export | Industry standard for reading and generating binary `.xlsx`/`.xls` files. |
| **jsPDF + AutoTable**| Audit Reports | Client-side vector PDF generation for enterprise compliance logs. |
| **Vitest** | Automated Testing | Fast unit testing for data transformation and diagnostic accuracy. |

---

## 📂 Project Structure

```
project/
├── public/                  # Static assets and favicons
├── src/
│   ├── components/          # Reusable UI component modules
│   │   ├── assistant/       # AI Assistant chat & suggestion popups
│   │   ├── auth/            # Optional authentication & user profile widgets
│   │   ├── cleaning/        # Cleaning action modals, recipe panels
│   │   ├── common/          # Buttons, modal dialogs, badges, tooltips
│   │   ├── diagnostics/     # Health score dials, column metric cards
│   │   ├── diff/            # Side-by-side & unified diff viewer
│   │   ├── export/          # Export modal, PDF generation triggers
│   │   ├── history/         # Audit trail and undo/redo timeline
│   │   ├── landing/         # Hero section, feature overviews
│   │   ├── layout/          # Top navigation, sidebar, theme toggle
│   │   ├── table/           # TanStack data table with pagination & sorting
│   │   └── upload/          # Drag-and-drop zone, file parser hooks
│   ├── config/
│   │   └── app-config.ts    # Single source of truth for branding, limits, tokens
│   ├── data/
│   │   └── sample-data.ts   # Pre-bundled messy dataset for instant evaluation
│   ├── lib/
│   │   ├── assistant/       # AI heuristic reasoning & intent matcher
│   │   ├── cleaning/        # Pure transformation functions (dedupe, impute, etc.)
│   │   ├── diagnostics/     # Statistical engine (IQR, null metrics, health scores)
│   │   ├── export/          # CSV, XLSX, JSON, and PDF export builders
│   │   ├── parsing/         # PapaParse and SheetJS wrappers
│   │   └── utils/           # Formatting and array utility helpers
│   ├── store/
│   │   └── index.ts         # Central Zustand store (data, history, theme)
│   ├── test/
│   │   └── cleaning.test.ts # Vitest automated test suite for cleaning logic
│   ├── types/
│   │   └── index.ts         # Global TypeScript definitions
│   ├── App.tsx              # Application root & view router
│   ├── index.css            # Design system, CSS tokens & dark theme
│   └── main.tsx             # Entry point
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite bundler configuration
└── README.md                # Documentation & evaluation guide
```

---

## 🧪 Testing & Quality Assurance

Tabulytix includes unit tests verifying the accuracy of transformations:
```bash
npm run test
```

### Test Coverage Highlights
- ✅ Deduplication logic (exact matching and subset columns).
- ✅ Whitespace trimming and case conversions.
- ✅ Missing value detection against token dictionaries.
- ✅ Mean, median, and mode imputation with edge cases.
- ✅ IQR outlier detection and boundary clamping.
- ✅ Date standardizer parsing international format variations.

---

## 📄 License & Attribution

Developed with ❤️ for the AI-Thon Hackathon by **Mirza Rehaan Baig**.  
Licensed under the [MIT License](LICENSE).
