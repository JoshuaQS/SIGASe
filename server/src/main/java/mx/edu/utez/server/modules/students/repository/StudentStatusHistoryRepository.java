package mx.edu.utez.server.modules.students.repository;

import mx.edu.utez.server.modules.students.entity.StudentStatusHistory;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentStatusHistoryRepository extends JpaRepository<StudentStatusHistory, UUID> {

    List<StudentStatusHistory> findByStudent_IdOrderByOccurredAtDesc(UUID studentId);
}
