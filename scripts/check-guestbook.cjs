const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { setTimeout: delay } = require("node:timers/promises");

// 사이트와 같은 공개 연결 설정 및 RPC 클라이언트를 사용합니다.
const scope = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../config.js"), "utf8"), scope);
require("../guestbook.js");

async function main() {
  const config = scope.window.INVITATION_CONFIG;
  if (!config?.supabaseUrl || !config?.supabasePublishableKey) {
    throw new Error("config.js에 Supabase 공개 연결 설정이 필요합니다.");
  }
  const api = new globalThis.GuestbookApi(config.supabaseUrl, config.supabasePublishableKey);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // 실제 방명록 테이블을 읽습니다. 댓글 추가·수정·삭제는 하지 않습니다.
      const data = await api.list(1);
      if (!Array.isArray(data.comments) || !Number.isInteger(data.total) || data.page !== 1) {
        throw new Error("방명록 조회 응답 형식이 올바르지 않습니다.");
      }
      // 댓글 내용과 연결 키는 로그에 출력하지 않습니다.
      console.log("Supabase 방명록 조회 성공");
      return;
    } catch (error) {
      if (attempt === 3) throw error;
      console.warn(`방명록 조회 실패 (${attempt}/3). 5초 후 다시 시도합니다.`);
      await delay(5000);
    }
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
