import { StudentDetailModal as RealStudentDetailModal } from '@/features/students/components/modals/student-detail-modal'
import type { StudentResponseDto } from '@/features/students/api/students-api'

export type StudentDetailModalProps = {
  open: boolean
  student: StudentResponseDto | null
  onOpenChange: (open: boolean) => void
}

export function StudentDetailModal(props: StudentDetailModalProps) {
  return <RealStudentDetailModal {...props} />
}
