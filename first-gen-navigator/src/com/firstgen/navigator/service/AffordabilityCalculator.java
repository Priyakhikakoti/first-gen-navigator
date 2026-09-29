package com.firstgen.navigator.service;

import com.firstgen.navigator.model.AffordabilityResult;
import com.firstgen.navigator.model.College;
import com.firstgen.navigator.model.Student;

import java.text.NumberFormat;
import java.util.Locale;

/**
 * Smart Affordability Calculator.
 * Implements pure Java financial calculations:
 * Tuition Fee + Hostel Fee - Scholarship = Estimated Net Cost
 *
 * Classifies into:
 * - Highly Affordable (Cost <= 50% of annual budget)
 * - Affordable (Cost <= 100% of annual budget)
 * - Stretch (Cost <= 125% of annual budget)
 * - Not Affordable (Cost > 125% of annual budget)
 */
public class AffordabilityCalculator {

    private final NumberFormat inrFormat;

    public AffordabilityCalculator() {
        this.inrFormat = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("en-IN"));
    }

    public AffordabilityResult calculate(College college, Student student, double applicableScholarship) {
        double tuition = college.getAnnualTuitionFee();
        double hostel = college.getAnnualHostelFee();
        
        // Check if student qualifies for 100% Tuition Fee Waiver (TFW) scheme
        // (Typically available for family income < 2.5L or state TFW quota)
        if (college.isHasTfwScheme() && student.getAnnualIncome() <= 250000) {
            tuition = tuition * 0.10; // 90% fee waiver under government TFW
        }

        double grossCost = tuition + hostel;
        double netCost = Math.max(0.0, grossCost - applicableScholarship);
        double budget = student.getAnnualBudget();

        String tier;
        String badgeClass;
        String explanation;

        if (budget <= 0) {
            tier = "Budget Unspecified";
            badgeClass = "badge-secondary";
            explanation = "Please specify your annual budget to evaluate affordability.";
        } else if (netCost <= budget * 0.50) {
            tier = "Highly Affordable";
            badgeClass = "badge-emerald";
            explanation = String.format("Comfortably within your limit. Net cost of %s is less than half of your ₹%,.0f budget.", 
                    formatRupees(netCost), budget);
        } else if (netCost <= budget) {
            tier = "Affordable";
            badgeClass = "badge-primary";
            explanation = String.format("Fits your financial situation. Net annual cost of %s is within your ₹%,.0f budget.", 
                    formatRupees(netCost), budget);
        } else if (netCost <= budget * 1.25) {
            tier = "Stretch";
            badgeClass = "badge-amber";
            explanation = String.format("Slightly exceeds your budget by %s. Can be made viable through an education grant or low-interest SBI Scholar loan.", 
                    formatRupees(netCost - budget));
        } else {
            tier = "Not Affordable";
            badgeClass = "badge-rose";
            explanation = String.format("Exceeds your annual budget by %s. Consider looking at Plan B/C alternatives or applying for larger private trusts.", 
                    formatRupees(netCost - budget));
        }

        return new AffordabilityResult(
                college.getId(),
                college.getName(),
                tuition,
                hostel,
                applicableScholarship,
                netCost,
                budget,
                tier,
                badgeClass,
                explanation
        );
    }

    private String formatRupees(double amount) {
        return String.format("₹%,.0f", amount);
    }
}
