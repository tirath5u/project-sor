import { createHmac } from 'node:crypto';
import { z } from 'zod';

const Reservation = z.discriminatedUnion('allowed', [
  z.object({ allowed: z.literal(true), dailyCallsUsed: z.number().int().min(1).max(200) }),
  z.object({ allowed: z.literal(false), reason: z.enum(['rate_limited', 'daily_limit_reached']), retryAfterSeconds: z.number().positive() }),
]);
export const unavailableReservation = () => ({ allowed: false as const, reason: 'quota_storage_unavailable' as const, retryAfterSeconds: null });

export async function reserveDurableLabCall(request: Request) {
  try {
    // Only the edge-overwritten connecting address is trusted. Never use X-Forwarded-For.
    // Missing identity fails closed, including local requests without an edge address.
    const address = request.headers.get('cf-connecting-ip');
    const secret = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    if (!address || !secret) return unavailableReservation();
    const visitorHash = createHmac('sha256', secret).update(`lab-visitor-v1|${address}`).digest('hex');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data, error } = await supabaseAdmin.rpc('reserve_lab_call', { p_visitor_hash: visitorHash }).abortSignal(AbortSignal.timeout(5000));
    if (error) return unavailableReservation();
    const parsed = Reservation.safeParse(data);
    return parsed.success ? parsed.data : unavailableReservation();
  } catch {
    return unavailableReservation();
  }
}
