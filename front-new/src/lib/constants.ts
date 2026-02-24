export const API_URL = import.meta.env.VITE_API_URL as string;
export const WS_URL = import.meta.env.VITE_API_WS_URL as string;

export const ROLES = {
  SUPER_ADMIN: 5,
  ADMIN: 1,
  OWNER: 2,
  STYLIST: 3,
  CLIENT: 4,
} as const;

export const ROLE_LABELS: Record<number, string> = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.OWNER]: 'Propietario',
  [ROLES.STYLIST]: 'Estilista',
  [ROLES.CLIENT]: 'Cliente',
};

export const APPOINTMENT_STATUS = {
  PENDING: 'pendiente',
  CONFIRMED: 'confirmada',
  IN_PROGRESS: 'en_progreso',
  COMPLETED: 'completada',
  CANCELLED: 'cancelada',
  NO_SHOW: 'no_show',
} as const;

export const APPOINTMENT_STATUS_COLORS: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  confirmada: 'bg-blue-100 text-blue-800',
  en_progreso: 'bg-purple-100 text-purple-800',
  completada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-800',
};
