# First Gen Navigator

> **AI-powered higher education advisory and financial feasibility platform designed specifically for first-generation college students in India.**

First Gen Navigator bridges information asymmetry by converting scattered counselling cutoffs, state quota rules, and complex fee structures into one clear, actionable, and affordable roadmap.

---

## Key Features

### 1. Domicile & Category-Aware College Matching
- Evaluates student rank against past closing ranks across NITs, IIITs, GFTIs, and premier State Government Engineering Colleges.
- Segregates options into three actionable tiers:
  - **Realistic Target**: Colleges where the student has a competitive rank margin.
  - **Dream Reach**: Aspirational institutions where late-round or CSAB special round vacancies may be targeted.
  - **Safe Backup**: High-probability backup institutions well above closing thresholds.
- Incorporates state domicile quota relaxations and Tuition Fee Waiver (TFW) seat matrices.

### 2. Transparent Scholarship Eligibility Engine
- Replaces binary "eligible/ineligible" flags with line-by-line criterion audits.
- Evaluates income ceilings, reservation categories, domicile mandates, and academic branch requirements.
- Tracks required certificates (Income, Domicile, Caste, Marksheets) and computes real-time readiness scores.

### 3. Smart Net Affordability Calculator
- Computes real out-of-pocket expenses before admission:
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
Open your browser and navigate to:
```
http://localhost:8080
```

---

## License
Open educational architecture built for first-generation scholars.
