package com.firstgen.navigator.service;

import com.firstgen.navigator.model.EligibilityResult;
import com.firstgen.navigator.model.Scholarship;
import com.firstgen.navigator.model.Student;

import java.util.*;

/**
 * Matches student profile against all scholarships and classifies them
 * into Eligible vs Ineligible with clear criteria checks.
 */
public class ScholarshipMatcher {

    public static class ScholarshipMatchCard {
        private Scholarship scholarship;
        private EligibilityResult eligibility;
        private double readyDocumentCount;
        private double totalRequiredDocumentCount;
        private boolean isRecommended;

        public ScholarshipMatchCard() {}

        public ScholarshipMatchCard(Scholarship scholarship, EligibilityResult eligibility, 
                                    double readyDocumentCount, double totalRequiredDocumentCount, 
                                    boolean isRecommended) {
            this.scholarship = scholarship;
            this.eligibility = eligibility;
            this.readyDocumentCount = readyDocumentCount;
            this.totalRequiredDocumentCount = totalRequiredDocumentCount;
            this.isRecommended = isRecommended;
        }

        public Scholarship getScholarship() { return scholarship; }
        public EligibilityResult getEligibility() { return eligibility; }
        public double getReadyDocumentCount() { return readyDocumentCount; }
        public double getTotalRequiredDocumentCount() { return totalRequiredDocumentCount; }
        public boolean isRecommended() { return isRecommended; }
    }

    private final EligibilityChecker eligibilityChecker;

    public ScholarshipMatcher(EligibilityChecker eligibilityChecker) {
        this.eligibilityChecker = eligibilityChecker;
    }

    public List<ScholarshipMatchCard> matchScholarships(List<Scholarship> allScholarships, Student student, Set<String> uploadedDocTypes) {
        List<ScholarshipMatchCard> results = new ArrayList<>();

        for (Scholarship sc : allScholarships) {
            EligibilityResult elig = eligibilityChecker.checkScholarshipEligibility(sc, student);
            
            // Count document readiness
            int totalReq = sc.getRequiredDocumentTypes().size();
            int ready = 0;
            for (String docType : sc.getRequiredDocumentTypes()) {
                if (uploadedDocTypes != null && uploadedDocTypes.contains(docType)) {
                    ready++;
                }
            }

            boolean recommended = elig.isEligible() && (sc.getAnnualAmount() >= 40000);
            results.add(new ScholarshipMatchCard(sc, elig, ready, totalReq, recommended));
        }

        // Sort: eligible first, then by highest amount
        results.sort((a, b) -> {
            if (a.getEligibility().isEligible() != b.getEligibility().isEligible()) {
                return a.getEligibility().isEligible() ? -1 : 1;
            }
            return Double.compare(b.getScholarship().getAnnualAmount(), a.getScholarship().getAnnualAmount());
        });

        return results;
    }

    public double getTopEligibleScholarshipAmount(List<Scholarship> allScholarships, Student student) {
        double top = 0;
        for (Scholarship sc : allScholarships) {
            EligibilityResult elig = eligibilityChecker.checkScholarshipEligibility(sc, student);
            if (elig.isEligible() && sc.getAnnualAmount() > top) {
                top = sc.getAnnualAmount();
            }
        }
        return top;
    }
}
