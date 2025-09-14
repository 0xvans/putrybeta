-- Row Level Security (RLS) policies for Putry Agency starter
-- IMPORTANT: Review and adapt these policies to your app's exact needs before enabling in production.
-- Enable RLS on sensitive tables and create policies that allow client actions only for authorized users.

-- Enable RLS
alter table profiles enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table likes enable row level security;
alter table recasts enable row level security;
alter table follows enable row level security;
alter table dm_messages enable row level security;
alter table dm_participants enable row level security;
alter table notifications enable row level security;

-- profiles: user can select profiles (public), but can update only their own row (except admin)
create policy "profiles_select_public" on profiles for select using (true);

create policy "profiles_update_own_or_admin" on profiles
  for update using ( auth.uid() = id or (exists (select 1 from profiles p2 where p2.id = auth.uid() and p2.role = 'admin')) )
  with check ( auth.uid() = id or (exists (select 1 from profiles p2 where p2.id = auth.uid() and p2.role = 'admin')) );

-- posts: anyone can select posts; insert only allowed if not banned and role in (admin, moderator) OR allow members to post if you prefer
create policy "posts_select_public" on posts for select using (true);

create policy "posts_insert_not_banned" on posts
  for insert with check (
    -- only allow if auth user is not banned and has proper role (change as desired)
    exists (select 1 from profiles p where p.id = auth.uid() and p.banned = false and (p.role = 'admin' or p.role = 'moderator'))
  );

create policy "posts_update_owner_or_admin" on posts
  for update using ( exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'admin' or p.role = 'moderator')) or auth.uid() = user_id )
  with check ( auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin') );

create policy "posts_delete_owner_or_admin" on posts
  for delete using ( auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin') );

-- comments: allow insert if not banned
create policy "comments_insert_not_banned" on comments for insert with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.banned = false)
);
create policy "comments_select_public" on comments for select using (true);
create policy "comments_update_owner_or_admin" on comments for update using ( auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin') );
create policy "comments_delete_owner_or_admin" on comments for delete using ( auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin') );

-- dm_participants: only participants may select/insert
create policy "dm_participants_select_is_participant" on dm_participants for select using (
  exists (select 1 from dm_participants dp where dp.conversation_id = dm_participants.conversation_id and dp.user_id = auth.uid())
);
create policy "dm_participants_insert_any" on dm_participants for insert with check ( auth.uid() = user_id );

-- dm_messages: participants can select/insert messages for conversations they're part of
create policy "dm_messages_select_participant" on dm_messages for select using (
  exists (select 1 from dm_participants dp where dp.conversation_id = dm_messages.conversation_id and dp.user_id = auth.uid())
);
create policy "dm_messages_insert_participant" on dm_messages for insert with check (
  exists (select 1 from dm_participants dp where dp.conversation_id = dm_messages.conversation_id and dp.user_id = auth.uid())
);

-- notifications: only recipient can select their notifications; inserts allowed (e.g. from server)
create policy "notifications_select_own" on notifications for select using ( auth.uid() = user_id );
create policy "notifications_insert_server_or_any" on notifications for insert with check ( true );
create policy "notifications_update_own" on notifications for update using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );

-- likes/recasts/follows: allow insert if not banned and valid user; allow delete by owner or admin
create policy "likes_insert_not_banned" on likes for insert with check ( exists (select 1 from profiles p where p.id = auth.uid() and p.banned = false) );
create policy "likes_delete_owner_or_admin" on likes for delete using ( exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin') or exists (select 1 from likes l where l.id = old.id and l.user_id = auth.uid()) );

create policy "recasts_insert_not_banned" on recasts for insert with check ( exists (select 1 from profiles p where p.id = auth.uid() and p.banned = false) );
create policy "follows_insert_not_banned" on follows for insert with check ( exists (select 1 from profiles p where p.id = auth.uid() and p.banned = false) );
