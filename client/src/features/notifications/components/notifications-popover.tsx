import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CheckCheck, Clock3, Settings, Trash2 } from 'lucide-react';

import { useAuthUser } from '@/features/auth/hooks/use-auth-user';
import {
  ROLE_ADMIN_BIBLIOTECA,
  ROLE_ADMIN_TI,
  isAdminRole,
} from '@/features/auth/types/auth-user';
import { useAppToast } from '@/shared/components/ui/app-toast-provider';
import { Badge } from '@/shared/components/ui/badge';
import { AppConfirmDialog } from '@/shared/components/ui/confirmation-dialog';
import { AnimatedList } from '@/shared/components/magicui/animated-list';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { cn } from '@/shared/lib/utils';
import {
  getUnreadNotificationCount,
  dismissAllNotifications,
  dismissNotification,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationResponseDto,
  type NotificationType,
} from '../api';
import { NotificationPreferencesModal } from './notification-preferences-modal';

const INITIAL_PAGE_SIZE = 100;
const COLLAPSED_VISIBLE_ROWS = 3;
const EXPANDED_VISIBLE_ROWS = 6;
const ESTIMATED_ROW_HEIGHT = 60;

const TYPE_LABEL: Record<NotificationType, string> = {
  AUDIT: 'Auditoría',
  ACCESS: 'Acceso',
};

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function typeIcon(type: NotificationType) {
  if (type === 'AUDIT') {
    return <Bell className="h-3.5 w-3.5 text-amber-600" />;
  }

  return <Clock3 className="h-3.5 w-3.5 text-sky-600" />;
}

function UnreadDot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />;
}

function NotificationLoadingRow() {
  return (
    <div className="flex gap-3 px-4 py-3 border-b border-border last:border-0">
      <div className="mt-0.5 h-4 w-4 animate-pulse rounded bg-muted" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-3 w-14 animate-pulse rounded bg-muted" />
    </div>
  );
}

