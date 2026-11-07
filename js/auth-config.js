// Supabase 연결 정보. 둘 다 비어 있으면 로그인 버튼은 "준비 중" 안내만 띄우고 기록은 이 기기에만 저장된다.
// Supabase 대시보드 > Project Settings > API 에서 복사한다.
// anon(public) 키는 브라우저에 공개되는 키라 저장소에 올려도 된다. 데이터는 user_state 테이블의 RLS가 지킨다.
// service_role 키는 절대 여기에 넣지 않는다.
export const SUPABASE_URL = 'https://itysexcfbeermsgfralr.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0eXNleGNmYmVlcm1zZ2ZyYWxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5ODkzMzEsImV4cCI6MjEwOTU2NTMzMX0.dXFdmegUWvQ7gsJm1oCyLp4_-vFoV9fwPzAcI7xMJ_Q';
