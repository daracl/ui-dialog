import { isSafeUrl, sanitizeHtml } from "@daracl/core/utils";

let DIALOG_IDX = 0;

// show 할 때마다 증가하는 쌓임 순서. 나중에 연 dialog 가 항상 위에 표시되도록 z-index 계산에 쓴다.
let STACK_SEQ = 0;

const HIDDEN_ELEMENT_ID = "daraclDialogHidden";

const THEME_ATTRIBUTE = "data-daracl-theme";

const iconStyleMap = {
  primary: "primary",
  secondary: "secondary",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
};

// focus trap 에서 사용하는 포커스 가능한 요소
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "[contenteditable=true]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * 하단 버튼 옵션
 * @typedef {Object} DialogButton
 * @property {string | Node} label - 버튼명. 문자열이면 core 의 sanitizeHtml 을 거쳐 표시한다.
 * @property {string} [styleClass] - 버튼 class (기본 success). (primary, secondary, info, success, warning, danger 또는 사용자 class)
 * @property {(e: Event) => void} [callback] - 클릭(mousedown) 또는 Enter / Space 키 입력시 호출
 */

/**
 * HTML 정리 방식
 * - 지정 안 함(기본) : title · button label 은 sanitizeHtml, template 은 신뢰된 HTML 로 그대로 표시
 * - true : title · button label · template 모두 sanitizeHtml
 * - false : 모두 그대로 표시 (0.0.7 이전 동작. 신뢰된 값에만 사용)
 * - function : 앱이 지정한 sanitizer 를 모두에 사용 (반환값이 Node 이면 그대로 추가)
 * @typedef {boolean | ((html: string) => string | Node)} DialogSanitize
 */

/**
 * 다이얼로그 옵션
 * @typedef {Object} DialogOptions
 * @property {string | Node} [title] - 제목
 * @property {string | Node | (() => string | Node)} [template] - 본문. 문자열은 신뢰된 HTML 로 취급한다 (sanitize 옵션 참고)
 * @property {string} [url] - iframe 으로 표시할 주소. http, https, mailto, tel, 상대 경로만 허용한다
 * @property {string | number} [width = 400] - 넓이
 * @property {string | number} [height = 300] - 높이
 * @property {string} [styleClass] - css class
 * @property {boolean} [isModal = false] - 모달 사용여부
 * @property {string} [icon = ""] - icon primary, secondary, info, success, warning, danger
 * @property {boolean} [autoOpen = true] - 자동 열기 여부
 * @property {boolean} [draggable = true] - drag 가능여부
 * @property {boolean} [resizable = false] - 창 리사이즈 여부
 * @property {boolean} [enableHeader = true] - 헤더 영역 보일지 여부
 * @property {boolean} [enableFooter = true] - 하단 버튼 영역 보일지 여부
 * @property {boolean} [enableMaxButton = true] - 최대화 버튼
 * @property {boolean} [enableCloseButton = true] - 닫기 버튼 활성화 여부
 * @property {boolean} [closeOnEscape = true] - ESC 키로 닫기 (enableCloseButton 이 false 이면 동작하지 않는다)
 * @property {boolean} [autoFocus = true] - 열릴 때 dialog 안으로 포커스 이동, 닫힐 때 이전 요소로 포커스 복원
 * @property {DialogSanitize} [sanitize] - HTML 정리 방식
 * @property {string} [theme] - dialog 별 테마 (light, dark). 지정하지 않으면 상위 요소의 data-daracl-theme 를 따른다
 * @property {number} [minHeight = 130] - 최소 높이
 * @property {number} [minWidth = 230] - 최소 넓이
 * @property {number} [zIndex = 10000] - css z-index
 * @property {boolean} [dragOverflow = true] - drag 시 창 밖으로 넘어갈 수 있는지 여부
 * @property {DialogButton[]} [buttons = []] - dialog 하단 버튼
 * @property {number} [moveDelay = 15] - requestAnimationFrame 이 없는 환경에서만 쓰는 drag / resize 갱신 간격(ms). 일반 브라우저는 화면 갱신 주기마다 반영한다
 * @property {false | ((this: Dialog, element: HTMLElement) => void)} [afterOpen = false] - 오픈후 호출
 */

