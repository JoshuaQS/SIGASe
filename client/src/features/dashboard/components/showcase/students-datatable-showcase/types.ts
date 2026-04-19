export type StudentStatus = "ACTIVE" | "PENDING" | "INACTIVE";

export type Student = {
  id: number;
  enrollment: string;
  name: string;
  email: string;
  career: string;
  status: StudentStatus;
  lastAccess: string;
};
