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
                "NIT-SIL", "Assam", "NIT", 40, 125000, 38000, true, "JoSAA / CSAB", 3.5);
        nitSilchar.addBranchCutoff("CSE", "GEN", 96.8);
        nitSilchar.addBranchCutoff("CSE", "OBC-NCL", 93.2);
        nitSilchar.addBranchCutoff("CSE", "EWS", 94.0);
        nitSilchar.addBranchCutoff("CSE", "SC", 84.0);
        nitSilchar.addBranchCutoff("CSE", "ST", 76.0);
        nitSilchar.addBranchCutoff("ECE", "GEN", 93.5);
        nitSilchar.addBranchCutoff("ECE", "OBC-NCL", 89.5);
        nitSilchar.addBranchCutoff("ECE", "EWS", 90.5);
        nitSilchar.addBranchCutoff("ECE", "SC", 78.0);
        nitSilchar.addBranchCutoff("ECE", "ST", 70.0);
        nitSilchar.addBranchCutoff("EE", "GEN", 91.5);
        nitSilchar.addBranchCutoff("EE", "OBC-NCL", 86.5);
        nitSilchar.addBranchCutoff("ME", "GEN", 89.0);
        nitSilchar.addBranchCutoff("ME", "OBC-NCL", 83.5);
        nitSilchar.addBranchCutoff("CE", "GEN", 87.0);
        nitSilchar.addBranchCutoff("CE", "OBC-NCL", 81.0);
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

        // 11. Indian Institute of Technology (IIT) Guwahati (Assam)
        College iitGuwahati = new College("COL-11", "Indian Institute of Technology (IIT) Guwahati", 
                "IIT-GHY", "Assam", "IIT", 7, 200000, 58000, true, "JoSAA / JEE Advanced", 0.0);
        iitGuwahati.addBranchCutoff("CSE", "GEN", 99.6);
        iitGuwahati.addBranchCutoff("CSE", "OBC-NCL", 98.5);
        iitGuwahati.addBranchCutoff("CSE", "EWS", 98.8);
        iitGuwahati.addBranchCutoff("CSE", "SC", 93.0);
        iitGuwahati.addBranchCutoff("CSE", "ST", 88.0);
        iitGuwahati.addBranchCutoff("ECE", "GEN", 98.8);
        iitGuwahati.addBranchCutoff("ECE", "OBC-NCL", 96.8);
        iitGuwahati.addBranchCutoff("EE", "GEN", 97.8);
        iitGuwahati.addBranchCutoff("EE", "OBC-NCL", 94.5);
        iitGuwahati.addBranchCutoff("ME", "GEN", 96.5);
        iitGuwahati.addBranchCutoff("ME", "OBC-NCL", 92.5);
        iitGuwahati.addBranchCutoff("CE", "GEN", 95.0);
        iitGuwahati.addBranchCutoff("CE", "OBC-NCL", 90.0);
        colleges.put(iitGuwahati.getId(), iitGuwahati);

        // 12. Indian Institute of Information Technology (IIIT) Guwahati (Assam)
        College iiitGuwahati = new College("COL-12", "Indian Institute of Information Technology (IIIT) Guwahati", 
                "IIIT-GHY", "Assam", "IIIT", 85, 225000, 48000, false, "JoSAA / CSAB", 1.5);
        iiitGuwahati.addBranchCutoff("CSE", "GEN", 97.0);
        iiitGuwahati.addBranchCutoff("CSE", "OBC-NCL", 93.5);
        iiitGuwahati.addBranchCutoff("CSE", "EWS", 94.2);
        iiitGuwahati.addBranchCutoff("CSE", "SC", 84.0);
        iiitGuwahati.addBranchCutoff("CSE", "ST", 75.0);
        iiitGuwahati.addBranchCutoff("ECE", "GEN", 94.5);
        iiitGuwahati.addBranchCutoff("ECE", "OBC-NCL", 90.0);
        iiitGuwahati.addBranchCutoff("ECE", "SC", 78.0);
        colleges.put(iiitGuwahati.getId(), iiitGuwahati);

        // 13. Assam Engineering College (AEC), Jalukbari, Guwahati (Assam Premier State Govt - Est. 1955)
        College aec = new College("COL-13", "Assam Engineering College (AEC) Jalukbari, Guwahati", 
                "AEC-GHY", "Assam", "State Govt", 130, 18000, 14000, true, "DTE Assam / Assam CEE / JEE Main", 5.0);
        aec.addBranchCutoff("CSE", "GEN", 92.5);
        aec.addBranchCutoff("CSE", "OBC-NCL", 86.0);
        aec.addBranchCutoff("CSE", "EWS", 87.5);
        aec.addBranchCutoff("CSE", "SC", 78.0);
        aec.addBranchCutoff("CSE", "ST", 70.0);
        aec.addBranchCutoff("ECE", "GEN", 89.0);
        aec.addBranchCutoff("ECE", "OBC-NCL", 82.0);
        aec.addBranchCutoff("ECE", "SC", 73.0);
        aec.addBranchCutoff("EE", "GEN", 86.5);
        aec.addBranchCutoff("EE", "OBC-NCL", 78.0);
        aec.addBranchCutoff("ME", "GEN", 84.0);
        aec.addBranchCutoff("ME", "OBC-NCL", 75.0);
        aec.addBranchCutoff("CE", "GEN", 82.0);
        aec.addBranchCutoff("CE", "OBC-NCL", 72.0);
        colleges.put(aec.getId(), aec);

        // 14. Jorhat Engineering College (JEC), Jorhat (Assam Premier State Govt - Est. 1960)
        College jec = new College("COL-14", "Jorhat Engineering College (JEC) Jorhat", 
                "JEC-JRH", "Assam", "State Govt", 145, 18000, 14000, true, "DTE Assam / Assam CEE / JEE Main", 5.0);
        jec.addBranchCutoff("CSE", "GEN", 91.0);
        jec.addBranchCutoff("CSE", "OBC-NCL", 84.5);
        jec.addBranchCutoff("CSE", "EWS", 85.5);
        jec.addBranchCutoff("CSE", "SC", 75.0);
        jec.addBranchCutoff("CSE", "ST", 68.0);
        jec.addBranchCutoff("EE", "GEN", 85.0);
        jec.addBranchCutoff("EE", "OBC-NCL", 77.0);
        jec.addBranchCutoff("ME", "GEN", 83.0);
        jec.addBranchCutoff("ME", "OBC-NCL", 74.0);
        jec.addBranchCutoff("CE", "GEN", 80.5);
        jec.addBranchCutoff("CE", "OBC-NCL", 71.0);
        colleges.put(jec.getId(), jec);

        // 15. Tezpur University, School of Engineering (Assam - Central Univ / CFTI)
        College tezpur = new College("COL-15", "Tezpur University, School of Engineering", 
                "TU-SOE", "Assam", "CFTI", 69, 48000, 22000, true, "JoSAA / CSAB / TU Entrance", 4.0);
        tezpur.addBranchCutoff("CSE", "GEN", 94.5);
        tezpur.addBranchCutoff("CSE", "OBC-NCL", 89.0);
        tezpur.addBranchCutoff("CSE", "EWS", 90.0);
        tezpur.addBranchCutoff("CSE", "SC", 80.0);
        tezpur.addBranchCutoff("CSE", "ST", 72.0);
        tezpur.addBranchCutoff("ECE", "GEN", 91.0);
        tezpur.addBranchCutoff("ECE", "OBC-NCL", 85.0);
        tezpur.addBranchCutoff("EE", "GEN", 88.0);
        tezpur.addBranchCutoff("EE", "OBC-NCL", 81.0);
        tezpur.addBranchCutoff("ME", "GEN", 85.0);
        tezpur.addBranchCutoff("ME", "OBC-NCL", 78.0);
        tezpur.addBranchCutoff("CE", "GEN", 83.0);
        tezpur.addBranchCutoff("CE", "OBC-NCL", 75.0);
        colleges.put(tezpur.getId(), tezpur);

        // 16. Central Institute of Technology (CIT) Kokrajhar (Assam - Deemed / CFTI)
        College citKokrajhar = new College("COL-16", "Central Institute of Technology (CIT) Kokrajhar", 
                "CIT-KKR", "Assam", "CFTI", 180, 42000, 20000, true, "JoSAA / CSAB / CIT Entrance", 5.0);
        citKokrajhar.addBranchCutoff("CSE", "GEN", 89.0);
        citKokrajhar.addBranchCutoff("CSE", "OBC-NCL", 81.0);
        citKokrajhar.addBranchCutoff("CSE", "EWS", 82.5);
        citKokrajhar.addBranchCutoff("CSE", "SC", 72.0);
        citKokrajhar.addBranchCutoff("CSE", "ST", 65.0);
        citKokrajhar.addBranchCutoff("ECE", "GEN", 85.0);
        citKokrajhar.addBranchCutoff("ECE", "OBC-NCL", 76.0);
        citKokrajhar.addBranchCutoff("IT", "GEN", 87.0);
        citKokrajhar.addBranchCutoff("IT", "OBC-NCL", 79.0);
        citKokrajhar.addBranchCutoff("CE", "GEN", 80.0);
        citKokrajhar.addBranchCutoff("CE", "OBC-NCL", 70.0);
        colleges.put(citKokrajhar.getId(), citKokrajhar);

        // 17. Assam University, Silchar - TSSOT (Assam - Central Univ / GFTI)
        College assamUniv = new College("COL-17", "Assam University, Triguna Sen School of Technology (TSSOT)", 
                "AUS-TSSOT", "Assam", "GFTI", 160, 45000, 18000, true, "JoSAA / CSAB", 4.5);
        assamUniv.addBranchCutoff("CSE", "GEN", 88.0);
        assamUniv.addBranchCutoff("CSE", "OBC-NCL", 80.0);
        assamUniv.addBranchCutoff("CSE", "EWS", 81.0);
        assamUniv.addBranchCutoff("CSE", "SC", 70.0);
        assamUniv.addBranchCutoff("CSE", "ST", 63.0);
        assamUniv.addBranchCutoff("ECE", "GEN", 84.0);
        assamUniv.addBranchCutoff("ECE", "OBC-NCL", 75.0);
        assamUniv.addBranchCutoff("CE", "GEN", 78.0);
        assamUniv.addBranchCutoff("CE", "OBC-NCL", 68.0);
        colleges.put(assamUniv.getId(), assamUniv);

        // 18. Bineswar Brahma Engineering College (BBEC), Kokrajhar (Assam State Govt)
        College bbec = new College("COL-18", "Bineswar Brahma Engineering College (BBEC) Kokrajhar", 
                "BBEC-KKR", "Assam", "State Govt", 220, 20000, 14000, true, "DTE Assam / Assam CEE", 6.0);
        bbec.addBranchCutoff("CSE", "GEN", 85.0);
        bbec.addBranchCutoff("CSE", "OBC-NCL", 77.0);
        bbec.addBranchCutoff("CSE", "EWS", 78.0);
        bbec.addBranchCutoff("CSE", "SC", 68.0);
        bbec.addBranchCutoff("CSE", "ST", 60.0);
        bbec.addBranchCutoff("EE", "GEN", 80.0);
        bbec.addBranchCutoff("EE", "OBC-NCL", 71.0);
        bbec.addBranchCutoff("ME", "GEN", 78.0);
        bbec.addBranchCutoff("ME", "OBC-NCL", 69.0);
        bbec.addBranchCutoff("CE", "GEN", 76.0);
        bbec.addBranchCutoff("CE", "OBC-NCL", 66.0);
        colleges.put(bbec.getId(), bbec);

        // 19. Jorhat Institute of Science & Technology (JIST), Jorhat (Assam State Govt)
        College jist = new College("COL-19", "Jorhat Institute of Science & Technology (JIST) Jorhat", 
                "JIST-JRH", "Assam", "State Govt", 230, 20000, 14000, true, "DTE Assam / Assam CEE", 6.0);
        jist.addBranchCutoff("CSE", "GEN", 83.5);
        jist.addBranchCutoff("CSE", "OBC-NCL", 75.0);
        jist.addBranchCutoff("CSE", "EWS", 76.5);
        jist.addBranchCutoff("CSE", "SC", 66.0);
        jist.addBranchCutoff("CSE", "ST", 58.0);
        jist.addBranchCutoff("ECE", "GEN", 79.0);
        jist.addBranchCutoff("ECE", "OBC-NCL", 70.0);
        jist.addBranchCutoff("ME", "GEN", 77.0);
        jist.addBranchCutoff("ME", "OBC-NCL", 68.0);
        jist.addBranchCutoff("CE", "GEN", 75.0);
        jist.addBranchCutoff("CE", "OBC-NCL", 65.0);
        colleges.put(jist.getId(), jist);

        // 20. Barak Valley Engineering College (BVEC), Karimganj (Assam State Govt)
        College bvec = new College("COL-20", "Barak Valley Engineering College (BVEC) Karimganj", 
                "BVEC-KRG", "Assam", "State Govt", 250, 20000, 14000, true, "DTE Assam / Assam CEE", 6.0);
        bvec.addBranchCutoff("CSE", "GEN", 81.0);
        bvec.addBranchCutoff("CSE", "OBC-NCL", 72.0);
        bvec.addBranchCutoff("CSE", "EWS", 74.0);
        bvec.addBranchCutoff("CSE", "SC", 63.0);
        bvec.addBranchCutoff("CSE", "ST", 55.0);
        bvec.addBranchCutoff("ECE", "GEN", 77.0);
        bvec.addBranchCutoff("ECE", "OBC-NCL", 67.0);
        bvec.addBranchCutoff("ME", "GEN", 74.0);
        bvec.addBranchCutoff("ME", "OBC-NCL", 64.0);
        bvec.addBranchCutoff("CE", "GEN", 72.0);
        bvec.addBranchCutoff("CE", "OBC-NCL", 61.0);
        colleges.put(bvec.getId(), bvec);

        // 21. Girijananda Chowdhury University (GCU), Guwahati (Assam Private / Self-Financed)
        College gcu = new College("COL-21", "Girijananda Chowdhury University (GCU) Guwahati", 
                "GCU-GHY", "Assam", "Private", 260, 110000, 50000, true, "State / Direct / JEE Main", 3.0);
        gcu.addBranchCutoff("CSE", "GEN", 72.0);
        gcu.addBranchCutoff("CSE", "OBC-NCL", 64.0);
        gcu.addBranchCutoff("CSE", "SC", 54.0);
        gcu.addBranchCutoff("CSE", "ST", 46.0);
        gcu.addBranchCutoff("ECE", "GEN", 68.0);
        gcu.addBranchCutoff("ECE", "OBC-NCL", 60.0);
        gcu.addBranchCutoff("EE", "GEN", 64.0);
        gcu.addBranchCutoff("EE", "OBC-NCL", 56.0);
        gcu.addBranchCutoff("ME", "GEN", 62.0);
        gcu.addBranchCutoff("ME", "OBC-NCL", 54.0);
        gcu.addBranchCutoff("CE", "GEN", 60.0);
        gcu.addBranchCutoff("CE", "OBC-NCL", 52.0);
        colleges.put(gcu.getId(), gcu);
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

        // 7. Ishan Uday Special Scholarship for NER (Assam & North East)
        Scholarship sc7 = new Scholarship("SCH-07", "Ishan Uday Special Scholarship for North Eastern Region (Assam)", 
                "UGC / Ministry of Education (NSP)", 93600, 450000, "Assam", "2026-10-31", 
                "Prestigious UGC scholarship providing Rs 7,800/month (Rs 93,600/year) for undergraduate technical/engineering students domiciled in Assam.", 
                "https://scholarships.gov.in");
        sc7.addEligibleCategory("GEN");
        sc7.addEligibleCategory("OBC-NCL");
        sc7.addEligibleCategory("EWS");
        sc7.addEligibleCategory("SC");
        sc7.addEligibleCategory("ST");
        sc7.setMinPercentileRequired(60.0);
        sc7.addRequiredDocument("Aadhaar");
        sc7.addRequiredDocument("Income Certificate");
        sc7.addRequiredDocument("Domicile Certificate");
        sc7.addRequiredDocument("Class 12 Marksheet");
        sc7.addRequiredDocument("Bank Details");
        scholarships.put(sc7.getId(), sc7);

        // 8. Assam DHE Combined Merit Scholarship
        Scholarship sc8 = new Scholarship("SCH-08", "Assam DHE Combined Merit Scholarship", 
                "Directorate of Higher Education, Govt of Assam", 24000, 500000, "Assam", "2026-11-15", 
                "Merit-cum-means scholarship awarded by Govt. of Assam for degree engineering students pursuing studies in recognized colleges.", 
                "https://dhe-operations.assam.gov.in");
        sc8.addEligibleCategory("GEN");
        sc8.addEligibleCategory("OBC-NCL");
        sc8.addEligibleCategory("EWS");
        sc8.addEligibleCategory("SC");
        sc8.addEligibleCategory("ST");
        sc8.setMinPercentileRequired(70.0);
        sc8.addRequiredDocument("Aadhaar");
        sc8.addRequiredDocument("Income Certificate");
        sc8.addRequiredDocument("Domicile Certificate");
        sc8.addRequiredDocument("Bank Details");
        scholarships.put(sc8.getId(), sc8);
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
