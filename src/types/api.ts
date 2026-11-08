import { z } from 'zod';
import type { AlertStatus } from './domain';
export const userSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  role: z.enum(['admin', 'manager', 'analyst', 'viewer']),
  active: z.boolean(),
  version: z.number().int(),
});
export type SessionUser = z.infer<typeof userSchema>;
export const loginSchema = z.object({
  accessToken: z.string().min(40),
  tokenType: z.literal('bearer'),
  expiresAt: z.iso.datetime({ offset: true }),
  user: userSchema,
});
export type ResourceName = 'bookings' | 'departures' | 'allocations' | 'costs';
export type AlertRecord = {
  id: string;
  status: AlertStatus;
  note: string;
  version: number;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: string;
};
export type AlertResponse = {
  items: (AlertRecord & { conditionActive: boolean })[];
  statuses: AlertRecord[];
  normalizedIds: string[];
};
export type ImportValidation = {
  batchId: string;
  validationToken: string;
  rows: number;
  expiresAt: string;
  status: 'validated';
};
export type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number };
export type AuditRecord = {
  id: number;
  action: string;
  entityType?: string;
  entityId?: string;
  actorUserId: string | null;
  occurredAt: string;
  beforeData?: unknown;
  afterData?: unknown;
  before?: unknown;
  after?: unknown;
  requestId: string;
};
