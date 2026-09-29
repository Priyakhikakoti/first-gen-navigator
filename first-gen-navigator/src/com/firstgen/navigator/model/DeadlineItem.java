package com.firstgen.navigator.model;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Tracks critical academic and scholarship deadlines with urgency classification.
 */
public class DeadlineItem {
    private String id;
    private String title;
    private String category; // SCHOLARSHIP, COUNSELLING, DOCUMENT_SUBMISSION
    private String dueDateStr; // YYYY-MM-DD
    private String portalUrl;
    private String description;

    public DeadlineItem() {}

    public DeadlineItem(String id, String title, String category, String dueDateStr, 
                        String portalUrl, String description) {
        this.id = id;
        this.title = title;
        this.category = category;
        this.dueDateStr = dueDateStr;
        this.portalUrl = portalUrl;
        this.description = description;
    }

    public long getDaysRemaining() {
        try {
            LocalDate today = LocalDate.now();
            LocalDate due = LocalDate.parse(dueDateStr);
            return ChronoUnit.DAYS.between(today, due);
        } catch (Exception e) {
            return 30; // fallback
        }
    }

    public String getUrgencyLevel() {
        long days = getDaysRemaining();
        if (days <= 3) return "CRITICAL"; // 🔴 Red
        if (days <= 14) return "APPROACHING"; // 🟡 Yellow
        return "UPCOMING"; // 🟢 Green
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getDueDateStr() { return dueDateStr; }
    public void setDueDateStr(String dueDateStr) { this.dueDateStr = dueDateStr; }

    public String getPortalUrl() { return portalUrl; }
    public void setPortalUrl(String portalUrl) { this.portalUrl = portalUrl; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
