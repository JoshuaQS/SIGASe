import { StudentsCreateModal } from '@/features/students/components/modals/create-student-modal'
import type { StudentResponseDto } from '@/features/students/api/students-api'

type EditStudentModalProps = {
  open: boolean
  student: StudentResponseDto | null
  onClose: () => void
  onSuccess?: (student: StudentResponseDto) => void
}

export function EditStudentModal({
  open,
  student,
  onClose,
  onSuccess,
}: EditStudentModalProps) {
  return (
    <StudentsCreateModal
      open={open}
      onClose={onClose}
      onCreated={onSuccess}
      mode="edit"
      student={student}
    />
  )
}
