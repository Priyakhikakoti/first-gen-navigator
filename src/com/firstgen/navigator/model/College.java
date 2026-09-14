package com.firstgen.navigator.model;

import java.util.Map;
import java.util.HashMap;

/**
 * Represents an institution, its fee structure, location, and branch cutoffs per category.
 */
public class College {
    private String id;
    private String name;
    private String code;
    private String state;
    private String type; // NIT, IIIT, State Govt, GFTI, Top Private
    private int nirfRank;
    private double annualTuitionFee;
    private double annualHostelFee;
    private boolean hasTfwScheme; // Tuition Fee Waiver for economically weak students
    private String counsellingBoard; // JoSAA, CSAB, JCECEB, WBJEE, JAC Delhi, etc.
    
    // Map of branch -> (Map of category -> cutoff percentile)
    // E.g., "CSE" -> {"GEN": 96.5, "OBC-NCL": 93.5, "SC": 84.0, "ST": 75.0, "EWS": 94.0}
    private Map<String, Map<String, Double>> branchCutoffs;
    
    // Home state quota cutoff relief (percentile discount for state domicile students)
    private double homeStateCutoffDiscount;

    public College() {
        this.branchCutoffs = new HashMap<>();
        this.homeStateCutoffDiscount = 0.0;
    }

    public College(String id, String name, String code, String state, String type, 
                   int nirfRank, double annualTuitionFee, double annualHostelFee, 
                   boolean hasTfwScheme, String counsellingBoard, double homeStateDiscount) {
        this();
        this.id = id;
        this.name = name;
        this.code = code;
        this.state = state;
        this.type = type;
        this.nirfRank = nirfRank;
        this.annualTuitionFee = annualTuitionFee;
        this.annualHostelFee = annualHostelFee;
        this.hasTfwScheme = hasTfwScheme;
        this.counsellingBoard = counsellingBoard;
        this.homeStateCutoffDiscount = homeStateDiscount;
    }

    public void addBranchCutoff(String branch, String category, double minPercentile) {
        branchCutoffs.computeIfAbsent(branch, k -> new HashMap<>()).put(category, minPercentile);
    }

    public Double getCutoff(String branch, String category, boolean isHomeState) {
        Map<String, Double> catMap = branchCutoffs.get(branch);
        if (catMap == null) {
            return null;
        }
        Double baseCutoff = catMap.get(category);
        if (baseCutoff == null) {
            baseCutoff = catMap.get("GEN"); // Fallback
        }
        if (baseCutoff == null) return null;

        if (isHomeState) {
            return Math.max(0.0, baseCutoff - homeStateCutoffDiscount);
        }
        return baseCutoff;
    }

    public double getTotalAnnualFee() {
        return annualTuitionFee + annualHostelFee;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public int getNirfRank() { return nirfRank; }
    public void setNirfRank(int nirfRank) { this.nirfRank = nirfRank; }

    public double getAnnualTuitionFee() { return annualTuitionFee; }
    public void setAnnualTuitionFee(double annualTuitionFee) { this.annualTuitionFee = annualTuitionFee; }

    public double getAnnualHostelFee() { return annualHostelFee; }
    public void setAnnualHostelFee(double annualHostelFee) { this.annualHostelFee = annualHostelFee; }

    public boolean isHasTfwScheme() { return hasTfwScheme; }
    public void setHasTfwScheme(boolean hasTfwScheme) { this.hasTfwScheme = hasTfwScheme; }

    public String getCounsellingBoard() { return counsellingBoard; }
    public void setCounsellingBoard(String counsellingBoard) { this.counsellingBoard = counsellingBoard; }

    public Map<String, Map<String, Double>> getBranchCutoffs() { return branchCutoffs; }
    public void setBranchCutoffs(Map<String, Map<String, Double>> branchCutoffs) { this.branchCutoffs = branchCutoffs; }

    public double getHomeStateCutoffDiscount() { return homeStateCutoffDiscount; }
    public void setHomeStateCutoffDiscount(double homeStateCutoffDiscount) { this.homeStateCutoffDiscount = homeStateCutoffDiscount; }
}
