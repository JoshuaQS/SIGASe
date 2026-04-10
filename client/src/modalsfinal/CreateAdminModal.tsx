
import { CreateAdminModal as RealCreateAdminModal } from '@/features/admins/components/modals/create-admin-modal'

export type CreateAdminModalProps = React.ComponentProps<typeof RealCreateAdminModal>

export function CreateAdminModal(props: CreateAdminModalProps) {
  return <RealCreateAdminModal {...props} />
}
