package com.firstgen.navigator.model;

/**
 * Encapsulates the output of the Smart Affordability Calculator.
 */
public class AffordabilityResult {
    private String collegeId;
    private String collegeName;
    private double annualTuition;
    private double annualHostel;
    private double applicableScholarship;
    private double estimatedNetCost;
    private double studentAnnualBudget;
    private String affordabilityTier; // Highly Affordable, Affordable, Stretch, Not Affordable
    private String tierBadgeClass; // badge-success, badge-primary, badge-warning, badge-danger
    private String calculationExplanation;

    public AffordabilityResult() {}

    public AffordabilityResult(String collegeId, String collegeName, double annualTuition, 
                               double annualHostel, double applicableScholarship, 
                               double estimatedNetCost, double studentAnnualBudget, 
                               String affordabilityTier, String tierBadgeClass, 
                               String calculationExplanation) {
        this.collegeId = collegeId;
        this.collegeName = collegeName;
        this.annualTuition = annualTuition;
        this.annualHostel = annualHostel;
        this.applicableScholarship = applicableScholarship;
        this.estimatedNetCost = estimatedNetCost;
        this.studentAnnualBudget = studentAnnualBudget;
        this.affordabilityTier = affordabilityTier;
        this.tierBadgeClass = tierBadgeClass;
        this.calculationExplanation = calculationExplanation;
    }

    public String getCollegeId() { return collegeId; }
    public void setCollegeId(String collegeId) { this.collegeId = collegeId; }

    public String getCollegeName() { return collegeName; }
    public void setCollegeName(String collegeName) { this.collegeName = collegeName; }

    public double getAnnualTuition() { return annualTuition; }
    public void setAnnualTuition(double annualTuition) { this.annualTuition = annualTuition; }

    public double getAnnualHostel() { return annualHostel; }
    public void setAnnualHostel(double annualHostel) { this.annualHostel = annualHostel; }

    public double getApplicableScholarship() { return applicableScholarship; }
    public void setApplicableScholarship(double applicableScholarship) { this.applicableScholarship = applicableScholarship; }

    public double getEstimatedNetCost() { return estimatedNetCost; }
    public void setEstimatedNetCost(double estimatedNetCost) { this.estimatedNetCost = estimatedNetCost; }

    public double getStudentAnnualBudget() { return studentAnnualBudget; }
    public void setStudentAnnualBudget(double studentAnnualBudget) { this.studentAnnualBudget = studentAnnualBudget; }

    public String getAffordabilityTier() { return affordabilityTier; }
    public void setAffordabilityTier(String affordabilityTier) { this.affordabilityTier = affordabilityTier; }

    public String getTierBadgeClass() { return tierBadgeClass; }
    public void setTierBadgeClass(String tierBadgeClass) { this.tierBadgeClass = tierBadgeClass; }

    public String getCalculationExplanation() { return calculationExplanation; }
    public void setCalculationExplanation(String calculationExplanation) { this.calculationExplanation = calculationExplanation; }
}
