
import { CreateAdminModal as RealCreateAdminModal } from '@/features/admins/components/modals/create-admin-modal'

export type EditAdminModalProps = React.ComponentProps<typeof RealCreateAdminModal>

export function EditAdminModal(props: EditAdminModalProps) {
  return <RealCreateAdminModal {...props} />
}
