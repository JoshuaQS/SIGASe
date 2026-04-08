import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  CheckCircle,
  XCircle,
  BarChart3,
  UserRound,
  GraduationCap,
  Hash,
  Calendar,
} from "lucide-react";

interface StudentData {
  name: string;
  lastNamePaternal: string;
  lastNameMaternal?: string | null;
  sex: "MALE" | "FEMALE" | "NON_BINARY";
  career?: { code: string } | null;
  enrollmentId: string;
}

interface StudentCardProps {
  student: StudentData;
  appliedStatus: "ALL" | "SUCCESS" | "FAILED";
  appliedRangeText: string;
}

function capitalizeWords(text: string) {
  return text
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getInitials(student: StudentData) {
  const first = student.name?.charAt(0) || "";
  const last = student.lastNamePaternal?.charAt(0) || "";
  return (first + last).toUpperCase();
}

const statusConfig = {
  ALL: {
    label: "Ambos",
    icon: BarChart3,
    className: "border-muted-foreground/30 text-muted-foreground bg-muted",
  },
  SUCCESS: {
    label: "Exitosos",
    icon: CheckCircle,
    className: "border-emerald-500/30 text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40",
  },
  FAILED: {
    label: "Fallidos",
    icon: XCircle,
    className: "border-red-500/30 text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/40",
  },
} as const;

const sexLabels: Record<string, string> = {
  MALE: "Masculino",
  FEMALE: "Femenino",
  NON_BINARY: "No binario",
};

export function StudentCard({
  student,
  appliedStatus,
  appliedRangeText,
}: StudentCardProps) {
  const fullName = capitalizeWords(
    [student.name, student.lastNamePaternal, student.lastNameMaternal]
      .filter(Boolean)
      .join(" ")
  );

  const status = statusConfig[appliedStatus];
  const StatusIcon = status.icon;

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className="h-10 w-10 shrink-0 bg-primary mt-0.5">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
              {getInitials(student)}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Row 1: Name + Range */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground truncate">
                {fullName}
              </p>
              <Badge
                variant="outlined"
                className="shrink-0 gap-1 text-xs text-muted-foreground"
              >
                <Calendar className="h-3 w-3" />
                {appliedRangeText}
              </Badge>
            </div>

            {/* Row 2: Labeled data fields */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mt-3">
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Filtro
                </p>
                <Badge variant="outlined" className={`gap-1 ${status.className}`}>
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
              </div>

              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Sexo
                </p>
                <Badge
                  variant="outlined"
                  className="gap-1 border-blue-500/30 text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40"
                >
                  <UserRound className="h-3 w-3" />
                  {sexLabels[student.sex] || student.sex}
                </Badge>
              </div>

              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Carrera
                </p>
                <Badge
                  variant="outlined"
                  className="gap-1 border-violet-500/30 text-violet-700 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/40"
                >
                  <GraduationCap className="h-3 w-3" />
                  {student.career?.code || "Sin carrera"}
                </Badge>
              </div>

              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Matrícula
                </p>
                <Badge
                  variant="outlined"
                  className="gap-1 border-amber-500/30 text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40"
                >
                  <Hash className="h-3 w-3" />
                  {student.enrollmentId}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
