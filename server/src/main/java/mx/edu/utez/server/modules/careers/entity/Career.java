package mx.edu.utez.server.modules.careers.entity;

import mx.edu.utez.server.shared.entity.BaseAuditableEntity;
import mx.edu.utez.server.shared.enums.CareerStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "careers",
        indexes = {
                @Index(name = "idx_careers_code", columnList = "code", unique = true),
                @Index(name = "idx_careers_name", columnList = "name", unique = true),
                @Index(name = "idx_careers_status", columnList = "status")
        }
)
public class Career extends BaseAuditableEntity {

    @Column(name = "code", nullable = false, length = 20, unique = true)
    private String code;

    @Column(name = "name", nullable = false, length = 160, unique = true)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private CareerStatus status = CareerStatus.ACTIVE;

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

    public CareerStatus getStatus() {
        return status;
    }

    public void setStatus(CareerStatus status) {
        this.status = status;
    }

    /** Bridge para compatibilidad con llamadores existentes. */
    public boolean isActive() {
        return status == CareerStatus.ACTIVE;
    }

    /** Bridge para compatibilidad con llamadores existentes. */
    public void setActive(boolean active) {
        this.status = active ? CareerStatus.ACTIVE : CareerStatus.INACTIVE;
    }
}
