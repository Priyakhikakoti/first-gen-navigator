package com.firstgen.navigator.service;

import com.firstgen.navigator.model.DocumentRecord;
import com.firstgen.navigator.model.Scholarship;

import java.util.*;

/**
 * Manages stored student documents and computes readiness scorecards
 * against target scholarship requirements.
 */
public class DocumentManager {

    public static class ReadinessReport {
        private String scholarshipId;
        private String scholarshipName;
        private int readyCount;
        private int totalCount;
        private double percentage;
        private List<DocCheckItem> checklist;

        public static class DocCheckItem {
            private String docType;
            private boolean isAvailable;
            private String fileName;
            private String status;

            public DocCheckItem(String docType, boolean isAvailable, String fileName, String status) {
                this.docType = docType;
                this.isAvailable = isAvailable;
                this.fileName = fileName;
                this.status = status;
            }

            public String getDocType() { return docType; }
            public boolean isAvailable() { return isAvailable; }
            public String getFileName() { return fileName; }
            public String getStatus() { return status; }
        }

        public ReadinessReport() {
            this.checklist = new ArrayList<>();
        }

        public String getScholarshipId() { return scholarshipId; }
        public void setScholarshipId(String scholarshipId) { this.scholarshipId = scholarshipId; }

        public String getScholarshipName() { return scholarshipName; }
        public void setScholarshipName(String scholarshipName) { this.scholarshipName = scholarshipName; }

        public int getReadyCount() { return readyCount; }
        public void setReadyCount(int readyCount) { this.readyCount = readyCount; }

        public int getTotalCount() { return totalCount; }
        public void setTotalCount(int totalCount) { this.totalCount = totalCount; }

        public double getPercentage() { return percentage; }
        public void setPercentage(double percentage) { this.percentage = percentage; }

        public List<DocCheckItem> getChecklist() { return checklist; }
        public void setChecklist(List<DocCheckItem> checklist) { this.checklist = checklist; }
    }

    public ReadinessReport checkReadiness(Scholarship scholarship, List<DocumentRecord> studentDocs) {
        ReadinessReport report = new ReadinessReport();
        report.setScholarshipId(scholarship.getId());
        report.setScholarshipName(scholarship.getName());

        Map<String, DocumentRecord> uploadedMap = new HashMap<>();
        if (studentDocs != null) {
            for (DocumentRecord doc : studentDocs) {
                if ("UPLOADED".equalsIgnoreCase(doc.getStatus())) {
                    uploadedMap.put(doc.getDocumentType().toLowerCase(), doc);
                }
            }
        }

        int ready = 0;
        int total = scholarship.getRequiredDocumentTypes().size();

        for (String reqType : scholarship.getRequiredDocumentTypes()) {
            DocumentRecord existing = uploadedMap.get(reqType.toLowerCase());
            boolean available = (existing != null);
            if (available) ready++;

            report.getChecklist().add(new ReadinessReport.DocCheckItem(
                    reqType,
                    available,
                    available ? existing.getFileName() : null,
                    available ? "Ready" : "Missing / Required"
            ));
        }

        report.setReadyCount(ready);
        report.setTotalCount(total);
        report.setPercentage(total > 0 ? (ready * 100.0 / total) : 100.0);

        return report;
    }

    public List<DocumentRecord> addOrUpdateDocument(List<DocumentRecord> docList, String studentId, 
                                                    String docType, String fileName) {
        if (docList == null) {
            docList = new ArrayList<>();
        }

        boolean found = false;
        for (DocumentRecord doc : docList) {
            if (doc.getDocumentType().equalsIgnoreCase(docType)) {
                doc.setFileName(fileName);
                doc.setStatus("UPLOADED");
                doc.setUploadDate(java.time.LocalDate.now().toString());
                doc.setVerifiedNotes("Uploaded via First Gen Portal");
                found = true;
                break;
            }
        }

        if (!found) {
            DocumentRecord newDoc = new DocumentRecord(
                    "DOC-" + System.currentTimeMillis(),
                    studentId,
                    docType,
                    fileName,
                    java.time.LocalDate.now().toString(),
                    "UPLOADED",
                    "Uploaded via First Gen Portal"
            );
            docList.add(newDoc);
        }

        return docList;
    }
}
