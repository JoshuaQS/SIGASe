
import type { StudentResponseDto } from '@/features/students/api/students-api'
import { StudentsCreateModal } from '@/features/students/components/modals/create-student-modal'

export type CreateStudentModalProps = {
  open: boolean
  onClose: () => void
  onCreated?: (student: StudentResponseDto) => void
}

export function CreateStudentModal({ open, onClose, onCreated }: CreateStudentModalProps) {
  return (
    <StudentsCreateModal
      open={open}
      onClose={onClose}
      onCreated={onCreated}
      mode="create"
      student={null}
    />
  )
}
