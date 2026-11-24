// 접근성 테스트 : ARIA, 키보드, focus 이동 / 복원 / trap, ESC
// 스크린리더 실제 낭독은 자동 검증할 수 없다. 여기서는 스크린리더가 읽는 ARIA 속성만 검증한다.
import Dialog from "../src/index";
import { resetDom, key } from "./helpers/dom";

describe("ARIA", () => {
  afterEach(resetDom);

  it("wrapper 에 role=dialog, 모달이면 aria-modal, 제목이 aria-label 이 된다", () => {
    const d = Dialog.create({ title: "사용자 정보", isModal: true, template: "x" });
    const w = d.dialogWrapperElement;
    expect(w.getAttribute("role")).toBe("dialog");
    expect(w.getAttribute("aria-modal")).toBe("true");
    expect(w.getAttribute("aria-label")).toBe("사용자 정보");
    expect(w.getAttribute("tabindex")).toBe("-1");
    d.destroy();

    const d2 = Dialog.create({ template: "x" });
    expect(d2.dialogWrapperElement.hasAttribute("aria-modal")).toBe(false);
    expect(d2.dialogWrapperElement.hasAttribute("aria-label")).toBe(false);
    d2.destroy();
  });

  it("닫기 · 최대화 · 하단 버튼은 role=button 과 tabindex=0, 이름(aria-label / 텍스트)을 가진다", () => {
    const d = Dialog.create({ title: "t", template: "x", buttons: [{ label: "확인" }] });
    const w = d.dialogWrapperElement;
    const close = w.querySelector(".dialog-close");
    const max = w.querySelector(".dialog-maximise");
    const btn = w.querySelector(".dialog-btn-0");
    [close, max, btn].forEach((el) => {
      expect(el.getAttribute("role")).toBe("button");
      expect(el.getAttribute("tabindex")).toBe("0");
    });
    expect(close.getAttribute("aria-label")).toBe("Close");
    expect(max.getAttribute("aria-label")).toBe("Maximize");
    expect(btn.textContent).toBe("확인");
    d.destroy();
  });
});

describe("키보드 · 포커스", () => {
  let opener;
  beforeEach(() => {
    opener = document.createElement("button");
    opener.textContent = "open";
    document.body.appendChild(opener);
    opener.focus();
  });
  afterEach(resetDom);

  it("열리면 본문의 첫 포커스 요소로 이동하고, 닫히면 열기 전 요소로 복원한다", () => {
    const d = Dialog.create({ autoOpen: false, template: '<input id="first"><input id="second">', buttons: [{ label: "ok" }] });
    d.show();
    expect(document.activeElement.id).toBe("first");
    d.hide();
    expect(document.activeElement).toBe(opener);
    d.destroy();
  });

  it("본문에 포커스 요소가 없으면 하단 버튼, 그것도 없으면 dialog 자체로 이동한다", () => {
    const d = Dialog.create({ template: "text", buttons: [{ label: "ok" }] });
    expect(document.activeElement.classList.contains("dialog-btn-0")).toBe(true);
    d.destroy();
    expect(document.activeElement).toBe(opener);

    const d2 = Dialog.create({ template: "text", enableFooter: false });
    expect(document.activeElement).toBe(d2.dialogWrapperElement);
    d2.destroy();
  });

  it("autoFocus: false 이면 포커스를 옮기지 않는다", () => {
    const d = Dialog.create({ template: "<input>", autoFocus: false });
    expect(document.activeElement).toBe(opener);
    d.destroy();
  });

  it("ESC 로 닫힌다 (closeOnEscape 기본 true)", () => {
    const d = Dialog.create({ template: "<input>" });
    key(document.activeElement, "Escape");
    expect(d.isOpen()).toBe(false);
    expect(document.activeElement).toBe(opener);
    d.destroy();
  });

  it("closeOnEscape: false 또는 enableCloseButton: false 이면 ESC 로 닫히지 않는다", () => {
    const d = Dialog.create({ template: "<input>", closeOnEscape: false });
    key(document.activeElement, "Escape");
    expect(d.isOpen()).toBe(true);
    d.destroy();

    const d2 = Dialog.create({ template: "<input>", enableCloseButton: false });
    key(document.activeElement, "Escape");
    expect(d2.isOpen()).toBe(true);
    d2.destroy();
  });

  it("중첩 dialog 에서 ESC 는 포커스가 있는 위쪽 dialog 만 닫는다", () => {
    const a = Dialog.create({ isModal: true, template: '<input id="a">' });
    const b = Dialog.create({ isModal: true, template: '<input id="b">' });
    expect(document.activeElement.id).toBe("b");
    key(document.activeElement, "Escape");
    expect(b.isOpen()).toBe(false);
    expect(a.isOpen()).toBe(true);
    expect(document.activeElement.id).toBe("a");
    a.destroy();
    b.destroy();
  });

  it("모달은 Tab / Shift+Tab 포커스를 dialog 안에 가둔다", () => {
    const d = Dialog.create({ isModal: true, title: "t", template: '<input id="i1">', buttons: [{ label: "ok" }] });
    const w = d.dialogWrapperElement;
    const focusable = d.getFocusableElements();
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    expect(first.classList.contains("dialog-maximise")).toBe(true);
    expect(last.classList.contains("dialog-btn-0")).toBe(true);

    last.focus();
    const e1 = key(last, "Tab");
    expect(e1.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);

    const e2 = key(first, "Tab", { shiftKey: true });
    expect(e2.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);

    // 중간 요소에서는 브라우저 기본 동작에 맡긴다
    const middle = w.querySelector("#i1");
    middle.focus();
    expect(key(middle, "Tab").defaultPrevented).toBe(false);
    d.destroy();
  });

  it("모달이 아니면 Tab 을 가두지 않는다", () => {
    const d = Dialog.create({ template: '<input id="only">', enableHeader: false, enableFooter: false });
    const input = d.dialogWrapperElement.querySelector("#only");
    input.focus();
    expect(key(input, "Tab").defaultPrevented).toBe(false);
    d.destroy();
  });

  it("닫기 · 최대화 버튼은 Enter / Space 로 동작한다", () => {
    const d = Dialog.create({ title: "t", template: "x" });
    const w = d.dialogWrapperElement;
    key(w.querySelector(".dialog-maximise"), "Enter");
    expect(d.isMaximise()).toBe(true);
    key(w.querySelector(".dialog-maximise"), " ");
    expect(d.isMaximise()).toBe(false);
    key(w.querySelector(".dialog-close"), "Enter");
    expect(d.isOpen()).toBe(false);
    d.destroy();
  });
});
