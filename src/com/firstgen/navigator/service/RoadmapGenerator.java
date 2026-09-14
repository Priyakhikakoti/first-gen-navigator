package com.firstgen.navigator.service;

import com.firstgen.navigator.model.DocumentRecord;
import com.firstgen.navigator.model.RoadmapStep;
import com.firstgen.navigator.model.Student;

import java.util.ArrayList;
import java.util.List;

/**
 * Generates an adaptive, step-by-step personalized action plan that dynamically
 * tracks which milestones are completed and clearly highlights "What should I do next?".
 */
public class RoadmapGenerator {

    public List<RoadmapStep> generateRoadmap(Student student, List<DocumentRecord> studentDocs, boolean hasShortlistedColleges) {
        List<RoadmapStep> steps = new ArrayList<>();
        int seq = 1;

        // Step 1: Complete Student Profile
        boolean profileComplete = student != null && student.getName() != null && !student.getName().isEmpty()
                && student.getJeePercentile() > 0 && student.getAnnualIncome() > 0;
        steps.add(new RoadmapStep("STEP-01", seq++, "Complete Student Profile", 
                "Provide JEE score, domicile state, reservation category, and family annual budget.", 
                profileComplete, "PROFILE", null));

        // Step 2: Review College Matches & Shortlist
        steps.add(new RoadmapStep("STEP-02", seq++, "Explore Dream, Realistic & Safe Colleges", 
                "Review cutoff probabilities, tuition and hostel fee breakdowns, and bookmark your preferred institutes.", 
                hasShortlistedColleges, "COLLEGE", null));

        // Step 3: Check Documents (Income & Domicile)
        boolean hasIncomeCert = false;
        boolean hasDomicileCert = false;
        if (studentDocs != null) {
            for (DocumentRecord doc : studentDocs) {
                if ("Income Certificate".equalsIgnoreCase(doc.getDocumentType()) && "UPLOADED".equalsIgnoreCase(doc.getStatus())) {
                    hasIncomeCert = true;
                }
                if ("Domicile Certificate".equalsIgnoreCase(doc.getDocumentType()) && "UPLOADED".equalsIgnoreCase(doc.getStatus())) {
                    hasDomicileCert = true;
                }
            }
        }
        steps.add(new RoadmapStep("STEP-03", seq++, "Obtain Valid Income Certificate (Tehsildar/SDO)", 
                "Essential for fee remission at NITs/IITs and state scholarship portals (must be issued for current financial year).", 
                hasIncomeCert, "DOCUMENTS", "Income Certificate"));

        steps.add(new RoadmapStep("STEP-04", seq++, "Verify Domicile & Caste Reservation Certificates", 
                "Crucial to unlock Home State quota seats in BIT Sindri / NIT Jamshedpur with lower cutoffs.", 
                hasDomicileCert, "DOCUMENTS", "Domicile Certificate"));

        // Step 5: Counselling Registration
        steps.add(new RoadmapStep("STEP-05", seq++, "Register for JoSAA / CSAB & State Counselling Portals", 
                "Fill and arrange choices in prioritized order (Dream -> Realistic -> Safe backup).", 
                false, "COUNSELLING", null));

        // Step 6: Apply for Top Matched Scholarships
        steps.add(new RoadmapStep("STEP-06", seq++, "Submit Application for Reliance / NSP Scholarships", 
                "Leverage your uploaded marksheet and family income certificate before portal deadlines.", 
                false, "SCHOLARSHIP", null));

        // Step 7: Complete Application Tracking
        steps.add(new RoadmapStep("STEP-07", seq++, "Track Seat Allotment & Scholarship Verification", 
                "Monitor document verification status at nodal reporting centres and bank account PFMS seeding.", 
                false, "APPLICATION", null));

        return steps;
    }
}
