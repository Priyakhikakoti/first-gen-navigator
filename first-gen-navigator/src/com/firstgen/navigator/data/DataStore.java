package com.firstgen.navigator.data;

import com.firstgen.navigator.model.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory repository with pre-seeded, realistic Indian higher education data
 * (Colleges, Cutoffs, Scholarships, Deadlines, and Student Data).
 */
public class DataStore {
    private static DataStore instance;

    private final Map<String, College> colleges = new ConcurrentHashMap<>();
    private final Map<String, Scholarship> scholarships = new ConcurrentHashMap<>();
    private final Map<String, DeadlineItem> deadlines = new ConcurrentHashMap<>();
    private final Map<String, List<DocumentRecord>> studentDocuments = new ConcurrentHashMap<>();
    private final Map<String, List<ApplicationRecord>> studentApplications = new ConcurrentHashMap<>();
    private Student currentStudent;

    private DataStore() {
        seedColleges();
        seedScholarships();
        seedDeadlines();
        seedDefaultStudent();
    }

    public static synchronized DataStore getInstance() {
        if (instance == null) {
            instance = new DataStore();
        }
        return instance;
    }

    private void seedColleges() {
        // 1. NIT Jamshedpur (Jharkhand)
        College nitJsr = new College("COL-01", "National Institute of Technology (NIT) Jamshedpur", 
                "NIT-JSR", "Jharkhand", "NIT", 86, 125000, 42000, true, "JoSAA / CSAB", 3.5);
        nitJsr.addBranchCutoff("CSE", "GEN", 97.2);
        nitJsr.addBranchCutoff("CSE", "OBC-NCL", 94.0);
        nitJsr.addBranchCutoff("CSE", "EWS", 95.1);
        nitJsr.addBranchCutoff("CSE", "SC", 85.2);
        nitJsr.addBranchCutoff("CSE", "ST", 78.0);

        nitJsr.addBranchCutoff("ECE", "GEN", 95.5);
        nitJsr.addBranchCutoff("ECE", "OBC-NCL", 91.8);
        nitJsr.addBranchCutoff("ECE", "EWS", 93.0);
        nitJsr.addBranchCutoff("ECE", "SC", 80.5);
        nitJsr.addBranchCutoff("ECE", "ST", 72.0);

        nitJsr.addBranchCutoff("ME", "GEN", 92.5);
        nitJsr.addBranchCutoff("ME", "OBC-NCL", 88.0);
        nitJsr.addBranchCutoff("ME", "SC", 75.0);
        nitJsr.addBranchCutoff("ME", "ST", 68.0);
        colleges.put(nitJsr.getId(), nitJsr);

        // 2. BIT Sindri, Dhanbad (Jharkhand Premier Govt College - Highly Affordable)
        College bitSindri = new College("COL-02", "Birsa Institute of Technology (BIT) Sindri", 
                "BIT-SINDRI", "Jharkhand", "State Govt", 120, 28000, 18000, true, "JCECEB / JEE Main", 4.0);
        bitSindri.addBranchCutoff("CSE", "GEN", 93.0);
        bitSindri.addBranchCutoff("CSE", "OBC-NCL", 89.5);
        bitSindri.addBranchCutoff("CSE", "EWS", 90.0);
        bitSindri.addBranchCutoff("CSE", "SC", 78.0);
        bitSindri.addBranchCutoff("CSE", "ST", 70.0);

        bitSindri.addBranchCutoff("IT", "GEN", 91.5);
        bitSindri.addBranchCutoff("IT", "OBC-NCL", 87.5);
        bitSindri.addBranchCutoff("IT", "EWS", 88.5);
        bitSindri.addBranchCutoff("IT", "SC", 74.0);

        bitSindri.addBranchCutoff("ECE", "GEN", 89.0);
        bitSindri.addBranchCutoff("ECE", "OBC-NCL", 85.0);
        colleges.put(bitSindri.getId(), bitSindri);

        // 3. BIT Mesra, Ranchi (Jharkhand GFTI)
        College bitMesra = new College("COL-03", "Birla Institute of Technology (BIT) Mesra", 
                "BIT-MESRA", "Jharkhand", "GFTI", 53, 290000, 55000, true, "JoSAA / CSAB", 2.0);
        bitMesra.addBranchCutoff("CSE", "GEN", 98.2);
        bitMesra.addBranchCutoff("CSE", "OBC-NCL", 95.5);
        bitMesra.addBranchCutoff("CSE", "EWS", 96.0);
        bitMesra.addBranchCutoff("CSE", "SC", 87.0);

        bitMesra.addBranchCutoff("AI & DS", "GEN", 96.8);
        bitMesra.addBranchCutoff("AI & DS", "OBC-NCL", 93.5);

        bitMesra.addBranchCutoff("ECE", "GEN", 94.0);
        bitMesra.addBranchCutoff("ECE", "OBC-NCL", 91.0);
        colleges.put(bitMesra.getId(), bitMesra);

        // 4. IIIT Ranchi (Jharkhand)
        College iiitRanchi = new College("COL-04", "Indian Institute of Information Technology (IIIT) Ranchi", 
                "IIIT-RNC", "Jharkhand", "IIIT", 110, 180000, 48000, false, "JoSAA / CSAB", 1.0);
        iiitRanchi.addBranchCutoff("CSE", "GEN", 96.0);
        iiitRanchi.addBranchCutoff("CSE", "OBC-NCL", 92.8);
        iiitRanchi.addBranchCutoff("CSE", "EWS", 93.5);
        iiitRanchi.addBranchCutoff("CSE", "SC", 81.0);

        iiitRanchi.addBranchCutoff("ECE", "GEN", 93.0);
        iiitRanchi.addBranchCutoff("ECE", "OBC-NCL", 89.0);
        colleges.put(iiitRanchi.getId(), iiitRanchi);

        // 5. NIT Rourkela (Odisha)
        College nitRkl = new College("COL-05", "National Institute of Technology (NIT) Rourkela", 
                "NIT-RKL", "Odisha", "NIT", 16, 135000, 45000, true, "JoSAA / CSAB", 0.0);
        nitRkl.addBranchCutoff("CSE", "GEN", 99.0);
        nitRkl.addBranchCutoff("CSE", "OBC-NCL", 97.8);
        nitRkl.addBranchCutoff("CSE", "SC", 91.0);
        nitRkl.addBranchCutoff("ME", "GEN", 94.5);
        nitRkl.addBranchCutoff("ME", "OBC-NCL", 91.5);
        colleges.put(nitRkl.getId(), nitRkl);

        // 6. NIT Patna (Bihar)
        College nitPatna = new College("COL-06", "National Institute of Technology (NIT) Patna", 
                "NIT-PAT", "Bihar", "NIT", 56, 125000, 40000, true, "JoSAA / CSAB", 2.0);
        nitPatna.addBranchCutoff("CSE", "GEN", 97.0);
        nitPatna.addBranchCutoff("CSE", "OBC-NCL", 93.8);
        nitPatna.addBranchCutoff("CSE", "EWS", 94.8);
        nitPatna.addBranchCutoff("CSE", "SC", 83.5);

        nitPatna.addBranchCutoff("ECE", "GEN", 94.5);
        nitPatna.addBranchCutoff("ECE", "OBC-NCL", 90.5);
        colleges.put(nitPatna.getId(), nitPatna);

        // 7. Government Engineering College, Dumka (Jharkhand State Govt)
        College gecDumka = new College("COL-07", "Government Engineering College, Dumka", 
                "GEC-DMK", "Jharkhand", "State Govt", 180, 24000, 16000, true, "JCECEB", 5.0);
        gecDumka.addBranchCutoff("CSE", "GEN", 88.0);
        gecDumka.addBranchCutoff("CSE", "OBC-NCL", 82.0);
        gecDumka.addBranchCutoff("CSE", "SC", 68.0);
        gecDumka.addBranchCutoff("ECE", "GEN", 83.0);
        gecDumka.addBranchCutoff("ECE", "OBC-NCL", 76.0);
        colleges.put(gecDumka.getId(), gecDumka);

        // 8. NIT Silchar (Assam)
        College nitSilchar = new College("COL-08", "National Institute of Technology (NIT) Silchar", 
                "NIT-SIL", "Assam", "NIT", 40, 125000, 38000, true, "JoSAA / CSAB", 2.5);
        nitSilchar.addBranchCutoff("CSE", "GEN", 96.8);
        nitSilchar.addBranchCutoff("CSE", "OBC-NCL", 93.2);
        nitSilchar.addBranchCutoff("ECE", "GEN", 93.5);
        nitSilchar.addBranchCutoff("ECE", "OBC-NCL", 89.5);
        colleges.put(nitSilchar.getId(), nitSilchar);

        // 9. Jadavpur University, Kolkata (West Bengal)
        College juKolkata = new College("COL-09", "Jadavpur University, Faculty of Engg & Tech", 
                "JU-KOL", "West Bengal", "State Govt", 10, 12000, 15000, true, "WBJEE / JEE Main", 3.0);
        juKolkata.addBranchCutoff("CSE", "GEN", 98.8);
        juKolkata.addBranchCutoff("CSE", "OBC-NCL", 96.5);
        juKolkata.addBranchCutoff("IT", "GEN", 97.5);
        juKolkata.addBranchCutoff("IT", "OBC-NCL", 94.5);
        colleges.put(juKolkata.getId(), juKolkata);

        // 10. MNNIT Allahabad, Prayagraj (Uttar Pradesh)
        College mnnit = new College("COL-10", "Motilal Nehru National Institute of Technology (MNNIT) Allahabad", 
                "MNNIT-ALL", "Uttar Pradesh", "NIT", 49, 130000, 44000, true, "JoSAA / CSAB", 2.0);
        mnnit.addBranchCutoff("CSE", "GEN", 98.5);
        mnnit.addBranchCutoff("CSE", "OBC-NCL", 96.0);
        mnnit.addBranchCutoff("ECE", "GEN", 95.8);
        mnnit.addBranchCutoff("ECE", "OBC-NCL", 92.5);
        colleges.put(mnnit.getId(), mnnit);
    }

