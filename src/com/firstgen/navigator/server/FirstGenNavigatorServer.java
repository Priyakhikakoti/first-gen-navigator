package com.firstgen.navigator.server;

import com.firstgen.navigator.data.DataStore;
import com.firstgen.navigator.model.*;
import com.firstgen.navigator.service.*;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.Executors;

/**
 * Main application HTTP server and REST API dispatcher.
 */
public class FirstGenNavigatorServer {

    private static int getPort() {
        String envPort = System.getenv("PORT");
        if (envPort != null && !envPort.trim().isEmpty()) {
            try {
                return Integer.parseInt(envPort.trim());
            } catch (NumberFormatException ignored) {}
        }
        return 8080;
    }

    private final DataStore dataStore;
    private final AffordabilityCalculator affordabilityCalculator;
    private final CollegeMatcher collegeMatcher;
    private final EligibilityChecker eligibilityChecker;
    private final ScholarshipMatcher scholarshipMatcher;
    private final AlternativePathGenerator alternativePathGenerator;
    private final RoadmapGenerator roadmapGenerator;
    private final DocumentManager documentManager;
    private final DeadlineManager deadlineManager;
    private final ApplicationTracker applicationTracker;
    private final TranslationService translationService;
    private final AIService aiService;

    public FirstGenNavigatorServer() {
        this.dataStore = DataStore.getInstance();
        this.affordabilityCalculator = new AffordabilityCalculator();
        this.collegeMatcher = new CollegeMatcher(affordabilityCalculator);
        this.eligibilityChecker = new EligibilityChecker();
        this.scholarshipMatcher = new ScholarshipMatcher(eligibilityChecker);
        this.alternativePathGenerator = new AlternativePathGenerator(affordabilityCalculator);
        this.roadmapGenerator = new RoadmapGenerator();
        this.documentManager = new DocumentManager();
        this.deadlineManager = new DeadlineManager();
        this.applicationTracker = new ApplicationTracker();
        this.translationService = new TranslationService();
        this.aiService = new AIService();
    }

    public void start() throws IOException {
        int port = getPort();
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.setExecutor(Executors.newFixedThreadPool(16));

        // REST API endpoints
        server.createContext("/api/profile", new ProfileHandler());
        server.createContext("/api/colleges", new CollegesHandler());
        server.createContext("/api/scholarships", new ScholarshipsHandler());
        server.createContext("/api/affordability", new AffordabilityHandler());
        server.createContext("/api/alternatives", new AlternativesHandler());
        server.createContext("/api/roadmap", new RoadmapHandler());
        server.createContext("/api/documents", new DocumentsHandler());
        server.createContext("/api/deadlines", new DeadlinesHandler());
        server.createContext("/api/applications", new ApplicationsHandler());
        server.createContext("/api/translate", new TranslateHandler());
        server.createContext("/api/why-match", new WhyMatchHandler());
        server.createContext("/api/health", exchange -> sendResponse(exchange, 200, "{\"status\":\"UP\",\"system\":\"First Gen Navigator\"}", "application/json"));

        // Static Web Files Handler
        server.createContext("/", new StaticFileHandler());

        server.start();
        System.out.println("=========================================================");
        System.out.println("  FIRST GEN NAVIGATOR — Higher Education Guidance Server");
        System.out.println("  Status: RUNNING at port " + port);
        System.out.println("  Access Web Interface: http://localhost:" + port);
        System.out.println("=========================================================");
    }

    // --- API HANDLERS ---

