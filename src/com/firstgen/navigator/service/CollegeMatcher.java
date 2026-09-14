package com.firstgen.navigator.service;

import com.firstgen.navigator.model.AffordabilityResult;
import com.firstgen.navigator.model.College;
import com.firstgen.navigator.model.Student;

import java.util.*;

/**
 * Categorizes college opportunities into Dream, Realistic, and Safe tiers
 * while evaluating state quota advantages and net affordability.
 */
public class CollegeMatcher {

    public static class CollegeMatchCard {
        private College college;
        private String branch;
        private double effectiveCutoff;
        private boolean isHomeState;
        private String tier; // DREAM, REALISTIC, SAFE
        private String tierIcon; // 🌟, 🎓, 🛡️
        private String admissionProbability; // High, Moderate, Aspirational
        private AffordabilityResult affordability;
        private String keyInsight;

        public CollegeMatchCard() {}

        public CollegeMatchCard(College college, String branch, double effectiveCutoff, 
                                boolean isHomeState, String tier, String tierIcon, 
                                String admissionProbability, AffordabilityResult affordability, 
                                String keyInsight) {
            this.college = college;
            this.branch = branch;
            this.effectiveCutoff = effectiveCutoff;
            this.isHomeState = isHomeState;
            this.tier = tier;
            this.tierIcon = tierIcon;
            this.admissionProbability = admissionProbability;
            this.affordability = affordability;
            this.keyInsight = keyInsight;
        }

        public College getCollege() { return college; }
        public String getBranch() { return branch; }
        public double getEffectiveCutoff() { return effectiveCutoff; }
        public boolean isHomeState() { return isHomeState; }
        public String getTier() { return tier; }
        public String getTierIcon() { return tierIcon; }
        public String getAdmissionProbability() { return admissionProbability; }
        public AffordabilityResult getAffordability() { return affordability; }
        public String getKeyInsight() { return keyInsight; }
    }

    private final AffordabilityCalculator affordabilityCalculator;

    public CollegeMatcher(AffordabilityCalculator affordabilityCalculator) {
        this.affordabilityCalculator = affordabilityCalculator;
    }

    public Map<String, List<CollegeMatchCard>> matchColleges(List<College> allColleges, Student student, double topScholarshipAmount) {
        Map<String, List<CollegeMatchCard>> tieredMatches = new LinkedHashMap<>();
        tieredMatches.put("DREAM", new ArrayList<>());
        tieredMatches.put("REALISTIC", new ArrayList<>());
        tieredMatches.put("SAFE", new ArrayList<>());

        String branch = (student.getPreferredBranch() != null && !student.getPreferredBranch().isEmpty()) 
                ? student.getPreferredBranch() : "CSE";

        for (College college : allColleges) {
            boolean isHomeState = college.getState().equalsIgnoreCase(student.getState());
            Double cutoff = college.getCutoff(branch, student.getCategory(), isHomeState);

            // If preferred branch not offered, check general engineering branches
            if (cutoff == null) {
                cutoff = college.getCutoff("ECE", student.getCategory(), isHomeState);
                if (cutoff == null) continue;
            }

            double percentileDiff = student.getJeePercentile() - cutoff;
            AffordabilityResult aff = affordabilityCalculator.calculate(college, student, topScholarshipAmount);

            String tier;
            String icon;
            String prob;
            String insight;

            if (percentileDiff >= 3.0) {
                // Student's score is well above cutoff
                tier = "SAFE";
                icon = "";
                prob = "High (>85% chance)";
                insight = isHomeState 
                        ? String.format("Strong safe bet! Home state quota provides a %.1f%% cutoff relaxation.", college.getHomeStateCutoffDiscount())
                        : "Your score is comfortably above previous year closing cutoffs.";
            } else if (percentileDiff >= -2.0 && percentileDiff < 3.0) {
                // Score is very close (within ±2 percentile)
                tier = "REALISTIC";
                icon = "";
                prob = "Competitive (50% - 75% chance)";
                insight = isHomeState 
                        ? "Prime realistic match. Excellent value for rank under state domicile seat pool." 
                        : "Well matched with your percentile. Target in JoSAA choice list round 2-4.";
            } else if (percentileDiff >= -5.0 && percentileDiff < -2.0) {
                // Score is 2-5 percentile below cutoff (reach/dream)
                tier = "DREAM";
                icon = "";
                prob = "Aspirational (20% - 40% chance)";
                insight = "Ambitious target. Keep in top preference list for possible CSAB special round vacancy.";
            } else {
                // Too far beyond realistic reach
                continue;
            }

            CollegeMatchCard card = new CollegeMatchCard(
                    college, branch, cutoff, isHomeState, tier, icon, prob, aff, insight
            );

            tieredMatches.get(tier).add(card);
        }

        // Sort inside each tier by NIRF rank or fee
        for (List<CollegeMatchCard> list : tieredMatches.values()) {
            list.sort(Comparator.comparingInt(c -> c.getCollege().getNirfRank()));
        }

        return tieredMatches;
    }
}
