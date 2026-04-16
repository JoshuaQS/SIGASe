'use client';

import { useEffect } from 'react';
import { AppConfirmDialog } from '@/shared/components/ui/confirmation-dialog';
import { useSessionExpiredDialog } from '@/shared/hooks/use-session-expired-dialog';

/**
 * Componente que muestra un diálogo cuando la sesión expira.
 * Se cierra automáticamente después de 4 segundos o al cerrarlo manualmente.
 */
export function SessionExpiredDialog() {
  const { open, onClose } = useSessionExpiredDialog();

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  return (
    <AppConfirmDialog
      open={open}
      title="Sesión expirada"
      description="Tu sesión ha expirado por inactividad. Inicia sesión de nuevo para continuar."
      confirmColor="info"
      confirmText="Iniciar sesión"
      cancelText="Cerrar"
      animateIcon
      size="md"
      onCancel={onClose}
      onConfirm={onClose}
    />
  );
}
