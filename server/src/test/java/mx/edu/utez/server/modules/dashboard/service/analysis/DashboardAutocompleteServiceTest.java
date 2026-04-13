package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.util.List;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.enums.CareerStatus;
import mx.edu.utez.server.shared.enums.StudentStatus;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Pageable;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DashboardAutocompleteServiceTest {

    private final StudentRepository studentRepository = mock(StudentRepository.class);
    private final CareerRepository careerRepository = mock(CareerRepository.class);
    private final DashboardAutocompleteService service = new DashboardAutocompleteService(studentRepository, careerRepository);

    @Test
    void shouldBuildStudentDisplayLabelAndUseDefaultLimit() {
        Student student = new Student();
        student.setEnrollmentId("2026D001");
        student.setName("Juan");
        student.setLastNamePaternal("Perez");
        student.setLastNameMaternal("Lopez");
        student.setStatus(StudentStatus.ACTIVE);
        student.setCreatedByAdmin(new Admin());
        Career career = new Career();
        career.setCode("SIS");
        career.setName("Sistemas");
        career.setStatus(CareerStatus.ACTIVE);
        student.setCareer(career);

        when(studentRepository.searchForDashboardAnalysis(eq("juan"), org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(List.of(student));

        var response = service.searchStudents(" juan ", null);

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(studentRepository).searchForDashboardAnalysis(eq("juan"), pageableCaptor.capture());
        assertEquals(DashboardAutocompleteService.DEFAULT_LIMIT, pageableCaptor.getValue().getPageSize());
        assertEquals("2026D001 - Juan Perez Lopez", response.items().get(0).displayLabel());
        assertEquals("Sistemas | Activo", response.items().get(0).subtitle());
        assertEquals("Juan Perez Lopez", response.items().get(0).fullName());
    }

    @Test
    void shouldBuildCareerDisplayLabel() {
        Career career = new Career();
        career.setCode("IND");
        career.setName("Industrial");
        career.setStatus(CareerStatus.INACTIVE);

        when(careerRepository.searchForDashboardAnalysis(eq("ind"), org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(List.of(career));

        var response = service.searchCareers("ind", 5);

        assertEquals(5, response.limit());
        assertEquals("IND - Industrial", response.items().get(0).displayLabel());
        assertEquals("Inactivo", response.items().get(0).subtitle());
        assertEquals("INACTIVE", response.items().get(0).status());
        assertTrue(response.items().size() == 1);
    }
}
