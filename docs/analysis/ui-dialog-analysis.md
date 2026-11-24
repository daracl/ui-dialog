# ui-dialog 소스 분석 (변경 전, 커밋 `5253977` 기준)

- 분석일: 2026-11-24, 브랜치 `main` (작업 트리 clean) → 작업 브랜치 `improve/harness-security-quality`
- 대상: `src/`, `style/`, `types/`, `example/`, `package.json`, `tsconfig.json`, `webpack.*.js`, `build.js`, `babel.config.js`, `.github/workflows/deploy.yaml`, `README.md`

## 1. 구성 · 아키텍처

| 파일 | 내용 |
| --- | --- |
| `src/dialog.js` (557줄) | `Dialog` 클래스 하나. 옵션 병합, DOM 생성(문자열 HTML → `innerHTML`), drag, resize, show / hide / maximise / destroy |
| `src/index.js` | `Dialog` default export + `style/daracl.dialog.scss` import |
| `src/index.html` | webpack-dev-server 용 데모 (HtmlWebpackPlugin 템플릿) |
| `style/daracl.dialog.scss`, `_icon.scss` | `@daracl/ui-style` 기반 스타일, 아이콘은 data-URI SVG |
| `style/daracl.dialog(.min).css` | **추적되는 생성물** (2024-10-20, 현재 SCSS 와 다름) |
| `types/index.d.ts` | 손으로 쓴 선언 (`export class Dialog`, `options: any`) — 패키지 `types` 와 연결되지 않음 |
| `example/index.html` | `../dist` 를 쓰는 정적 데모 |

모듈 의존: `index.js → dialog.js`, `index.js → style/daracl.dialog.scss → @daracl/ui-style/{abstracts,themes,base}`, `_icon.scss`. 외부 런타임 의존 없음.

빌드 두 경로 (하네스 CONVENTIONS 2절 "webpack + esbuild"):

| 명령 | 도구 | 산출물 |
| --- | --- | --- |
| `build:prod` | webpack (UMD, `window.Daracl.dialog`, `export: "default"`) | `dist/daracl.dialog(.min).js` |
| `build:tsc` | tsc `allowJs` + `emitDeclarationOnly` | `dist/index.d.ts`, `dist/dialog.d.ts` (JSDoc 기반, 대부분 `any`) |
| `build:js` | esbuild + esbuild-sass-plugin | `dist/index.js` (ESM), `dist/index.cjs`, `dist/index.css` |

## 2. Dialog 생성 · 제거 과정

1. `constructor(options)`: 문자열이면 `{ items: options }` (쓰이지 않는 키 → `template` 없음 → **예외**).
2. `Object.assign({}, defaultOptions, options)`, `DIALOG_IDX` 증가.
3. wrapper `div.daracl-dialog-wrapper.hide.dd-N` 생성, `z-index = zIndex + N`, width/height 는 `"auto"` 가 아니면 `값 + "px"` (**`"150px"` → `"150pxpx"`**).
4. 공용 컨테이너 `#daraclDialogHidden` 에 추가 (없으면 `insertAdjacentHTML` 로 생성).
5. `dialogTemplate()`: 헤더 · 본문 · 푸터 · resizer 를 **문자열로 이어 붙여 `innerHTML`**. 이후 닫기 / 최대화 / 버튼에 리스너.
6. `initDrag()`, `initResize()`, `autoOpen` 이면 `show()`.
7. `destroy()`: wrapper 만 제거하고 `options = null`. **overlay · 리스너 · 타이머 정리 없음**. 두 번 호출하면 예외.

## 3. Modal 상태 관리

- `show()` 에서 `isModal` 이면 overlay 를 컨테이너 **첫 자식**으로 넣고 `z-index = zIndex + idx`. wrapper 도 `zIndex + idx`(생성 시점).
- 쌓임 순서가 **생성 순서**로 고정: 먼저 만든 dialog 를 나중에 열면 뒤에 깔린다.
- `hide()` 는 overlay 제거. `destroy()` 는 overlay 를 제거하지 않아 **열린 모달을 destroy 하면 화면을 덮는 overlay 가 남는다**.
- `aria-modal`, focus trap, 포커스 이동 / 복원, ESC 없음.

## 4. Drag / Resize / Maximize

- drag: `.dialog-header` 의 `mousedown touchdown` → document `mousemove touchmove`, `mouseup touchup`. **`touchdown` / `touchup` 은 존재하지 않는 이벤트**라 터치 drag 가 시작되지 않고, 시작되더라도 `e.clientX`(터치에는 없음)를 쓴다.
- `moveDelay`(15ms) 타이머로 이동을 늦춘다. 타이머는 지역 변수로만 관리 → destroy 후에 실행되면 `null.style` 예외 가능.
- resize: 8개 `.resizer[data-mode]`, `e.target.getAttribute("data-mode")`. 최소 크기 · 화면 위 / 왼쪽 경계 처리.
- maximise: wrapper 의 `maximise` 클래스 토글. 최대화 중 drag / resize 무시.

