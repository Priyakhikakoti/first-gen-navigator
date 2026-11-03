# First Gen Navigator

First Gen Navigator is a web app for Indian students—especially first-generation students—to explore college options, compare estimated costs, review scholarship rules, and organize admission tasks in one place.

**Live app:** [first-gen-navigator.onrender.com](https://first-gen-navigator.onrender.com)

The running app is a **Node.js and Express** application. Java source code is also present in `src/` as a separate backend implementation; it is not the server used by the current deployment.

## What the app currently does

### Student profile and sign-in

- Sign up, sign in, restore a session, and sign out with Supabase Auth.
- Save a profile with name, entrance exam and score, study area, category, home state, preferred branch, annual family income, and annual education budget.
- Store the profile in the app API and mirror it to the Supabase `student_profiles` table when configured.
- Choose from JEE Main, JEE Advanced, NEET UG, CUET UG, CLAT, AILET, BITSAT, VITEEE, MHT CET, KCET, WBJEE, KEAM, COMEDK UGET, AP EAPCET, TS EAPCET, GUJCET, OJEE, Assam CEE, MET, SRMJEEE, KIITEE, NATA, NIFT, UCEED, IPMAT, NDA, GATE, or enter another exam.

### College discovery and matching

- Search **All India** or narrow discovery to the student's **home state**.
- For **JEE Main**, show named institutions from the local college catalog and group estimated matches into Realistic, Dream, and Safe categories. This is a heuristic based on seeded percentile cutoffs, not an official rank prediction.
- For other selected exams, use Anakin web search to find named admissions pages and institution leads for the exam and study area. These are discovery leads: the app does **not** currently compare those exams' scores or ranks against a verified college cutoff dataset.
- Show source links, data notes, profile context, and an explanation panel so users can inspect why a result appeared.
- Refresh or request a new live search when the Anakin API key is configured. Search results may be cached briefly to reduce repeat API calls.
- Compare selected college cards in the comparison panel.

### Costs and scholarships

- Estimate annual tuition plus hostel costs, apply a listed scholarship estimate or user-entered scholarship amount, and compare the result with the student's stated budget.
- Show scholarship schemes and profile-based eligibility criteria from the app's local data and any available scraped data.
- Explain that costs, scholarship amounts, rules, and cutoffs need confirmation with the institution or official scheme.

### Admission planning

- Generate strategic alternative pathways for JEE Main using the local college/cutoff catalog. Other exams currently receive an explanation that verified exam-specific pathways are unavailable.
- Provide a document checklist and a readiness view based on profile, document status, and deadlines.
- Show admission and scholarship deadlines, countdowns, risk labels, and a step-by-step roadmap.
- Maintain application progress and saved checklist data where the corresponding Supabase tables are set up.

### Document checklist and OCR

- Select a certificate file in the browser and run text extraction/classification locally in the browser when the required PDF.js/Tesseract libraries are available.
- Display a classification result, a confidence indicator, and a masked-PII preview; users can record the document type and file name in their checklist.
- Keep the selected file and extracted document record in browser storage (IndexedDB, with a localStorage fallback). The app API/Supabase sync stores document metadata; it does **not** upload the original certificate file to server storage.
- OCR classification is an aid for organizing documents. It does not verify the issuing authority or prove that a certificate is genuine or accepted by a counselling board.

### Language and guidance

- Includes a language selector and a small translation endpoint/UI hook. The current endpoint returns language metadata rather than a complete translated interface, so full English, Hindi, Bengali, and Assamese localization is not yet implemented.
- Provides a “Why this match?” explanation for a college result using the available local rationale service/data.

## Data quality and important limits

- JEE Main college names and cutoff/fee inputs come from the local catalog and seeded estimates. They are not a live official counselling database, and tiers are not admission guarantees.
- For NEET, CUET, and other non-JEE exams, Anakin search returns admissions-source leads, not verified score-based college matches. A page title mentioning a college or exam does not establish eligibility.
- Anakin is used for web search/discovery and the separate scraper can collect source material. The current pipeline does not reliably extract and fact-check every current cutoff, fee, scholarship rule, or placement claim. Scraped references should be opened and checked against official sources.
- Cost calculations are only as accurate as the underlying fee and scholarship inputs. Verify current fees, category rules, domicile eligibility, and deadlines with official authorities before making decisions.
- Java implementation under `src/` is not wired into the current Node-based deployment. The app's current API and live Anakin integration run through `scraper/proxy-server.js`.
- The server keeps some profile, search, and checklist state in process memory; deploying multiple server instances or restarting the service may affect state that is not mirrored to Supabase or browser storage. Configure Supabase Row Level Security and review API authorization before using real student data in production.

## Technology

- **Frontend:** HTML, CSS, and vanilla JavaScript in `web/`.
- **Current web/API server:** Node.js 22+, Express 5 (`scraper/proxy-server.js`).
- **Live search and scraper:** Anakin SDK (`@anakin-io/sdk`) in `scraper/`.
- **Authentication and optional profile/document/progress mirror:** Supabase Auth and Supabase JS.
- **Separate implementation:** Java source in `src/com/firstgen/navigator/`; it is not the active production server.
- **Deployment:** Docker image on Render, configured by `Dockerfile` and `render.yaml`.

## Run locally

### Requirements

- Node.js 22 or newer and npm.
- A Supabase project for authentication. Set the server environment values below and ensure the browser Supabase configuration in `web/supabase-client.js` points to the intended project.
- An Anakin API key for live non-JEE college discovery and scraper runs. The JEE catalog does not require Anakin.

### Configure environment

Copy `.env.example` to `.env`, then set the values for your own Supabase project and Anakin account. Keep `.env` private and do not commit it.

Required or optional variables:

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL used by the server. |
| `SUPABASE_ANON_KEY` | Supabase public/anonymous key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional server credential used by some server-side operations; keep secret. |
| `ANAKIN_API_KEY` | Enables Anakin search and scraper requests. |
| `PORT` | HTTP port; defaults to `3001` locally. |

### Start the app

```bash
npm ci
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). The API health endpoint is [http://localhost:3001/api/health](http://localhost:3001/api/health).

To run the separate data collection script:

```bash
npm run scrape
```

It writes scraped/enriched JSON under `scraper/`. This is a source-discovery pipeline; inspect its output and verify claims against official sources before using them as facts.

## API routes

The Express server serves the static frontend and these app routes:

| Route | Purpose |
| --- | --- |
| `GET /api/health` | Service health. |
| `GET, POST /api/profile` | Read or update the signed-in student's profile. |
| `GET /api/colleges?scope=all-india\|home-state` | Return JEE catalog matches or exam-specific search leads. |
| `POST /api/scrape` | Run a profile-based live search. |
| `GET /api/scrape-status` | Report available local scrape data and whether an Anakin key is configured. |
| `POST /api/refresh` | Return scraper refresh guidance. |
| `GET /api/scholarships` | Return scholarship entries and profile criteria. |
| `GET /api/affordability?collegeId=...` | Calculate estimated yearly net cost. |
| `GET /api/alternatives` | Return JEE Main pathways or an unsupported-data message for other exams. |
| `GET, POST /api/documents` | Read document checklist metadata or record an uploaded document. |
| `GET /api/deadlines` | Return admission and scholarship deadlines. |
| `GET /api/roadmap` | Return admission milestones. |
| `GET /api/why-match?collegeId=...` | Explain the available match rationale. |
| `GET /api/translate?lang=...` | Return language metadata for the translation UI hook. |

App API routes other than the health endpoint require a signed-in Supabase session.

## Repository layout

```text
web/                         Frontend HTML, CSS, and JavaScript
scraper/proxy-server.js      Active Node.js web server and API
scraper/anakin-scraper.js    Anakin data collection script
scraper/                     Local scraped/enriched data and helpers
src/com/firstgen/navigator/  Separate Java models, services, and server
supabase/schema.sql          Supabase table definitions and policies
Dockerfile                   Render deployment image
render.yaml                  Render service configuration
```

## Privacy and deployment notes

- Use Supabase Row Level Security policies that restrict each student's rows to their own `auth.uid()` for `student_profiles`, `student_documents`, and `admission_progress`.
- A browser sign-in gate is not a substitute for server-side authorization or database policies.
- Do not place a Supabase service-role key or Anakin secret in frontend code, screenshots, commits, or public issue reports.
- Before production use with real applicants, review data persistence, authorization, rate limits, backup behavior, and retention for uploaded documents and profiles.

## License

Open educational project. See repository license metadata for the applicable terms.
