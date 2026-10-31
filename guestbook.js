(function (root) {
  "use strict";

  // 서버가 고정된 10개 단위 페이지와 삭제 권한을 관리합니다.
  class GuestbookApi {
    constructor(url, key, request = root.fetch.bind(root)) {
      this.url = url.replace(/\/+$/, "");
      this.key = key;
      this.request = request;
      if (key.startsWith("sb_secret_")) throw new Error("공개 키를 사용해 주세요.");
      if (key.startsWith("eyJ")) {
        const payload = JSON.parse(root.atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payload.role !== "anon") throw new Error("공개 anon 키를 사용해 주세요.");
      }
    }

    async rpc(name, body) {
      const headers = { apikey: this.key, "Content-Type": "application/json" };
      if (!this.key.startsWith("sb_publishable_")) headers.Authorization = `Bearer ${this.key}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await this.request(`${this.url}/rest/v1/rpc/${name}`, {
          method: "POST", headers, body: JSON.stringify(body), signal: controller.signal
        });
        if (!response.ok) throw new Error("방명록에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.");
        return await response.json();
      } catch (error) {
        if (error.name === "AbortError" || error instanceof TypeError) {
          throw new Error("연결이 원활하지 않아요. 인터넷 연결을 확인해 주세요.");
        }
        throw error;
      } finally { clearTimeout(timer); }
    }

    list(page = 1) {
      return this.rpc("list_guestbook", { p_page: Math.max(1, Math.trunc(page) || 1) });
    }
    add(side, name, message) {
      return this.rpc("add_guestbook", { p_side: side, p_name: name.trim(), p_message: message.trim() });
    }
    remove(id, password) {
      return this.rpc("delete_guestbook", { p_id: id, p_password: password });
    }
  }
  root.GuestbookApi = GuestbookApi;
})(globalThis);