    private void seedScholarships() {
        // 1. Post-Matric Scholarship for OBC Students (e-Kalyan / State)
        Scholarship sc1 = new Scholarship("SCH-01", "Post-Matric Scholarship for Backward Classes (OBC)", 
                "State Welfare Dept / e-Kalyan", 50000, 300000, "Jharkhand", "2026-09-22", 
                "Financial assistance for OBC-NCL students pursuing higher engineering degrees in recognized institutions.", 
                "https://ekalyan.cgg.gov.in");
        sc1.addEligibleCategory("OBC-NCL");
        sc1.addRequiredDocument("Aadhaar");
        sc1.addRequiredDocument("Income Certificate");
        sc1.addRequiredDocument("Caste Certificate");
        sc1.addRequiredDocument("Domicile Certificate");
        sc1.addRequiredDocument("Bank Details");
        scholarships.put(sc1.getId(), sc1);

        // 2. Central Sector Scheme of Scholarship (CSSS - MoE)
        Scholarship sc2 = new Scholarship("SCH-02", "Central Sector Scheme of Scholarship (CSSS)", 
                "Ministry of Education (NSP)", 20000, 450000, "ALL_INDIA", "2026-10-15", 
                "Merit-cum-means scholarship for top percentile college students pursuing regular engineering/professional courses.", 
                "https://scholarships.gov.in");
        sc2.addEligibleCategory("GEN");
        sc2.addEligibleCategory("OBC-NCL");
        sc2.addEligibleCategory("EWS");
        sc2.setMinPercentileRequired(80.0);
        sc2.addRequiredDocument("Aadhaar");
        sc2.addRequiredDocument("Class 12 Marksheet");
        sc2.addRequiredDocument("Income Certificate");
        sc2.addRequiredDocument("Bank Details");
        scholarships.put(sc2.getId(), sc2);

        // 3. Reliance Foundation Undergraduate Scholarship
        Scholarship sc3 = new Scholarship("SCH-03", "Reliance Foundation Undergraduate Scholarship", 
                "Reliance Foundation", 50000, 250000, "ALL_INDIA", "2026-09-18", 
                "Need-cum-merit scholarship empowering first-generation scholars pursuing first-year degree programs.", 
                "https://www.scholarships.reliancefoundation.org");
        sc3.addEligibleCategory("GEN");
        sc3.addEligibleCategory("OBC-NCL");
        sc3.addEligibleCategory("SC");
        sc3.addEligibleCategory("ST");
        sc3.addEligibleCategory("EWS");
        sc3.setMinPercentileRequired(75.0);
        sc3.addRequiredDocument("Aadhaar");
        sc3.addRequiredDocument("Income Certificate");
        sc3.addRequiredDocument("Class 12 Marksheet");
        scholarships.put(sc3.getId(), sc3);

        // 4. Tata Trusts Need-Based Engineering Grant
        Scholarship sc4 = new Scholarship("SCH-04", "Tata Trusts Education Grant for Technical Education", 
                "Tata Trusts", 60000, 400000, "ALL_INDIA", "2026-10-30", 
                "Provides substantial fee relief for disadvantaged engineering students in recognized colleges.", 
                "https://www.tatatrusts.org");
        sc4.addEligibleCategory("GEN");
        sc4.addEligibleCategory("OBC-NCL");
        sc4.addEligibleCategory("SC");
        sc4.addEligibleCategory("ST");
        sc4.addEligibleCategory("EWS");
        sc4.addRequiredDocument("Aadhaar");
        sc4.addRequiredDocument("Income Certificate");
        sc4.addRequiredDocument("JEE Scorecard");
        scholarships.put(sc4.getId(), sc4);

        // 5. Post-Matric Scholarship for SC/ST Students
        Scholarship sc5 = new Scholarship("SCH-05", "Post-Matric Scholarship for SC/ST Scholars", 
                "Ministry of Social Justice / NSP", 100000, 250000, "ALL_INDIA", "2026-11-05", 
                "Full maintenance allowance and tuition reimbursement for SC/ST students.", 
                "https://scholarships.gov.in");
        sc5.addEligibleCategory("SC");
        sc5.addEligibleCategory("ST");
        sc5.addRequiredDocument("Aadhaar");
        sc5.addRequiredDocument("Caste Certificate");
        sc5.addRequiredDocument("Income Certificate");
        sc5.addRequiredDocument("Domicile Certificate");
        scholarships.put(sc5.getId(), sc5);

        // 6. Foundation for Excellence (FFE) Engineering Scholarship
        Scholarship sc6 = new Scholarship("SCH-06", "Foundation for Excellence (FFE) Scholarship", 
                "FFE India Trust", 50000, 300000, "ALL_INDIA", "2026-10-20", 
                "For academically gifted students pursuing BE/BTech with constrained economic circumstances.", 
                "https://ffe.org");
        sc6.addEligibleCategory("GEN");
        sc6.addEligibleCategory("OBC-NCL");
        sc6.addEligibleCategory("EWS");
        sc6.setMinPercentileRequired(85.0);
        sc6.addRequiredDocument("Aadhaar");
        sc6.addRequiredDocument("Income Certificate");
        sc6.addRequiredDocument("JEE Scorecard");
        scholarships.put(sc6.getId(), sc6);
    }

