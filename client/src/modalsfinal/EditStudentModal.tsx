
import type { StudentResponseDto } from '@/features/students/api/students-api'
import { StudentsCreateModal } from '@/features/students/components/modals/create-student-modal'

export type EditStudentModalProps = {
  open: boolean
  onClose: () => void
  student: StudentResponseDto | null
  onSaved?: (student: StudentResponseDto) => void
}

export function EditStudentModal({ open, onClose, student, onSaved }: EditStudentModalProps) {
  return (
    <StudentsCreateModal
      open={open}
      onClose={onClose}
      onCreated={onSaved}
      mode="edit"
      student={student}
    />
  )
}
