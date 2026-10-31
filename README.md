# 임한솔 · 장현정 모바일 청첩장

2027년 3월 6일 토요일 오후 2시 20분 · 어반폴 트레마리스

주소: 대구광역시 북구 워터폴리스로 5길 3 (검단동 1922)

게시 주소: https://ihs61855.github.io/wedding-invitation/

HTML/CSS/JavaScript로 만든 GitHub Pages용 청첩장입니다. 빌드나 Node 패키지 설치가 필요하지 않습니다.

## 구성

- 폴더에 있던 두 장의 사진을 사용한 세로형 커버와 꽃잎 효과
- 초대글, 신랑·신부 이름, 한국 시간 기준 달력과 실시간 카운트다운
- ICS 일정 저장, 사진 확대·키보드 이동·좌우 스와이프
- 예식장 지도, 네이버 지도·카카오맵 연결, 주소 복사
- 신랑 측·신부 측 접이식 계좌 안내와 계좌번호 복사 (현재 양가 각 3개의 예시 데이터)
- 휴대폰 기본 공유와 링크 복사, 카카오톡 미리보기용 Open Graph 메타데이터
- 신랑 측·신부 측 선택, 이름 20자·댓글 200자, 최신순 10개씩 페이지 이동
- 서버에서 공통 삭제 비밀번호를 검사하는 삭제 모달

## 미리보기와 게시

`index.html`을 브라우저로 열어 기본 화면을 볼 수 있습니다.
HTTP 미리보기는 이 폴더에서 `python -m http.server 4173 --bind 127.0.0.1` 실행 후
http://127.0.0.1:4173/ 에 접속합니다.

GitHub Desktop에서 변경 사항을 Commit 한 다음 Push origin을 누르세요.
GitHub 저장소 Settings → Pages는 `Deploy from a branch`, `main`, `/(root)`로 설정합니다.
커밋만 하고 Push하지 않으면 공개 사이트에는 반영되지 않습니다.

## 공유 방명록 최초 연결

GitHub Pages는 댓글을 저장할 서버를 제공하지 않으므로 Supabase를 연결합니다.
연결 전에는 작성 폼을 비활성화하고 ‘방명록을 준비하고 있어요’를 표시합니다.
브라우저에만 저장하는 댓글을 공유 댓글처럼 표시하지 않습니다.

1. https://supabase.com/ 에 가입하고 대시보드에서 New project를 만듭니다.
   프로젝트 이름과 데이터베이스 비밀번호를 정하고, 가까운 리전을 선택합니다.
   데이터베이스 비밀번호는 방명록 삭제 비밀번호와 별개입니다.
2. 프로젝트의 SQL Editor → New query를 엽니다.
3. 이 저장소 바깥, 상위 ‘모바일청첩장’ 폴더에 준비된 `supabase-setup.sql`의 전체 내용을 붙여 넣고 Run을 누릅니다.
   해당 복사본에는 요청하신 삭제 비밀번호가 설정되어 있으므로 저장소에 옮기지 않습니다.
   복사본이 없다면 `supabase/schema.sql`의 `CHANGE_ME_DELETE_PASSWORD`를 바꾼 복사본을 실행합니다.
4. 프로젝트의 Connect 화면에서 Project URL과 Publishable key를 복사합니다.
   키는 Settings → API Keys에서도 확인할 수 있습니다.
5. `config.js`의 `supabaseUrl`과 `supabasePublishableKey`에 각각 붙여 넣고 저장합니다.
   브라우저에 공개 가능한 publishable key(또는 기존 anon key)만 넣습니다.
   secret key, service_role 키, DB 비밀번호, 삭제 비밀번호는 넣지 않습니다.
6. 페이지를 새로고침하면 폼이 활성화됩니다. 댓글을 작성하고 다른 휴대폰에서도 확인하세요.
7. 댓글을 11개 이상 준비해 1페이지 10개와 다음 페이지를 확인합니다.
   잘못된 삭제 비밀번호가 거절되고, 지정 비밀번호로 삭제되는지 확인하세요.
8. `config.js` 변경도 Commit → Push origin으로 게시합니다.

SQL은 테이블 직접 읽기·쓰기·삭제를 익명 사용자에게 허용하지 않고,
한 번에 10개만 반환하는 목록 RPC, 글쓰기 RPC, 비밀번호 확인 삭제 RPC만 공개합니다.
공통 비밀번호는 비공개 스키마에 bcrypt 해시로 보관합니다.
글쓰기는 연결 IP 기준 분당 5회, 삭제 시도는 5분당 5회로 제한합니다.
클라이언트 IP 헤더를 받을 수 없는 환경에서는 공유 제한이 적용될 수 있습니다.
비밀번호를 아는 사람은 다른 사람의 댓글도 삭제할 수 있는 공통 관리자 비밀번호 방식입니다.

## 수정할 파일

계좌는 `config.js`의 `accounts.groom`, `accounts.bride`에 있습니다.
`relation`은 관계, `holder`는 예금주, `bank`는 은행, `number`는 계좌번호입니다.
현재는 예시은행과 000으로 시작하는 가짜 계좌이며, 실제 자료로 교체한 뒤 `accounts.isExample`을 `false`로 바꾸면 예시 안내가 사라집니다.

네이버 QR 주소는 `config.js`의 `qrUrl`에 보관했습니다.
네이버 QR 코드가 활성화되어 원본 GitHub Pages 청첩장으로 연결되는 것을 확인했습니다.
현재 `useQrUrlForSharing`은 `true`이며 공유·링크 복사에는 QR 주소를 사용합니다.
원본 주소를 공유하려면 이 값을 `false`로 바꿉니다.

공유 썸네일은 `social-preview.jpg`(1200×630)입니다. `share-preview.html`은 해당 이미지를 만든 원본 화면입니다.
Open Graph와 Twitter Card 메타데이터에 절대 주소로 연결했으며, 실제 미리보기는 Push 이후 해당 파일이 공개된 상태에서 확인합니다.
네이버 QR 페이지 자체의 대표 이미지는 네이버 QR 편집 화면에서도 설정해야 할 수 있습니다.

- `index.html`: 초대 문구, 표시되는 날짜·장소, 공유 미리보기 정보
- `style.css`: 글꼴, 색상, 여백, 모바일 화면
- `config.js`: 예식 시간, 지도·공유 주소, Supabase 공개 연결 정보
- `script.js`: 달력, 갤러리, 복사·공유·방명록 화면
- `guestbook.js`: Supabase RPC 통신
- `supabase/schema.sql`: 비밀번호가 없는 서버 설정 템플릿

화면의 날짜는 `index.html`에도 있으므로 예식 정보를 변경할 때 설정 파일과 함께 수정하세요.
사진을 교체할 때는 기존 파일명을 유지하거나 `index.html`, `script.js`, `og:image` 경로를 함께 바꿉니다.
글꼴은 Google Fonts에서 불러오며 연결되지 않으면 시스템 바탕체를 사용합니다.

## 검증

`node --test tests/guestbook.test.cjs`로 RPC 경로·입력·키 사용·오류 처리를 확인합니다.
브라우저에서는 모바일 가로 넘침, 달력 날짜, 사진 확대·전환, 지도 링크를 확인합니다.
실제 Supabase 댓글 저장·삭제는 최초 연결 후 위 절차로 확인해야 합니다.
