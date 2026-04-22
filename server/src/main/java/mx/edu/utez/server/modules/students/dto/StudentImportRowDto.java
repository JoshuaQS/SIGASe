package mx.edu.utez.server.modules.students.dto;

public record StudentImportRowDto(
        String nombres,
        String apellidoPaterno,
        String apellidoMaterno,
        String sexo,
        String matricula,
        String cuatrimestre,
        String carrera,
        String institutionalEmail
) {
}
