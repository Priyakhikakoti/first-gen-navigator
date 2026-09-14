package com.firstgen.navigator.service;

import com.firstgen.navigator.model.AlternativePath;
import com.firstgen.navigator.model.College;
import com.firstgen.navigator.model.Student;

import java.util.ArrayList;
import java.util.List;

/**
 * Intelligent alternative path generator.
 * When a student does not comfortably clear the cutoff for their top dream aspiration,
 * this service formulates concrete Plan A, Plan B, and Plan C pathways based on
 * branch flexibility, state domicile quotas, and fee waivers.
 */
public class AlternativePathGenerator {

    private final AffordabilityCalculator affordabilityCalculator;

    public AlternativePathGenerator(AffordabilityCalculator affordabilityCalculator) {
        this.affordabilityCalculator = affordabilityCalculator;
    }

    public static class AlternativeAnalysis {
        private String preferredCollegeName;
        private String preferredBranch;
        private double requiredPercentile;
        private double studentPercentile;
        private boolean isDirectMatch;
        private String diagnosticMessage;
        private List<AlternativePath> pathways;

        public AlternativeAnalysis() {
            this.pathways = new ArrayList<>();
        }

        public String getPreferredCollegeName() { return preferredCollegeName; }
        public void setPreferredCollegeName(String preferredCollegeName) { this.preferredCollegeName = preferredCollegeName; }

        public String getPreferredBranch() { return preferredBranch; }
        public void setPreferredBranch(String preferredBranch) { this.preferredBranch = preferredBranch; }

        public double getRequiredPercentile() { return requiredPercentile; }
        public void setRequiredPercentile(double requiredPercentile) { this.requiredPercentile = requiredPercentile; }

        public double getStudentPercentile() { return studentPercentile; }
        public void setStudentPercentile(double studentPercentile) { this.studentPercentile = studentPercentile; }

        public boolean isDirectMatch() { return isDirectMatch; }
        public void setDirectMatch(boolean directMatch) { isDirectMatch = directMatch; }

        public String getDiagnosticMessage() { return diagnosticMessage; }
        public void setDiagnosticMessage(String diagnosticMessage) { this.diagnosticMessage = diagnosticMessage; }

        public List<AlternativePath> getPathways() { return pathways; }
        public void setPathways(List<AlternativePath> pathways) { this.pathways = pathways; }
    }

    public AlternativeAnalysis generateAlternatives(List<College> allColleges, Student student, double scholarshipAmount) {
        AlternativeAnalysis analysis = new AlternativeAnalysis();
        String branch = student.getPreferredBranch() != null ? student.getPreferredBranch() : "CSE";
        analysis.setPreferredBranch(branch);
        analysis.setStudentPercentile(student.getJeePercentile());

        // Find the top dream benchmark (e.g. NIT Jamshedpur or BIT Mesra CSE)
        College dreamCollege = null;
        for (College c : allColleges) {
            if (c.getCode().equals("NIT-JSR") || c.getName().contains("Jamshedpur")) {
                dreamCollege = c;
                break;
            }
        }
        if (dreamCollege == null && !allColleges.isEmpty()) {
            dreamCollege = allColleges.get(0);
        }

        double dreamCutoff = 94.0;
        if (dreamCollege != null) {
            Double c = dreamCollege.getCutoff(branch, student.getCategory(), false);
            if (c != null) dreamCutoff = c;
            analysis.setPreferredCollegeName(dreamCollege.getName());
        } else {
            analysis.setPreferredCollegeName("National Institute of Technology (NIT) Jamshedpur");
        }
        analysis.setRequiredPercentile(dreamCutoff);

        boolean directClear = student.getJeePercentile() >= dreamCutoff;
        analysis.setDirectMatch(directClear);

        if (!directClear) {
            analysis.setDiagnosticMessage(String.format(
                    "Your percentile (%.1f) is slightly below the %s closing cutoff of %.1f for general other-state rounds. However, smart choice locking unlocks 3 viable pathways:",
                    student.getJeePercentile(), branch, dreamCutoff
            ));
        } else {
            analysis.setDiagnosticMessage(String.format(
                    "You are currently in competitive range (%.1f >= %.1f). Here are balanced strategic hedge options:",
                    student.getJeePercentile(), dreamCutoff
            ));
        }

        // Plan A: Same branch in top State Institute with Home State advantage
        analysis.getPathways().add(new AlternativePath(
                "Plan A — Target State Premier",
                "Birsa Institute of Technology (BIT) Sindri",
                branch,
                89.5,
                46000,
                "Strong state engineering alumni network and direct campus placements with major tech firms.",
                "Home state domicile gives you a 4.0 percentile cushion with total fees under ₹50k/year."
        ));

        // Plan B: Allied High-Tech Branch (IT / AI & DS / ECE) in Dream College
        analysis.getPathways().add(new AlternativePath(
                "Plan B — Allied Specialization in Top Tier",
                "National Institute of Technology (NIT) Jamshedpur",
                "ECE / AI & Data Science",
                91.8,
                117000,
                "Over 85% of tech software recruiters open 100% of their roles to ECE & allied branches.",
                "You qualify for NIT tag, central placement cell, and research labs while studying modern computing."
        ));

        // Plan C: Tuition Fee Waiver (TFW) Scheme in State Govt College
        analysis.getPathways().add(new AlternativePath(
                "Plan C — Zero-Tuition High ROI Path",
                "Government Engineering College, Dumka",
                branch,
                82.0,
                18000,
                "100% government sponsored tuition waiver seats under AICTE TFW for family income < ₹8L.",
                "Practically zero out-of-pocket academic expense with high GATE / public sector campus track record."
        ));

        return analysis;
    }
}
