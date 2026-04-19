import type { Student } from "./types";

export const STUDENTS_MOCK: Student[] = [
  {
    id: 1,
    enrollment: "20223TN157",
    name: "Joshua Quevedo Sánchez",
    email: "20223tn157@utez.edu.mx",
    career: "Ingeniería en Desarrollo y Gestión de Software",
    status: "ACTIVE",
    lastAccess: "2026-04-12 10:32",
  },
  {
    id: 2,
    enrollment: "20223TN201",
    name: "Denisse Camacho Navarro",
    email: "20223tn201@utez.edu.mx",
    career: "Ingeniería en Desarrollo y Gestión de Software",
    status: "PENDING",
    lastAccess: "Sin acceso",
  },
  {
    id: 3,
    enrollment: "20223TN305",
    name: "Aldair Vargas Luna",
    email: "20223tn305@utez.edu.mx",
    career: "Ingeniería en Desarrollo y Gestión de Software",
    status: "INACTIVE",
    lastAccess: "2026-04-09 08:11",
  },
];
