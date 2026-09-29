package com.firstgen.navigator.service;

import com.firstgen.navigator.model.DeadlineItem;

import java.util.*;
import java.util.concurrent.*;

/**
 * Manages deadline tracking and scheduled alert evaluation.
 */
public final class DeadlineManager {

    private final ScheduledExecutorService scheduler;
    private final List<String> activeAlerts;

    public DeadlineManager() {
        this.scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "DeadlineSchedulerThread");
            t.setDaemon(true);
            return t;
        });
        this.activeAlerts = new CopyOnWriteArrayList<>();
        startScheduledEvaluator();
    }

    private void startScheduledEvaluator() {
        // Runs periodically to evaluate deadlines and generate active warnings
        scheduler.scheduleAtFixedRate(this::evaluateAlerts, 0, 1, TimeUnit.HOURS);
    }

    public void evaluateAlerts() {
        // Periodic check
    }

    public List<DeadlineItem> getSortedDeadlines(Collection<DeadlineItem> allDeadlines) {
        List<DeadlineItem> list = new ArrayList<>(allDeadlines);
        list.sort(Comparator.comparingLong(DeadlineItem::getDaysRemaining));
        return list;
    }

    public List<String> generateAlertNotifications(Collection<DeadlineItem> allDeadlines) {
        List<String> notifications = new ArrayList<>();
        for (DeadlineItem item : allDeadlines) {
            long days = item.getDaysRemaining();
            if (days >= 0 && days <= 3) {
                notifications.add(String.format("URGENT (🔴 %d days remaining): %s closes on %s. Ensure all documents are uploaded!", 
                        days, item.getTitle(), item.getDueDateStr()));
            } else if (days > 3 && days <= 10) {
                notifications.add(String.format("APPROACHING (🟡 %d days remaining): %s due date is near.", 
                        days, item.getTitle()));
            }
        }
        return notifications;
    }

    public void shutdown() {
        scheduler.shutdown();
    }
}
