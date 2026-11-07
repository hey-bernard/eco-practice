-- 지구편 실천앱: 모임(만들기 · 공개 검색 · 초대 코드 · 참여 신청 · 실천 공유 · 반응 · 한마디 · 신고)
-- schema.sql(user_state)을 먼저 실행한 뒤, Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여 넣고 Run.
-- 여러 번 실행해도 되도록 만들었다 (테이블은 있으면 건너뛰고, 정책·함수는 다시 만든다).
--
-- 원칙
-- - 개인 기록(user_state)은 그대로 본인만 본다. 모임에는 본인이 '공유'를 누른 실천만 복사해 올린다.
-- - 모임 안의 내용(멤버 닉네임, 공유, 반응, 한마디)은 그 모임 멤버만 본다.
-- - 공개 모임도 검색 결과에는 소개 정보만 나온다 (search_groups / group_preview 함수로만).
-- - 모임을 나가거나 내보내지면 그 사람의 공유·반응·한마디·신청이 함께 지워진다. 탈퇴하면 모두 지워진다.

-- ───────── 테이블 ─────────

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 30),
  kind text not null default 'on' check (kind in ('on', 'off')),
  topic text not null default '기타' check (char_length(topic) between 1 and 20),
  place text not null default '' check (char_length(place) <= 30),        -- 공개 정보: 구 단위까지만
  schedule text not null default '' check (char_length(schedule) <= 40),  -- 예: 일요일 오전 10시
  intro text not null default '' check (char_length(intro) <= 100),
  is_public boolean not null default true,
  join_mode text not null default 'open' check (join_mode in ('open', 'approve')),
  invite_code text not null unique,
  max_members int not null default 30 check (max_members between 2 and 100),
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists groups_public_idx on public.groups (is_public, created_at desc);

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  nickname text not null check (char_length(btrim(nickname)) between 1 and 12),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members (user_id);

create table if not exists public.join_requests (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 1 and 12),
  message text not null default '' check (char_length(message) <= 80),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  user_id uuid not null,
  day date not null,
  action_id text not null check (char_length(action_id) between 1 and 30),
  memo text not null default '' check (char_length(memo) <= 140),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (group_id, user_id) references public.group_members (group_id, user_id) on delete cascade,
  unique (group_id, user_id, day, action_id)
);
create index if not exists shares_group_idx on public.shares (group_id, day desc);

create table if not exists public.reactions (
  share_id uuid not null references public.shares (id) on delete cascade,
  group_id uuid not null,
  user_id uuid not null,
  kind smallint not null check (kind between 0 and 2),   -- 0 응원해요 · 1 대단해요 · 2 함께해요
  created_at timestamptz not null default now(),
  primary key (share_id, user_id),                        -- 한 기록에 반응 하나
  foreign key (group_id, user_id) references public.group_members (group_id, user_id) on delete cascade
);
create index if not exists reactions_group_idx on public.reactions (group_id);

create table if not exists public.cheers (
  share_id uuid not null references public.shares (id) on delete cascade,
  group_id uuid not null,
  from_user uuid not null,
  phrase smallint not null check (phrase between 0 and 3), -- 정해진 문구 번호만 (자유 글 없음)
  created_at timestamptz not null default now(),
  primary key (share_id, from_user),                       -- 한 기록에 한마디 하나
  foreign key (group_id, from_user) references public.group_members (group_id, user_id) on delete cascade
);
create index if not exists cheers_group_idx on public.cheers (group_id);

create table if not exists public.reports (
  share_id uuid not null references public.shares (id) on delete cascade,
  group_id uuid not null,
  reporter uuid not null,
  reason text not null default '' check (char_length(reason) <= 40),
  created_at timestamptz not null default now(),
  primary key (share_id, reporter),
  foreign key (group_id, reporter) references public.group_members (group_id, user_id) on delete cascade
);

-- ───────── 확인용 함수 (정책 안에서 group_members를 다시 읽을 때 무한 재귀를 피한다) ─────────

create or replace function public.is_member(g uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from group_members where group_id = g and user_id = auth.uid());
$$;

create or replace function public.is_owner(g uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from group_members where group_id = g and user_id = auth.uid() and role = 'owner');
$$;

-- 공유 글이 그 모임 것인지 (반응·한마디·신고가 다른 모임 글을 가리키지 못하게)
create or replace function public.share_in_group(s uuid, g uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from shares where id = s and group_id = g);
$$;

