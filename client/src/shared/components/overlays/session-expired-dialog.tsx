'use client';

import { AppConfirmDialog } from '@/shared/components/ui/confirmation-dialog';
import { useSessionExpiredDialog } from '@/shared/hooks/use-session-expired-dialog';

/**
 * Componente que muestra un diálogo cuando la sesión expira.
 * Requiere confirmación manual para que el usuario pueda leer el motivo.
 */
export function SessionExpiredDialog() {
  const { open, description, onClose } = useSessionExpiredDialog();

  return (
    <AppConfirmDialog
      open={open}
      title="Sesión expirada"
      description={description}
      animateIcon
      size="lg"
      onCancel={onClose}
      onConfirm={onClose}
    />
  );
}
