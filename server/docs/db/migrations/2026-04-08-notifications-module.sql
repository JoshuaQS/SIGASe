CREATE TABLE notification_preferences (
    admin_id CHAR(36) NOT NULL,
    notify_critical TINYINT(1) NOT NULL DEFAULT 1,
    notify_security TINYINT(1) NOT NULL DEFAULT 1,
    notify_access_failures TINYINT(1) NOT NULL DEFAULT 1,
    notify_student_changes TINYINT(1) NOT NULL DEFAULT 1,
    notify_config_changes TINYINT(1) NOT NULL DEFAULT 1,
    notify_admin_changes TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (admin_id),
    CONSTRAINT fk_notification_preferences_admin
        FOREIGN KEY (admin_id) REFERENCES admins (id) ON DELETE CASCADE
);

CREATE TABLE notifications (
    id BIGINT NOT NULL AUTO_INCREMENT,
    admin_id CHAR(36) NOT NULL,
    title VARCHAR(160) NOT NULL,
    message VARCHAR(500) NOT NULL,
    type VARCHAR(20) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    dismissed TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    reference_type VARCHAR(20) NOT NULL,
    reference_id CHAR(36) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_notifications_admin_reference UNIQUE (admin_id, reference_type, reference_id),
    CONSTRAINT fk_notifications_admin
        FOREIGN KEY (admin_id) REFERENCES admins (id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_admin_created
    ON notifications (admin_id, created_at);

CREATE INDEX idx_notifications_admin_read
    ON notifications (admin_id, is_read);

CREATE INDEX idx_notifications_admin_dismissed
    ON notifications (admin_id, dismissed);

INSERT INTO notification_preferences (
    admin_id,
    notify_critical,
    notify_security,
    notify_access_failures,
    notify_student_changes,
    notify_config_changes,
    notify_admin_changes
)
SELECT
    a.id,
    1,
    1,
    1,
    1,
    1,
    1
FROM admins a
LEFT JOIN notification_preferences np ON np.admin_id = a.id
WHERE np.admin_id IS NULL;
