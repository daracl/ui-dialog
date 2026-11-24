// 예제 페이지 공통 도우미 : 예제 메뉴, 테마 전환, 로그, 옵션 코드 표시
const THEME_KEY = "daracl-dialog-uitest-theme";

/** 예제 목록. 새 예제를 추가하면 여기에 등록한다. (메뉴와 index.html 목록이 함께 쓴다) */
export const PAGES = [
  { file: "demo.html", title: "종합 데모 · 옵션 빌더", desc: "옵션을 골라 dialog 를 만들고 같은 결과의 코드를 확인한다." },
  { file: "basic.html", title: "기본 사용 · 메서드", desc: "README 예제, show / hide / maximise, 아이콘, 간단한 형태." },
  { file: "buttons.html", title: "하단 버튼 · 키보드", desc: "버튼 스타일 6종과 Tab · Enter · Space · Esc 동작." },
  { file: "modal.html", title: "모달 · 중첩 · 포커스", desc: "중첩 모달, 쌓임 순서, focus trap · 복원." },
  { file: "drag-resize.html", title: "이동 · 크기 조절 · 최대화", desc: "draggable, resizable, dragOverflow, maximise." },
  { file: "security.html", title: "HTML 보안 (sanitize · url)", desc: "sanitize 모드 비교와 위험한 url 차단." },
  { file: "theme.html", title: "테마", desc: "전체 · dialog 별 테마와 CSS 변수 재정의." },
  { file: "lifecycle.html", title: "생성 · 제거 (리소스 정리)", desc: "반복 생성 · 제거와 drag 중 destroy." },
];

/** 헤더 아래에 예제 메뉴를 넣는다. 현재 페이지는 aria-current 로 표시한다. */
export function renderNav() {
  const header = document.querySelector("body.example-page > .page-header");
  if (!header || document.querySelector(".example-nav")) return;
  const current = location.pathname.split("/").pop() || "index.html";
  const nav = document.createElement("nav");
  nav.className = "example-nav";
  nav.setAttribute("aria-label", "예제 메뉴");
  [{ file: "index.html", title: "전체 목록" }, ...PAGES].forEach(({ file, title }) => {
    const link = document.createElement("a");
    link.href = `./${file}`;
    link.textContent = title;
    if (file === current) link.setAttribute("aria-current", "page");
    nav.appendChild(link);
  });
  header.after(nav);
}

/** index.html 의 #pageCards 에 예제 카드를 채운다. */
export function renderCards(container = document.getElementById("pageCards")) {
  if (!container) return;
  container.replaceChildren(
    ...PAGES.map(({ file, title, desc }) => {
      const card = document.createElement("a");
      card.className = "page-card";
      card.href = `./${file}`;
      const strong = document.createElement("strong");
      strong.textContent = title;
      const span = document.createElement("span");
      span.textContent = desc;
      const small = document.createElement("small");
      small.textContent = `${file} →`;
      card.append(strong, span, small);
      return card;
    })
  );
}

/** 저장된 테마를 <html data-daracl-theme> 에 적용한다. (모든 예제 페이지가 같은 값을 쓴다) */
export function applyTheme(theme = localStorage.getItem(THEME_KEY) || "light") {
  document.documentElement.setAttribute("data-daracl-theme", theme);
  document.querySelectorAll("[data-theme-select]").forEach((select) => (select.value = theme));
  return theme;
}

/** 헤더의 테마 선택 상자를 연결한다. */
export function setupTheme() {
  applyTheme();
  document.querySelectorAll("[data-theme-select]").forEach((select) => {
    select.addEventListener("change", () => {
      localStorage.setItem(THEME_KEY, select.value);
      applyTheme(select.value);
    });
  });
  // 다른 탭에서 바꾼 값을 따른다.
  window.addEventListener("storage", (e) => {
    if (e.key === THEME_KEY) applyTheme(e.newValue || "light");
  });
}

/**
 * 로그 출력기를 만든다. <pre class="log" id="..."> 와 [data-clear="id"] 버튼을 연결한다.
 * @param {string} id pre 요소 id
 */
export function createLog(id = "log") {
  const el = document.getElementById(id);
  document.querySelectorAll(`[data-clear="${id}"]`).forEach((btn) => btn.addEventListener("click", () => (el.textContent = "")));
  return (message) => {
    const time = new Date().toTimeString().slice(0, 8);
    el.textContent += `[${time}] ${message}\n`;
    el.scrollTop = el.scrollHeight;
  };
}

/**
 * 옵션 객체를 Daracl.dialog.create(...) 코드로 보여 준다. 함수는 이름만 표시한다.
 * @param {HTMLElement} el
 * @param {object} options
 */
export function showCode(el, options) {
  const json = JSON.stringify(
    options,
    (key, value) => (typeof value === "function" ? `function ${value.name || ""}() { … }` : value),
    2
  ).replace(/"function ([^"]*)\(\) \{ … \}"/g, "function $1() { … }");
  el.textContent = `Daracl.dialog.create(${json});`;
}

/** 문서에 남아 있는 dialog DOM 수 (wrapper, overlay) */
export function countDialogDom() {
  return {
    wrapper: document.querySelectorAll(".daracl-dialog-wrapper").length,
    overlay: document.querySelectorAll(".daracl-dialog-overlay").length,
  };
}

setupTheme();
renderNav();
renderCards();
