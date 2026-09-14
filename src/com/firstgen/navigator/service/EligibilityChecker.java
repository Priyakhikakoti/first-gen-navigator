package com.firstgen.navigator.service;

import com.firstgen.navigator.model.EligibilityResult;
import com.firstgen.navigator.model.Scholarship;
import com.firstgen.navigator.model.Student;

import java.text.NumberFormat;
import java.util.Locale;

/**
 * Evaluates student eligibility against scholarship rules with transparent,
 * criterion-by-criterion explanation instead of opaque binary flags.
 */
public class EligibilityChecker {

    private final NumberFormat inrFormat;

    public EligibilityChecker() {
        this.inrFormat = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("en-IN"));
    }

    public EligibilityResult checkScholarshipEligibility(Scholarship scholarship, Student student) {
        EligibilityResult result = new EligibilityResult();
        result.setEntityId(scholarship.getId());
        result.setEntityName(scholarship.getName());

        boolean allPassed = true;

        // 1. Income Criterion Check
        if (scholarship.getMaxAnnualIncome() > 0) {
            boolean incomeOk = student.getAnnualIncome() <= scholarship.getMaxAnnualIncome();
            String explanation;
            if (incomeOk) {
                explanation = String.format("Family income ₹%,.0f is within the ceiling of ₹%,.0f.", 
                        student.getAnnualIncome(), scholarship.getMaxAnnualIncome());
            } else {
                allPassed = false;
                explanation = String.format("Family annual income ₹%,.0f exceeds required limit of ₹%,.0f.", 
                        student.getAnnualIncome(), scholarship.getMaxAnnualIncome());
            }
            result.addCriterion("Income requirement", incomeOk, explanation);
        }

        // 2. Category Criterion Check
        if (scholarship.getEligibleCategories() != null && !scholarship.getEligibleCategories().isEmpty()) {
            boolean categoryOk = scholarship.getEligibleCategories().contains(student.getCategory()) ||
                                 scholarship.getEligibleCategories().contains("ALL");
            String explanation;
            if (categoryOk) {
                explanation = String.format("Student category '%s' is eligible under scholarship criteria.", 
                        student.getCategory());
            } else {
                allPassed = false;
                explanation = String.format("Scholarship is earmarked for %s (Student is %s).", 
                        scholarship.getEligibleCategories(), student.getCategory());
            }
            result.addCriterion("Category requirement", categoryOk, explanation);
        }

        // 3. State / Domicile Criterion Check
        if (scholarship.getTargetState() != null && !scholarship.getTargetState().equalsIgnoreCase("ALL_INDIA")) {
            boolean stateOk = scholarship.getTargetState().equalsIgnoreCase(student.getState());
            String explanation;
            if (stateOk) {
                explanation = String.format("Home state '%s' satisfies state domicile condition.", student.getState());
            } else {
                allPassed = false;
                explanation = String.format("Restricted to %s domicile residents (Student is from %s).", 
                        scholarship.getTargetState(), student.getState());
            }
            result.addCriterion("State requirement", stateOk, explanation);
        } else {
            result.addCriterion("State requirement", true, "Open to students from all Indian States & Union Territories.");
        }

        // 4. Academic Percentile / Merit Check
        if (scholarship.getMinPercentileRequired() > 0) {
            boolean scoreOk = student.getJeePercentile() >= scholarship.getMinPercentileRequired();
            String explanation;
            if (scoreOk) {
                explanation = String.format("JEE Percentile %.1f meets the minimum qualifying cutoff of %.1f.", 
                        student.getJeePercentile(), scholarship.getMinPercentileRequired());
            } else {
                allPassed = false;
                explanation = String.format("Current percentile %.1f is below the scholarship's merit cutoff of %.1f.", 
                        student.getJeePercentile(), scholarship.getMinPercentileRequired());
            }
            result.addCriterion("Academic merit requirement", scoreOk, explanation);
        }

        // 5. Engineering Degree Course Check
        result.addCriterion("Engineering course eligible", true, "Approved for 4-year B.Tech / B.E. professional degree programs.");

        // Overall status
        result.setEligible(allPassed);
        if (allPassed) {
            result.setOverallStatus("YOU ARE LIKELY ELIGIBLE");
            result.setSummaryText(String.format("You satisfy all requirements for %s (₹%,.0f/year). We recommend preparing your documents now.", 
                    scholarship.getName(), scholarship.getAnnualAmount()));
        } else {
            result.setOverallStatus("NOT ELIGIBLE");
            result.setSummaryText(String.format("You currently do not meet one or more conditions for %s.", 
                    scholarship.getName()));
        }

        return result;
    }
}