-- ───────── 권한 ─────────

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.join_requests enable row level security;
alter table public.shares enable row level security;
alter table public.reactions enable row level security;
alter table public.cheers enable row level security;
alter table public.reports enable row level security;

revoke all on public.groups, public.group_members, public.join_requests, public.shares, public.reactions, public.cheers, public.reports from anon, authenticated;

grant select, delete on public.groups to authenticated;
grant update (name, kind, topic, place, schedule, intro, is_public, join_mode, max_members) on public.groups to authenticated;
grant select, delete on public.group_members to authenticated;
grant update (nickname) on public.group_members to authenticated;
grant select, delete on public.join_requests to authenticated;
grant select, insert, delete on public.shares to authenticated;
grant update (hidden) on public.shares to authenticated;
grant select, insert, delete on public.reactions to authenticated;
grant update (kind) on public.reactions to authenticated;
grant select, insert, delete on public.cheers to authenticated;
grant update (phrase) on public.cheers to authenticated;
grant select, insert, delete on public.reports to authenticated;

-- 정책은 다시 만든다
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('groups', 'group_members', 'join_requests', 'shares', 'reactions', 'cheers', 'reports')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- groups: 멤버만 읽고(초대 코드 포함), 운영자만 고치고 지운다. 만들기는 create_group 함수로만.
create policy "groups member read" on public.groups for select to authenticated using (is_member(id));
create policy "groups owner update" on public.groups for update to authenticated using (is_owner(id)) with check (is_owner(id));
create policy "groups owner delete" on public.groups for delete to authenticated using (is_owner(id));

-- group_members: 같은 모임 멤버끼리만 보인다. 닉네임은 본인만 고친다.
-- 나가기는 본인(운영자는 모임 삭제로), 내보내기는 운영자(자기 자신 제외). 들어오기는 함수로만.
create policy "members read" on public.group_members for select to authenticated using (is_member(group_id));
create policy "members own nickname" on public.group_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "members leave or kick" on public.group_members for delete to authenticated
  using ((user_id = (select auth.uid()) and role <> 'owner') or (is_owner(group_id) and user_id <> (select auth.uid())));

-- join_requests: 신청한 본인과 운영자만 본다. 본인은 취소, 운영자는 거절(삭제). 신청·수락은 함수로만.
create policy "requests read" on public.join_requests for select to authenticated
  using (user_id = (select auth.uid()) or is_owner(group_id));
create policy "requests delete" on public.join_requests for delete to authenticated
  using (user_id = (select auth.uid()) or is_owner(group_id));

-- shares: 멤버만 본다. 숨긴 글은 쓴 사람과 운영자만. 본인만 올리고, 본인·운영자가 지우거나 숨긴다.
create policy "shares read" on public.shares for select to authenticated
  using (is_member(group_id) and (not hidden or user_id = (select auth.uid()) or is_owner(group_id)));
create policy "shares insert own" on public.shares for insert to authenticated
  with check (user_id = (select auth.uid()) and is_member(group_id) and hidden = false);
create policy "shares hide" on public.shares for update to authenticated
  using (user_id = (select auth.uid()) or is_owner(group_id)) with check (user_id = (select auth.uid()) or is_owner(group_id));
create policy "shares delete" on public.shares for delete to authenticated
  using (user_id = (select auth.uid()) or is_owner(group_id));

-- reactions / cheers: 멤버만 보고, 본인 것만 남기고 바꾸고 지운다.
create policy "reactions read" on public.reactions for select to authenticated using (is_member(group_id));
create policy "reactions insert" on public.reactions for insert to authenticated
  with check (user_id = (select auth.uid()) and is_member(group_id) and share_in_group(share_id, group_id));
create policy "reactions update" on public.reactions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "reactions delete" on public.reactions for delete to authenticated using (user_id = (select auth.uid()));

create policy "cheers read" on public.cheers for select to authenticated using (is_member(group_id));
create policy "cheers insert" on public.cheers for insert to authenticated
  with check (from_user = (select auth.uid()) and is_member(group_id) and share_in_group(share_id, group_id)
    and not exists (select 1 from public.shares s where s.id = share_id and s.user_id = (select auth.uid())));
create policy "cheers update" on public.cheers for update to authenticated
  using (from_user = (select auth.uid())) with check (from_user = (select auth.uid()));
create policy "cheers delete" on public.cheers for delete to authenticated using (from_user = (select auth.uid()));

