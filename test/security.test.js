// 보안 테스트 : HTML / 속성 / class / URL 주입 방어
// 공격 페이로드는 jsdom 안에서만 사용한다. jsdom 은 스크립트 · 이미지 리소스를 로드하지 않으므로 DOM 결과(남은 요소 · 속성)로 판정한다.
import Dialog from "../src/index";
import { resetDom } from "./helpers/dom";

const PAYLOADS = [
  '<img src=x onerror="window.__xss=1">',
  "<script>window.__xss=1</script>",
  '<svg onload="window.__xss=1"></svg>',
  '<a href="javascript:window.__xss=1">x</a>',
  '<iframe src="javascript:window.__xss=1"></iframe>',
  '<div style="background:url(javascript:alert(1))">s</div>',
  '<math><mi xlink:href="javascript:alert(1)">m</mi></math>',
  '<form action="https://evil.example"><input name="p"></form>',
  "<!--<img src=x onerror=alert(1)>-->",
  "<<img src=x onerror=alert(1)//<",
  '<details open ontoggle="window.__xss=1">',
  '<a href=" jav&#x09;ascript:alert(1)">t</a>',
];

/** 위험한 요소 / 속성이 남아 있는지 검사 */
function assertSafe(root) {
  expect(root.querySelector("script, iframe, svg, math, form, input, object, embed, style")).toBeNull();
  root.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      expect(attr.name.toLowerCase().startsWith("on")).toBe(false);
      if (attr.name === "href" || attr.name === "src") {
        expect(attr.value.replace(/[\s\u0000-\u001f]/g, "").toLowerCase().startsWith("javascript:")).toBe(false); // eslint-disable-line no-control-regex
      }
      if (attr.name === "style") {
        expect(/url\s*\(/i.test(attr.value)).toBe(false);
      }
    });
  });
}

describe("XSS / HTML Injection", () => {
  let warn;
  beforeEach(() => {
    window.__xss = undefined;
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
    resetDom();
    expect(window.__xss).toBeUndefined();
  });

  it.each(PAYLOADS)("title 은 기본으로 sanitize 된다 : %s", (payload) => {
    const d = Dialog.create({ title: payload, template: "x" });
    assertSafe(d.dialogWrapperElement.querySelector(".dialog-header"));
    d.destroy();
  });

  it.each(PAYLOADS)("button label 은 기본으로 sanitize 된다 : %s", (payload) => {
    const d = Dialog.create({ template: "x", buttons: [{ label: payload }] });
    assertSafe(d.dialogWrapperElement.querySelector(".dialog-footer"));
    d.destroy();
  });

  it.each(PAYLOADS)("sanitize: true 이면 template 도 sanitize 된다 : %s", (payload) => {
    const d = Dialog.create({ sanitize: true, template: payload });
    assertSafe(d.dialogWrapperElement.querySelector(".dialog-content"));
    d.destroy();
  });

  it("sanitize: true 에서 template 함수의 반환 문자열도 sanitize 된다", () => {
    const d = Dialog.create({ sanitize: true, template: () => PAYLOADS[0] });
    assertSafe(d.dialogWrapperElement.querySelector(".dialog-content"));
    d.destroy();
  });

  it("허용되는 서식 HTML 은 title 에 유지된다 (하위 호환)", () => {
    const d = Dialog.create({ title: '<b>굵게</b> <span class="x">제목</span>', template: "x" });
    const header = d.dialogWrapperElement.querySelector(".dialog-header");
    expect(header.querySelector("b").textContent).toBe("굵게");
    expect(header.querySelector("span.x").textContent).toBe("제목");
    expect(d.dialogWrapperElement.getAttribute("aria-label")).toBe("굵게 제목");
    d.destroy();
  });

  it("target=_blank 링크에는 rel=noopener noreferrer 가 붙는다 (sanitize 경로)", () => {
    const d = Dialog.create({ title: '<a href="https://example.com" target="_blank">l</a>', template: "x" });
    expect(d.dialogWrapperElement.querySelector(".dialog-header a").getAttribute("rel")).toBe("noopener noreferrer");
    d.destroy();
  });

  it("template 문자열은 기본으로 신뢰된 HTML 로 유지된다 (form · input 을 쓰는 기존 사용 호환)", () => {
    const d = Dialog.create({ template: '<form><input name="id"><button type="button">b</button></form>' });
    const content = d.dialogWrapperElement.querySelector(".dialog-content");
    expect(content.querySelector("form input[name=id]")).not.toBeNull();
    expect(content.querySelector("button")).not.toBeNull();
    d.destroy();
  });

  it("template 문자열 안의 <script> 는 innerHTML 계열 삽입이라 실행되지 않는다", () => {
    const d = Dialog.create({ template: "<script>window.__xss=1</script>" });
    expect(window.__xss).toBeUndefined();
    d.destroy();
  });

  it("sanitize 함수는 title · label · template 모두에 적용된다", () => {
    const sanitize = jest.fn((html) => html.replace(/</g, "&lt;"));
    const d = Dialog.create({ sanitize, title: "<i>t</i>", template: "<b>c</b>", buttons: [{ label: "<u>l</u>" }] });
    expect(sanitize).toHaveBeenCalledTimes(3);
    const w = d.dialogWrapperElement;
    expect(w.querySelector("i, b, u")).toBeNull();
    expect(w.querySelector(".dialog-content").textContent).toBe("<b>c</b>");
    d.destroy();
  });

  it("sanitize 함수가 Node 를 반환하면 그대로 추가한다", () => {
    const d = Dialog.create({
      sanitize: (html) => {
        const span = document.createElement("span");
        span.textContent = html;
        return span;
      },
      template: "<b>c</b>",
    });
    expect(d.dialogWrapperElement.querySelector(".dialog-content span").textContent).toBe("<b>c</b>");
    d.destroy();
  });

  it("sanitize: false 는 0.0.7 동작(그대로 삽입)이다", () => {
    const d = Dialog.create({ sanitize: false, title: '<button class="t">b</button>', template: "x" });
    expect(d.dialogWrapperElement.querySelector(".dialog-header button.t")).not.toBeNull();
    d.destroy();
  });

  it("Node 로 전달한 title / template 은 그대로 추가된다 (문자열 파싱 없음)", () => {
    const title = document.createElement("strong");
    title.textContent = "<img src=x onerror=alert(1)>";
    const d = Dialog.create({ title, template: document.createTextNode("<script>") });
    const w = d.dialogWrapperElement;
    expect(w.querySelector(".dialog-header strong").textContent).toBe("<img src=x onerror=alert(1)>");
    expect(w.querySelector("img, script")).toBeNull();
    d.destroy();
  });
});

