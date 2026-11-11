-- Administrator role and fandom requests (TASKS.md, tasks 8 and 9).
-- The migration grants nobody: whoever runs the site adds the administrator
-- once in SQL Editor (see below). Clients can never read or write the table;
-- every admin function checks it on the server. Members request new fandoms;
-- the administrator approves (creating a "community" fandom usable by rooms,
-- follows and profiles) or rejects them with a reason.
begin;
create table public.admins (
  user_id uuid primary key references auth.users on delete cascade,
  granted_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from public, anon, authenticated;

-- No account becomes administrator automatically, so no personal email lives
-- in the code. After signing up and confirming your email, run once in SQL
-- Editor (as the database owner), with your own address:
--   insert into public.admins(user_id)
--     select id from auth.users where lower(email) = lower('you@example.com')
--     on conflict do nothing;

create function private.is_admin_user() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.admins a join auth.users u on u.id = a.user_id
    where a.user_id = auth.uid() and u.email_confirmed_at is not null
  )
$$;
-- Row-security policies run as the caller, so signed-in users may evaluate
-- it; it only says whether the caller is the administrator.
revoke execute on function private.is_admin_user() from public, anon;
grant execute on function private.is_admin_user() to authenticated;
-- The client may ask whether it is the admin (to show the panel link); the
-- answer is about the caller only.
create function public.is_admin() returns boolean
language sql stable security definer set search_path='' as $$
  select private.is_admin_user()
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Community fandoms live next to the catalogue in the same table.
alter table public.fandoms
  add column community boolean not null default false,
  add column description text check (description is null or char_length(description) <= 500),
  add column created_at timestamptz not null default now();
grant select(id, name, category, community, description, created_at) on public.fandoms to anon, authenticated;

create table public.fandom_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete set null,
  name text not null check (char_length(name) between 2 and 80),
  category text not null check (category in ('cinema','anime','games','music','books','sport')),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reason text check (reason is null or char_length(reason) <= 300),
  fandom_id text references public.fandoms on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  decided_at timestamptz,
  decided_by uuid references public.profiles on delete set null
);
create index fandom_requests_user_recent on public.fandom_requests(user_id, created_at desc);
create index fandom_requests_status on public.fandom_requests(status, created_at);
alter table public.fandom_requests enable row level security;
revoke all on public.fandom_requests from public, anon, authenticated;
grant select(id, user_id, name, category, note, status, reason, fandom_id, created_at, decided_at)
  on public.fandom_requests to authenticated;
-- Requesters see their own requests; the administrator sees all.
create policy fandom_requests_read on public.fandom_requests for select to authenticated
  using (user_id = auth.uid() or private.is_admin_user());

-- Submit a request. Returns the request id.
create function public.request_fandom(p_name text, p_category text, p_note text) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); clean text := btrim(coalesce(p_name, '')); rid uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 19));
  if char_length(clean) < 2 or char_length(clean) > 80
    or p_category not in ('cinema','anime','games','music','books','sport')
    or (p_note is not null and char_length(p_note) > 500) then
    raise exception 'invalid_request' using errcode='22023';
  end if;
  if exists(select 1 from public.fandoms where lower(name) = lower(clean)) then
    raise exception 'fandom_exists' using errcode='22023';
  end if;
  if exists(select 1 from public.fandom_requests
      where status = 'pending' and lower(name) = lower(clean)) then
    raise exception 'request_exists' using errcode='22023';
  end if;
  if exists(select 1 from public.fandom_requests
      where user_id = uid and created_at > clock_timestamp() - interval '30 seconds')
    or (select count(*) from public.fandom_requests
      where user_id = uid and status = 'pending') >= 5 then
    raise exception 'slow_down';
  end if;
  insert into public.fandom_requests(user_id, name, category, note)
    values (uid, clean, p_category, nullif(btrim(coalesce(p_note, '')), ''))
    returning id into rid;
  return rid;
end $$;

-- The administrator approves (adds the fandom) or rejects (with a reason).
create function public.decide_fandom_request(p_request uuid, p_approve boolean, p_reason text)
returns text
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); r public.fandom_requests; fid text;
begin
  if not private.is_admin_user() then raise exception 'forbidden' using errcode='42501'; end if;
  select * into r from public.fandom_requests where id = p_request for update;
  if r.id is null or r.status <> 'pending' then
    raise exception 'request_unavailable' using errcode='22023';
  end if;
  if p_reason is not null and char_length(p_reason) > 300 then
    raise exception 'invalid_request' using errcode='22023';
  end if;
  if p_approve then
    if exists(select 1 from public.fandoms where lower(name) = lower(r.name)) then
      raise exception 'fandom_exists' using errcode='22023';
    end if;
    fid := 'community-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
    insert into public.fandoms(id, name, category, community, description)
      values (fid, r.name, r.category, true, r.note);
    update public.fandom_requests set status = 'approved', fandom_id = fid,
      reason = nullif(btrim(coalesce(p_reason, '')), ''),
      decided_at = clock_timestamp(), decided_by = uid where id = r.id;
    return fid;
  end if;
  update public.fandom_requests set status = 'rejected',
    reason = nullif(btrim(coalesce(p_reason, '')), ''),
    decided_at = clock_timestamp(), decided_by = uid where id = r.id;
  return null;
end $$;

-- Admin views: all accounts, and how many people follow each fandom.
create function public.admin_accounts()
returns table(id uuid, display_name text, username text, email text,
  confirmed boolean, created_at timestamptz, is_admin boolean)
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_admin_user() then raise exception 'forbidden' using errcode='42501'; end if;
  return query
    select u.id, p.display_name, p.username, u.email::text,
      u.email_confirmed_at is not null, u.created_at,
      exists(select 1 from public.admins a where a.user_id = u.id)
    from auth.users u left join public.profiles p on p.id = u.id
    order by u.created_at, u.id;
end $$;
create function public.admin_fandom_followers()
returns table(fandom_id text, followers bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_admin_user() then raise exception 'forbidden' using errcode='42501'; end if;
  return query select uf.fandom_id, count(*) from public.user_fandoms uf group by uf.fandom_id;
end $$;

revoke all on function public.request_fandom(text, text, text),
  public.decide_fandom_request(uuid, boolean, text),
  public.admin_accounts(), public.admin_fandom_followers() from public, anon;
grant execute on function public.request_fandom(text, text, text),
  public.decide_fandom_request(uuid, boolean, text),
  public.admin_accounts(), public.admin_fandom_followers() to authenticated;
notify pgrst, 'reload schema';
commit;
