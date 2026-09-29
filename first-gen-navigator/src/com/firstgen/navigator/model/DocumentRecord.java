package com.firstgen.navigator.model;

/**
 * Represents a student document record stored locally.
 */
public class DocumentRecord {
    private String id;
    private String studentId;
    private String documentType; // Aadhaar, JEE Scorecard, Class 10 Marksheet, Class 12 Marksheet, Income Certificate, Caste Certificate, Domicile Certificate, Bank Passbook
    private String fileName;
    private String uploadDate;
    private String status; // UPLOADED, MISSING, EXPIRED
    private String verifiedNotes;

    public DocumentRecord() {}

    public DocumentRecord(String id, String studentId, String documentType, String fileName, 
                          String uploadDate, String status, String verifiedNotes) {
        this.id = id;
        this.studentId = studentId;
        this.documentType = documentType;
        this.fileName = fileName;
        this.uploadDate = uploadDate;
        this.status = status;
        this.verifiedNotes = verifiedNotes;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getUploadDate() { return uploadDate; }
    public void setUploadDate(String uploadDate) { this.uploadDate = uploadDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getVerifiedNotes() { return verifiedNotes; }
    public void setVerifiedNotes(String verifiedNotes) { this.verifiedNotes = verifiedNotes; }
}
