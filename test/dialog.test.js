// 기능 · 회귀 테스트 (기존 공개 API: Daracl.dialog.create, new Dialog, 옵션, 콜백)
import Dialog, { Dialog as NamedDialog } from "../src/index";
import { resetDom, key, mouse, trackListeners } from "./helpers/dom";

const packageJson = require("../package.json");

const wrapperOf = (dlg) => dlg.dialogWrapperElement;

describe("Dialog 기본 API", () => {
  let dialogs = [];
  const make = (opts) => {
    const d = Dialog.create(opts);
    dialogs.push(d);
    return d;
  };

  afterEach(() => {
    dialogs.forEach((d) => d.destroy());
    dialogs = [];
    resetDom();
    jest.useRealTimers();
  });

  it("default export 와 named export 는 같은 클래스이고 VERSION 은 package.json 버전이다", () => {
    expect(NamedDialog).toBe(Dialog);
    expect(Dialog.VERSION).toBe(packageJson.version);
  });

  it("README 사용 예제가 그대로 동작한다 (회귀)", () => {
    const afterOpen = jest.fn();
    const ok = jest.fn();
    const dialogObj = make({
      title: "dialog",
      width: 500,
      height: "auto",
      icon: "info",
      isModal: true,
      resizable: true,
      autoOpen: false,
      template: '<a href="https://varsql.com" target="_blank">링크 이동</a>',
      buttons: [
        { label: "ok", styleClass: "info", callback: ok },
        { label: "Cancel", callback: () => dialogObj.hide() },
      ],
      afterOpen,
    });

    const wrapper = wrapperOf(dialogObj);
    expect(wrapper.classList.contains("hide")).toBe(true);
    expect(wrapper.style.width).toBe("500px");
    expect(wrapper.style.height).toBe("auto");
    expect(wrapper.querySelector(".dialog-header").textContent).toContain("dialog");
    expect(wrapper.querySelector(".dialog-body").classList.contains("info")).toBe(true);
    expect(wrapper.querySelector(".dialog-content a").getAttribute("href")).toBe("https://varsql.com");
    expect(wrapper.querySelectorAll(".resizer")).toHaveLength(8);

    dialogObj.show();
    expect(wrapper.classList.contains("hide")).toBe(false);
    expect(afterOpen).toHaveBeenCalledTimes(1);
    expect(afterOpen.mock.instances[0]).toBe(dialogObj);
    expect(document.querySelector(".daracl-dialog-overlay")).not.toBeNull();

    mouse(wrapper.querySelector(".dialog-btn-0"), "mousedown");
    expect(ok).toHaveBeenCalledTimes(1);

    mouse(wrapper.querySelector(".dialog-btn-1"), "mousedown");
    expect(wrapper.classList.contains("hide")).toBe(true);
    expect(document.querySelector(".daracl-dialog-overlay")).toBeNull();
  });

  it("autoOpen 기본값은 true 이다", () => {
    const d = make({ template: "x" });
    expect(d.isOpen()).toBe(true);
  });

  it("기존 class 구조를 유지한다", () => {
    const d = make({ title: "t", template: "x", buttons: [{ label: "a" }, { label: "b", styleClass: "danger" }] });
    const w = wrapperOf(d);
    expect(w.parentElement.id).toBe("daraclDialogHidden");
    expect(w.parentElement.className).toBe("daracl-dialog-hidden");
    // draggable 기본값(true)이면 header move 커서용 draggable 클래스가 붙는다.
    expect(w.className).toMatch(/^daracl-dialog-wrapper dd-\d+ draggable$/);
    expect(w.querySelector(":scope > .daracl-dialog > .dialog-header > .btn-area > .dialog-maximise")).not.toBeNull();
    expect(w.querySelector(".dialog-header .dialog-close")).not.toBeNull();
    expect(w.querySelector(".dialog-body > .dialog-move-overay")).not.toBeNull();
    expect(w.querySelector(".dialog-body > .dialog-content").textContent).toBe("x");
    expect(w.querySelector(".dialog-footer > .btn-area .dialog-btn-0").className).toBe("dialog-btn dialog-btn-0 success");
    expect(w.querySelector(".dialog-btn-1").className).toBe("dialog-btn dialog-btn-1 danger");
    expect(w.querySelector(".dialog-body").style.height).toBe("calc(100% - 40px - 45px)");
  });

  it("enableHeader / enableFooter / enableMaxButton / enableCloseButton 을 제어한다", () => {
    const d = make({ enableHeader: false, enableFooter: false, template: "x" });
    const w = wrapperOf(d);
    expect(w.querySelector(".dialog-header")).toBeNull();
    expect(w.querySelector(".dialog-footer")).toBeNull();
    expect(w.querySelector(".dialog-body").style.height).toBe("calc(100%)");

    const d2 = make({ enableMaxButton: false, enableCloseButton: false, template: "x" });
    const w2 = wrapperOf(d2);
    expect(w2.querySelector(".dialog-maximise")).toBeNull();
    expect(w2.querySelector(".dialog-close")).toBeNull();
    expect(w2.querySelector(".dialog-header")).not.toBeNull();
  });

  it("닫기 · 최대화 버튼이 동작한다", () => {
    const d = make({ template: "x" });
    const w = wrapperOf(d);
    w.querySelector(".dialog-maximise").click();
    expect(d.isMaximise()).toBe(true);
    d.maximise();
    expect(d.isMaximise()).toBe(false);
    w.querySelector(".dialog-close").click();
    expect(d.isOpen()).toBe(false);
  });

  it("width / height 는 숫자 · 단위 있는 문자열 · auto 를 받는다 ('150px' 가 '150pxpx' 가 되지 않는다)", () => {
    const d = make({ width: "50%", height: "150px", minWidth: 100, minHeight: "80", template: "x" });
    const s = wrapperOf(d).style;
    expect(s.width).toBe("50%");
    expect(s.height).toBe("150px");
    expect(s.minWidth).toBe("100px");
    expect(s.minHeight).toBe("80px");
  });

  it("문자열 옵션과 template 없는 옵션에서 예외가 나지 않는다", () => {
    const d = make("hello");
    expect(wrapperOf(d).querySelector(".dialog-content").textContent).toBe("hello");
    const d2 = make({ title: "no template" });
    expect(wrapperOf(d2).querySelector(".dialog-content").textContent).toBe("");
  });

  it("template 함수의 반환값(문자열 · Node)을 표시한다", () => {
    const d = make({ template: () => "<b>fn</b>" });
    expect(wrapperOf(d).querySelector(".dialog-content b").textContent).toBe("fn");
    const el = document.createElement("form");
    el.innerHTML = '<input name="q">';
    const d2 = make({ template: () => el });
    expect(wrapperOf(d2).querySelector(".dialog-content form input[name=q]")).not.toBeNull();
  });

  it("setOptions 로 기본값을 바꾼다", () => {
    Dialog.setOptions({ width: 321 });
    const d = make({ template: "x" });
    expect(wrapperOf(d).style.width).toBe("321px");
    Dialog.setOptions({ width: 400 });
  });

  it("show / hide 는 체이닝을 위해 인스턴스를 반환하고 여러 번 호출해도 안전하다", () => {
    const afterOpen = jest.fn();
    const d = make({ autoOpen: false, template: "x", afterOpen });
    expect(d.show()).toBe(d);
    expect(d.show()).toBe(d);
    expect(afterOpen).toHaveBeenCalledTimes(1);
    expect(d.hide()).toBe(d);
    expect(d.hide()).toBe(d);
  });

  it("버튼 callback 은 mousedown 과 Enter / Space 키로 호출된다", () => {
    const cb = jest.fn();
    const d = make({ template: "x", buttons: [{ label: "ok", callback: cb }] });
    const btn = wrapperOf(d).querySelector(".dialog-btn-0");
    mouse(btn, "mousedown");
    key(btn, "Enter");
    key(btn, " ");
    key(btn, "a");
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it("모달 중첩 : 나중에 연 dialog 와 overlay 가 위에 쌓이고 각각 닫힌다", () => {
    const a = make({ isModal: true, template: "a" });
    const b = make({ isModal: true, template: "b" });
    const za = Number(wrapperOf(a).style.zIndex);
    const zb = Number(wrapperOf(b).style.zIndex);
    expect(zb).toBeGreaterThan(za);
    expect(document.querySelectorAll(".daracl-dialog-overlay")).toHaveLength(2);
    expect(Number(b.dialogOverrayElement.style.zIndex)).toBeGreaterThan(za);
    expect(Number(b.dialogOverrayElement.style.zIndex)).toBeLessThan(zb);

    // 먼저 만든 a 를 다시 열면 b 보다 위로 올라온다
    a.hide();
    a.show();
    expect(Number(wrapperOf(a).style.zIndex)).toBeGreaterThan(zb);

    b.hide();
    expect(document.querySelectorAll(".daracl-dialog-overlay")).toHaveLength(1);
    a.hide();
    expect(document.querySelectorAll(".daracl-dialog-overlay")).toHaveLength(0);
  });

  it("drag : 헤더를 끌면 위치가 바뀌고, 놓으면 document 리스너가 해제된다", () => {
    jest.useFakeTimers();
    const docTracker = trackListeners(document);
    try {
      const d = make({ title: "drag", template: "x" });
      const w = wrapperOf(d);
      const header = w.querySelector(".dialog-header");
      // jsdom 은 레이아웃이 없어 크기가 0 이다. 위치 계산(dragOverflow 하한)에 쓰이는 크기를 지정한다.
      Object.defineProperty(w, "clientWidth", { configurable: true, value: 400 });
      Object.defineProperty(w, "clientHeight", { configurable: true, value: 300 });
      mouse(header, "mousedown", { clientX: 100, clientY: 100 });
      expect(w.classList.contains("move-on")).toBe(true);
      // mousemove · touchmove · mouseup · touchend · touchcancel
      expect(docTracker.count()).toBe(5);

      // 잡은 지점(100,100)에서 (150,160)으로 이동 → 왼쪽 위 = 50, 60
      mouse(document, "mousemove", { clientX: 150, clientY: 160 });
      jest.advanceTimersByTime(50);
      expect(w.style.left).toBe("50px");
      expect(w.style.top).toBe("60px");

      mouse(document, "mouseup");
      expect(w.classList.contains("move-on")).toBe(false);
      expect(docTracker.count()).toBe(0);
    } finally {
      docTracker.restore();
    }
  });

  it("drag : 한 프레임의 여러 mousemove 는 마지막 좌표로 한 번만 반영하고, 놓을 때 마지막 이동을 버리지 않는다", () => {
    jest.useFakeTimers();
    const d = make({ title: "drag", template: "x" });
    const w = wrapperOf(d);
    const header = w.querySelector(".dialog-header");
    Object.defineProperty(w, "clientWidth", { configurable: true, value: 400 });
    Object.defineProperty(w, "clientHeight", { configurable: true, value: 300 });
    mouse(header, "mousedown", { clientX: 100, clientY: 100 });
    const startLeft = w.style.left;

    const setPosition = jest.spyOn(d, "setPosition");
    mouse(document, "mousemove", { clientX: 110, clientY: 110 });
    mouse(document, "mousemove", { clientX: 120, clientY: 120 });
    mouse(document, "mousemove", { clientX: 130, clientY: 140 });
    // 프레임 전에는 반영하지 않는다.
    expect(setPosition).not.toHaveBeenCalled();
    expect(w.style.left).toBe(startLeft);
    jest.advanceTimersByTime(16);
    expect(setPosition).toHaveBeenCalledTimes(1);
    expect(w.style.left).toBe("30px");
    expect(w.style.top).toBe("40px");

    // 프레임을 기다리지 않고 바로 놓아도 마지막 좌표가 반영된다. (0.0.7 은 버려졌다)
    mouse(document, "mousemove", { clientX: 170, clientY: 180 });
    mouse(document, "mouseup");
    expect(w.style.left).toBe("70px");
    expect(w.style.top).toBe("80px");
    expect(jest.getTimerCount()).toBe(0);
    setPosition.mockRestore();
  });

  it("drag : 터치 이벤트(touchstart / touchmove / touchend)도 동작한다", () => {
    jest.useFakeTimers();
    const d = make({ title: "drag", template: "x" });
    const w = wrapperOf(d);
    const header = w.querySelector(".dialog-header");
    Object.defineProperty(w, "clientWidth", { configurable: true, value: 400 });
    Object.defineProperty(w, "clientHeight", { configurable: true, value: 300 });
    const touch = (target, type, x, y) => {
      const e = new Event(type, { bubbles: true, cancelable: true });
      const t = [{ clientX: x, clientY: y, pageX: x, pageY: y }];
      Object.defineProperty(e, "touches", { value: type === "touchend" ? [] : t });
      Object.defineProperty(e, "changedTouches", { value: t });
      target.dispatchEvent(e);
    };
    touch(header, "touchstart", 10, 10);
    touch(document, "touchmove", 60, 70);
    jest.advanceTimersByTime(50);
    expect(w.style.left).toBe("50px");
    expect(w.style.top).toBe("60px");
    touch(document, "touchend", 60, 70);
    expect(w.classList.contains("move-on")).toBe(false);
  });

  it("drag : 최대화 상태와 draggable false 에서는 이동하지 않는다", () => {
    jest.useFakeTimers();
    const d = make({ title: "t", template: "x", draggable: false });
    const w = wrapperOf(d);
    mouse(w.querySelector(".dialog-header"), "mousedown", { clientX: 10, clientY: 10 });
    expect(w.classList.contains("move-on")).toBe(false);

    const d2 = make({ title: "t", template: "x" });
    d2.maximise();
    const w2 = wrapperOf(d2);
    mouse(w2.querySelector(".dialog-header"), "mousedown", { clientX: 10, clientY: 10 });
    expect(w2.classList.contains("move-on")).toBe(false);
  });

  it("draggable : 기본은 .draggable 클래스가 붙고, false 이면 붙지 않는다 (header move 커서)", () => {
    expect(wrapperOf(make({ template: "x" })).classList.contains("draggable")).toBe(true);
    expect(wrapperOf(make({ template: "x", draggable: false })).classList.contains("draggable")).toBe(false);
  });

  it("resize : 오른쪽 아래 핸들로 크기를 바꾸고 최소 크기를 지킨다", () => {
    jest.useFakeTimers();
    const d = make({ template: "x", resizable: true, width: 400, height: 300 });
    const w = wrapperOf(d);
    expect(w.classList.contains("resizable")).toBe(true);
    Object.defineProperty(w, "clientWidth", { configurable: true, value: 400 });
    Object.defineProperty(w, "clientHeight", { configurable: true, value: 300 });

    const handle = w.querySelector(".resizer.bottom-right");
    // jsdom 의 MouseEvent 는 pageX / pageY 가 0 이므로 clientX / clientY 로 대신한다.
    Object.defineProperty(MouseEvent.prototype, "pageX", { configurable: true, get() { return this.clientX; } });
    Object.defineProperty(MouseEvent.prototype, "pageY", { configurable: true, get() { return this.clientY; } });
    try {
      mouse(handle, "mousedown", { clientX: 400, clientY: 300 });
      mouse(document, "mousemove", { clientX: 450, clientY: 320 });
      jest.advanceTimersByTime(50);
      expect(w.style.width).toBe("450px");
      expect(w.style.height).toBe("320px");

      mouse(document, "mousemove", { clientX: 0, clientY: 0 });
      jest.advanceTimersByTime(50);
      expect(w.style.width).toBe("230px");
      expect(w.style.height).toBe("130px");
      mouse(document, "mouseup");
    } finally {
      delete MouseEvent.prototype.pageX;
      delete MouseEvent.prototype.pageY;
    }
  });
});

describe("수명주기 · 리소스 정리", () => {
  afterEach(() => {
    resetDom();
    jest.useRealTimers();
  });

  it("destroy 는 DOM · overlay 를 지우고 여러 번 호출해도 안전하며, 이후 호출도 예외가 없다", () => {
    const d = Dialog.create({ isModal: true, template: "x" });
    expect(document.querySelector(".daracl-dialog-overlay")).not.toBeNull();
    d.destroy();
    expect(document.querySelector(".daracl-dialog-wrapper")).toBeNull();
    expect(document.querySelector(".daracl-dialog-overlay")).toBeNull();
    expect(() => d.destroy()).not.toThrow();
    expect(() => d.show()).not.toThrow();
    expect(() => d.hide()).not.toThrow();
    expect(() => d.maximise()).not.toThrow();
    expect(d.isMaximise()).toBe(false);
  });

  it("drag 중에 destroy 해도 document 리스너와 타이머가 남지 않는다", () => {
    jest.useFakeTimers();
    const docTracker = trackListeners(document);
    try {
      const d = Dialog.create({ title: "t", template: "x", resizable: true });
      mouse(d.dialogWrapperElement.querySelector(".dialog-header"), "mousedown", { clientX: 1, clientY: 1 });
      mouse(document, "mousemove", { clientX: 5, clientY: 5 });
      expect(docTracker.count()).toBeGreaterThan(0);
      expect(jest.getTimerCount()).toBeGreaterThan(0);
      d.destroy();
      expect(docTracker.count()).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      docTracker.restore();
    }
  });

  it("반복 생성 · 제거 후 DOM 과 리스너가 누적되지 않는다", () => {
    const docTracker = trackListeners(document);
    try {
      for (let i = 0; i < 200; i++) {
        const d = Dialog.create({ isModal: i % 2 === 0, title: "t" + i, template: "<p>x</p>", resizable: true, buttons: [{ label: "a", callback() {} }] });
        d.hide();
        d.show();
        d.destroy();
      }
      expect(document.querySelectorAll(".daracl-dialog-wrapper")).toHaveLength(0);
      expect(document.querySelectorAll(".daracl-dialog-overlay")).toHaveLength(0);
      expect(docTracker.count()).toBe(0);
    } finally {
      docTracker.restore();
    }
  });

  it("인스턴스가 등록한 이벤트는 destroy 에서 모두 해제된다", () => {
    const d = Dialog.create({ title: "t", template: "x", resizable: true, buttons: [{ label: "a" }, { label: "b" }] });
    expect(d.eventList.length).toBeGreaterThan(0);
    const removed = jest.fn();
    new Set(d.eventList.map(([el]) => el)).forEach((el) => {
      const orig = el.removeEventListener;
      el.removeEventListener = function (...args) {
        removed();
        return orig.apply(this, args);
      };
    });
    const n = d.eventList.length;
    d.destroy();
    expect(removed).toHaveBeenCalledTimes(n);
  });

  it("addEvent 는 같은 대상 · 이벤트 · 핸들러를 중복 등록하지 않는다", () => {
    const d = Dialog.create({ template: "x" });
    const fn = jest.fn();
    d.addEvent(document, "click", fn);
    d.addEvent(document, "click", fn);
    document.body.click();
    expect(fn).toHaveBeenCalledTimes(1);
    d.removeEvent(document, "click", fn);
    document.body.click();
    expect(fn).toHaveBeenCalledTimes(1);
    d.destroy();
  });

  it("외부에서 overlay 를 지워도 hide 에서 예외가 나지 않는다", () => {
    const d = Dialog.create({ isModal: true, template: "x" });
    d.dialogOverrayElement.remove();
    expect(() => d.hide()).not.toThrow();
    d.destroy();
  });
});

describe("테마", () => {
  afterEach(resetDom);

  it("theme 옵션과 setTheme 은 wrapper / overlay 의 data-daracl-theme 를 바꾼다", () => {
    const d = Dialog.create({ isModal: true, theme: "dark", template: "x" });
    expect(d.dialogWrapperElement.getAttribute("data-daracl-theme")).toBe("dark");
    expect(d.dialogOverrayElement.getAttribute("data-daracl-theme")).toBe("dark");
    expect(d.setTheme("light")).toBe(d);
    expect(d.dialogWrapperElement.getAttribute("data-daracl-theme")).toBe("light");
    d.setTheme();
    expect(d.dialogWrapperElement.hasAttribute("data-daracl-theme")).toBe(false);
    expect(d.dialogOverrayElement.hasAttribute("data-daracl-theme")).toBe(false);
    d.destroy();
  });

  it("theme 을 지정하지 않으면 속성을 붙이지 않는다 (상위 요소의 테마를 따른다)", () => {
    const d = Dialog.create({ template: "x" });
    expect(d.dialogWrapperElement.hasAttribute("data-daracl-theme")).toBe(false);
    d.destroy();
  });
});
