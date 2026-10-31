// 공개 가능한 설정만 넣습니다. 삭제 비밀번호는 Supabase 서버에서 관리합니다.
window.INVITATION_CONFIG = Object.freeze({
  groom: "임한솔",
  bride: "장현정",
  weddingDate: "2027-03-06T14:20:00+09:00",
  venue: "어반폴 트레마리스",
  address: "대구광역시 북구 워터폴리스로 5길 3",
  siteUrl: "https://ihs61855.github.io/wedding-invitation/",
  // 활성화된 네이버 QR 주소를 공유·링크 복사에 사용합니다.
  qrUrl: "https://m.site.naver.com/2jYKF",
  useQrUrlForSharing: true,
  // 현재 예시 데이터입니다. 실제 계좌를 사용할 때 아래 정보를 교체하세요.
  accounts: {
    groom: [
      { relation: "신랑", holder: "임한솔", bank: "예시은행", number: "000-0000-000001" },
      { relation: "아버지", holder: "임창범", bank: "예시은행", number: "000-0000-000002" },
      { relation: "어머니", holder: "이선완", bank: "예시은행", number: "000-0000-000003" }
    ],
    bride: [
      { relation: "신부", holder: "장현정", bank: "예시은행", number: "000-0000-000004" },
      { relation: "아버지", holder: "XXX", bank: "예시은행", number: "000-0000-000005" },
      { relation: "어머니", holder: "YYY", bank: "예시은행", number: "000-0000-000006" }
    ]
  },
  // 프로젝트 Connect에서 복사한 URL과 publishable key를 입력합니다.
  // secret / service_role 키는 절대 사용하지 마세요.
  supabaseUrl: "https://pgzclyszfnytrcocmbmp.supabase.co",
  supabasePublishableKey: "sb_publishable_dG6VzB6pyumkZLuCXVa0ig_PfgXGCIP"
});
