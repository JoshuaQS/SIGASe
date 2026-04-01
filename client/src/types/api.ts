export type AdminRole = 'TI' | 'BIBLIOTECA' | 'ADMIN_TI' | 'ADMIN_BIBLIOTECA';
export type StudentStatus = 'ACTIVO' | 'INACTIVO' | 'ACTIVE' | 'INACTIVE';
export type StudentSex =
    | 'MASCULINO'
    | 'FEMENINO'
    | 'OTRO'
    | 'MALE'
    | 'FEMALE'
    | 'NON_BINARY'
    | 'NOT_SPECIFIED';
export type SortDir = 'asc' | 'desc';

export type ApiEnvelope<T> = {
    success: boolean;
    message: string;
    data: T;
    status: number;
}

export interface PaginatedMeta<F = Record<string, unknown>> {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    sortBy: string;
    sortDir: SortDir;
    appliedFilters: F;
    rangeSwapped?: boolean;
    warnings?: string[];
}

export interface PaginatedResponse<T, F = Record<string, unknown>> {
    items: T[];
    meta: PaginatedMeta<F>;
}

export interface AdminUser {
    id: string;
    email: string;
    fullName: string;
    role: AdminRole;
}

export interface StudentUser {
    id: string;
    email: string;
    fullName: string;
    status: StudentStatus;
}

export interface ManagedAdmin {
    id: string;
    email: string;
    fullName: string;
    role: AdminRole;
    active: boolean;
    lastLoginAt?: string | null;
    createdAt: string;
    updatedAt: string;
}


export interface AuthResponse<TUser> {
    accessToken: string;
    user: TUser;
}

export interface Student {
    id: string;
    matricula: string;
    fullName: string;
    lastNamePaternal: string;
    lastNameMaternal?: string | null;
    sex: StudentSex;
    quarter: number;
    institutionalEmail: string;
    career: string;
    status: StudentStatus;
    deactivatedAt?: string | null;
    deactivationReason?: string | null;
    reactivatedAt?: string | null;
    reactivationReason?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface StudentStatusHistoryEntry {
    id: string;
    action: 'student.create' | 'student.deactivate' | 'student.reactivate';
    status: StudentStatus | null;
    reason: string | null;
    createdAt: string;
    actorEmail: string | null;
}

export interface StudentStatusHistoryResponse {
    student: Student;
    history: StudentStatusHistoryEntry[];
    accessLogs: AccessLog[];
}


export type ElibroValidationStatus = 'NOT_VALIDATED' | 'VALID' | 'INVALID';

export interface ElibroConfigResponse {
    id: string;
    channelName: string;
    authEndpoint: string;
    active: boolean;
    validationStatus: ElibroValidationStatus;
    validationMessage: string | null;
    lastValidatedAt: string | null;
    createdByAdminId: string | null;
    updatedByAdminId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ElibroConfigValidationResponse {
    id: string;
    validationStatus: ElibroValidationStatus;
    validationMessage: string | null;
    lastValidatedAt: string | null;
}

export interface DashboardSummaryResponse {
    totalStudents: number;
    activeStudents: number;
    inactiveStudents: number;
    successfulAccessesInRange: number;
    failedAccessesInRange: number;
    successRate: number;
    uniqueStudentsWithSuccessfulAccess: number;
    currentElibroConfigStatus: 'NO_ACTIVE_CONFIG' | 'ACTIVE_VALID' | 'ACTIVE_INVALID' | 'ACTIVE_UNKNOWN' | string;
}

export interface DashboardTrendPointResponse {
    day: string;
    successful: number;
    failed: number;
}

export interface DashboardAccessTrendsResponse {
    dateFrom: string;
    dateTo: string;
    points: DashboardTrendPointResponse[];
}

export interface DashboardTopStudentItemResponse {
    studentId: string;
    fullName: string;
    matricula: string;
    career: string;
    successfulAccesses: number;
}

export interface DashboardTopStudentsResponse {
    dateFrom: string;
    dateTo: string;
    limit: number;
    sortDir: string;
    students: DashboardTopStudentItemResponse[];
}

export interface AccessLog {
    id: string;
    institutionalEmail: string;
    normalizedEmail?: string | null;
    result: string;
    destinationUrl?: string;
    redirectUrl?: string | null;
    providerName?: string | null;
    providerStatusCode?: number | null;
    providerErrorCode?: string | null;
    providerErrorMessage?: string | null;
    latencyMs?: number | null;
    errorDetail?: string;
    ipOrigin?: string;
    ipAddressMasked?: string | null;
    userAgentTruncated?: string | null;
    referer?: string | null;
    requestId?: string;
    correlationId?: string;
    sessionId?: string | null;
    sourceModule?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
}

export interface AuditLog {
    id: string;
    actorId?: string | null;
    actorEmail?: string;
    actorType?: string;
    actorRole?: string | null;
    action: string;
    entity: string;
    entityId?: string;
    outcome?: string;
    severity?: string;
    description?: string | null;
    targetLabel?: string | null;
    statusCode?: number | null;
    endpoint?: string | null;
    routePattern?: string | null;
    requestId?: string;
    correlationId?: string;
    sessionId?: string | null;
    sourceModule?: string | null;
    metadata?: Record<string, unknown>;
    createdAt: string;
}

export interface SsoLoginResponse {
    redirectUrl: string;
}