## 5. DOM 생성 · 제거, 이벤트

- 문자열 HTML 조립 후 `innerHTML` (title, button label, template, url, styleClass, icon 이 모두 문자열에 그대로 들어감) → security-audit.
- 리스너 등록 위치: 닫기 / 최대화(click), 푸터 버튼(mousedown), 헤더 · resizer(mousedown), document(mousemove / mouseup). document 리스너는 mouseup 에서 해제되지만 **drag 중 destroy 하면 남는다**. 나머지는 요소와 함께 GC 되지만 명시적 해제가 없다.
- 푸터 버튼 · 닫기 · 최대화가 `<span>` 이고 tabindex 가 없어 **키보드로 사용할 수 없다**.

## 6. CSS · 테마

- `themes.themed()` 로 `--dui-*` 참조 (body-bg, font-color, border-light-color, panel-header-bg, hover-bg).
- overlay `#aaaaaa`, 버튼 6종 색, 아이콘 색이 하드코딩. 테마 전환 시 버튼 · overlay 가 light 그대로.
- `define-theme-defaults` 가 없어 앱이 `theme-vars.css` 를 로드하지 않으면 dark 가 되지 않는다 (README 에 명시).
- 대비: primary / secondary / danger 버튼이 흰 글자 + 연한 배경 (대비 약 1.2~1.4:1).

## 7. TypeScript 타입 안정성

- 소스가 JS. `tsconfig.json` 은 d.ts 생성 전용 (`allowJs`, `emitDeclarationOnly`). `checkJs` 없음.
- 생성 d.ts: `options: any`, `create(options: any): any`. 손으로 쓴 `types/index.d.ts` 는 `export class Dialog`(named)인데 실제 모듈은 default export 만 있어 **선언과 구현이 불일치**.
- `APP_VERSION` 전역 선언 없음.

## 8. 패키지 · 빌드 설정

| 항목 | 상태 |
| --- | --- |
| `main` | `src/index.js` (SCSS import 가 있는 원본 → CJS / 번들러 없는 환경에서 사용 불가) |
| `exports["."]` | `./dist/index.js` 하나 (require 조건 없음), `"./dist/"` 폴더 매핑(Node 17+ 에서 제거된 문법) |
| `sideEffects` | `false` → webpack 이 `import "../style/…scss"` 를 제거해 **UMD 빌드에 CSS 산출물이 없다**. `dist/daracl.dialog.min.css` 는 VS Code Live Sass Compiler(`.vscode/settings.json`)가 만들던 파일 |
| esbuild | `define` 없음 → **`dist/index.js` · `index.cjs` 가 `APP_VERSION` ReferenceError** (재현: test-report 4절) |
| dependencies | `typescript`, `sass-embedded` (빌드 도구가 런타임 의존) |
| devDependencies | 쓰이지 않는 것 12개 (eslint-config-airbnb 등), 쓰지만 선언 없는 것 2개 (`webpack-merge`, `terser-webpack-plugin`) |
| scripts | `yarn` 호출 (npm lockfile 프로젝트) |
| lockfile | `package-lock.json` 이 `.gitignore` 대상 |
| 테스트 | `jest` 만 있고 jsdom 환경 · 테스트 파일 없음 |
| CI | `deploy.yaml`: Node 16, 테스트 없이 main push 마다 `npm publish` 시도 |

## 9. 공개 API (호환성 기준선)

- 전역: `window.Daracl.dialog` (UMD), ESM default export.
- 정적: `Dialog.create(options)`, `Dialog.setOptions(options)`, `Dialog.VERSION`.
- 인스턴스: `show()`, `hide()`, `maximise()`, `isMaximise()`, `destroy()`, `setPosition()`, `addEvent()`, `removeEvent()`, `removeDialogOverrayElement()`, 필드 `options`, `idx`, `dialogWrapperElement`, `dialogOverrayElement`.
- 옵션: `title, template, url, width, height, styleClass, isModal, icon, autoOpen, draggable, resizable, enableHeader, enableFooter, enableMaxButton, enableCloseButton, minHeight, minWidth, zIndex, dragOverflow, buttons[{label, styleClass, callback}], moveDelay, afterOpen`.
- CSS 클래스: `daracl-dialog-hidden, daracl-dialog-overlay, daracl-dialog-wrapper, hide, transform-disable, move-on, maximise, resizable, daracl-dialog, dialog-header, btn-area, dialog-maximise, dialog-close, dialog-body, dialog-move-overay, dialog-content, dialog-frame, dialog-footer, dialog-btn, dialog-btn-N, resizer, (top|left|…)`, 아이콘 · 버튼 변형 클래스, keyframes `ddlg-fade-in/out`, `daradialogHide`.
