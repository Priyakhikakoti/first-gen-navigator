# First Gen Navigator

**Higher education advisory and financial feasibility platform designed specifically for first-generation college students in India.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Render-00c7b7?style=for-the-badge&logo=render&logoColor=white)](https://first-gen-navigator.onrender.com)
[![Deployment Status](https://img.shields.io/badge/Status-Live-success?style=for-the-badge)](https://first-gen-navigator.onrender.com)
[![Java](https://img.shields.io/badge/Java-JDK_21%2B-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://www.oracle.com/java/)

🌐 **Live Deployed Web Application**: **[https://first-gen-navigator.onrender.com](https://first-gen-navigator.onrender.com)**

First Gen Navigator bridges information asymmetry by converting scattered counselling cutoffs, state quota rules, and complex fee structures into one clear, actionable, and affordable roadmap.

---

## Key Features

### 1. Domicile & Category-Aware College Matching
- Evaluates student rank against past closing ranks across NITs, IIITs, GFTIs, and premier State Government Engineering Colleges.
- Segregates options into three actionable tiers:
  - **Realistic Target**: Colleges where the student has a competitive rank margin.
  - **Dream Reach**: Aspirational institutions where late-round or CSAB special round vacancies may be targeted.
  - **Safe Backup**: Heuristic matches above the local cutoff estimate; not guaranteed admission.
- Shows domicile-match context; confirm quota eligibility and Tuition Fee Waiver (TFW) rules with each counselling authority.

### 2. Transparent Scholarship Eligibility Engine
- Replaces binary "eligible/ineligible" flags with line-by-line criterion audits.
- Evaluates income ceilings, reservation categories, domicile mandates, and academic branch requirements.
- Tracks required certificates (Income, Domicile, Caste, Marksheets) and computes real-time readiness scores.

### 3. Smart Net Affordability Calculator
- Estimates out-of-pocket expenses before admission:
  $$\text{Net Annual Cost} = \text{Annual Tuition} + \text{Annual Hostel \& Mess} - \text{Applicable Scholarships}$$
- Compares net expenses against the family's maximum stated education budget with real-time feasibility gauges (*Affordable*, *Stretch*, *Not Affordable*).

### 4. Strategic Alternative Pathways
- Generates 3 strategic alternatives when preferred branch cutoffs are narrow:
  - **Plan A (Target State Premier)**: Core branch in a premier state government college utilizing domicile advantage.
  - **Plan B (Allied Branch in Dream Tier)**: Related specialization (e.g., IT/ECE) in top-tier institutes with branch-change opportunities.
  - **Plan C (100% Fee-Waiver Govt Seat)**: High-ROI state institutions with zero tuition under government welfare quotas.

### 5. Document Readiness Vault & Verification
- Dedicated vault for tracking critical admission paperwork:
  - Aadhaar Card
  - Annual Family Income Certificate (Tehsildar / SDO / CO verified)
  - State Domicile / Residential Certificate
  - Reservation Category Certificate (OBC-NCL / EWS / SC / ST)
  - JEE Main Scorecard
  - Class 10 & 12 Board Marksheets
  - Bank Account Details
- Supports uploading and verifying certificates with instant recalculation of scholarship readiness.

### 6. Admission Deadlines & Milestone Roadmap
- Countdown tracking for high-stakes admission events:
  - JoSAA / CSAB Choice Locking
  - State Counselling Registrations (WBJEE, JCECEB, JAC Delhi)
  - Central & State Scholarship Portals (NSP, e-Kalyan)
- Step-by-step progress roadmap from initial profiling to seat acceptance.

### 7. Multilingual Support
- Simple, de-jargonized explanations available in:
  - **English**
  - **हिन्दी (Hindi)**
  - **বাংলা (Bengali)**
  - **অসমীয়া (Assamese)**

---

## Technology Stack

- **Scraper and API proxy**: Node.js, Express, and the Anakin SDK
  - Scrape references with `npm run scrape` and serve the web app with `npm run dev`
  - Add `ANAKIN_API_KEY` to the ignored root `.env` file before running the scraper
- **Backend**: Pure Java (JDK 17 / 21 / 26 compatible)
  - Built-in multi-threaded HTTP server (`com.sun.net.httpserver.HttpServer`)
  - Zero external third-party library dependencies required for build or runtime
  - Clean OOP architecture: Models, Services, In-Memory DataStore, REST Handlers, and Unit Verification Tests
- **Frontend**: Clean Institutional Web Architecture
  - Semantic HTML5 & Vanilla CSS3
  - Custom institutional academic design system (Deep Navy `#0b132b`, Slate `#f8fafc`, Emerald `#059669`, Saffron `#d97706`)
  - Vanilla JavaScript ES6+ connecting to REST endpoints
- **API Endpoints**:
  - `GET /api/profile`, `POST /api/profile`
  - `GET /api/colleges`
  - `GET /api/scholarships`
  - `GET /api/affordability`
  - `GET /api/alternatives`
  - `GET /api/documents`, `POST /api/documents`
  - `GET /api/deadlines`
  - `GET /api/roadmap`
  - `GET /api/translate`
  - `GET /api/why-match`
  - `GET /api/health`

---

## Scraped Data Quality

College cards include match and affordability context, available branch information, scrape timestamps, and any college-specific source links found by the scraper. Source links are discovery references only; they do not prove that a fee, ranking, or cutoff value came from that page.

College fees, NIRF ranks, scholarship rules, and cutoff values currently come from the project's local seeded dataset. The percentile comparisons and Dream / Realistic / Safe groups are heuristic estimates—not official JoSAA closing ranks, admission probabilities, or guarantees. Home-state status is shown as context but is not applied as an arbitrary percentile adjustment. Verify current fees and counselling data with the official institution and counselling authorities before making decisions.

The scraper preserves search results and source metadata for inspection, but does not yet extract and validate structured facts such as year-specific fees, placements, or round-wise category cutoffs. Do not treat scraper results as verified college data until those values are extracted with citations and reviewed.

---

## Authentication

The web app uses the existing Supabase email/password authentication client. The application shell stays hidden until Supabase restores a valid session or a user signs in; signing out returns to the sign-in screen. If email confirmation is enabled in Supabase, a new user must confirm their address before signing in.

Configure the deployed site URL and allowed redirect URLs in Supabase Auth settings. For private student data, enable Row Level Security on `student_profiles`, `student_documents`, and `admission_progress`, with policies that restrict each row to its owner (`auth.uid() = user_id`). The sign-in gate is a browser UI control; it does not secure unauthenticated API routes on its own.

---

## Project Structure

```
first-gen-navigator/
├── src/
│   └── com/firstgen/navigator/
│       ├── data/
│       │   └── DataStore.java                     # Pre-seeded colleges, cutoffs & scholarships
│       ├── model/
│       │   ├── Student.java                       # Student profile entity
│       │   ├── College.java                       # Institution and cutoff matrix
│       │   ├── Scholarship.java                   # Scholarship scheme definitions
│       │   ├── AffordabilityResult.java           # Net cost breakdown model
│       │   ├── AlternativePath.java               # Plan A/B/C recommendation model
│       │   ├── DocumentRecord.java                # Document status model
│       │   ├── DeadlineItem.java                  # Deadline and urgency model
│       │   ├── EligibilityResult.java             # Criterion audit result
│       │   ├── ApplicationRecord.java             # Application lifecycle tracker
│       │   └── RoadmapStep.java                   # Milestone roadmap model
│       ├── service/
│       │   ├── CollegeMatcher.java                # Tier classification algorithm
│       │   ├── ScholarshipMatcher.java            # Scholarship match evaluator
│       │   ├── EligibilityChecker.java            # Criterion-by-criterion rule engine
│       │   ├── AffordabilityCalculator.java       # Out-of-pocket cost calculator
│       │   ├── AlternativePathGenerator.java      # Strategic pathways generator
│       │   ├── DocumentManager.java               # Document checklist and upload manager
│       │   ├── DeadlineManager.java               # Scheduled deadline evaluator
│       │   ├── RoadmapGenerator.java              # Dynamic milestone generator
│       │   ├── ApplicationTracker.java            # Submission tracking
│       │   ├── TranslationService.java            # Multilingual glossary
│       │   └── AIService.java                     # Academic rationale synthesis
│       ├── server/
│       │   ├── FirstGenNavigatorServer.java       # Embedded REST server and static file dispatcher
│       │   └── SimpleJson.java                    # Lightweight JSON serializer
│       └── test/
│           └── SystemVerificationTest.java        # Automated 22-step integration test suite
├── web/
│   ├── index.html                                 # Dashboard web application
│   ├── styles.css                                 # Academic design system stylesheet
│   └── app.js                                     # Frontend state management & API client
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites
- **Java Development Kit (JDK 17 or higher)** installed and available in your `PATH`.
- Check your installation:
  ```bash
  javac -version
  java -version
  ```

### 1. Compile the Java Source Code
```powershell
# Windows (PowerShell)
$files = (Get-ChildItem -Recurse -Filter *.java src).FullName; javac -d bin $files

# macOS / Linux (Bash)
find src -name "*.java" > sources.txt && javac -d bin @sources.txt
```

### 2. Run Automated Verification Tests
Run the standalone integration test suite to verify all business rules:
```bash
java -cp bin com.firstgen.navigator.test.SystemVerificationTest
```
Expected output:
```
=========================================================
  RUNNING SYSTEM VERIFICATION TESTS: FIRST GEN NAVIGATOR
=========================================================
  [PASS] Tuition Calculation
  [PASS] Hostel Calculation
  ...
=========================================================
  TEST RESULTS: 22 PASSED, 0 FAILED
=========================================================
```

### 3. Launch the Web Server
```bash
java -cp bin com.firstgen.navigator.server.FirstGenNavigatorServer
```
Output:
```
=========================================================
  FIRST GEN NAVIGATOR - Higher Education Guidance Server
  Status: RUNNING at http://localhost:8080
  Access Web Interface: http://localhost:8080
=========================================================
```

### 4. Access the Platform
- **Live Production URL**: **[https://first-gen-navigator.onrender.com](https://first-gen-navigator.onrender.com)**
- **Local Development**: `http://localhost:8080`

---

## License
Open educational architecture built for first-generation scholars.
