-- lovable-cron-fallback-reviewed: 720 runs/day; auto-campaign processor must advance search/send cycles and resume anti-spam pauses within ~2 minutes
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'auto-campaign-processor-job';

select cron.schedule(
  'auto-campaign-processor-job',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := 'https://puazyogqwqmsqczaruuw.supabase.co/functions/v1/auto-campaign-processor',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_0saMLCPWgFckNWhLbeBsIQ_qSDADOfw", "Authorization": "Bearer sb_publishable_0saMLCPWgFckNWhLbeBsIQ_qSDADOfw"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);