    private void seedDeadlines() {
        deadlines.put("D-01", new DeadlineItem("D-01", "Reliance Foundation Scholarship Closing", 
                "SCHOLARSHIP", "2026-09-17", "https://www.scholarships.reliancefoundation.org", 
                "Last chance to submit undergraduate portal application with income slip."));

        deadlines.put("D-02", new DeadlineItem("D-02", "State e-Kalyan Portal Domicile Verification", 
                "DOCUMENT_SUBMISSION", "2026-09-22", "https://ekalyan.cgg.gov.in", 
                "Mandatory upload of Circle Officer/SDO verified caste and income certificate."));

        deadlines.put("D-03", new DeadlineItem("D-03", "JoSAA Round 1 Choice Filling & Locking", 
                "COUNSELLING", "2026-09-25", "https://josaa.nic.in", 
                "Complete locking of college preferences across NITs, IIITs, and GFTIs."));

        deadlines.put("D-04", new DeadlineItem("D-04", "NSP Central Sector Scheme Registration", 
                "SCHOLARSHIP", "2026-10-15", "https://scholarships.gov.in", 
                "National Scholarship Portal registration for first-year degree students."));
    }

    private void seedDefaultStudent() {
        // Asha Kumar profile as requested in the prompt
        this.currentStudent = new Student("Asha Kumar", 92.0, "OBC-NCL", "Jharkhand", 
                300000, "CSE", 100000);
        this.currentStudent.setId("STU-ASHA-01");

        // Seed document status for Asha Kumar:
        // Stored: Aadhaar, JEE Scorecard, Class 12 Marksheet, Caste Certificate
        // Missing: Income Certificate (in progress), Domicile Certificate (missing)
        List<DocumentRecord> docs = new ArrayList<>();
        docs.add(new DocumentRecord("DOC-01", currentStudent.getId(), "Aadhaar", "aadhaar_asha.pdf", "2026-08-10", "UPLOADED", "Verified via DigiLocker"));
        docs.add(new DocumentRecord("DOC-02", currentStudent.getId(), "JEE Scorecard", "jee_main_scorecard.pdf", "2026-08-12", "UPLOADED", "NTA verified (92.0 percentile)"));
        docs.add(new DocumentRecord("DOC-03", currentStudent.getId(), "Class 12 Marksheet", "cbse_12th_marksheet.pdf", "2026-08-12", "UPLOADED", "Passed with 88.4%"));
        docs.add(new DocumentRecord("DOC-04", currentStudent.getId(), "Caste Certificate", "obc_ncl_cert_jharkhand.pdf", "2026-08-15", "UPLOADED", "Valid non-creamy layer issued by SDO"));
        docs.add(new DocumentRecord("DOC-05", currentStudent.getId(), "Income Certificate", null, null, "MISSING", "Needs renewal from Tehsildar"));
        docs.add(new DocumentRecord("DOC-06", currentStudent.getId(), "Domicile Certificate", null, null, "MISSING", "Required for state quota admission"));
        docs.add(new DocumentRecord("DOC-07", currentStudent.getId(), "Bank Details", "sbi_passbook.pdf", "2026-08-18", "UPLOADED", "Aadhaar seeded savings account"));
        studentDocuments.put(currentStudent.getId(), docs);

        // Seed sample application tracking for Asha
        List<ApplicationRecord> apps = new ArrayList<>();
        apps.add(new ApplicationRecord("APP-01", currentStudent.getId(), "Reliance Foundation Undergraduate Scholarship", 
                "SCHOLARSHIP", "IN_REVIEW", "2026-09-10", "https://reliancefoundation.org", "Documents uploaded. Awaiting aptitude test schedule."));
        apps.add(new ApplicationRecord("APP-02", currentStudent.getId(), "BIT Sindri - CSE (State Quota)", 
                "COLLEGE", "DOCUMENTS_COLLECTED", "2026-09-12", "https://bitsindri.ac.in", "Choice filled in JCECEB portal."));
        apps.add(new ApplicationRecord("APP-03", currentStudent.getId(), "e-Kalyan Post-Matric OBC", 
                "SCHOLARSHIP", "NOT_STARTED", "2026-09-13", "https://ekalyan.cgg.gov.in", "Waiting for renewal of Income Certificate."));
        studentApplications.put(currentStudent.getId(), apps);
    }

    public Map<String, College> getColleges() { return colleges; }
    public Map<String, Scholarship> getScholarships() { return scholarships; }
    public Map<String, DeadlineItem> getDeadlines() { return deadlines; }
    public Map<String, List<DocumentRecord>> getStudentDocuments() { return studentDocuments; }
    public Map<String, List<ApplicationRecord>> getStudentApplications() { return studentApplications; }
    public Student getCurrentStudent() { return currentStudent; }
    public void setCurrentStudent(Student currentStudent) { this.currentStudent = currentStudent; }
}
