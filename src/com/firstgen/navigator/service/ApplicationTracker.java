package com.firstgen.navigator.service;

import com.firstgen.navigator.model.ApplicationRecord;

import java.util.*;

/**
 * Manages tracking of scholarship and college counselling applications.
 */
public class ApplicationTracker {

    public ApplicationRecord updateStatus(List<ApplicationRecord> list, String applicationId, String newStatus, String notes) {
        if (list == null) return null;
        for (ApplicationRecord app : list) {
            if (app.getId().equalsIgnoreCase(applicationId)) {
                app.setStatus(newStatus);
                if (notes != null && !notes.isEmpty()) {
                    app.setNotes(notes);
                }
                app.setLastUpdated(java.time.LocalDate.now().toString());
                return app;
            }
        }
        return null;
    }

    public ApplicationRecord createApplication(List<ApplicationRecord> list, String studentId, 
                                               String targetName, String type, String portalUrl) {
        ApplicationRecord app = new ApplicationRecord(
                "APP-" + System.currentTimeMillis(),
                studentId,
                targetName,
                type,
                "NOT_STARTED",
                java.time.LocalDate.now().toString(),
                portalUrl,
                "Initiated via First Gen Navigator"
        );
        list.add(app);
        return app;
    }
}