/** @type {DialogOptions} */
let defaultOptions = {
  width: 400,
  height: 300,
  styleClass: "",
  isModal: false,
  icon: "", // info,
  // 자동 열기 여부
  autoOpen: true,
  // drag 가능여부
  draggable: true,
  // 창 리사이즈 여부
  resizable: false,
  // 헤더 영역 보일지 여부
  enableHeader: true,
  // 하단 버튼 영역 보일지 여부
  enableFooter: true,
  // 최대화 버튼
  enableMaxButton: true,
  //  닫기 버튼 활성화 여부
  enableCloseButton: true,
  // ESC 로 닫기
  closeOnEscape: true,
  // 포커스 이동 / 복원
  autoFocus: true,
  // 최소 높이
  minHeight: 130,
  //  최소 넓이
  minWidth: 230,
  // css z-index
  zIndex: 10000,
  dragOverflow: true,
  buttons: [],
  moveDelay: 15,
  afterOpen: false, // open 후 호출 메소드
};

function dialogHiddenElement() {
  let hiddenElement = document.getElementById(HIDDEN_ELEMENT_ID);
  if (hiddenElement == null) {
    hiddenElement = document.createElement("div");
    hiddenElement.id = HIDDEN_ELEMENT_ID;
    hiddenElement.className = "daracl-dialog-hidden";
    document.body.appendChild(hiddenElement);
  }

  return hiddenElement;
}

/**
 * css 길이 값. 숫자 · 숫자 문자열은 px 를 붙이고 "auto", "50%", "150px" 같은 값은 그대로 쓴다.
 * @param {string | number | undefined} value
 * @returns {string}
 */
function toCssLength(value) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "number" || /^\d+(\.\d+)?$/.test(String(value))) return value + "px";
  return String(value);
}

/**
 * 공백으로 구분된 class 문자열을 classList 에 추가한다. (class 속성 문자열을 직접 만들지 않는다)
 * @param {Element} element
 * @param {string | undefined} className
 */
function addClassNames(element, className) {
  if (typeof className !== "string") return;
  className
    .split(/\s+/)
    .filter((name) => name !== "")
    .forEach((name) => element.classList.add(name));
}

/**
 * 키보드로 버튼 동작 (Enter, Space)
 * @param {KeyboardEvent} e
 */
function isActivateKey(e) {
  return e.key === "Enter" || e.key === " " || e.key === "Spacebar";
}

/**
 * mouse / touch 이벤트의 좌표
 * @param {*} e MouseEvent, TouchEvent 또는 좌표 객체
 * @returns {{clientX: number, clientY: number, pageX: number, pageY: number}}
 */
function eventPoint(e) {
  const touch = e.touches && e.touches[0] ? e.touches[0] : e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e;
  return { clientX: touch.clientX, clientY: touch.clientY, pageX: touch.pageX, pageY: touch.pageY };
}

/**
 * dialog 모듈
 *
 * @export
 * @class Dialog
 */
export default class Dialog {
  static VERSION = APP_VERSION;