describe("속성 · class 주입", () => {
  afterEach(resetDom);

  it("styleClass 에 따옴표 · 이벤트 속성을 넣어도 class 토큰으로만 처리된다", () => {
    const d = Dialog.create({ styleClass: 'a" onclick="window.__xss=1', template: "x", buttons: [{ label: "b", styleClass: 'x" onmouseover="alert(1)' }] });
    const w = d.dialogWrapperElement;
    w.querySelectorAll("*").forEach((el) => {
      Array.from(el.attributes).forEach((attr) => expect(attr.name.startsWith("on")).toBe(false));
    });
    expect(w.querySelector(".daracl-dialog").classList.contains("a\"")).toBe(true);
    d.destroy();
  });

  it.each(["constructor", "__proto__", "toString", 'info" onclick="x'])("icon 은 허용 목록만 class 로 쓴다 : %s", (icon) => {
    const d = Dialog.create({ icon, template: "x" });
    expect(d.dialogWrapperElement.querySelector(".dialog-body").className).toBe("dialog-body");
    d.destroy();
  });
});

describe("URL (iframe)", () => {
  let warn;
  beforeEach(() => {
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
    resetDom();
  });

  it.each(["javascript:alert(1)", " JaVaScRiPt:alert(1)", "java\tscript:alert(1)", "vbscript:msgbox(1)", "data:text/html,<script>alert(1)</script>", "file:///etc/passwd"])("위험한 url 은 iframe 을 만들지 않는다 : %s", (url) => {
    const d = Dialog.create({ url });
    expect(d.dialogWrapperElement.querySelector("iframe")).toBeNull();
    expect(warn).toHaveBeenCalled();
    d.destroy();
  });

  it("url 의 따옴표로 속성을 탈출할 수 없다", () => {
    const d = Dialog.create({ url: 'https://example.com/"><script>window.__xss=1</script>' });
    const frames = d.dialogWrapperElement.querySelectorAll("iframe");
    expect(frames).toHaveLength(1);
    expect(d.dialogWrapperElement.querySelector("script")).toBeNull();
    expect(Array.from(frames[0].attributes).map((a) => a.name).sort()).toEqual(["class", "src", "title"].filter((n) => frames[0].hasAttribute(n)).sort());
    d.destroy();
  });

  it.each(["https://example.com/page", "/relative/path?a=1", "page.html"])("허용되는 url 은 iframe 으로 표시한다 : %s", (url) => {
    const d = Dialog.create({ url, title: "frame" });
    const frame = d.dialogWrapperElement.querySelector("iframe.dialog-frame");
    expect(frame).not.toBeNull();
    expect(frame.getAttribute("src")).toBe(url);
    expect(frame.getAttribute("title")).toBe("frame");
    d.destroy();
  });
});
