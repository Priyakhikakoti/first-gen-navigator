package com.firstgen.navigator.model;

/**
 * Tracks the lifecycle status of a scholarship or college application.
 */
public class ApplicationRecord {
    private String id;
    private String studentId;
    private String targetName; // e.g. "Reliance Foundation Scholarship" or "NIT Jamshedpur CSE"
    private String type; // SCHOLARSHIP or COLLEGE
    private String status; // NOT_STARTED, DOCUMENTS_COLLECTED, APPLIED, IN_REVIEW, VERIFIED, AWARDED
    private String lastUpdated;
    private String portalUrl;
    private String notes;

    public ApplicationRecord() {}

    public ApplicationRecord(String id, String studentId, String targetName, String type, 
                             String status, String lastUpdated, String portalUrl, String notes) {
        this.id = id;
        this.studentId = studentId;
        this.targetName = targetName;
        this.type = type;
        this.status = status;
        this.lastUpdated = lastUpdated;
        this.portalUrl = portalUrl;
        this.notes = notes;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getTargetName() { return targetName; }
    public void setTargetName(String targetName) { this.targetName = targetName; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(String lastUpdated) { this.lastUpdated = lastUpdated; }

    public String getPortalUrl() { return portalUrl; }
    public void setPortalUrl(String portalUrl) { this.portalUrl = portalUrl; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
