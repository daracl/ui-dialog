/**
 * dialog message 모듈 (@daracl/dialog)
 *
 * 패키지의 `types`(dist/index.d.ts)는 build:tsc 가 src 의 JSDoc 에서 생성한다. 이 파일은 같은 공개 API 를 손으로 정리한 참조 선언이다.
 */

/** HTML 정리 방식. 자세한 내용은 README "HTML 보안" */
export type DialogSanitize = boolean | ((html: string) => string | Node);

export interface DialogButton {
  /** 버튼명. 문자열이면 sanitize 를 거쳐 표시한다 */
  label: string | Node;
  /** 버튼 class. 기본 success (primary, secondary, info, success, warning, danger 또는 사용자 class) */
  styleClass?: string;
  /** mousedown 또는 Enter / Space 키 입력시 호출 */
  callback?: (e: Event) => void;
}

export interface DialogOptions {
  title?: string | Node;
  /** 본문. 문자열은 신뢰된 HTML 로 취급한다 (sanitize: true 이면 정리) */
  template?: string | Node | (() => string | Node);
  /** iframe 주소. http, https, mailto, tel, 상대 경로만 허용 */
  url?: string;
  width?: string | number;
  height?: string | number;
  styleClass?: string;
  isModal?: boolean;
  icon?: "" | "primary" | "secondary" | "info" | "success" | "warning" | "danger";
  autoOpen?: boolean;
  draggable?: boolean;
  resizable?: boolean;
  enableHeader?: boolean;
  enableFooter?: boolean;
  enableMaxButton?: boolean;
  enableCloseButton?: boolean;
  /** ESC 로 닫기 (기본 true, enableCloseButton 이 false 이면 동작하지 않음) */
  closeOnEscape?: boolean;
  /** 열 때 포커스 이동 · 닫을 때 복원 (기본 true) */
  autoFocus?: boolean;
  sanitize?: DialogSanitize;
  /** dialog 별 테마 (light, dark). 지정하지 않으면 상위 요소의 data-daracl-theme 를 따른다 */
  theme?: string;
  minHeight?: number;
  minWidth?: number;
  zIndex?: number;
  dragOverflow?: boolean;
  buttons?: DialogButton[];
  /** requestAnimationFrame 이 없는 환경에서만 쓰는 drag / resize 갱신 간격(ms). 일반 브라우저는 화면 갱신 주기마다 반영한다. */
  moveDelay?: number;
  afterOpen?: false | ((this: Dialog, element: HTMLElement) => void);
}

export class Dialog {
  static VERSION: string;
  static create(options?: DialogOptions | string): Dialog;
  static setOptions(options: DialogOptions): void;

  constructor(options?: DialogOptions | string);
  options: DialogOptions | null;
  idx: number;
  dialogWrapperElement: HTMLDivElement | null;

  /** 최대화 전환 */
  maximise: () => void;
  isMaximise(): boolean;
  /** show dialog message */
  show: () => Dialog;
  /** dialog hide */
  hide: () => Dialog;
  isOpen(): boolean;
  /** dialog 별 테마. 빈 값이면 해제 */
  setTheme(themeName?: string): Dialog;
  /** 이벤트 · 타이머 · overlay · DOM 정리 */
  destroy: () => void;
}

export default Dialog;