-- reports: 멤버가 남기고, 운영자와 신고한 본인만 본다.
create policy "reports insert" on public.reports for insert to authenticated
  with check (reporter = (select auth.uid()) and is_member(group_id) and share_in_group(share_id, group_id));
create policy "reports read" on public.reports for select to authenticated
  using (reporter = (select auth.uid()) or is_owner(group_id));
create policy "reports delete" on public.reports for delete to authenticated
  using (reporter = (select auth.uid()) or is_owner(group_id));

-- ───────── 함수 (RPC) ─────────

-- 헷갈리는 글자(0 O 1 I L)를 뺀 6자리 초대 코드
create or replace function public.new_invite_code() returns text
language plpgsql volatile set search_path = public as $$
declare
  abc constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(abc, 1 + floor(random() * length(abc))::int, 1);
    end loop;
    exit when not exists (select 1 from groups where invite_code = c);
  end loop;
  return c;
end $$;

-- 모임 만들기: 모임 + 운영자 등록을 한 번에. 한 사람이 운영하는 모임은 5개까지.
create or replace function public.create_group(
  p_name text, p_kind text, p_topic text, p_place text, p_schedule text, p_intro text,
  p_is_public boolean, p_join_mode text, p_nickname text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  gid uuid;
begin
  if uid is null then raise exception 'login_required'; end if;
  if (select count(*) from groups where owner_id = uid) >= 5 then raise exception 'too_many_groups'; end if;
  if (select count(*) from group_members where user_id = uid) >= 20 then raise exception 'too_many_memberships'; end if;
  insert into groups (name, kind, topic, place, schedule, intro, is_public, join_mode, invite_code, owner_id)
  values (btrim(p_name), p_kind, coalesce(nullif(btrim(p_topic), ''), '기타'), btrim(coalesce(p_place, '')), btrim(coalesce(p_schedule, '')),
          btrim(coalesce(p_intro, '')), coalesce(p_is_public, true), coalesce(p_join_mode, 'open'), new_invite_code(), uid)
  returning id into gid;
  insert into group_members (group_id, user_id, role, nickname) values (gid, uid, 'owner', btrim(p_nickname));
  return gid;
end $$;

-- 공개 모임 검색: 이름·주제·지역·소개에서 찾는다. 소개 정보와 내 상태(참여 중·신청함)만 돌려준다.
create or replace function public.search_groups(p_q text default '', p_kind text default 'all')
returns table (id uuid, name text, kind text, topic text, place text, schedule text, intro text, join_mode text,
               member_count int, max_members int, is_member boolean, requested boolean)
language sql security definer stable set search_path = public as $$
  select g.id, g.name, g.kind, g.topic, g.place, g.schedule, g.intro, g.join_mode,
         (select count(*)::int from group_members m where m.group_id = g.id),
         g.max_members,
         exists (select 1 from group_members m where m.group_id = g.id and m.user_id = auth.uid()),
         exists (select 1 from join_requests r where r.group_id = g.id and r.user_id = auth.uid())
  from groups g
  where auth.uid() is not null
    and g.is_public
    and (p_kind = 'all' or g.kind = p_kind)
    and (coalesce(btrim(p_q), '') = ''
         or (g.name || ' ' || g.topic || ' ' || g.place || ' ' || g.intro) ilike '%' || replace(replace(btrim(p_q), '%', ''), '_', '') || '%')
  order by g.created_at desc
  limit 50;
$$;

-- 모임 소개 한 개: 공개 모임이거나, 초대 코드를 아는 경우 또는 이미 멤버인 경우에만
create or replace function public.group_preview(p_id uuid default null, p_code text default null)
returns table (id uuid, name text, kind text, topic text, place text, schedule text, intro text, join_mode text, is_public boolean,
               member_count int, max_members int, is_member boolean, requested boolean, by_code boolean)
language sql security definer stable set search_path = public as $$
  select g.id, g.name, g.kind, g.topic, g.place, g.schedule, g.intro, g.join_mode, g.is_public,
         (select count(*)::int from group_members m where m.group_id = g.id),
         g.max_members,
         exists (select 1 from group_members m where m.group_id = g.id and m.user_id = auth.uid()),
         exists (select 1 from join_requests r where r.group_id = g.id and r.user_id = auth.uid()),
         p_code is not null
  from groups g
  where auth.uid() is not null
    and ((p_code is not null and g.invite_code = upper(btrim(p_code)))
      or (p_code is null and g.id = p_id
          and (g.is_public or exists (select 1 from group_members m where m.group_id = g.id and m.user_id = auth.uid()))))
  limit 1;
$$;

-- 참여: 초대 코드가 맞으면 바로 참여. 코드 없이 공개 모임이면 '바로 참여'는 참여, '승인 후 참여'는 신청.
-- 돌려주는 값: 'joined' | 'requested' | 'already'
create or replace function public.join_group(p_id uuid, p_nickname text, p_code text default null, p_message text default '')
returns text
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  g groups%rowtype;
begin
  if uid is null then raise exception 'login_required'; end if;
  select * into g from groups where id = p_id;
  if not found then raise exception 'not_found'; end if;
  if exists (select 1 from group_members where group_id = p_id and user_id = uid) then return 'already'; end if;
  if p_code is not null and g.invite_code <> upper(btrim(p_code)) then raise exception 'bad_code'; end if;
  if p_code is null and not g.is_public then raise exception 'not_found'; end if;
  if (select count(*) from group_members where group_id = p_id) >= g.max_members then raise exception 'full'; end if;
  if (select count(*) from group_members where user_id = uid) >= 20 then raise exception 'too_many_memberships'; end if;

  if p_code is null and g.join_mode = 'approve' then
    insert into join_requests (group_id, user_id, nickname, message)
    values (p_id, uid, btrim(p_nickname), left(btrim(coalesce(p_message, '')), 80))
    on conflict (group_id, user_id) do update set nickname = excluded.nickname, message = excluded.message, created_at = now();
    return 'requested';
  end if;

  insert into group_members (group_id, user_id, role, nickname) values (p_id, uid, 'member', btrim(p_nickname));
  delete from join_requests where group_id = p_id and user_id = uid;
  return 'joined';
end $$;

-- 운영자: 참여 신청 수락
create or replace function public.accept_request(p_group uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r join_requests%rowtype;
begin
  if not is_owner(p_group) then raise exception 'not_owner'; end if;
  select * into r from join_requests where group_id = p_group and user_id = p_user;
  if not found then raise exception 'not_found'; end if;
  if (select count(*) from group_members where group_id = p_group) >= (select max_members from groups where id = p_group) then raise exception 'full'; end if;
  insert into group_members (group_id, user_id, role, nickname) values (p_group, p_user, 'member', r.nickname)
  on conflict do nothing;
  delete from join_requests where group_id = p_group and user_id = p_user;
end $$;

-- 운영자: 초대 코드 바꾸기 (예전 코드로는 더 못 들어온다)
create or replace function public.reset_invite_code(p_group uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  c text;
begin
  if not is_owner(p_group) then raise exception 'not_owner'; end if;
  c := new_invite_code();
  update groups set invite_code = c where id = p_group;
  return c;
end $$;

-- 내 모임 목록: 멤버 수, 최근 7일 공유한 멤버 수, 운영자에겐 대기 중 신청 수
create or replace function public.my_groups()
returns table (id uuid, name text, kind text, topic text, place text, schedule text, role text, nickname text,
               member_count int, active_week int, pending int, joined_at timestamptz)
language sql security definer stable set search_path = public as $$
  select g.id, g.name, g.kind, g.topic, g.place, g.schedule, m.role, m.nickname,
         (select count(*)::int from group_members x where x.group_id = g.id),
         (select count(distinct s.user_id)::int from shares s
            where s.group_id = g.id and s.day >= ((now() at time zone 'Asia/Seoul')::date - 6)),
         case when m.role = 'owner' then (select count(*)::int from join_requests r where r.group_id = g.id) else 0 end,
         m.joined_at
  from group_members m join groups g on g.id = m.group_id
  where m.user_id = auth.uid()
  order by m.joined_at;
$$;

revoke all on function public.is_member(uuid), public.is_owner(uuid), public.share_in_group(uuid, uuid), public.new_invite_code(),
  public.create_group(text, text, text, text, text, text, boolean, text, text), public.search_groups(text, text),
  public.group_preview(uuid, text), public.join_group(uuid, text, text, text), public.accept_request(uuid, uuid),
  public.reset_invite_code(uuid), public.my_groups() from public, anon;
grant execute on function public.is_member(uuid), public.is_owner(uuid), public.share_in_group(uuid, uuid),
  public.create_group(text, text, text, text, text, text, boolean, text, text), public.search_groups(text, text),
  public.group_preview(uuid, text), public.join_group(uuid, text, text, text), public.accept_request(uuid, uuid),
  public.reset_invite_code(uuid), public.my_groups() to authenticated;