    private class ProfileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                Student s = dataStore.getCurrentStudent();
                String json = studentToJson(s);
                sendResponse(exchange, 200, json, "application/json");
            } else if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                String body = readRequestBody(exchange);
                Map<String, String> map = SimpleJson.parseSimpleJsonMap(body);

                Student s = dataStore.getCurrentStudent();
                if (map.containsKey("name")) s.setName(map.get("name"));
                if (map.containsKey("jeePercentile")) {
                    try { s.setJeePercentile(Double.parseDouble(map.get("jeePercentile"))); } catch (Exception ignored) {}
                }
                if (map.containsKey("category")) s.setCategory(map.get("category"));
                if (map.containsKey("state")) s.setState(map.get("state"));
                if (map.containsKey("annualIncome")) {
                    try { s.setAnnualIncome(Double.parseDouble(map.get("annualIncome"))); } catch (Exception ignored) {}
                }
                if (map.containsKey("preferredBranch")) s.setPreferredBranch(map.get("preferredBranch"));
                if (map.containsKey("annualBudget")) {
                    try { s.setAnnualBudget(Double.parseDouble(map.get("annualBudget"))); } catch (Exception ignored) {}
                }
                if (map.containsKey("preferredLanguage")) s.setPreferredLanguage(map.get("preferredLanguage"));

                sendResponse(exchange, 200, studentToJson(s), "application/json");
            } else {
                sendResponse(exchange, 405, "{\"error\":\"Method not allowed\"}", "application/json");
            }
        }
    }

    private class CollegesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            Student student = dataStore.getCurrentStudent();
            List<College> colleges = new ArrayList<>(dataStore.getColleges().values());
            double topScholarship = scholarshipMatcher.getTopEligibleScholarshipAmount(
                    new ArrayList<>(dataStore.getScholarships().values()), student);

            Map<String, List<CollegeMatcher.CollegeMatchCard>> matches = collegeMatcher.matchColleges(colleges, student, topScholarship);

            StringBuilder json = new StringBuilder();
            json.append("{");
            json.append("\"studentPercentile\":").append(student.getJeePercentile()).append(",");
            json.append("\"category\":\"").append(SimpleJson.escape(student.getCategory())).append("\",");
            json.append("\"branch\":\"").append(SimpleJson.escape(student.getPreferredBranch())).append("\",");
            json.append("\"topScholarshipAmount\":").append(topScholarship).append(",");
            json.append("\"tiers\":{");

            int tierIdx = 0;
            for (Map.Entry<String, List<CollegeMatcher.CollegeMatchCard>> entry : matches.entrySet()) {
                if (tierIdx++ > 0) json.append(",");
                json.append("\"").append(entry.getKey()).append("\":[");
                List<CollegeMatcher.CollegeMatchCard> list = entry.getValue();
                for (int i = 0; i < list.size(); i++) {
                    if (i > 0) json.append(",");
                    CollegeMatcher.CollegeMatchCard card = list.get(i);
                    json.append(collegeCardToJson(card));
                }
                json.append("]");
            }
            json.append("}}");

            sendResponse(exchange, 200, json.toString(), "application/json");
        }
    }

    private class ScholarshipsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            Student student = dataStore.getCurrentStudent();
            List<Scholarship> scholarships = new ArrayList<>(dataStore.getScholarships().values());
            List<DocumentRecord> docs = dataStore.getStudentDocuments().getOrDefault(student.getId(), Collections.emptyList());

            Set<String> uploadedTypes = new HashSet<>();
            for (DocumentRecord d : docs) {
                if ("UPLOADED".equalsIgnoreCase(d.getStatus())) {
                    uploadedTypes.add(d.getDocumentType());
                }
            }

            List<ScholarshipMatcher.ScholarshipMatchCard> matches = scholarshipMatcher.matchScholarships(scholarships, student, uploadedTypes);

            StringBuilder json = new StringBuilder();
            json.append("[");
            for (int i = 0; i < matches.size(); i++) {
                if (i > 0) json.append(",");
                ScholarshipMatcher.ScholarshipMatchCard card = matches.get(i);
                json.append(scholarshipCardToJson(card));
            }
            json.append("]");

            sendResponse(exchange, 200, json.toString(), "application/json");
        }
    }

    private class AffordabilityHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            Map<String, String> query = parseQuery(exchange.getRequestURI().getQuery());
            String collegeId = query.get("collegeId");
            double customScholarship = 0;
            try {
                if (query.containsKey("scholarship")) {
                    customScholarship = Double.parseDouble(query.get("scholarship"));
                }
            } catch (Exception ignored) {}

            Student student = dataStore.getCurrentStudent();
            College college = dataStore.getColleges().get(collegeId);
            if (college == null && !dataStore.getColleges().isEmpty()) {
                college = dataStore.getColleges().values().iterator().next();
            }

            AffordabilityResult result = affordabilityCalculator.calculate(college, student, customScholarship);
            sendResponse(exchange, 200, affordabilityResultToJson(result), "application/json");
        }
    }

    private class AlternativesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            Student student = dataStore.getCurrentStudent();
            List<College> colleges = new ArrayList<>(dataStore.getColleges().values());
            double topScholarship = scholarshipMatcher.getTopEligibleScholarshipAmount(
                    new ArrayList<>(dataStore.getScholarships().values()), student);

            AlternativePathGenerator.AlternativeAnalysis analysis = alternativePathGenerator.generateAlternatives(colleges, student, topScholarship);

            StringBuilder json = new StringBuilder();
            json.append("{");
            json.append("\"preferredCollege\":\"").append(SimpleJson.escape(analysis.getPreferredCollegeName())).append("\",");
            json.append("\"preferredBranch\":\"").append(SimpleJson.escape(analysis.getPreferredBranch())).append("\",");
            json.append("\"requiredCutoff\":").append(analysis.getRequiredPercentile()).append(",");
            json.append("\"studentPercentile\":").append(analysis.getStudentPercentile()).append(",");
            json.append("\"isDirectMatch\":").append(analysis.isDirectMatch()).append(",");
            json.append("\"diagnosticMessage\":\"").append(SimpleJson.escape(analysis.getDiagnosticMessage())).append("\",");
            json.append("\"pathways\":[");
            for (int i = 0; i < analysis.getPathways().size(); i++) {
                if (i > 0) json.append(",");
                AlternativePath p = analysis.getPathways().get(i);
                json.append("{");
                json.append("\"planTag\":\"").append(SimpleJson.escape(p.getPlanTag())).append("\",");
                json.append("\"collegeName\":\"").append(SimpleJson.escape(p.getCollegeName())).append("\",");
                json.append("\"branch\":\"").append(SimpleJson.escape(p.getBranch())).append("\",");
                json.append("\"cutoff\":").append(p.getExpectedCutoff()).append(",");
                json.append("\"annualCost\":").append(p.getAnnualEstimatedCost()).append(",");
                json.append("\"reason\":\"").append(SimpleJson.escape(p.getReason())).append("\",");
                json.append("\"admissionAdvantage\":\"").append(SimpleJson.escape(p.getAdmissionAdvantage())).append("\"");
                json.append("}");
            }
            json.append("]}");

            sendResponse(exchange, 200, json.toString(), "application/json");
        }
    }

    private class RoadmapHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            Student student = dataStore.getCurrentStudent();
            List<DocumentRecord> docs = dataStore.getStudentDocuments().getOrDefault(student.getId(), Collections.emptyList());
            List<RoadmapStep> steps = roadmapGenerator.generateRoadmap(student, docs, true);

            StringBuilder json = new StringBuilder();
            json.append("[");
            for (int i = 0; i < steps.size(); i++) {
                if (i > 0) json.append(",");
                RoadmapStep s = steps.get(i);
                json.append("{");
                json.append("\"id\":\"").append(s.getId()).append("\",");
                json.append("\"sequence\":").append(s.getSequence()).append(",");
                json.append("\"title\":\"").append(SimpleJson.escape(s.getTitle())).append("\",");
                json.append("\"description\":\"").append(SimpleJson.escape(s.getDescription())).append("\",");
                json.append("\"completed\":").append(s.isCompleted()).append(",");
                json.append("\"actionType\":\"").append(s.getActionType()).append("\"");
                json.append("}");
            }
            json.append("]");

            sendResponse(exchange, 200, json.toString(), "application/json");
        }
    }

    private class DocumentsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            Student student = dataStore.getCurrentStudent();
            List<DocumentRecord> docs = dataStore.getStudentDocuments().computeIfAbsent(student.getId(), k -> new ArrayList<>());

            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                String body = readRequestBody(exchange);
                Map<String, String> map = SimpleJson.parseSimpleJsonMap(body);
                String docType = map.getOrDefault("documentType", "Aadhaar");
                String fileName = map.getOrDefault("fileName", docType.toLowerCase().replace(" ", "_") + ".pdf");

                documentManager.addOrUpdateDocument(docs, student.getId(), docType, fileName);
                sendResponse(exchange, 200, "{\"success\":true,\"message\":\"Document uploaded successfully\"}", "application/json");
                return;
            }

            // Return document list and readiness summary
            int uploadedCount = 0;
            for (DocumentRecord d : docs) {
                if ("UPLOADED".equalsIgnoreCase(d.getStatus())) uploadedCount++;
            }

            StringBuilder json = new StringBuilder();
            json.append("{");
            json.append("\"totalCount\":").append(docs.size()).append(",");
            json.append("\"uploadedCount\":").append(uploadedCount).append(",");
            json.append("\"missingCount\":").append(docs.size() - uploadedCount).append(",");
            json.append("\"documents\":[");
            for (int i = 0; i < docs.size(); i++) {
                if (i > 0) json.append(",");
                DocumentRecord d = docs.get(i);
                json.append("{");
                json.append("\"id\":\"").append(d.getId()).append("\",");
                json.append("\"documentType\":\"").append(SimpleJson.escape(d.getDocumentType())).append("\",");
                json.append("\"fileName\":\"").append(SimpleJson.escape(d.getFileName())).append("\",");
                json.append("\"uploadDate\":\"").append(SimpleJson.escape(d.getUploadDate())).append("\",");
                json.append("\"status\":\"").append(SimpleJson.escape(d.getStatus())).append("\",");
                json.append("\"notes\":\"").append(SimpleJson.escape(d.getVerifiedNotes())).append("\"");
                json.append("}");
            }
            json.append("]}");

            sendResponse(exchange, 200, json.toString(), "application/json");
        }
    }

    private class DeadlinesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            List<DeadlineItem> list = deadlineManager.getSortedDeadlines(dataStore.getDeadlines().values());
            List<String> alerts = deadlineManager.generateAlertNotifications(list);

            StringBuilder json = new StringBuilder();
            json.append("{");
            json.append("\"alerts\":[");
            for (int i = 0; i < alerts.size(); i++) {
                if (i > 0) json.append(",");
                json.append("\"").append(SimpleJson.escape(alerts.get(i))).append("\"");
            }
            json.append("],\"deadlines\":[");
            for (int i = 0; i < list.size(); i++) {
                if (i > 0) json.append(",");
                DeadlineItem d = list.get(i);
                json.append("{");
                json.append("\"id\":\"").append(d.getId()).append("\",");
                json.append("\"title\":\"").append(SimpleJson.escape(d.getTitle())).append("\",");
                json.append("\"category\":\"").append(SimpleJson.escape(d.getCategory())).append("\",");
                json.append("\"dueDate\":\"").append(SimpleJson.escape(d.getDueDateStr())).append("\",");
                json.append("\"daysRemaining\":").append(d.getDaysRemaining()).append(",");
                json.append("\"urgency\":\"").append(d.getUrgencyLevel()).append("\",");
                json.append("\"portalUrl\":\"").append(SimpleJson.escape(d.getPortalUrl())).append("\",");
                json.append("\"description\":\"").append(SimpleJson.escape(d.getDescription())).append("\"");
                json.append("}");
            }
            json.append("]}");

            sendResponse(exchange, 200, json.toString(), "application/json");
        }
    }

    private class ApplicationsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            Student student = dataStore.getCurrentStudent();
            List<ApplicationRecord> list = dataStore.getStudentApplications().computeIfAbsent(student.getId(), k -> new ArrayList<>());

            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                String body = readRequestBody(exchange);
                Map<String, String> map = SimpleJson.parseSimpleJsonMap(body);
                String appId = map.get("applicationId");
                String status = map.get("status");
                String notes = map.get("notes");
                applicationTracker.updateStatus(list, appId, status, notes);
                sendResponse(exchange, 200, "{\"success\":true}", "application/json");
                return;
            }

            StringBuilder json = new StringBuilder();
            json.append("[");
            for (int i = 0; i < list.size(); i++) {
                if (i > 0) json.append(",");
                ApplicationRecord a = list.get(i);
                json.append("{");
                json.append("\"id\":\"").append(a.getId()).append("\",");
                json.append("\"targetName\":\"").append(SimpleJson.escape(a.getTargetName())).append("\",");
                json.append("\"type\":\"").append(a.getType()).append("\",");
                json.append("\"status\":\"").append(a.getStatus()).append("\",");
                json.append("\"lastUpdated\":\"").append(SimpleJson.escape(a.getLastUpdated())).append("\",");
                json.append("\"portalUrl\":\"").append(SimpleJson.escape(a.getPortalUrl())).append("\",");
                json.append("\"notes\":\"").append(SimpleJson.escape(a.getNotes())).append("\"");
                json.append("}");
            }
            json.append("]");

            sendResponse(exchange, 200, json.toString(), "application/json");
        }
    }

    private class TranslateHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            Map<String, String> q = parseQuery(exchange.getRequestURI().getQuery());
            String lang = q.getOrDefault("lang", "en");
            Map<String, String> strings = translationService.getAllStringsForLang(lang);

            StringBuilder json = new StringBuilder();
            json.append("{");
            int idx = 0;
            for (Map.Entry<String, String> e : strings.entrySet()) {
                if (idx++ > 0) json.append(",");
                json.append("\"").append(e.getKey()).append("\":\"").append(SimpleJson.escape(e.getValue())).append("\"");
            }
            json.append("}");

            sendResponse(exchange, 200, json.toString(), "application/json");
        }
    }

    private class WhyMatchHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            Map<String, String> q = parseQuery(exchange.getRequestURI().getQuery());
            String collegeId = q.get("collegeId");
            College college = dataStore.getColleges().get(collegeId);
            Student student = dataStore.getCurrentStudent();

            if (college == null) {
                sendResponse(exchange, 404, "{\"error\":\"College not found\"}", "application/json");
                return;
            }

            String branch = student.getPreferredBranch() != null ? student.getPreferredBranch() : "CSE";
            boolean isHomeState = college.getState().equalsIgnoreCase(student.getState());
            Double cutoff = college.getCutoff(branch, student.getCategory(), isHomeState);
            if (cutoff == null) cutoff = 90.0;

            String reasoning = aiService.generateWhyThisMatchReasoning(college, student, branch, cutoff);
            String json = "{\"collegeId\":\"" + collegeId + "\",\"collegeName\":\"" + SimpleJson.escape(college.getName()) 
                    + "\",\"aiReasoning\":\"" + SimpleJson.escape(reasoning) + "\"}";
            sendResponse(exchange, 200, json, "application/json");
        }
    }

    // --- STATIC ASSET SERVING ---

    private class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String rawPath = exchange.getRequestURI().getPath();
            if (rawPath.equals("/") || rawPath.isEmpty()) {
                rawPath = "/index.html";
            }

            Path webDir = Paths.get("web").toAbsolutePath().normalize();
            Path filePath = webDir.resolve(rawPath.substring(1)).normalize();

            if (!filePath.startsWith(webDir) || !Files.exists(filePath) || Files.isDirectory(filePath)) {
                // Fallback to index.html for client-side routing
                filePath = webDir.resolve("index.html");
            }

            if (!Files.exists(filePath)) {
                String notFound = "<h1>404 - Web files not found</h1><p>Please ensure the 'web' folder exists.</p>";
                sendResponse(exchange, 404, notFound, "text/html");
                return;
            }

            String mime = getMimeType(filePath.toString());
            byte[] fileBytes = Files.readAllBytes(filePath);

            exchange.getResponseHeaders().set("Content-Type", mime);
            exchange.sendResponseHeaders(200, fileBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(fileBytes);
            }
        }
    }

    // --- HELPER SERIALIZERS ---

    private String studentToJson(Student s) {
        return "{"
                + "\"id\":\"" + SimpleJson.escape(s.getId()) + "\","
                + "\"name\":\"" + SimpleJson.escape(s.getName()) + "\","
                + "\"jeePercentile\":" + s.getJeePercentile() + ","
                + "\"category\":\"" + SimpleJson.escape(s.getCategory()) + "\","
                + "\"state\":\"" + SimpleJson.escape(s.getState()) + "\","
                + "\"annualIncome\":" + s.getAnnualIncome() + ","
                + "\"preferredBranch\":\"" + SimpleJson.escape(s.getPreferredBranch()) + "\","
                + "\"annualBudget\":" + s.getAnnualBudget() + ","
                + "\"preferredLanguage\":\"" + SimpleJson.escape(s.getPreferredLanguage()) + "\""
                + "}";
    }

    private String collegeCardToJson(CollegeMatcher.CollegeMatchCard card) {
        College c = card.getCollege();
        AffordabilityResult a = card.getAffordability();
        return "{"
                + "\"id\":\"" + c.getId() + "\","
                + "\"name\":\"" + SimpleJson.escape(c.getName()) + "\","
                + "\"code\":\"" + SimpleJson.escape(c.getCode()) + "\","
                + "\"state\":\"" + SimpleJson.escape(c.getState()) + "\","
                + "\"type\":\"" + SimpleJson.escape(c.getType()) + "\","
                + "\"nirfRank\":" + c.getNirfRank() + ","
                + "\"branch\":\"" + SimpleJson.escape(card.getBranch()) + "\","
                + "\"effectiveCutoff\":" + card.getEffectiveCutoff() + ","
                + "\"isHomeState\":" + card.isHomeState() + ","
                + "\"tier\":\"" + card.getTier() + "\","
                + "\"tierIcon\":\"" + card.getTierIcon() + "\","
                + "\"admissionProbability\":\"" + SimpleJson.escape(card.getAdmissionProbability()) + "\","
                + "\"keyInsight\":\"" + SimpleJson.escape(card.getKeyInsight()) + "\","
                + "\"affordability\":" + affordabilityResultToJson(a)
                + "}";
    }

    private String scholarshipCardToJson(ScholarshipMatcher.ScholarshipMatchCard card) {
        Scholarship s = card.getScholarship();
        EligibilityResult e = card.getEligibility();

        StringBuilder checks = new StringBuilder();
        checks.append("[");
        for (int i = 0; i < e.getCriteriaChecks().size(); i++) {
            if (i > 0) checks.append(",");
            EligibilityResult.CriterionCheck c = e.getCriteriaChecks().get(i);
            checks.append("{")
                  .append("\"criterion\":\"").append(SimpleJson.escape(c.getCriterion())).append("\",")
                  .append("\"passed\":").append(c.isPassed()).append(",")
                  .append("\"explanation\":\"").append(SimpleJson.escape(c.getExplanation())).append("\"")
                  .append("}");
        }
        checks.append("]");

        StringBuilder reqDocs = new StringBuilder();
        reqDocs.append("[");
        for (int i = 0; i < s.getRequiredDocumentTypes().size(); i++) {
            if (i > 0) reqDocs.append(",");
            reqDocs.append("\"").append(SimpleJson.escape(s.getRequiredDocumentTypes().get(i))).append("\"");
        }
        reqDocs.append("]");

        return "{"
                + "\"id\":\"" + s.getId() + "\","
                + "\"name\":\"" + SimpleJson.escape(s.getName()) + "\","
                + "\"provider\":\"" + SimpleJson.escape(s.getProvider()) + "\","
                + "\"annualAmount\":" + s.getAnnualAmount() + ","
                + "\"maxAnnualIncome\":" + s.getMaxAnnualIncome() + ","
                + "\"targetState\":\"" + SimpleJson.escape(s.getTargetState()) + "\","
                + "\"deadlineDate\":\"" + SimpleJson.escape(s.getDeadlineDate()) + "\","
                + "\"applicationUrl\":\"" + SimpleJson.escape(s.getApplicationUrl()) + "\","
                + "\"description\":\"" + SimpleJson.escape(s.getDescription()) + "\","
                + "\"requiredDocuments\":" + reqDocs.toString() + ","
                + "\"readyDocumentCount\":" + (int) card.getReadyDocumentCount() + ","
                + "\"totalRequiredDocumentCount\":" + (int) card.getTotalRequiredDocumentCount() + ","
                + "\"isRecommended\":" + card.isRecommended() + ","
                + "\"eligibility\":{"
                + "\"isEligible\":" + e.isEligible() + ","
                + "\"overallStatus\":\"" + SimpleJson.escape(e.getOverallStatus()) + "\","
                + "\"summaryText\":\"" + SimpleJson.escape(e.getSummaryText()) + "\","
                + "\"criteriaChecks\":" + checks.toString()
                + "}}";
    }

    private String affordabilityResultToJson(AffordabilityResult a) {
        if (a == null) return "null";
        return "{"
                + "\"collegeId\":\"" + a.getCollegeId() + "\","
                + "\"collegeName\":\"" + SimpleJson.escape(a.getCollegeName()) + "\","
                + "\"annualTuition\":" + a.getAnnualTuition() + ","
                + "\"annualHostel\":" + a.getAnnualHostel() + ","
                + "\"applicableScholarship\":" + a.getApplicableScholarship() + ","
                + "\"estimatedNetCost\":" + a.getEstimatedNetCost() + ","
                + "\"studentAnnualBudget\":" + a.getStudentAnnualBudget() + ","
                + "\"affordabilityTier\":\"" + SimpleJson.escape(a.getAffordabilityTier()) + "\","
                + "\"tierBadgeClass\":\"" + SimpleJson.escape(a.getTierBadgeClass()) + "\","
                + "\"calculationExplanation\":\"" + SimpleJson.escape(a.getCalculationExplanation()) + "\""
                + "}";
    }

    // --- UTILITIES ---

    private void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
    }

    private void sendResponse(HttpExchange exchange, int status, String body, String contentType) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", contentType + "; charset=UTF-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private String readRequestBody(HttpExchange exchange) throws IOException {
        try (InputStream is = exchange.getRequestBody();
             BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line);
            }
            return sb.toString();
        }
    }

    private Map<String, String> parseQuery(String query) {
        Map<String, String> map = new HashMap<>();
        if (query == null || query.isEmpty()) return map;
        String[] pairs = query.split("&");
        for (String pair : pairs) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2) {
                try {
                    map.put(URLDecoder.decode(kv[0], StandardCharsets.UTF_8),
                            URLDecoder.decode(kv[1], StandardCharsets.UTF_8));
                } catch (Exception ignored) {}
            }
        }
        return map;
    }

    private String getMimeType(String path) {
        if (path.endsWith(".html") || path.endsWith(".htm")) return "text/html";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        if (path.endsWith(".pdf")) return "application/pdf";
        return "text/plain";
    }

    public static void main(String[] args) {
        try {
            FirstGenNavigatorServer app = new FirstGenNavigatorServer();
            app.start();
        } catch (Exception e) {
            System.err.println("Fatal error starting First Gen Navigator Server: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
