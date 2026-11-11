-- A member who left or was removed returns as an ordinary member.
-- join_room and redeem_room_invite reactivate rows with an upsert that keeps
-- the old role; without this trigger a moderator who left and rejoined would
-- silently regain moderation rights. Covers every current and future rejoin path.
begin;
create function private.reset_role_on_rejoin() returns trigger language plpgsql set search_path='' as $$
begin
  if new.status='active' and old.status<>'active' and new.role<>'owner' then
    new.role := 'member';
  end if;
  return new;
end $$;
revoke execute on function private.reset_role_on_rejoin() from public;
create trigger room_members_reset_role_on_rejoin before update of status on public.room_members
  for each row execute function private.reset_role_on_rejoin();
commit;
