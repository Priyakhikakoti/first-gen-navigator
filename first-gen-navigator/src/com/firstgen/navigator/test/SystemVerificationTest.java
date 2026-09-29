package com.firstgen.navigator.test;

import com.firstgen.navigator.data.DataStore;
import com.firstgen.navigator.model.*;
import com.firstgen.navigator.service.*;

import java.util.*;

/**
 * System Verification Test Runner.
 * Executes end-to-end verification of all core modules without external testing frameworks.
 */
public class SystemVerificationTest {

    private static int passedCount = 0;
    private static int failedCount = 0;

    public static void main(String[] args) {
        System.out.println("=========================================================");
        System.out.println("  RUNNING SYSTEM VERIFICATION TESTS: FIRST GEN NAVIGATOR");
        System.out.println("=========================================================");

        testAffordabilityCalculation();
        testCollegeMatchingTiers();
        testScholarshipEligibilityChecker();
        testAlternativePathways();
        testDocumentReadiness();
        testDeadlineUrgency();

        System.out.println("=========================================================");
        System.out.printf("  TEST RESULTS: %d PASSED, %d FAILED\n", passedCount, failedCount);
        System.out.println("=========================================================");

        if (failedCount > 0) {
            System.exit(1);
        }
    }

    private static void assertTrue(String testName, boolean condition, String message) {
        if (condition) {
            System.out.println("  [PASS] " + testName);
            passedCount++;
        } else {
            System.err.println("  [FAIL] " + testName + " -> " + message);
            failedCount++;
        }
    }

    private static void testAffordabilityCalculation() {
        AffordabilityCalculator calc = new AffordabilityCalculator();
        College collegeB = new College("TEST-COL", "College B", "CB", "Jharkhand", "State Govt", 100, 80000, 40000, false, "JoSAA", 0);
        Student student = new Student("Asha Kumar", 92.0, "OBC-NCL", "Jharkhand", 300000, "CSE", 100000);

        // 80,000 tuition + 40,000 hostel - 50,000 scholarship = 70,000 estimated net cost
        AffordabilityResult res = calc.calculate(collegeB, student, 50000);

        assertTrue("Tuition Calculation", res.getAnnualTuition() == 80000, "Expected tuition 80,000");
        assertTrue("Hostel Calculation", res.getAnnualHostel() == 40000, "Expected hostel 40,000");
        assertTrue("Scholarship Subtraction", res.getApplicableScholarship() == 50000, "Expected scholarship 50,000");
        assertTrue("Net Cost Calculation", res.getEstimatedNetCost() == 70000, "Expected 70,000, got: " + res.getEstimatedNetCost());
        assertTrue("Affordability Tier is Affordable", "Affordable".equals(res.getAffordabilityTier()), "Expected 'Affordable' for 70k cost on 100k budget");
    }

    private static void testCollegeMatchingTiers() {
        DataStore ds = DataStore.getInstance();
        Student student = ds.getCurrentStudent(); // Asha Kumar: 92 percentile, OBC, Jharkhand
        AffordabilityCalculator calc = new AffordabilityCalculator();
        CollegeMatcher matcher = new CollegeMatcher(calc);

        Map<String, List<CollegeMatcher.CollegeMatchCard>> matches = matcher.matchColleges(
                new ArrayList<>(ds.getColleges().values()), student, 50000);

        assertTrue("Dream Tiers Populated", matches.containsKey("DREAM") && !matches.get("DREAM").isEmpty(), 
                "Expected at least one dream option");
        assertTrue("Realistic Tiers Populated", matches.containsKey("REALISTIC") && !matches.get("REALISTIC").isEmpty(), 
                "Expected realistic options for 92 percentile");
        assertTrue("Safe Tiers Populated", matches.containsKey("SAFE") && !matches.get("SAFE").isEmpty(), 
                "Expected safe options");

        // Verify BIT Sindri is in Realistic or Safe due to Home State quota
        boolean foundBitSindri = false;
        for (CollegeMatcher.CollegeMatchCard card : matches.get("REALISTIC")) {
            if (card.getCollege().getName().contains("Sindri")) foundBitSindri = true;
        }
        for (CollegeMatcher.CollegeMatchCard card : matches.get("SAFE")) {
            if (card.getCollege().getName().contains("Sindri")) foundBitSindri = true;
        }
        assertTrue("Home State BIT Sindri Matched", foundBitSindri, "Expected BIT Sindri to be matched for Jharkhand OBC student");
    }

