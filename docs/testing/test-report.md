# 테스트 보고서

- 실행일: 2026-11-24, Windows 11, Node.js v24.20.0, npm 11.19.0, Jest 29.7.0 (jsdom 20, `jest-environment-jsdom` 29.7.0)
- 아래 결과는 모두 실제로 실행한 출력이다. 실행하지 못한 항목은 7절에 따로 적었다.

## 1. 자동 테스트 (`npm test`)

```
PASS test/source-guard.test.js
PASS test/style.test.js
PASS test/a11y.test.js
PASS test/security.test.js
PASS test/dialog.test.js
Test Suites: 5 passed, 5 total
Tests:       105 passed, 105 total
```

| 파일 | 수 | 내용 |
| --- | --- | --- |
| `test/dialog.test.js` | 25건 · 기능 · 회귀 · 수명주기 · 테마 | README 예제 회귀, 기존 class 구조, autoOpen, header/footer/max/close 제어, 크기 단위, 문자열 옵션, template 함수 · Node, setOptions, 체이닝, 버튼 callback(mousedown · Enter · Space), 모달 중첩 z-index, drag(마우스 · 터치 · 최대화 · draggable false), resize(최소 크기), destroy 멱등 · 사후 호출, drag 중 destroy 시 리스너 · 타이머 0, 200회 생성 · 제거 후 DOM · 리스너 0, eventList 전부 해제, 중복 등록 방지, 외부 overlay 제거, theme / setTheme |
| `test/security.test.js` | 60건 · 보안 | 페이로드 12종 × (title, label, `sanitize: true` template), 서식 유지, `rel=noopener`, 신뢰 template 의 form 유지, sanitize 함수 · Node 반환, `sanitize: false`, Node 전달, styleClass 속성 주입, icon 프로토타입 키, 위험 URL 6종, URL 따옴표 탈출, 허용 URL 3종 |
| `test/a11y.test.js` | 11건 · 접근성 | role / aria-modal / aria-label / tabindex, 버튼 role · 이름, 포커스 이동 · 복원, autoFocus false, ESC · 비활성 조건, 중첩 ESC, 모달 focus trap(Tab · Shift+Tab), 비모달 trap 없음, 닫기 · 최대화 키보드 |
| `test/style.test.js` | 5건 · 스타일 (node 환경, 별도 프로세스로 SCSS 컴파일) | `--dui-*` 는 `:where` 로만 선언, `--ddlg-*` 전역 · dialog 별 · OS 다크, 접두사 없는 변수 없음, 기존 class · keyframes 유지, `:focus-visible` |
| `test/source-guard.test.js` | 4건 · 기본 보안 검사 | src 에 `innerHTML=` · `outerHTML=` · `document.write` · `eval` · `new Function` 없음, `insertAdjacentHTML` 은 `appendHtml` 안에서만, `isSafeUrl` 검사 후 `frame.src` |

jsdom 한계로 테스트에서 보완한 것: 레이아웃 크기(`clientWidth`), `MouseEvent.pageX`, 터치 이벤트 객체. 이 값은 테스트 안에서 지정했다.

## 2. 정적 검사

| 명령 | 결과 |
| --- | --- |
| `npm run lint` (`eslint src test build.js`) | 오류 0, 경고 0 |
| `npm run typecheck` (`tsc -p tsconfig.typecheck.json`, `checkJs`, `types/index.d.ts`, `test/types/usage.ts`) | 오류 0 |
| `node ../ui-common-harness/scripts/check-standards.mjs ui-dialog` | 필수 위반 0, 권장 5 (prettier 계열 C · ts-jest · vite scripts · default export — 프로젝트 고유 차이), 참고 2 |
| `node ../ui-common-harness/scripts/audit.mjs ui-dialog` | 오류 0, 경고 2 (`--ddlg-*` 를 하네스 메타가 모름 · 미커밋 변경) |
| `node ../ui-common-harness/scripts/compile-scss.mjs ui-dialog` | 성공, Sass 경고 0 |

## 3. 빌드 (`temp-build`, 임시 사본) — 1차 작업(webpack) 기준. vite 전환 후 결과는 8절

```
node ../ui-common-harness/scripts/temp-build.mjs ui-dialog --keep -- npm run build
asset daracl.dialog.min.css 20.9 KiB [emitted] [minimized]
webpack 5.95.0 compiled successfully
asset daracl.dialog.css 26.7 KiB [emitted]
webpack 5.95.0 compiled successfully
[temp-build] dist (18개 파일)
[temp-build] 종료 코드 0
```

- 프로젝트의 `dist/` 는 바꾸지 않았다 (임시 폴더에서만 빌드).
- 산출물: `daracl.dialog(.min).js`, `daracl.dialog(.min).css`, `index.js`, `index.cjs`, `index.css`, `index.d.ts`, `dialog.d.ts`, 맵 파일.
- `APP_VERSION` 남은 참조: `index.js` 0, `index.cjs` 0, `daracl.dialog.min.js` 0.
- `@daracl/core/utils` 는 ESM/CJS 에서 external(`import … from "@daracl/core/utils"`), UMD 에는 번들.
- `dialog.d.ts` 에 `NodeJS` 참조 0 (소비 앱이 `@types/node` 없이 사용 가능).
- UMD min 크기 (gzip): 18,403 B → 23,666 B (+5.3 KB, core sanitize 코드와 polyfill).

## 4. 산출물 스모크 (jsdom, 임시 빌드의 dist)

