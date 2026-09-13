CREATE TABLE public.lab_call_reservations (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 visitor_hash text NOT NULL,
 reserved_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
GRANT ALL ON public.lab_call_reservations TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.lab_call_reservations_id_seq TO service_role;
ALTER TABLE public.lab_call_reservations ENABLE ROW LEVEL SECURITY;
CREATE INDEX lab_call_reservations_time ON public.lab_call_reservations(reserved_at);
CREATE INDEX lab_call_reservations_visitor_time ON public.lab_call_reservations(visitor_hash, reserved_at);
CREATE FUNCTION public.reserve_lab_call(p_visitor_hash text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
 v_now timestamptz;
 v_day timestamptz;
 v_daily integer;
 v_hour integer;
 v_last timestamptz;
 v_first timestamptz;
BEGIN
 IF p_visitor_hash IS NULL OR p_visitor_hash !~ '^[a-f0-9]{64}$' THEN
  RAISE EXCEPTION 'Invalid visitor identifier';
 END IF;
 -- One transaction-scoped lock shared by every instance and every day.
 PERFORM pg_advisory_xact_lock(734019, 1);
 v_now := clock_timestamp();
 v_day := date_trunc('day', v_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
 SELECT count(*) INTO v_daily FROM public.lab_call_reservations WHERE reserved_at >= v_day;
 IF v_daily >= 200 THEN
  RETURN jsonb_build_object('allowed',false,'reason','daily_limit_reached','retryAfterSeconds',ceil(extract(epoch FROM v_day + interval '1 day' - v_now)),'dailyCallsUsed',v_daily);
 END IF;
 SELECT count(*), max(reserved_at), min(reserved_at) INTO v_hour,v_last,v_first
 FROM public.lab_call_reservations WHERE visitor_hash = p_visitor_hash AND reserved_at > v_now - interval '1 hour';
 IF v_hour >= 10 THEN
  RETURN jsonb_build_object('allowed',false,'reason','rate_limited','retryAfterSeconds',greatest(1,ceil(extract(epoch FROM v_first + interval '1 hour' - v_now))));
 END IF;
 IF v_last IS NOT NULL AND v_last > v_now - interval '20 seconds' THEN
  RETURN jsonb_build_object('allowed',false,'reason','rate_limited','retryAfterSeconds',greatest(1,ceil(extract(epoch FROM v_last + interval '20 seconds' - v_now))));
 END IF;
 INSERT INTO public.lab_call_reservations(visitor_hash,reserved_at) VALUES(p_visitor_hash,v_now);
 -- Bounded retention; failed or ambiguous model calls never refund reservations.
 DELETE FROM public.lab_call_reservations WHERE reserved_at < v_day - interval '2 days';
 RETURN jsonb_build_object('allowed',true,'dailyCallsUsed',v_daily+1);
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_lab_call(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_lab_call(text) TO service_role;