    private static void testScholarshipEligibilityChecker() {
        EligibilityChecker checker = new EligibilityChecker();
        Student student = new Student("Asha Kumar", 92.0, "OBC-NCL", "Jharkhand", 300000, "CSE", 100000);

        // Scholarship A: OBC eligible, max income 3L, state Jharkhand
        Scholarship scA = new Scholarship("S-A", "Scholarship A", "State", 50000, 300000, "Jharkhand", "2026-10-01", "Desc", "url");
        scA.addEligibleCategory("OBC-NCL");
        EligibilityResult resA = checker.checkScholarshipEligibility(scA, student);
        assertTrue("Eligible for Scholarship A", resA.isEligible(), "Asha should be eligible for Scholarship A");
        assertTrue("Likely Eligible Status Text", resA.getOverallStatus().contains("LIKELY ELIGIBLE"), "Expected 'YOU ARE LIKELY ELIGIBLE'");

        // Scholarship C: Max income 2.5L (Asha has 3.0L) -> Should fail income condition
        Scholarship scC = new Scholarship("S-C", "Scholarship C", "Trust", 30000, 250000, "ALL_INDIA", "2026-10-01", "Desc", "url");
        scC.addEligibleCategory("OBC-NCL");
        EligibilityResult resC = checker.checkScholarshipEligibility(scC, student);
        assertTrue("Ineligible for Scholarship C due to income", !resC.isEligible(), "Asha should not be eligible for Scholarship C");
        assertTrue("Income Failure Detected", resC.getCriteriaChecks().stream().anyMatch(c -> c.getCriterion().contains("Income") && !c.isPassed()), 
                "Expected income check to fail");
    }

    private static void testAlternativePathways() {
        DataStore ds = DataStore.getInstance();
        Student student = ds.getCurrentStudent();
        AffordabilityCalculator calc = new AffordabilityCalculator();
        AlternativePathGenerator altGen = new AlternativePathGenerator(calc);

        AlternativePathGenerator.AlternativeAnalysis analysis = altGen.generateAlternatives(
                new ArrayList<>(ds.getColleges().values()), student, 50000);

        assertTrue("Alternative Pathways Count >= 3", analysis.getPathways().size() >= 3, "Expected Plan A, B, C pathways");
        assertTrue("Contains Plan A", analysis.getPathways().stream().anyMatch(p -> p.getPlanTag().contains("Plan A")), "Missing Plan A");
        assertTrue("Contains Plan B", analysis.getPathways().stream().anyMatch(p -> p.getPlanTag().contains("Plan B")), "Missing Plan B");
        assertTrue("Contains Plan C", analysis.getPathways().stream().anyMatch(p -> p.getPlanTag().contains("Plan C")), "Missing Plan C");
    }

    private static void testDocumentReadiness() {
        DataStore ds = DataStore.getInstance();
        Student student = ds.getCurrentStudent();
        DocumentManager docMgr = new DocumentManager();
        List<DocumentRecord> docs = ds.getStudentDocuments().get(student.getId());

        // Scholarship requiring Aadhaar, Income Certificate, Domicile Certificate
        Scholarship sc = new Scholarship("SCH-TEST", "Test Scholarship", "Trust", 50000, 500000, "ALL_INDIA", "2026-10-01", "Desc", "url");
        sc.addRequiredDocument("Aadhaar");
        sc.addRequiredDocument("Income Certificate");
        sc.addRequiredDocument("Domicile Certificate");

        DocumentManager.ReadinessReport report = docMgr.checkReadiness(sc, docs);
        // In Asha's initial seed: Aadhaar is uploaded, but Income Certificate and Domicile Certificate are MISSING
        assertTrue("Document Readiness Check Count", report.getTotalCount() == 3, "Expected 3 required documents");
        assertTrue("Uploaded Document Matched", report.getReadyCount() == 1, "Expected 1 uploaded doc (Aadhaar)");
    }

    private static void testDeadlineUrgency() {
        DeadlineItem urgent = new DeadlineItem("D-1", "Test Urgent", "SCHOLARSHIP", java.time.LocalDate.now().plusDays(2).toString(), "url", "desc");
        DeadlineItem approaching = new DeadlineItem("D-2", "Test Approaching", "COUNSELLING", java.time.LocalDate.now().plusDays(8).toString(), "url", "desc");
        DeadlineItem upcoming = new DeadlineItem("D-3", "Test Upcoming", "SCHOLARSHIP", java.time.LocalDate.now().plusDays(22).toString(), "url", "desc");

        assertTrue("Urgent Deadline Flagged Critical", "CRITICAL".equals(urgent.getUrgencyLevel()), "Expected CRITICAL for 2 days");
        assertTrue("Approaching Deadline Flagged", "APPROACHING".equals(approaching.getUrgencyLevel()), "Expected APPROACHING for 8 days");
        assertTrue("Upcoming Deadline Flagged", "UPCOMING".equals(upcoming.getUrgencyLevel()), "Expected UPCOMING for 22 days");
    }
}
