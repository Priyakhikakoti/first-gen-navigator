package com.firstgen.navigator.model;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents a scholarship opportunity, eligibility rules, award amount, and required documents.
 */
public class Scholarship {
    private String id;
    private String name;
    private String provider; // Central Govt (NSP), State Govt, Corporate, Trust
    private double annualAmount; // INR per year
    private double maxAnnualIncome; // Maximum family income ceiling in INR
    private List<String> eligibleCategories; // GEN, OBC-NCL, SC, ST, EWS, or "ALL"
    private String targetState; // "ALL_INDIA" or specific state like "Jharkhand", "Bihar", etc.
    private String genderRequirement; // "ALL", "FEMALE", etc.
    private double minPercentileRequired; // 0 if no score requirement
    private String description;
    private String applicationUrl;
    private String deadlineDate; // e.g. "2026-10-15"
    private List<String> requiredDocumentTypes; // Aadhaar, Income Certificate, Caste Certificate, etc.

    public Scholarship() {
        this.eligibleCategories = new ArrayList<>();
        this.requiredDocumentTypes = new ArrayList<>();
        this.genderRequirement = "ALL";
        this.targetState = "ALL_INDIA";
        this.minPercentileRequired = 0.0;
    }

    public Scholarship(String id, String name, String provider, double annualAmount, 
                       double maxAnnualIncome, String targetState, String deadlineDate, 
                       String description, String applicationUrl) {
        this();
        this.id = id;
        this.name = name;
        this.provider = provider;
        this.annualAmount = annualAmount;
        this.maxAnnualIncome = maxAnnualIncome;
        this.targetState = targetState;
        this.deadlineDate = deadlineDate;
        this.description = description;
        this.applicationUrl = applicationUrl;
    }

    public void addEligibleCategory(String cat) {
        eligibleCategories.add(cat);
    }

    public void addRequiredDocument(String docType) {
        requiredDocumentTypes.add(docType);
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public double getAnnualAmount() { return annualAmount; }
    public void setAnnualAmount(double annualAmount) { this.annualAmount = annualAmount; }

    public double getMaxAnnualIncome() { return maxAnnualIncome; }
    public void setMaxAnnualIncome(double maxAnnualIncome) { this.maxAnnualIncome = maxAnnualIncome; }

    public List<String> getEligibleCategories() { return eligibleCategories; }
    public void setEligibleCategories(List<String> eligibleCategories) { this.eligibleCategories = eligibleCategories; }

    public String getTargetState() { return targetState; }
    public void setTargetState(String targetState) { this.targetState = targetState; }

    public String getGenderRequirement() { return genderRequirement; }
    public void setGenderRequirement(String genderRequirement) { this.genderRequirement = genderRequirement; }

    public double getMinPercentileRequired() { return minPercentileRequired; }
    public void setMinPercentileRequired(double minPercentileRequired) { this.minPercentileRequired = minPercentileRequired; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getApplicationUrl() { return applicationUrl; }
    public void setApplicationUrl(String applicationUrl) { this.applicationUrl = applicationUrl; }

    public String getDeadlineDate() { return deadlineDate; }
    public void setDeadlineDate(String deadlineDate) { this.deadlineDate = deadlineDate; }

    public List<String> getRequiredDocumentTypes() { return requiredDocumentTypes; }
    public void setRequiredDocumentTypes(List<String> requiredDocumentTypes) { this.requiredDocumentTypes = requiredDocumentTypes; }
}
