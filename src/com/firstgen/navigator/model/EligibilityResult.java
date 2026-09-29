package com.firstgen.navigator.model;

import java.util.ArrayList;
import java.util.List;

/**
 * Encapsulates detailed criteria-by-criteria eligibility breakdown for a scholarship or college.
 */
public class EligibilityResult {
    private String entityId;
    private String entityName;
    private boolean eligible;
    private String overallStatus; // "YOU ARE LIKELY ELIGIBLE" or "NOT ELIGIBLE"
    private String summaryText;
    private List<CriterionCheck> criteriaChecks;

    public static class CriterionCheck {
        private String criterion;
        private boolean passed;
        private String explanation;

        public CriterionCheck() {}

        public CriterionCheck(String criterion, boolean passed, String explanation) {
            this.criterion = criterion;
            this.passed = passed;
            this.explanation = explanation;
        }

        public String getCriterion() { return criterion; }
        public void setCriterion(String criterion) { this.criterion = criterion; }

        public boolean isPassed() { return passed; }
        public void setPassed(boolean passed) { this.passed = passed; }

        public String getExplanation() { return explanation; }
        public void setExplanation(String explanation) { this.explanation = explanation; }
    }

    public EligibilityResult() {
        this.criteriaChecks = new ArrayList<>();
    }

    public EligibilityResult(String entityId, String entityName, boolean eligible, 
                             String overallStatus, String summaryText) {
        this();
        this.entityId = entityId;
        this.entityName = entityName;
        this.eligible = eligible;
        this.overallStatus = overallStatus;
        this.summaryText = summaryText;
    }

    public void addCriterion(String criterion, boolean passed, String explanation) {
        criteriaChecks.add(new CriterionCheck(criterion, passed, explanation));
    }

    public String getEntityId() { return entityId; }
    public void setEntityId(String entityId) { this.entityId = entityId; }

    public String getEntityName() { return entityName; }
    public void setEntityName(String entityName) { this.entityName = entityName; }

    public boolean isEligible() { return eligible; }
    public void setEligible(boolean eligible) { this.eligible = eligible; }

    public String getOverallStatus() { return overallStatus; }
    public void setOverallStatus(String overallStatus) { this.overallStatus = overallStatus; }

    public String getSummaryText() { return summaryText; }
    public void setSummaryText(String summaryText) { this.summaryText = summaryText; }

    public List<CriterionCheck> getCriteriaChecks() { return criteriaChecks; }
    public void setCriteriaChecks(List<CriterionCheck> criteriaChecks) { this.criteriaChecks = criteriaChecks; }
}
