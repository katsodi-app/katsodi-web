-- send_room_message (also used by send_room_sticker/send_room_image) rate-limits
-- with "sender_id = uid and created_at > now() - 1 second". Without an index
-- that check scans every message ever written, so each send gets slower as the
-- table grows. This index turns it into a short range scan per sender.
-- Plain CREATE INDEX briefly blocks writes to room_messages while it builds;
-- on a large production table, run it as CREATE INDEX CONCURRENTLY outside a
-- transaction instead.
create index if not exists room_messages_sender_recent
  on public.room_messages(sender_id, created_at desc);
