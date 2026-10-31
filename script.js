(() => {
  "use strict";
  const config = window.INVITATION_CONFIG;
  const shareUrl = config.useQrUrlForSharing && config.qrUrl ? config.qrUrl : config.siteUrl;
  const $ = id => document.getElementById(id);
  let toastTimer;
  function toast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 3000);
  }
  async function copy(text, success) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const input = document.createElement("textarea");
        input.value = text;
        input.style.cssText = "position:fixed;top:0;left:-9999px";
        document.body.append(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("copy");
      }
      toast(success);
    } catch { toast("복사하지 못했어요. 길게 눌러 복사해 주세요."); }
  }
  $("copy-address").addEventListener("click", () => copy(config.address, "예식장 주소를 복사했어요."));
  $("copy-link").addEventListener("click", () => copy(shareUrl, "청첩장 링크를 복사했어요."));
  $("share-invitation").addEventListener("click", async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${config.groom} · ${config.bride}, 우리 결혼합니다`, text: "2027년 3월 6일 오후 2시 20분, 소중한 분들을 초대합니다.", url: shareUrl });
      } catch (error) { if (error.name !== "AbortError") copy(shareUrl, "청첩장 링크를 복사했어요."); }
    } else await copy(shareUrl, "청첩장 링크를 복사했어요.");
  });

  const accounts = config.accounts || {};
  for (const side of ["groom", "bride"]) {
    const list = $(`${side}-accounts`);
    for (const account of accounts[side] || []) {
      const row = element("div", "account-row");
      const info = element("div", "account-info");
      const name = element("p", "account-holder");
      name.append(element("span", "account-relation", account.relation), document.createTextNode(account.holder));
      const bank = element("p", "account-bank", account.bank);
      const number = element("p", "account-number", account.number);
      info.append(name, bank, number);
      const button = element("button", "account-copy", "복사 ⧉");
      button.type = "button";
      button.setAttribute("aria-label", `${side === "groom" ? "신랑" : "신부"} 측 ${account.relation} ${account.holder} 계좌번호 복사`);
      button.addEventListener("click", () => copy(account.number, "계좌번호를 복사했어요."));
      row.append(info, button);
      list.append(row);
    }
  }

  // 달력은 방문자의 시간대와 관계없이 한국 예식 날짜로 표시합니다.
  const dateParts = config.weddingDate.slice(0, 10).split("-").map(Number);
  const [year, month, day] = dateParts;
  const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const calendar = $("calendar-body");
  for (let cell = 0; cell < Math.ceil((offset + daysInMonth) / 7) * 7; cell++) {
    if (cell % 7 === 0) calendar.append(document.createElement("tr"));
    const td = document.createElement("td");
    const n = cell - offset + 1;
    if (n > 0 && n <= daysInMonth) {
      if (n === day) {
        const span = document.createElement("span");
        span.className = "wedding-day";
        span.textContent = String(n);
        td.setAttribute("aria-label", `${month}월 ${day}일 결혼식`);
        td.append(span);
      } else td.textContent = String(n);
    }
    calendar.lastElementChild.append(td);
  }
  const weddingTime = new Date(config.weddingDate).getTime();
  function updateCountdown() {
    const now = Date.now();
    const diff = Math.max(0, weddingTime - now);
    const seconds = Math.floor(diff / 1000);
    const values = [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60];
    ["days", "hours", "minutes", "seconds"].forEach((id, i) => { $(id).textContent = String(values[i]).padStart(2, "0"); });
    const koreanToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    if (koreanToday === config.weddingDate.slice(0, 10)) $("countdown-message").textContent = "한솔 ♡ 현정, 오늘 결혼합니다.";
    else if (now >= weddingTime) $("countdown-message").textContent = "함께해 주신 모든 분께 감사드립니다.";
    else {
      const strong = document.createElement("strong");
      strong.textContent = `${Math.ceil(diff / 86400000)}일`;
      $("countdown-message").replaceChildren("한솔 ♡ 현정의 결혼식까지 ", strong, " 남았습니다.");
    }
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);
  $("save-calendar").addEventListener("click", () => {
    const stamp = time => new Date(time).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const escape = value => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, "\\$&");
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Hansol Hyeonjeong//Wedding//KO", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", "UID:hansol-hyeonjeong-20270306@ihs61855.github.io", `DTSTAMP:${stamp(Date.now())}`, `DTSTART:${stamp(weddingTime)}`, `DTEND:${stamp(weddingTime + 3600000)}`, `SUMMARY:${escape(`${config.groom} · ${config.bride} 결혼식`)}`, `LOCATION:${escape(`${config.venue}, ${config.address}`)}`, `DESCRIPTION:${escape(config.siteUrl)}`, "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = "한솔-현정-결혼식.ics";
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  const photos = [
    { src: "./images/main.jpg?v=a7976f656582", alt: "푸른 잔디밭에서 서로를 바라보는 두 사람" },
    { src: "./images/gallery-01.jpg", alt: "초록빛 들판에서 함께 웃는 두 사람" }
  ];
  let photoIndex = 0;
  const photoDialog = $("photo-dialog");
  const deleteDialog = $("delete-dialog");
  function selectPhoto(index) {
    photoIndex = (index + photos.length) % photos.length;
    const photo = photos[photoIndex];
    $("gallery-feature").src = photo.src;
    $("gallery-feature").alt = photo.alt;
    $("large-photo").src = photo.src;
    $("large-photo").alt = photo.alt;
    $("gallery-number").textContent = String(photoIndex + 1).padStart(2, "0");
    $("photo-position").textContent = `${photoIndex + 1} / ${photos.length}`;
    document.querySelector(".gallery-main").setAttribute("aria-label", `${photoIndex + 1}번째 사진 크게 보기`);
    document.querySelectorAll("[data-select-photo]").forEach((button, i) => {
      button.classList.toggle("selected", i === photoIndex);
      button.setAttribute("aria-pressed", String(i === photoIndex));
    });
  }
  document.querySelectorAll("[data-select-photo]").forEach(button => button.addEventListener("click", () => selectPhoto(Number(button.dataset.selectPhoto))));
  document.querySelector(".gallery-main").addEventListener("click", () => { selectPhoto(photoIndex); photoDialog.showModal(); document.body.style.overflow = "hidden"; });
  $("previous-photo").addEventListener("click", () => selectPhoto(photoIndex - 1));
  $("next-photo").addEventListener("click", () => selectPhoto(photoIndex + 1));
  $("close-photo").addEventListener("click", () => photoDialog.close());
  photoDialog.addEventListener("keydown", event => {
    if (event.key === "ArrowRight") selectPhoto(photoIndex + 1);
    if (event.key === "ArrowLeft") selectPhoto(photoIndex - 1);
  });
  let touchStart = null;
  photoDialog.addEventListener("touchstart", event => { touchStart = event.changedTouches[0].clientX; }, { passive: true });
  photoDialog.addEventListener("touchend", event => {
    if (touchStart === null) return;
    const diff = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 50) selectPhoto(photoIndex + (diff < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });
  for (const dialog of [photoDialog, deleteDialog]) {
    dialog.addEventListener("click", event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
    dialog.addEventListener("close", () => { document.body.style.overflow = ""; });
  }

  // 모든 방문자가 같은 서버 데이터를 읽습니다. 브라우저별 임시 저장은 사용하지 않습니다.
  const status = $("guestbook-status");
  const fields = $("guestbook-fields");
  let api;
  let currentPage = 1;
  let deleteId = null;
  let requestVersion = 0;
  let posting = false;
  let deleting = false;
  const errorMessages = {
    rate_limited: "잠시 쉬었다가 다시 시도해 주세요.",
    invalid_input: "이름과 축하 메시지를 확인해 주세요.",
    invalid_password: "비밀번호가 일치하지 않아요.",
    not_found: "이미 삭제된 메시지입니다."
  };
  function setStatus(message = "", error = false) { status.textContent = message; status.classList.toggle("error", error); }
  function element(tag, className, text) { const node = document.createElement(tag); node.className = className; if (text !== undefined) node.textContent = text; return node; }
  function renderComments(data) {
    currentPage = data.page;
    $("comment-count").textContent = String(data.total);
    const list = $("comment-list");
    list.replaceChildren();
    if (!data.comments.length) list.append(element("p", "empty-message", "첫 번째 축하의 마음을 남겨 주세요."));
    for (const comment of data.comments) {
      const article = element("article", "comment");
      const meta = element("div", "comment-meta");
      meta.append(element("span", `side-tag ${comment.side}`, comment.side === "bride" ? "신부 측" : "신랑 측"));
      meta.append(element("span", "comment-name", comment.name));
      const date = element("time", "comment-date", new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(comment.created_at)));
      date.dateTime = comment.created_at;
      meta.append(date);
      const button = element("button", "comment-delete", "삭제");
      button.type = "button";
      button.setAttribute("aria-label", `${comment.name}님의 메시지 삭제`);
      button.addEventListener("click", () => {
        deleteId = comment.id;
        $("delete-form").reset(); $("delete-error").textContent = "";
        deleteDialog.showModal(); document.body.style.overflow = "hidden";
      });
      // 사용자 입력은 항상 textContent로 출력하여 HTML 실행을 막습니다.
      article.append(meta, element("p", "comment-text", comment.message), button);
      list.append(article);
    }
    const nav = $("guestbook-pagination");
    nav.replaceChildren(); nav.hidden = data.pages <= 1;
    function pageButton(label, page, disabled = false, selected = false) {
      const button = element("button", "", label);
      button.type = "button"; button.disabled = disabled;
      button.setAttribute("aria-label", label === "‹" ? "이전 페이지" : label === "›" ? "다음 페이지" : `${page}페이지`);
      if (selected) button.setAttribute("aria-current", "page");
      button.addEventListener("click", () => loadComments(page, true));
      nav.append(button);
    }
    pageButton("‹", currentPage - 1, currentPage === 1);
    const start = Math.max(1, Math.min(currentPage - 2, data.pages - 4));
    for (let page = start; page <= Math.min(start + 4, data.pages); page++) pageButton(String(page), page, false, page === currentPage);
    pageButton("›", currentPage + 1, currentPage === data.pages);
  }
  async function loadComments(page = currentPage, scroll = false) {
    const version = ++requestVersion;
    setStatus("축하 메시지를 불러오고 있어요.");
    $("refresh-comments").disabled = true;
    try {
      const data = await api.list(page);
      if (version !== requestVersion) return false;
      renderComments(data); setStatus();
      fields.disabled = posting;
      if (scroll) document.querySelector(".guestbook-list-heading").scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    } catch (error) { if (version === requestVersion) setStatus(error.message, true); return false; }
    finally { if (version === requestVersion) $("refresh-comments").disabled = false; }
  }
  $("guest-message").addEventListener("input", event => { $("character-count").textContent = String(event.target.value.length); });
  $("guestbook-form").addEventListener("submit", async event => {
    event.preventDefault();
    if (!api || posting) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const message = String(form.get("message") || "").trim();
    if (!name || !message) { setStatus("이름과 축하 메시지를 입력해 주세요.", true); return; }
    posting = true; fields.disabled = true;
    let saved = false;
    try {
      const result = await api.add(String(form.get("side")), name, message);
      if (!result.ok) throw new Error(errorMessages[result.reason] || "저장하지 못했어요. 다시 시도해 주세요.");
      saved = true;
      $("guest-message").value = ""; $("character-count").textContent = "0";
      toast("따뜻한 마음을 남겨 주셔서 감사합니다.");
      if (!await loadComments(1)) setStatus("메시지는 저장되었어요. 새로고침을 눌러 확인해 주세요.", true);
    } catch (error) { setStatus(error.message, true); }
    finally { posting = false; fields.disabled = false; if (saved) $("guest-message").focus(); }
  });
  $("refresh-comments").addEventListener("click", () => loadComments());
  $("cancel-delete").addEventListener("click", () => { if (!deleting) deleteDialog.close(); });
  deleteDialog.addEventListener("cancel", event => { if (deleting) event.preventDefault(); });
  deleteDialog.addEventListener("close", () => { $("delete-password").value = ""; deleteId = null; });
  $("delete-form").addEventListener("submit", async event => {
    event.preventDefault();
    if (deleting || !deleteId || !api) return;
    deleting = true;
    $("confirm-delete").disabled = true; $("cancel-delete").disabled = true;
    $("delete-error").textContent = "";
    try {
      const result = await api.remove(deleteId, $("delete-password").value);
      if (!result.ok) throw new Error(errorMessages[result.reason] || "삭제하지 못했어요. 다시 시도해 주세요.");
      deleteDialog.close(); toast("메시지를 삭제했어요.");
      await loadComments(currentPage);
    } catch (error) { $("delete-error").textContent = error.message; }
    finally { deleting = false; $("confirm-delete").disabled = false; $("cancel-delete").disabled = false; }
  });
  if (config.supabaseUrl && config.supabasePublishableKey) {
    try {
      api = new window.GuestbookApi(config.supabaseUrl, config.supabasePublishableKey);
      $("refresh-comments").hidden = false;
      loadComments(1);
    } catch { setStatus("방명록을 준비하고 있어요."); }
  }
})();