  /**
   * @param {DialogOptions | string} options 옵션. 문자열이면 template 으로 쓴다.
   */
  constructor(options) {
    if (typeof options === "string") {
      // items 는 0.0.7 의 값(쓰이지 않음)을 호환용으로 남긴다.
      options = /** @type {DialogOptions} */ ({ template: options, items: options });
    }

    /** @type {DialogOptions} */
    this.options = Object.assign({}, defaultOptions, options);
    this.idx = DIALOG_IDX += 1;

    /** 등록한 이벤트 (destroy 에서 모두 해제한다) @type {Array<[EventTarget, string, EventListener]>} */
    this.eventList = [];
    /** drag / resize 지연 타이머 @type {Set<ReturnType<typeof setTimeout>>} */
    this.timerSet = new Set();
    /** drag / resize 화면 갱신 요청(requestAnimationFrame) id @type {Set<number>} */
    this.frameSet = new Set();

    const dialogWrapperElement = document.createElement("div");
    dialogWrapperElement.className = `daracl-dialog-wrapper hide dd-${DIALOG_IDX}`;
    dialogWrapperElement.setAttribute("role", "dialog");
    dialogWrapperElement.setAttribute("tabindex", "-1");
    if (this.options.isModal === true) {
      dialogWrapperElement.setAttribute("aria-modal", "true");
    }
    const style = dialogWrapperElement.style;
    style.zIndex = String(this.options.zIndex + DIALOG_IDX);
    style.width = toCssLength(this.options.width);
    style.height = toCssLength(this.options.height);
    style.minHeight = toCssLength(this.options.minHeight);
    style.minWidth = toCssLength(this.options.minWidth);

    dialogHiddenElement().appendChild(dialogWrapperElement);
    /** @type {HTMLDivElement} */
    this.dialogWrapperElement = dialogWrapperElement;

    this.setTheme(this.options.theme);

    this.dialogTemplate();

    this.addEvent(dialogWrapperElement, "keydown", this.onKeydown);

    if (this.options.draggable !== false) {
      // header 의 move 커서는 .draggable 일 때만 적용된다.
      dialogWrapperElement.classList.add("draggable");
      this.initDrag();
    }

    if (this.options.resizable === true) {
      dialogWrapperElement.classList.add("resizable");
      this.initResize();
    }

    if (this.options.autoOpen !== false) {
      this.show();
    }
  }

  /**
   * @param {DialogOptions | string} options
   * @returns {Dialog}
   */
  static create(options) {
    return new Dialog(options);
  }

  /**
   * default options 셋팅
   *
   * @static
   * @param {DialogOptions} options
   */
  static setOptions(options) {
    defaultOptions = Object.assign({}, defaultOptions, options);
  }

  /**
   * 문자열 HTML 을 sanitize 옵션에 따라 target 에 추가한다.
   *
   * @param {Element} target 추가할 요소
   * @param {string | number | Node | null | undefined} value 내용
   * @param {boolean} trusted template 처럼 기본적으로 신뢰된 HTML 로 취급하는 값인지 여부
   */
  appendHtml(target, value, trusted) {
    if (value === undefined || value === null) return;

    if (typeof Node !== "undefined" && value instanceof Node) {
      target.appendChild(value);
      return;
    }

    const html = String(value);
    const sanitize = this.options.sanitize;

    if (typeof sanitize === "function") {
      const result = sanitize(html);
      if (typeof Node !== "undefined" && result instanceof Node) {
        target.appendChild(result);
      } else {
        target.insertAdjacentHTML("beforeend", result == null ? "" : String(result));
      }
      return;
    }

    if (sanitize === false || (trusted && sanitize !== true)) {
      // 신뢰 경계: 앱이 직접 만든 HTML 만 전달해야 한다. (README "HTML 보안" 참고)
      target.insertAdjacentHTML("beforeend", html);
      return;
    }

    target.appendChild(sanitizeHtml(html));
  }

  /**
   * 포커스 가능한 요소 목록
   * @returns {HTMLElement[]}
   */
  getFocusableElements() {
    if (!this.dialogWrapperElement) return [];
    return Array.prototype.slice.call(this.dialogWrapperElement.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => !el.closest(".resizer"));
  }

