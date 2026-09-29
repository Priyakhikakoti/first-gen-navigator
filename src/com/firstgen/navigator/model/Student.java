package com.firstgen.navigator.model;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents a student's academic and socio-economic profile.
 */
public class Student {
    private String id;
    private String name;
    private double jeePercentile;
    private String category; // GEN, OBC-NCL, SC, ST, EWS
    private String state; // e.g. Jharkhand, Bihar, Uttar Pradesh, Maharashtra, etc.
    private double annualIncome; // Family annual income in INR
    private String preferredBranch; // e.g. CSE, ECE, IT, Mechanical, Electrical, Civil
    private double annualBudget; // Maximum affordable annual cost in INR
    private String preferredLanguage; // en, hi, bn, as
    private List<String> shortlistedCollegeIds;

    public Student() {
        this.shortlistedCollegeIds = new ArrayList<>();
        this.preferredLanguage = "en";
    }

    public Student(String name, double jeePercentile, String category, String state, 
                   double annualIncome, String preferredBranch, double annualBudget) {
        this();
        this.id = "STU-" + System.currentTimeMillis();
        this.name = name;
        this.jeePercentile = jeePercentile;
        this.category = category;
        this.state = state;
        this.annualIncome = annualIncome;
        this.preferredBranch = preferredBranch;
        this.annualBudget = annualBudget;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public double getJeePercentile() { return jeePercentile; }
    public void setJeePercentile(double jeePercentile) { this.jeePercentile = jeePercentile; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public double getAnnualIncome() { return annualIncome; }
    public void setAnnualIncome(double annualIncome) { this.annualIncome = annualIncome; }

    public String getPreferredBranch() { return preferredBranch; }
    public void setPreferredBranch(String preferredBranch) { this.preferredBranch = preferredBranch; }

    public double getAnnualBudget() { return annualBudget; }
    public void setAnnualBudget(double annualBudget) { this.annualBudget = annualBudget; }

    public String getPreferredLanguage() { return preferredLanguage; }
    public void setPreferredLanguage(String preferredLanguage) { this.preferredLanguage = preferredLanguage; }

    public List<String> getShortlistedCollegeIds() { return shortlistedCollegeIds; }
    public void setShortlistedCollegeIds(List<String> shortlistedCollegeIds) { 
        this.shortlistedCollegeIds = shortlistedCollegeIds; 
    }
}
