-- 오늘의 실천: 로그인한 사람의 기록(js/store.js 상태 전체)을 한 줄로 저장한다.
-- Supabase 대시보드 > SQL Editor 에 붙여 넣고 Run.

create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

-- 프로젝트에서 '새 테이블 자동 공개'를 껐으므로, 로그인한 사용자(authenticated)에게만 직접 열어 준다. anon(로그인 전)은 접근 불가.
revoke all on public.user_state from anon;
grant select, insert, update, delete on public.user_state to authenticated;

-- 자기 줄만 읽고 쓸 수 있다
drop policy if exists "own row select" on public.user_state;
drop policy if exists "own row insert" on public.user_state;
drop policy if exists "own row update" on public.user_state;
drop policy if exists "own row delete" on public.user_state;

create policy "own row select" on public.user_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own row insert" on public.user_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own row update" on public.user_state
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own row delete" on public.user_state
  for delete to authenticated using ((select auth.uid()) = user_id);