  /**
   * ESC 닫기, 모달일 때 Tab focus trap
   * @param {KeyboardEvent} e
   */
  onKeydown = (e) => {
    if (!this.options) return;

    if ((e.key === "Escape" || e.key === "Esc") && this.options.closeOnEscape !== false && this.options.enableCloseButton !== false) {
      e.stopPropagation();
      this.hide();
      return;
    }

    if (e.key === "Tab" && this.options.isModal === true) {
      const focusable = this.getFocusableElements();
      if (focusable.length === 0) {
        e.preventDefault();
        this.dialogWrapperElement.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === this.dialogWrapperElement)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  /**
   * 지연 실행 타이머 등록 (destroy 에서 정리한다)
   * @param {() => void} fn
   * @param {number} delay
   * @returns {ReturnType<typeof setTimeout>}
   */
  setTimer(fn, delay) {
    const timer = setTimeout(() => {
      this.timerSet.delete(timer);
      fn();
    }, delay);
    this.timerSet.add(timer);
    return timer;
  }

  /** @param {ReturnType<typeof setTimeout> | undefined} timer */
  clearTimer(timer) {
    if (timer === undefined) return;
    clearTimeout(timer);
    this.timerSet.delete(timer);
  }

  /**
   * 마우스 / 터치 이동을 화면 갱신 주기(requestAnimationFrame)마다 한 번만 반영한다.
   * 한 프레임 안의 여러 move 이벤트는 마지막 좌표만 쓰고, flush 는 남은 좌표를 바로 반영한다 (놓을 때 마지막 이동 유지).
   * requestAnimationFrame 이 없는 환경에서는 moveDelay(ms) 타이머로 대신한다.
   * @param {(point: {clientX: number, clientY: number, pageX: number, pageY: number}) => void} apply
   */
  createFrameUpdater(apply) {
    /** @type {{clientX: number, clientY: number, pageX: number, pageY: number} | null} */
    let pending = null;
    let frame = 0;
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let timer;

    const cancel = () => {
      if (frame) {
        cancelAnimationFrame(frame);
        this.frameSet.delete(frame);
        frame = 0;
      }
      this.clearTimer(timer);
      timer = undefined;
    };

    const run = () => {
      cancel();
      const point = pending;
      pending = null;
      if (point && this.dialogWrapperElement) {
        apply(point);
      }
    };

    return {
      /** @param {{clientX: number, clientY: number, pageX: number, pageY: number}} point */
      request: (point) => {
        pending = point;
        if (frame || timer !== undefined) return;

        if (typeof requestAnimationFrame === "function") {
          const id = requestAnimationFrame(() => {
            this.frameSet.delete(id);
            frame = 0;
            run();
          });
          frame = id;
          this.frameSet.add(id);
        } else {
          timer = this.setTimer(() => {
            timer = undefined;
            run();
          }, Math.max(this.options.moveDelay || 0, 0));
        }
      },
      flush: run,
    };
  }

  /** 사이즈 조절 초기화 */
  initResize() {
    const dialogElement = this.dialogWrapperElement;
    const reslzeElement = this.dialogWrapperElement.querySelectorAll(".resizer");

    let dialogWidth, dialogHeight;
    let startX, startY;
    let moveMode = "";
    let offsetX = -1,
      offsetY = -1;

    let isResizeTop, isResizeLeft;

    this.addEvent(reslzeElement, "mousedown touchstart", (e) => {
      if (this.isMaximise()) {
        return false;
      }

      moveMode = /** @type {HTMLElement} */ (e.currentTarget).getAttribute("data-mode") || "";

      isResizeTop = moveMode.indexOf("t") > -1;
      isResizeLeft = moveMode.indexOf("l") > -1;

      offsetX = isResizeLeft ? dialogElement.getBoundingClientRect().left : -1;
      offsetY = isResizeTop ? dialogElement.getBoundingClientRect().top : -1;

      e.preventDefault();

      const point = eventPoint(e);

      startX = point.pageX;
      startY = point.pageY;

      dialogWidth = dialogElement.clientWidth;
      dialogHeight = dialogElement.clientHeight;

      if (!dialogElement.classList.contains("transform-disable")) {
        const rect = dialogElement.getBoundingClientRect();

        this.setPosition(point, point.clientX - rect.left, point.clientY - rect.top, dialogWidth, dialogHeight);

        dialogElement.classList.add("transform-disable");
      }

      this.addEvent(document, "mousemove touchmove", onResizeMouseMove);

      this.addEvent(document, "mouseup touchend touchcancel", onResizeMouseUp);
    });
    const resizeFrame = this.createFrameUpdater((point) => {
      let moveX = point.pageX - startX,
        moveY = point.pageY - startY;

      moveY = isResizeTop ? moveY * -1 : moveY;
      moveX = isResizeLeft ? moveX * -1 : moveX;

      let resizeHeight = dialogHeight + moveY,
        resizeWidth = dialogWidth + moveX;

      if (this.options.minHeight >= resizeHeight) {
        resizeHeight = this.options.minHeight;
        moveY = (dialogHeight - resizeHeight) * -1;
      }

      if (this.options.minWidth >= resizeWidth) {
        resizeWidth = this.options.minWidth;
        moveX = (dialogWidth - resizeWidth) * -1;
      }

      let topVal = -1;
      if (isResizeTop) {
        topVal = offsetY - moveY;
        if (topVal <= 0) {
          topVal = 0;
          resizeHeight = dialogHeight + offsetY;
        }
        dialogElement.style.top = topVal + "px";
      }

      let leftVal = -1;
      if (isResizeLeft) {
        leftVal = offsetX - moveX;
        if (leftVal <= 0) {
          leftVal = 0;
          resizeWidth = dialogWidth + offsetX;
        }
        dialogElement.style.left = leftVal + "px";
      }

      if (moveMode != "b" && moveMode != "t") {
        dialogElement.style.width = resizeWidth + "px";
      }

      if (moveMode != "r" && moveMode != "l") {
        dialogElement.style.height = resizeHeight + "px";
      }
    });

    const onResizeMouseMove = (e) => {
      resizeFrame.request(eventPoint(e));
    };

    const onResizeMouseUp = () => {
      // 놓기 직전의 마지막 이동을 버리지 않고 반영한다.
      resizeFrame.flush();
      this.removeEvent(document, "mousemove touchmove", onResizeMouseMove);
      this.removeEvent(document, "mouseup touchend touchcancel", onResizeMouseUp);
    };
  }

  /**
   * init drag
   */
  initDrag() {
    const dialogElement = this.dialogWrapperElement;
    const dragElement = this.dialogWrapperElement.querySelector(".dialog-header");

    if (!dragElement) return;

    let isDragging = false;

    let offsetX, offsetY, dialogWidth, dialogHeight;

    let isDrag = false;

    this.addEvent(dragElement, "mousedown touchstart", (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      const tagName = target.tagName || "";

      if (tagName.search(/(input|textarea|select|button)/gi) > -1) {
        return true;
      }

      // 최대화 / 닫기 버튼은 drag 를 시작하지 않는다.
      if (target.closest && target.closest(".btn-area")) {
        return true;
      }

      if (this.isMaximise()) {
        return false;
      }

      e.preventDefault();

      const point = eventPoint(e);
      const rect = dialogElement.getBoundingClientRect();

      dialogWidth = dialogElement.clientWidth;
      dialogHeight = dialogElement.clientHeight;

      isDragging = true;
      offsetX = point.clientX - rect.left;
      offsetY = point.clientY - rect.top;

      if (!isDrag) {
        this.setPosition(point, offsetX, offsetY, dialogWidth, dialogHeight);

        isDrag = true;
        dialogElement.classList.add("transform-disable");
      }

      dialogElement.classList.add("move-on");

      this.addEvent(document, "mousemove touchmove", onMouseMove);

      this.addEvent(document, "mouseup touchend touchcancel", onMouseUp);
    });
    const dragFrame = this.createFrameUpdater((point) => {
      this.setPosition(point, offsetX, offsetY, dialogWidth, dialogHeight);
    });

    const onMouseMove = (e) => {
      if (isDragging) {
        dragFrame.request(eventPoint(e));
      }
    };

    const onMouseUp = () => {
      // 놓기 직전의 마지막 이동을 버리지 않고 반영한다. (0.0.7 에서는 마지막 지연 이동이 버려졌다)
      dragFrame.flush();
      isDragging = false;

      dialogElement.classList.remove("move-on");
      this.removeEvent(document, "mousemove touchmove", onMouseMove);
      this.removeEvent(document, "mouseup touchend touchcancel", onMouseUp);
    };
  }

  /**
   * dialog position
   *
   * @param {{clientX: number, clientY: number}} e event 또는 좌표
   * @param {Number} offsetX offset x
   * @param {Number} offsetY offset y
   * @param {Number} dialogWidth dialog width
   * @param {Number} dialogHeight dialog height
   */
  setPosition(e, offsetX, offsetY, dialogWidth, dialogHeight) {
    let minX, minY;
    if (this.options.dragOverflow === false) {
      minX = Math.min(Math.max(e.clientX - offsetX, 0), window.innerWidth - dialogWidth);
      minY = Math.min(Math.max(e.clientY - offsetY, 0), window.innerHeight - dialogHeight);
    } else {
      minX = Math.min(Math.max(e.clientX - offsetX, (dialogWidth - 80) * -1), window.innerWidth - 80);

      minY = Math.min(Math.max(e.clientY - offsetY, 0), window.innerHeight - 30);
    }

    this.dialogWrapperElement.style.left = minX + "px";
    this.dialogWrapperElement.style.top = minY + "px";
  }

  /**
   * span 버튼에 role / tabindex / 키보드 동작을 붙인다.
   * @param {HTMLElement} element
   * @param {string} eventName 마우스 이벤트 이름 (기존 동작 유지: 닫기 · 최대화는 click, 하단 버튼은 mousedown)
   * @param {(e: Event) => void} handler
   */
  bindButton(element, eventName, handler) {
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");
    this.addEvent(element, eventName, handler);
    this.addEvent(element, "keydown", (e) => {
      if (isActivateKey(/** @type {KeyboardEvent} */ (e))) {
        e.preventDefault();
        handler(e);
      }
    });
  }

  dialogTemplate() {
    const options = this.options;
    const enableHeader = options.enableHeader !== false;
    const enableFooter = options.enableFooter !== false;
    const dialog = document.createElement("div");

    dialog.className = "daracl-dialog";
    addClassNames(dialog, options.styleClass ?? "");

    if (enableHeader) {
      const header = document.createElement("div");
      header.className = "dialog-header";
      this.appendHtml(header, options.title ?? "", false);

      const label = (header.textContent || "").trim();
      if (label !== "") {
        this.dialogWrapperElement.setAttribute("aria-label", label);
      }

      const btnArea = document.createElement("div");
      btnArea.className = "btn-area";

      if (options.enableMaxButton) {
        const maxButton = document.createElement("span");
        maxButton.className = "dialog-maximise";
        maxButton.setAttribute("aria-label", "Maximize");
        maxButton.setAttribute("title", "Maximize");
        btnArea.appendChild(maxButton);
      }

      if (options.enableCloseButton) {
        const closeButton = document.createElement("span");
        closeButton.className = "dialog-close";
        closeButton.setAttribute("aria-label", "Close");
        closeButton.setAttribute("title", "Close");
        btnArea.appendChild(closeButton);
      }

      header.appendChild(btnArea);
      dialog.appendChild(header);
    }

    const body = document.createElement("div");
    body.className = "dialog-body";
    if (Object.prototype.hasOwnProperty.call(iconStyleMap, options.icon)) {
      body.classList.add(iconStyleMap[options.icon]);
    }
    body.style.height = `calc(100%${enableHeader ? " - 40px" : ""}${enableFooter ? " - 45px" : ""})`;

    const moveOverlay = document.createElement("div");
    moveOverlay.className = "dialog-move-overay";
    body.appendChild(moveOverlay);

    const content = document.createElement("div");
    content.className = "dialog-content";
    body.appendChild(content);

    if (options.url) {
      const url = String(options.url);
      if (isSafeUrl(url)) {
        const frame = document.createElement("iframe");
        frame.className = "dialog-frame";
        // 속성 문자열을 만들지 않고 DOM 속성으로 지정한다.
        frame.src = url;
        if (typeof options.title === "string") frame.title = (this.dialogWrapperElement.getAttribute("aria-label") || "").slice(0, 200);
        content.appendChild(frame);
      } else {
        console.warn("[daracl.dialog] unsafe url blocked : " + url.slice(0, 100));
      }
    } else if (typeof options.template === "function") {
      this.appendHtml(content, options.template(), true);
    } else {
      this.appendHtml(content, options.template, true);
    }

    dialog.appendChild(body);

    // footer
    const buttons = options.buttons ?? [];

    if (enableFooter) {
      const footer = document.createElement("div");
      footer.className = "dialog-footer";
      const btnArea = document.createElement("div");
      btnArea.className = "btn-area";

      for (let i = 0; i < buttons.length; i++) {
        const button = /** @type {DialogButton} */ (buttons[i] ?? {});
        const btnElement = document.createElement("span");
        btnElement.className = `dialog-btn dialog-btn-${i}`;
        addClassNames(btnElement, button.styleClass ?? "success");
        this.appendHtml(btnElement, button.label ?? "", false);

        this.bindButton(btnElement, "mousedown", (e) => {
          if (typeof button.callback === "function") {
            button.callback(e);
          }
        });

        btnArea.appendChild(btnElement);
      }

      footer.appendChild(btnArea);
      dialog.appendChild(footer);
    }

    if (options.resizable === true) {
      [
        ["top", "t"],
        ["left", "l"],
        ["right", "r"],
        ["bottom", "b"],
        ["top-left", "tl"],
        ["top-right", "tr"],
        ["bottom-left", "bl"],
        ["bottom-right", "br"],
      ].forEach(([className, mode]) => {
        const resizer = document.createElement("div");
        resizer.className = `resizer ${className}`;
        resizer.setAttribute("data-mode", mode);
        dialog.appendChild(resizer);
      });
    }

    this.dialogWrapperElement.appendChild(dialog); // Append the dialog element

    const maxButton = /** @type {HTMLElement | null} */ (dialog.querySelector(".dialog-header .dialog-maximise"));
    if (maxButton) {
      this.bindButton(maxButton, "click", () => {
        this.maximise();
      });
    }

    const closeButton = /** @type {HTMLElement | null} */ (dialog.querySelector(".dialog-header .dialog-close"));
    if (closeButton) {
      this.bindButton(closeButton, "click", () => {
        this.hide();
      });
    }
  }

  /**
   * dialog 별 테마 지정. 빈 값이면 해제하고 상위 요소의 data-daracl-theme 를 따른다.
   *
   * @param {string} [themeName] light, dark
   * @returns {Dialog}
   */
  setTheme(themeName) {
    if (!this.dialogWrapperElement) return this;

    this.themeName = themeName ? String(themeName) : "";

    [this.dialogWrapperElement, this.dialogOverrayElement].forEach((element) => {
      if (!element) return;
      if (this.themeName) {
        element.setAttribute(THEME_ATTRIBUTE, this.themeName);
      } else {
        element.removeAttribute(THEME_ATTRIBUTE);
      }
    });

    return this;
  }

  /**
   * dialog 가 보이는지 여부
   * @returns {boolean}
   */
  isOpen() {
    return !!this.dialogWrapperElement && !this.dialogWrapperElement.classList.contains("hide");
  }

  /**
   * show dialog message
   * @returns {Dialog}
   */
  show = () => {
    if (!this.dialogWrapperElement || !this.dialogWrapperElement.classList.contains("hide")) {
      return this;
    }

    STACK_SEQ = Math.max(STACK_SEQ, DIALOG_IDX) + 2;
    const zIndex = this.options.zIndex + STACK_SEQ;

    /** 열기 전에 포커스가 있던 요소 @type {HTMLElement | null} */
    this.returnFocusElement = typeof document !== "undefined" ? /** @type {HTMLElement | null} */ (document.activeElement) : null;

    this.dialogWrapperElement.style.zIndex = String(zIndex);
    this.dialogWrapperElement.classList.remove("hide");

    if (this.options.isModal === true) {
      this.removeDialogOverrayElement();
      const dialogOverrayElement = document.createElement("div");
      dialogOverrayElement.className = "daracl-dialog-overlay";
      dialogOverrayElement.style.zIndex = String(zIndex - 1);
      if (this.themeName) {
        dialogOverrayElement.setAttribute(THEME_ATTRIBUTE, this.themeName);
      }

      const hiddenElement = dialogHiddenElement();
      const firstChild = hiddenElement.firstChild;

      if (firstChild) {
        hiddenElement.insertBefore(dialogOverrayElement, firstChild);
      } else {
        hiddenElement.appendChild(dialogOverrayElement);
      }

      this.dialogOverrayElement = dialogOverrayElement;
    }

    if (this.options.autoFocus !== false) {
      const focusable = this.getFocusableElements();
      const contentFirst = focusable.find((el) => el.closest(".dialog-content")) || focusable.find((el) => el.closest(".dialog-footer"));
      const target = contentFirst || this.dialogWrapperElement;
      try {
        target.focus({ preventScroll: true });
      } catch (e) {
        target.focus();
      }
    }

    if (typeof this.options.afterOpen === "function") {
      this.options.afterOpen.call(this, this.dialogWrapperElement);
    }

    return this;
  };

  /**
   * dialog hide
   * @returns {Dialog}
   */
  hide = () => {
    if (!this.dialogWrapperElement) return this;

    const wasOpen = this.isOpen();
    const hadFocus = this.dialogWrapperElement.contains(document.activeElement);

    this.dialogWrapperElement.classList.add("hide");

    if (this.options.isModal === true) {
      this.removeDialogOverrayElement();
    }

    if (wasOpen) {
      this.restoreFocus(hadFocus);
    }

    return this;
  };

  /**
   * 열기 전에 포커스가 있던 요소로 되돌린다.
   * @param {boolean} hadFocus 포커스가 dialog 안에 있었는지 여부
   */
  restoreFocus(hadFocus) {
    const returnElement = this.returnFocusElement;
    this.returnFocusElement = null;

    if (!this.options || this.options.autoFocus === false || !hadFocus) return;
    if (returnElement && typeof returnElement.focus === "function" && document.body.contains(returnElement)) {
      returnElement.focus();
    }
  }

  removeDialogOverrayElement() {
    const overlay = this.dialogOverrayElement;
    this.dialogOverrayElement = undefined;

    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  /**
   * maximise hide
   *
   */
  maximise = () => {
    if (!this.dialogWrapperElement) return;
    const classList = this.dialogWrapperElement.classList;
    if (classList.contains("maximise")) {
      classList.remove("maximise");
    } else {
      classList.add("maximise");
    }
  };

  isMaximise() {
    return !!this.dialogWrapperElement && this.dialogWrapperElement.classList.contains("maximise");
  }

  /**
   * 이벤트 등록. 등록한 이벤트는 destroy 에서 모두 해제한다.
   * @param {EventTarget | NodeList | EventTarget[]} elements
   * @param {string} events 공백으로 구분한 이벤트 이름
   * @param {EventListener} fnHandler
   */
  addEvent(elements, events, fnHandler) {
    const targets = elements instanceof NodeList || Array.isArray(elements) ? Array.prototype.slice.call(elements) : [elements];
    events.split(" ").forEach((e) => {
      if (e === "") return;
      targets.forEach((element) => {
        if (!element) return;
        // 같은 대상 · 이벤트 · 핸들러는 한 번만 등록한다.
        if (this.eventList.some(([el, name, fn]) => el === element && name === e && fn === fnHandler)) return;
        element.addEventListener(e, fnHandler, false);
        this.eventList.push([element, e, fnHandler]);
      });
    });
  }

  /**
   * @param {EventTarget | NodeList | EventTarget[]} elements
   * @param {string} events 공백으로 구분한 이벤트 이름
   * @param {EventListener} fnHandler
   */
  removeEvent(elements, events, fnHandler) {
    const targets = elements instanceof NodeList || Array.isArray(elements) ? Array.prototype.slice.call(elements) : [elements];
    events.split(" ").forEach((e) => {
      targets.forEach((element) => {
        if (!element) return;
        element.removeEventListener(e, fnHandler, false);
        this.eventList = this.eventList.filter(([el, name, fn]) => !(el === element && name === e && fn === fnHandler));
      });
    });
  }

  /**
   * dialog destroy. 이벤트 · 타이머 · overlay · DOM 을 모두 정리한다. 여러 번 호출해도 된다.
   */
  destroy = () => {
    if (!this.dialogWrapperElement) return;

    const wasOpen = this.isOpen();
    const hadFocus = this.dialogWrapperElement.contains(document.activeElement);

    this.eventList.forEach(([element, name, fn]) => element.removeEventListener(name, fn, false));
    this.eventList = [];

    this.timerSet.forEach((timer) => clearTimeout(timer));
    this.timerSet.clear();

    if (typeof cancelAnimationFrame === "function") {
      this.frameSet.forEach((frame) => cancelAnimationFrame(frame));
    }
    this.frameSet.clear();

    this.removeDialogOverrayElement();

    if (wasOpen) {
      this.restoreFocus(hadFocus);
    }

    const wrapper = this.dialogWrapperElement;
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }

    this.dialogWrapperElement = null;
    this.options = null;
    this.idx = -1;
  };
}
