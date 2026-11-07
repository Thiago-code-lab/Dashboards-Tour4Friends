import { z } from 'zod';

export const isoDate = z.iso.date();
const id = z.string().min(1).max(80);
const money = z.number().finite().nonnegative();
const count = z.number().int().nonnegative();
export const categorySchema = z.enum(['Premium', 'Conforto', 'Alternativa']);
export const bookingSchema = z.object({
  id,
  customerId: id,
  travelerIds: z.array(id).min(1).max(20),
  leadId: id,
  departureId: id,
  bookedAt: isoDate,
  confirmedAt: isoDate.nullable(),
  status: z.enum(['confirmed', 'pending', 'cancelled']),
  category: categorySchema,
  totalAmount: money,
  formComplete: z.boolean(),
  cancellationReason: z.string().nullable(),
});
export const datasetSchema = z.object({
  metadata: z.object({
    source_type: z.literal('synthetic_demo'),
    version: id,
    seed: z.number().int(),
    generatedAt: z.iso.datetime(),
    referenceDate: isoDate,
    historyStart: isoDate,
    historyEnd: isoDate,
    currency: z.literal('BRL'),
  }),
  routes: z.array(
    z.object({
      id,
      name: id,
      shortName: id,
      modality: z.enum(['A pé', 'Bicicleta', 'Cultural']),
      country: id,
      days: count.positive(),
      distanceKm: count,
      stages: z.array(id).min(1),
    }),
  ),
  customers: z.array(z.object({ id, label: id })),
  departures: z.array(
    z.object({
      id,
      routeId: id,
      date: isoDate,
      endDate: isoDate,
      capacity: count.positive(),
      transferConfirmed: z.boolean(),
      transferDue: isoDate,
    }),
  ),
  bookings: z.array(bookingSchema),
  leads: z.array(
    z.object({
      id,
      routeId: id,
      category: categorySchema,
      createdAt: isoDate,
      channel: id,
      stage: z.enum(['new', 'qualified', 'proposal', 'won', 'lost']),
      potentialValue: money,
    }),
  ),
  partners: z.array(z.object({ id, name: id, routeId: id, locality: id })),
  allocations: z.array(
    z.object({
      id,
      departureId: id,
      partnerId: id,
      locality: id,
      date: isoDate,
      category: categorySchema,
      capacity: count.positive(),
      confirmed: z.boolean(),
    }),
  ),
  costs: z.array(
    z.object({
      id,
      departureId: id,
      category: id,
      date: isoDate,
      budget: money,
      amount: money,
      status: z.enum(['realized', 'estimated']),
    }),
  ),
  payments: z.array(z.object({ id, bookingId: id, date: isoDate, amount: money })),
  feedback: z.array(
    z.object({
      id,
      bookingId: id,
      date: isoDate,
      nps: count.max(10),
      service: count.max(10),
      accommodation: count.max(10),
      logistics: count.max(10),
      comment: z.string().max(600),
    }),
  ),
});
export type Dataset = z.infer<typeof datasetSchema>;
export type Booking = z.infer<typeof bookingSchema>;
export type Route = Dataset['routes'][number];
export type Category = z.infer<typeof categorySchema>;
export type Filters = {
  start: string;
  end: string;
  route: string;
  modality: string;
  category: string;
};
export type AlertStatus = 'open' | 'reviewed' | 'resolved';
export type Alert = {
  id: string;
  type: string;
  severity: 'critical' | 'attention';
  routeId: string;
  departureId: string;
  date: string;
  cause: string;
  action: string;
};
export type Thresholds = { attention: number; critical: number; costOverrun: number };
