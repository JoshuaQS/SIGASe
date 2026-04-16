export type AdminRole = 'ADMIN_TI' | 'ADMIN_BIBLIOTECA';
export type AdminStatus = 'ACTIVE' | 'INACTIVE';
export type StudentStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';
export type StudentSex = 'FEMALE' | 'MALE' | 'NON_BINARY';
export type SortDir = 'asc' | 'desc';
export type DashboardCurrentElibroConfigStatus =
    | 'NO_ACTIVE_CONFIG'
    | 'ACTIVE_VALID'
    | 'ACTIVE_INVALID'
    | 'ACTIVE_UNKNOWN';
export type ElibroConfigStatus = 'ACTIVE' | 'INACTIVE';

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
    name: string;
    role: AdminRole;
}

export interface StudentUser {
    id: string;
    email: string;
    name: string;
    status: StudentStatus;
}

export interface ManagedAdmin {
    id: string;
    email: string;
    name: string;
    role: AdminRole;
    status: AdminStatus;
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
    name: string;
    lastNamePaternal: string;
    lastNameMaternal?: string | null;
    sex: StudentSex;
    quarter: number;
    institutionalEmail: string;
    career: string;
    status: StudentStatus;
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
    nextUrl: string | null;
    status: ElibroConfigStatus;
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
    currentElibroConfigStatus: DashboardCurrentElibroConfigStatus;
    lastAccessAt?: string | null;
    lastSuccessfulAccessAt?: string | null;
    lastFailedAccessAt?: string | null;
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
    name: string;
    enrollmentId: string;
    careerCode: string;
    careerName: string;
    successfulAccesses: number;
    failedAccesses: number;
    totalAccesses: number;
}

export interface DashboardTopStudentsResponse {
    dateFrom: string;
    dateTo: string;
    limit: number;
    sortDir: SortDir;
    students: DashboardTopStudentItemResponse[];
}

export interface DashboardTopCareerItemResponse {
    careerCode: string;
    careerName: string;
    successfulAccesses: number;
    failedAccesses: number;
    totalAccesses: number;
}

export interface DashboardTopCareersResponse {
    dateFrom: string;
    dateTo: string;
    limit: number;
    sortDir: SortDir;
    careers: DashboardTopCareerItemResponse[];
}

export type AccessLogActorType = 'STUDENT' | 'ADMIN' | 'ALL';
export type AccessLogScope = 'SIGASE_LOCAL' | 'SIGASE_GOOGLE' | 'ELIBRO' | 'ADMIN_LOGIN' | 'ALL';
export type AdminAuthResult =
    | 'SUCCESS'
    | 'FAILED_INVALID_CREDENTIALS'
    | 'FAILED_ADMIN_INACTIVE'
    | 'FAILED_ACCOUNT_LOCKED'
    | 'FAILED_INTERNAL_ERROR';
export type StudentAuthResult =
    | 'SUCCESS'
    | 'FAILED_INVALID_CREDENTIALS'
    | 'FAILED_STUDENT_NOT_FOUND'
    | 'FAILED_STUDENT_INACTIVE'
    | 'FAILED_ACCOUNT_LOCKED'
    | 'FAILED_INVALID_GOOGLE_TOKEN'
    | 'FAILED_GOOGLE_PROVIDER_UNAVAILABLE'
    | 'FAILED_GOOGLE_PROVIDER_ERROR'
    | 'FAILED_GOOGLE_SUBJECT_MISMATCH'
    | 'FAILED_INSTITUTIONAL_DOMAIN'
    | 'FAILED_INTERNAL_ERROR';
export type ElibroAccessResult =
    | 'SUCCESS'
    | 'FAILED_STUDENT_NOT_FOUND'
    | 'FAILED_STUDENT_INACTIVE'
    | 'FAILED_ACCOUNT_LOCKED'
    | 'FAILED_ELIBRO_CONFIG'
    | 'FAILED_NEXT_URL_VALIDATION'
    | 'FAILED_ELIBRO_API'
    | 'FAILED_ELIBRO_TIMEOUT'
    | 'FAILED_INTERNAL_ERROR';
export type AccessLogResult = AdminAuthResult | StudentAuthResult | ElibroAccessResult;
export type AuditActorType = 'ADMIN' | 'SYSTEM' | 'INTEGRATION';
export type AuditOutcome = 'SUCCESS' | 'FAILURE' | 'DENIED' | 'ERROR';
export type AuditSeverity = 'INFO' | 'NOTICE' | 'WARNING' | 'SECURITY' | 'CRITICAL';
export type AuditSourceModule = 'AUTH' | 'ADMINS' | 'STUDENTS' | 'CAREERS' | 'ELIBRO' | 'DASHBOARD' | 'SYSTEM';

export interface UnifiedAccessLogRecord {
    id: string;
    occurredAt: string;
    actorType: 'STUDENT' | 'ADMIN';
    scope: 'SIGASE_LOCAL' | 'SIGASE_GOOGLE' | 'ELIBRO' | 'ADMIN_LOGIN';
    actorId: string | null;
    actorName: string | null;
    actorEmail: string | null;
    result: AccessLogResult;
    reason: string | null;
    requestId: string | null;
    correlationId: string | null;
    sessionId: string | null;
    ipAddressMasked: string | null;
    userAgentSanitized: string | null;
    latencyMs: number | null;
    nextUrl: string | null;
    redirectUrl: string | null;
    providerStatusCode: number | null;
    providerErrorCode: string | null;
    providerErrorMessage: string | null;
    channelName: string | null;
    metadata: unknown | null;
}

export interface AccessLog {
    id: string;
    studentId?: string | null;
    attemptedEmail?: string | null;
    normalizedEmail?: string | null;
    result: AccessLogResult;
    errorCode?: string | null;
    nextUrl?: string | null;
    redirectUrl?: string | null;
    channelNameSnapshot?: string | null;
    providerStatusCode?: number | null;
    providerErrorCode?: string | null;
    providerErrorMessage?: string | null;
    latencyMs?: number | null;
    errorDetail?: string | null;
    ipAddressMasked?: string | null;
    ipAddressHash?: string | null;
    userAgentSanitized?: string | null;
    referer?: string | null;
    requestId?: string;
    correlationId?: string;
    sessionId?: string | null;
    origin?: string | null;
    httpMethod?: string | null;
    requestPath?: string | null;
    metadataJson?: string | null;
    occurredAt: string;
}

export interface AuditLog {
    id: string;
    actorType?: AuditActorType | null;
    actorAdminId?: string | null;
    actorAdminEmail?: string | null;
    actorReference?: string | null;
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    outcome?: AuditOutcome | null;
    severity?: AuditSeverity | null;
    sourceModule?: AuditSourceModule | null;
    description?: string | null;
    entitySnapshotName?: string | null;
    targetLabel?: string | null;
    httpMethod?: string | null;
    endpoint?: string | null;
    statusCode?: number | null;
    metadataJson?: string | null;
    requestId?: string | null;
    correlationId?: string | null;
    ipAddressMasked?: string | null;
    ipAddressHash?: string | null;
    userAgentSanitized?: string | null;
    occurredAt: string;
}

export interface SsoLoginResponse {
    redirectUrl: string;
}
