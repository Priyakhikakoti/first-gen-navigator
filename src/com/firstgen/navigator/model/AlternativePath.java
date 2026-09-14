package com.firstgen.navigator.model;

/**
 * Represents a practical Plan A, B, or C alternative pathway.
 */
public class AlternativePath {
    private String planTag; // Plan A, Plan B, Plan C
    private String collegeName;
    private String branch;
    private double expectedCutoff;
    private double annualEstimatedCost;
    private String reason;
    private String admissionAdvantage;

    public AlternativePath() {}

    public AlternativePath(String planTag, String collegeName, String branch, 
                           double expectedCutoff, double annualEstimatedCost, 
                           String reason, String admissionAdvantage) {
        this.planTag = planTag;
        this.collegeName = collegeName;
        this.branch = branch;
        this.expectedCutoff = expectedCutoff;
        this.annualEstimatedCost = annualEstimatedCost;
        this.reason = reason;
        this.admissionAdvantage = admissionAdvantage;
    }

    public String getPlanTag() { return planTag; }
    public void setPlanTag(String planTag) { this.planTag = planTag; }

    public String getCollegeName() { return collegeName; }
    public void setCollegeName(String collegeName) { this.collegeName = collegeName; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public double getExpectedCutoff() { return expectedCutoff; }
    public void setExpectedCutoff(double expectedCutoff) { this.expectedCutoff = expectedCutoff; }

    public double getAnnualEstimatedCost() { return annualEstimatedCost; }
    public void setAnnualEstimatedCost(double annualEstimatedCost) { this.annualEstimatedCost = annualEstimatedCost; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getAdmissionAdvantage() { return admissionAdvantage; }
    public void setAdmissionAdvantage(String admissionAdvantage) { this.admissionAdvantage = admissionAdvantage; }
}
