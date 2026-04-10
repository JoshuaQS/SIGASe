
import { AdminProfileModal as RealAdminProfileModal } from '@/features/admins/components/modals/admin-profile-modal'

export type AdminProfileModalProps = React.ComponentProps<typeof RealAdminProfileModal>

export function AdminProfileModal(props: AdminProfileModalProps) {
  return <RealAdminProfileModal {...props} />
}