```
PASS daracl.dialog.min.js: window.Daracl.dialog 등록 / VERSION / title sanitize / overlay / javascript: url 차단 / destroy 정리
PASS daracl.dialog.js: (동일 6건)
PASS index.cjs: default / named export
PASS index.cjs: 동작 · sanitize
모두 통과
[새 빌드 dist/index.js]        ESM OK 0.0.7 true
[기존 작업트리 dist/index.js]  ESM FAIL ReferenceError: APP_VERSION is not defined   ← 변경 전 결함 재현
```

스모크 스크립트는 작업 폴더 밖(scratchpad)에 두었고 저장소에 포함하지 않았다.

## 5. 실제 브라우저 확인 (수동 · 도구 조작)

- 브라우저: Google Chrome (Claude in Chrome 확장으로 조작), 페이지: 임시 빌드의 `example/index.html` 을 `127.0.0.1:5599` 로 제공.

| 항목 | 방법 | 결과 |
| --- | --- | --- |
| 열기 · 포커스 | `dialogObj.show()` | 포커스가 본문 링크로 이동 |
| drag | 헤더를 마우스로 끌기 (700,320 → 450,200) | 이동, `move-on` 해제. 마지막 약 50px 이동은 반영되지 않음 (기존 `moveDelay` 동작, P2-7) |
| resize | 오른쪽 아래 핸들 끌기 | 500×137 → 583×235 |
| dark 테마 | `<html data-daracl-theme="dark">`, `theme-vars.css` 없이 | 본문 `rgb(29,30,31)`, 글자 `rgb(207,211,220)`, info 버튼 `rgb(18,65,74)` / `rgb(182,239,251)`, overlay `#000` |
| sanitize 데모 | `alert` 를 `console.log` 로 바꾼 뒤 실행 | `[onerror]` 0개, `<b>` 유지, `[xss-alert]` 로그 없음 |
| ESC | 실제 Escape 키 | 위 dialog 만 닫히고 포커스가 아래 dialog 링크로 복원 |
| focus trap | 실제 Tab 7회 | 포커스가 모달 안에서 순환 (5개 요소, 예상 위치와 일치) |
| 콘솔 오류 | `read_console_messages` | 없음 |

## 6. 회귀 (기존 API)

- README 사용 예제(옵션 14종 + 버튼 + afterOpen)를 그대로 실행하는 테스트 통과.
- 기존 class 이름 · DOM 계층(`.daracl-dialog > .dialog-header > .btn-area > .dialog-maximise` 등), `dialog-btn dialog-btn-N <styleClass>` className, 본문 높이 `calc()` 값 동일.
- `Daracl.dialog.create`, `Dialog.setOptions`, `show/hide/maximise/isMaximise/destroy`, `afterOpen` 의 `this` 바인딩 동일.

## 7. 실행하지 못한 검증

| 항목 | 이유 |
| --- | --- |
| Firefox · Safari · Edge · IE 11 실제 실행 | 이 환경에서 Chrome 만 조작 가능. IE 11 은 `browserslist` 에 있으나 확인하지 않음 |
| 스크린리더(NVDA, VoiceOver) 낭독 | 도구 없음. ARIA 속성만 자동 검증 |
| 터치 기기 실제 drag | jsdom 의 합성 터치 이벤트로만 확인 |
| GitHub Actions `ci.yml` 실행 | 원격 실행 안 함 (push 금지). 특히 audit 게이트 통과 여부는 미확인 (security-audit SEC-11) |
| `npm ci` | lockfile 이 추적되지 않아 대신 `npm install` 사용 |
| `npm run start` (webpack-dev-server) | 실행하지 않음 |
| sanitize mXSS 전수 검증 | 페이로드 12종만 |

## 지원 브라우저 vs 실제 테스트 브라우저

| 구분 | 내용 |
| --- | --- |
| 선언된 지원 (`browserslist`, README) | Chrome · Firefox · Safari · Opera · Edge 최신, IE 11 |
| 실제 테스트 | Chrome (수동 6항목), jsdom 20 (자동 105건) |

## 8. vite 전환 후 재검증 (2026-11-24)

| 항목 | 결과 |
| --- | --- |
| `npm test` | 5 스위트, **106 통과** / 0 실패 |
| `npm run lint` | 0 |
| `npm run typecheck` | 0 |
| `temp-build -- npm run build` | vite 4회 빌드(ESM/CJS × prod/dev, UMD × prod/dev) 성공, `[temp-build] 종료 코드 0`, dist 20개 파일 |
| 산출물 스모크 | `daracl.dialog.min.js` · `daracl.dialog.js`(기존 이름) 각 6항목, `index.cjs` 2항목, ESM `index.js` import 모두 통과 |
| UMD 전역 | `daracl.dialog(.min).umd.js` 를 `window.Daracl = { grid }` 가 있는 페이지에 로드 → `grid` 유지 + `dialog` 등록 |
| 크기 | UMD min gzip 5,139 B (webpack 23,666 B) |
| 개발 서버 | `npx vite` → `127.0.0.1:5182`, Chrome 에서 `/uitest/index.html` 확인 (5절과 같은 항목 + 200회 생성 · 제거 전후 2 → 2) |

dist 파일: `daracl.dialog.css`, `daracl.dialog.js(.map)`, `daracl.dialog.min.css`, `daracl.dialog.min.js`, `daracl.dialog.min.umd.js`, `daracl.dialog.umd.js(.map)`, `dialog.d.ts`, `index.cjs(.map)`, `index.css`, `index.d.ts`, `index.js(.map)`, `index.min.cjs(.map)`, `index.min.js(.map)`, `index.umd.d.ts`.

실행하지 못한 것은 7절과 같다. 추가로 `npm run preview` 는 실행하지 않았다.
