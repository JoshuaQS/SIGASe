import type { ElibroValidationStatus } from '@/types/api';

export type SsoProtectedKey = 'authToken' | 'channelId' | 'channelSecret';

export type SsoEditingFields = Record<SsoProtectedKey, boolean>;

export type SsoProtectedDrafts = Record<SsoProtectedKey, string>;

export type SsoProtectedOriginals = Record<SsoProtectedKey, string>;

/** Estado local de la vista (mock + derivado del backend) */
export interface SsoConfigViewState {
  id: string;
  channelName: string;
  authEndpoint: string;
  active: boolean;
  validationStatus: ElibroValidationStatus;
  validationMessage: string | null;
  lastValidatedAt: string | null;
  updatedAt: string | null;
  updatedByAdminId: string | null;
  createdAt: string | null;
}

export interface SsoFormValues {
  channelName: string;
  authToken: string;
  channelId: string;
  channelSecret: string;
}

export const SSO_PROTECTED_KEYS: SsoProtectedKey[] = [
  'authToken',
  'channelId',
  'channelSecret',
];

export const EMPTY_EDITING: SsoEditingFields = {
  authToken: false,
  channelId: false,
  channelSecret: false,
};

export const EMPTY_DRAFTS: SsoProtectedDrafts = {
  authToken: '',
  channelId: '',
  channelSecret: '',
};

export const FIXED_AUTH_ENDPOINT = 'https://auth.elibro.net/auth/sso/';
