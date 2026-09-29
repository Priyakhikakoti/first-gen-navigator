package com.firstgen.navigator.model;

/**
 * Represents a single milestone in the personalized "What Next?" roadmap.
 */
public class RoadmapStep {
    private String id;
    private int sequence;
    private String title;
    private String description;
    private boolean completed;
    private String actionType; // PROFILE, DOCUMENTS, COUNSELLING, SCHOLARSHIP, APPLICATION
    private String targetEntityId; // Optional reference

    public RoadmapStep() {}

    public RoadmapStep(String id, int sequence, String title, String description, 
                       boolean completed, String actionType, String targetEntityId) {
        this.id = id;
        this.sequence = sequence;
        this.title = title;
        this.description = description;
        this.completed = completed;
        this.actionType = actionType;
        this.targetEntityId = targetEntityId;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public int getSequence() { return sequence; }
    public void setSequence(int sequence) { this.sequence = sequence; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }

    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }

    public String getTargetEntityId() { return targetEntityId; }
    public void setTargetEntityId(String targetEntityId) { this.targetEntityId = targetEntityId; }
}
