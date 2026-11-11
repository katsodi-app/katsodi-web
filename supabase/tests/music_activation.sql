-- Run as the database owner after migration 23. This transaction writes no data.
begin read only;
do $acceptance$
declare
  client_role text;
  operation text;
begin
  if to_regclass('public.music_chart_snapshots') is null then
    raise exception 'Apply 20261108002300_music_discovery.sql first';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.music_chart_snapshots'::regclass) then
    raise exception 'Chart row level security must be enabled';
  end if;
  foreach client_role in array array['anon', 'authenticated'] loop
    if not has_table_privilege(client_role, 'public.music_chart_snapshots', 'SELECT') then
      raise exception '% cannot read public charts', client_role;
    end if;
    foreach operation in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
      if has_table_privilege(client_role, 'public.music_chart_snapshots', operation) then
        raise exception '% unexpectedly has % privileges', client_role, operation;
      end if;
    end loop;
  end loop;
  foreach operation in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
    if not has_table_privilege('service_role', 'public.music_chart_snapshots', operation) then
      raise exception 'The publisher lacks % privileges', operation;
    end if;
  end loop;
  if not (select rolbypassrls or rolsuper from pg_roles where rolname = 'service_role') then
    raise exception 'The service_role publisher cannot bypass chart RLS';
  end if;
end;
$acceptance$;

-- Public metadata only; an empty result means storage still needs seeding.
select provider, jsonb_array_length(payload->'tracks') as tracks,
       payload->>'checked' as checked, refreshed_at
from public.music_chart_snapshots
order by provider;
rollback;
