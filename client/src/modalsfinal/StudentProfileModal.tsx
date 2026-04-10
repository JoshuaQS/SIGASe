
import { StudentProfileModal as RealStudentProfileModal } from '@/features/students/components/modals/student-profile-modal'

export type StudentProfileModalProps = React.ComponentProps<typeof RealStudentProfileModal>

export function StudentProfileModal(props: StudentProfileModalProps) {
  return <RealStudentProfileModal {...props} />
}
