package mx.edu.utez.server.modules.careers.entity;

import mx.edu.utez.server.shared.entity.BaseAuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "careers",
        indexes = {
                @Index(name = "idx_careers_code", columnList = "code", unique = true),
                @Index(name = "idx_careers_name", columnList = "name", unique = true),
                @Index(name = "idx_careers_active", columnList = "is_active")
        }
)
public class Career extends BaseAuditableEntity {

    @Column(name = "code", nullable = false, length = 20, unique = true)
    private String code;

    @Column(name = "name", nullable = false, length = 160, unique = true)
    private String name;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }
}
