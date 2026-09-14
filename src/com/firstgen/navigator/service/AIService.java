package com.firstgen.navigator.service;

import com.firstgen.navigator.model.College;
import com.firstgen.navigator.model.Scholarship;
import com.firstgen.navigator.model.Student;

import java.util.*;

/**
 * AI Service layer.
 * Generates personalized qualitative explanations, "Why this match?" reasoning,
 * and conversational synthesis. Can be wired to external LLM/Anakin endpoints
 * or use high-fidelity localized heuristic models.
 */
public class AIService {

    public String generateWhyThisMatchReasoning(College college, Student student, String branch, double cutoff) {
        StringBuilder sb = new StringBuilder();
        boolean isHomeState = college.getState().equalsIgnoreCase(student.getState());
        double diff = student.getJeePercentile() - cutoff;

        sb.append(String.format("Based on %s's %.1f percentile in JEE Main and category status (%s):\n", 
                student.getName(), student.getJeePercentile(), student.getCategory()));

        if (isHomeState) {
            sb.append(String.format("1. Domicile Advantage: Because you are a resident of %s, you benefit from the State Quota at %s, effectively reducing the cutoff barrier by %.1f percentile compared to other-state aspirants.\n",
                    student.getState(), college.getName(), college.getHomeStateCutoffDiscount()));
        } else {
            sb.append(String.format("1. All-India Standing: You compete in the Open State seat matrix where your academic score is in the %s bracket.\n",
                    diff >= 0 ? "healthy qualifying" : "aspirational reach"));
        }

        sb.append(String.format("2. Branch Synergy: Your preferred specialization in %s matches this institute's strongest engineering placement records (NIRF #%d nationally).\n",
                branch, college.getNirfRank()));

        if (college.isHasTfwScheme() && student.getAnnualIncome() <= 300000) {
            sb.append("3. Financial Safety: You are eligible to apply for Tuition Fee Waiver (TFW) or central fee remission, bringing annual expenses significantly down.\n");
        } else {
            sb.append("3. Financial Reality: Net estimated fees align closely with typical first-gen student grant ceilings.\n");
        }

        return sb.toString();
    }

    public String generateScholarshipAdvice(Scholarship scholarship, Student student, boolean isEligible) {
        if (isEligible) {
            return String.format(
                    "High priority opportunity! %s offers ₹%,.0f/yr which will cover a large portion of your degree costs. Make sure your income certificate has been renewed for the current fiscal cycle before submitting.",
                    scholarship.getName(), scholarship.getAnnualAmount()
            );
        } else {
            return String.format(
                    "While %s is not a match due to specific income or domicile parameters, we have highlighted other central schemes (e.g. NSP / FFE) that suit your profile.",
                    scholarship.getName()
            );
        }
    }
}
