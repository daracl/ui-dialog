# 마이그레이션 가이드 (0.0.7 → 다음 버전)

기존 옵션 · 메서드 · 전역(`window.Daracl.dialog`) · CSS 클래스는 그대로다. 대부분의 앱은 **코드 수정 없이** 업그레이드된다. 아래는 동작이 달라진 곳과 새로 생긴 것이다.

## 1. 동작이 달라진 것

| 변경 | 영향 받는 경우 | 이전 동작이 필요하면 |
| --- | --- | --- |
| `title` · 버튼 `label` 문자열이 `@daracl/core` `sanitizeHtml` 을 거친다 | 제목 · 버튼에 `<button>`, `<input>`, `<svg>`, `<style>`, `on*` 속성, `javascript:` 링크를 넣던 경우 (이 요소는 제거된다. `<b>`, `<span>`, `<a href>` 등 서식은 유지) | `sanitize: false`, 또는 `title` 에 DOM `Node` 를 전달 |
| `url` 은 http · https · mailto · tel · 상대 경로만 iframe 으로 연다 | `javascript:`, `data:`, `file:` 등 | 없음 (보안상 차단). 콘솔에 `[daracl.dialog] unsafe url blocked` |
| ESC 로 닫힌다 (`closeOnEscape` 기본 true, 닫기 버튼이 있을 때만) | ESC 를 다른 용도로 쓰는 본문 | `closeOnEscape: false` |
| 열 때 포커스가 dialog 안으로 이동하고 닫을 때 복원된다 | 열린 뒤에도 바깥 입력에 포커스를 유지해야 하는 경우 | `autoFocus: false` |
| 모달에서 Tab 이 dialog 안에서만 순환한다 | — | (모달이 아니면 적용되지 않음) |
| 나중에 `show()` 한 dialog 가 위에 쌓인다 (이전: 생성 순서) | z-index 값을 직접 비교하던 코드 | `zIndex` 옵션으로 기준값 조정 |
| `destroy()` 가 모달 overlay 와 리스너 · 타이머도 정리하고, 두 번 호출해도 예외가 없다 | — | — |
| `show()` · `hide()` 가 인스턴스를 반환한다 (이전: `undefined` / 일부만) | — | — |
| `width: "150px"` 같은 단위 문자열이 그대로 적용된다 (이전: `150pxpx`) | — | — |
| `create("문자열")` 이 본문으로 표시된다 (이전: 예외) | — | — |
| 터치 drag 가 동작한다 (이전: 없는 이벤트 이름이라 동작 안 함) | — | — |
| 버튼 색: primary · secondary · danger 글자가 흰색 → 같은 계열 진한 색 (대비 개선) | 흰 글자를 기대한 화면 | `--ddlg-btn-primary-color` 등 변수로 재정의 |
| 닫기 · 최대화 · 하단 버튼에 `role="button"`, `tabindex="0"` 이 붙는다 | 해당 span 의 속성을 검사하던 테스트 | — |

## 2. 패키지 · 빌드

| 변경 | 내용 |
| --- | --- |
| `dependencies` | `@daracl/core ^0.0.15` 추가, `typescript` · `sass-embedded` 제거 (빌드 도구는 devDependencies) |
| `main` | `src/index.js` → `./dist/index.cjs` |
| `module` | `./dist/index.js` 추가 |
| `exports["."]` | `{ types, import, require }`. `./dist/*`, `./style/*`, `./package.json` 추가 (기존 `./dist/`, `./style/` 도 유지) |
| `sideEffects` | `false` → `["*.scss", "*.css"]` |
| `dist/index.js`, `index.cjs` | `APP_VERSION` 오류 수정 — **0.0.7 의 ESM/CJS 산출물은 import 시 `ReferenceError` 가 났다** |
| `dist/daracl.dialog(.min).css` | `npm run build` 가 만든다 (이전에는 VS Code 확장이 만들던 파일) |
| 빌드 도구 | webpack + esbuild → **vite** (ui-grid 구조) |
| 새 파일 이름 | `index.min.js`, `index.min.cjs`, `daracl.dialog(.min).umd.js`. 기존 `daracl.dialog(.min).js`, `index.css` 도 같은 내용으로 계속 제공 |
| **IE 11** | **지원 종료.** UMD 는 `es2017`, ESM/CJS 는 최신 브라우저 대상. `browserslist` 에서 `ie 11` 제거 |
| `engines.node` (개발) | `^20.19.0 \|\| >=22.12.0` (vite 7) |
| 개발 서버 | `npm run dev` / `npm start` → `http://127.0.0.1:5182/uitest/index.html` |
| UMD | `@daracl/core` 를 포함하므로 CDN 사용 시 추가 스크립트가 필요 없다. vite 전환 후 gzip 5.1 KB (0.0.7 webpack 빌드 18.4 KB) |
| ESM/CJS | `@daracl/core` 를 포함하지 않는다. 번들러가 `dependencies` 의 `@daracl/core` 를 사용한다 |

## 3. 새로 생긴 것

- 옵션: `sanitize`, `closeOnEscape`, `autoFocus`, `theme`. `title` · `template` · 버튼 `label` 에 DOM `Node` 허용.
- 메서드: `setTheme(name?)`, `isOpen()`.
- named export: `import { Dialog } from "@daracl/dialog"` (default export 도 유지).
- CSS 변수 `--ddlg-*` (overlay, 버튼 6종). `data-daracl-theme` 전환이 `theme-vars.css` 없이도 동작.

## 4. 외부 값을 표시하던 앱 (권장)

```js
// 0.0.7 : template 에 사용자 입력을 그대로 넣으면 XSS
Daracl.dialog.create({ title: userName, template: userComment });

// 변경 후 : title 은 자동으로 정리된다. template 은 sanitize 를 지정한다.
Daracl.dialog.create({ title: userName, template: userComment, sanitize: true });

// 또는 텍스트로만 표시
const p = document.createElement("p");
p.textContent = userComment;
Daracl.dialog.create({ title: userName, template: p });
```

## 5. 다크 테마

0.0.7 은 앱이 `@daracl/ui-style/theme-vars.css` 를 로드해야 dark 가 되었다. 이제 dialog CSS 가 공통 변수 기본값을 특이도 0 으로 포함하므로 `data-daracl-theme="dark"` 만으로 전환된다. `theme-vars.css` 를 로드하거나 `:root` 에 값을 지정한 앱은 그 값이 그대로 우선한다.
