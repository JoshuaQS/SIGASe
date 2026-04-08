import { useCallback, useState } from 'react';

/**
 * Hook para detectar si la tecla Bloq Mayús (Caps Lock) está activada.
 * Se recomienda su uso en campos de contraseña para dar feedback de UX.
 */
export function useCapsLock() {
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  /**
   * Manejador para el evento onKeyDown de un input.
   * Utiliza getModifierState para una detección robusta.
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.getModifierState) {
      setIsCapsLockOn(event.getModifierState('CapsLock'));
    }
  }, []);

  /**
   * Manejador para el evento onKeyUp de un input.
   * Actualiza el estado si el usuario desactiva las mayúsculas mientras escribe.
   */
  const handleKeyUp = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.getModifierState) {
      setIsCapsLockOn(event.getModifierState('CapsLock'));
    }
  }, []);

  return {
    isCapsLockOn,
    handleKeyDown,
    handleKeyUp,
  };
}