export function NotificationsPopover() {
  const authUser = useAuthUser();
  const { showToast } = useAppToast();
  const isAdmin = isAdminRole(authUser?.role);
  const [open, setOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationResponseDto[]>([]);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingCount, setLoadingCount] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dismissAllConfirmOpen, setDismissAllConfirmOpen] = useState(false);
  const requestIdRef = useRef(0);
  const knownNotificationIdsRef = useRef<Set<number>>(new Set());
  const notificationsHydratedRef = useRef(false);

  const hasUnread = typeof unreadCount === 'number' && unreadCount > 0;

  const adminLabel = useMemo(() => {
    if (authUser?.role === ROLE_ADMIN_TI) return 'TI';
    if (authUser?.role === ROLE_ADMIN_BIBLIOTECA) return 'Biblioteca';
    return 'Administrador';
  }, [authUser?.role]);

  const refreshUnreadCount = useCallback(async () => {
    setLoadingCount(true);

    try {
      const response = await getUnreadNotificationCount();
      setUnreadCount(response.unreadCount);
    } catch {
      setUnreadCount(null);
    } finally {
      setLoadingCount(false);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoadingList(true);
    setLoadError(null);

    try {
      const [page, unread] = await Promise.all([
        listNotifications({ page: 0, size: INITIAL_PAGE_SIZE }),
        getUnreadNotificationCount(),
      ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setNotifications(page.content);
      setUnreadCount(unread.unreadCount);
      if (!notificationsHydratedRef.current) {
        knownNotificationIdsRef.current = new Set(page.content.map((item) => item.id));
        notificationsHydratedRef.current = true;
      } else {
        for (const item of page.content) {
          knownNotificationIdsRef.current.add(item.id);
        }
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      const message =
        error instanceof Error ? error.message : 'No se pudieron cargar las notificaciones.';
      setLoadError(message);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingList(false);
      }
    }
  }, []);

  const pollNotifications = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    try {
      const [page, unread] = await Promise.all([
        listNotifications({ page: 0, size: INITIAL_PAGE_SIZE }),
        getUnreadNotificationCount(),
      ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!notificationsHydratedRef.current) {
        knownNotificationIdsRef.current = new Set(page.content.map((item) => item.id));
        notificationsHydratedRef.current = true;
      } else {
        const incoming = [...page.content]
          .filter((item) => !knownNotificationIdsRef.current.has(item.id))
          .reverse();

        for (const item of incoming) {
          showToast({
            severity: 'info',
            title: item.title || 'Nueva notificación',
            description: `${TYPE_LABEL[item.type]} · ${item.message}`,
          });
        }

        for (const item of page.content) {
          knownNotificationIdsRef.current.add(item.id);
        }
      }

      if (open) {
        setNotifications(page.content);
      }
      setUnreadCount(unread.unreadCount);
    } catch {
      // Silent polling failure; manual refresh/open flow already shows explicit errors.
    }
  }, [open, showToast]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    void refreshUnreadCount();
    void pollNotifications();
  }, [isAdmin, pollNotifications, refreshUnreadCount]);

  useEffect(() => {
    if (!open || !isAdmin) {
      return;
    }

    setExpanded(false);
    void refreshNotifications();
  }, [open, isAdmin, refreshNotifications]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void pollNotifications();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [isAdmin, pollNotifications]);

  const updateAfterRead = (notificationId: number) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification,
      ),
    );
  };

  const handleMarkRead = async (notificationId: number) => {
    const target = notifications.find((notification) => notification.id === notificationId);
    if (!target || target.read) {
      return;
    }

    try {
      await markNotificationAsRead(notificationId);
      updateAfterRead(notificationId);
      void refreshUnreadCount();
    } catch (error) {
      showToast({
        severity: 'error',
        title: 'No se pudo marcar como leída',
        description: error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
      setUnreadCount(0);
      showToast({
        severity: 'success',
        title: 'Todo marcado como leído',
        description: 'Las notificaciones pendientes quedaron al día.',
      });
    } catch (error) {
      showToast({
        severity: 'error',
        title: 'No se pudo actualizar',
        description: error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      });
    }
  };

  const handleDismissOne = async (notificationId: number) => {
    setMutating(true);
    try {
      await dismissNotification(notificationId);
      setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
      void refreshUnreadCount();
      showToast({
        severity: 'success',
        title: 'Notificación eliminada',
        description: 'La notificación se eliminó correctamente.',
      });
    } catch (error) {
      showToast({
        severity: 'error',
        title: 'No se pudo eliminar',
        description: error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      });
    } finally {
      setMutating(false);
    }
  };

  const handleDismissAll = async () => {
    if (notifications.length === 0) return;
    setDismissAllConfirmOpen(false);
    setMutating(true);
    try {
      await dismissAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
      showToast({
        severity: 'success',
        title: 'Notificaciones eliminadas',
        description: 'Se eliminaron todas las notificaciones.',
      });
    } catch (error) {
      showToast({
        severity: 'error',
        title: 'No se pudo eliminar',
        description: error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      });
    } finally {
      setMutating(false);
    }
  };

  const handleRequestDismissAll = () => {
    if (notifications.length === 0 || mutating) return;
    setDismissAllConfirmOpen(true);
  };

  const handleOpenPreferences = () => {
    setOpen(false);
    setPreferencesOpen(true);
  };

  const handleViewAll = () => {
    setExpanded(true);
  };

  const visibleNotifications = expanded
    ? notifications
    : notifications.slice(0, COLLAPSED_VISIBLE_ROWS);

  const shouldShowViewAll = notifications.length > COLLAPSED_VISIBLE_ROWS && !expanded;
  const expandedHeight = EXPANDED_VISIBLE_ROWS * ESTIMATED_ROW_HEIGHT;

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <AppConfirmDialog
        open={dismissAllConfirmOpen}
        title="Eliminar todas las notificaciones"
        description="Esta acción eliminará todas las notificaciones de forma permanente. No podrás recuperarlas."
        confirmText="Eliminar todo"
        cancelText="Cancelar"
        confirmColor="error"
        isConfirming={mutating}
        onCancel={() => !mutating && setDismissAllConfirmOpen(false)}
        onConfirm={() => { if (!mutating) void handleDismissAll(); }}
      />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
              'hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            aria-label="Abrir notificaciones"
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
            {loadingCount ? (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-primary" />
            ) : hasUnread ? (
              <Badge
                variant="filled"
                className="absolute -right-1 -top-1 min-w-5 justify-center border border-background px-1 text-[10px] leading-4"
              >
                {unreadCount && unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            ) : null}
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={10}
          className="w-80 rounded-lg border border-border bg-card p-0 shadow-lg"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Notificaciones</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-500/10 disabled:text-muted-foreground"
                onClick={() => void handleMarkAllRead()}
                disabled={notifications.length === 0 || mutating}
                aria-label="Marcar todas como leídas"
                title="Marcar todas como leídas"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="text-xs text-destructive hover:underline disabled:text-muted-foreground disabled:no-underline"
                onClick={handleRequestDismissAll}
                disabled={notifications.length === 0 || mutating}
              >
                Eliminar todas
              </button>
              <Settings
                className="w-3.5 h-3.5 text-muted-foreground ml-2 cursor-pointer"
                onClick={handleOpenPreferences}
              />
            </div>
          </div>

          <ScrollArea
            className={cn(expanded && 'max-h-[360px]')}
            style={expanded ? { height: `${expandedHeight}px` } : undefined}
          >
            {loadError ? (
              <div className="px-4 py-3 text-xs text-destructive border-b border-border">{loadError}</div>
            ) : null}

            {loadingList ? (
              Array.from({ length: COLLAPSED_VISIBLE_ROWS }).map((_, index) => <NotificationLoadingRow key={index} />)
            ) : notifications.length > 0 ? (
              <AnimatedList itemDelay={0.04}>
                {visibleNotifications.map((notification) => {
                  const unread = !notification.read;

                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 text-left',
                        unread ? 'bg-primary/[0.03]' : '',
                      )}
                    >
                      <div className="mt-0.5">{typeIcon(notification.type)}</div>
                      <button
                        type="button"
                        onClick={() => void handleMarkRead(notification.id)}
                        className="min-w-0 flex-1 text-left"
                        aria-label={`Abrir notificación ${notification.title}`}
                      >
                        <div className="flex items-center gap-2">
                          <p className={cn('text-xs truncate text-foreground', unread ? 'font-semibold' : 'font-normal')}>
                            {notification.title}
                          </p>
                          {unread ? <UnreadDot /> : null}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {TYPE_LABEL[notification.type]} · {notification.message}
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5 inline-block">
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                        onClick={() => void handleDismissOne(notification.id)}
                        aria-label={`Eliminar notificación ${notification.title}`}
                        title="Eliminar notificación"
                        disabled={mutating}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </AnimatedList>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-xs font-medium text-foreground">Sin notificaciones</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Bandeja de {adminLabel} al día.
                </p>
              </div>
            )}
          </ScrollArea>

          {shouldShowViewAll ? (
            <div className="px-4 py-2.5 border-t border-border text-center">
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={handleViewAll}
              >
                Ver todas
              </button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>

      <NotificationPreferencesModal
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
        onSaved={() => {
          void refreshUnreadCount();
        }}
      />
    </>
  );
}
