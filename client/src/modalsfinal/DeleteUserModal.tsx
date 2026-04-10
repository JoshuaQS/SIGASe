
import { DeleteUserModal as RealDeleteUserModal } from '@/features/admins/components/modals/delete-user-modal'

export type DeleteUserModalProps = React.ComponentProps<typeof RealDeleteUserModal>

export function DeleteUserModal(props: DeleteUserModalProps) {
  return <RealDeleteUserModal {...props} />
}
