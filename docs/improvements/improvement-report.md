# 개선 보고서 — @daracl/dialog

- 작업일: 2026-11-24 · 대상: 로컬 저장소 `F:\09.opensource\daracl\ui-dialog`
- 브랜치: `main`(`5253977`, clean) → **`improve/harness-security-quality`** (미커밋. 커밋 · 푸시 · 배포하지 않음)
- 상세: [분석](../analysis/ui-dialog-analysis.md) · [하네스 분석](../analysis/ui-common-harness-analysis.md) · [보안](../security/security-audit.md) · [계획](improvement-plan.md) · [테스트](../testing/test-report.md) · [마이그레이션](../migration/migration-guide.md)

## 1. 기존 프로젝트 상태 (요약)

- JS 2파일(568줄), 테스트 0, lint 설정 없음, `types/index.d.ts` 가 실제 export 와 불일치.
- 문자열 HTML 을 `innerHTML` 로 조립 (title · label · template · url · class 모두 그대로).
- **ESM/CJS 산출물이 import 시 `ReferenceError: APP_VERSION`** (재현함). UMD 빌드는 CSS 를 만들지 않음 (`sideEffects: false`).
- destroy 가 overlay · 리스너 · 타이머를 정리하지 않음. 터치 이벤트 이름 오류. 키보드 · ARIA 없음.
- 빌드 도구가 runtime dependencies, 미사용 devDependencies 12개, 선언 없는 사용 2개, lockfile 미추적, CI 는 테스트 없이 publish.

## 2. 적용한 기준 프로젝트 규칙

| 규칙 (출처) | 적용 |
| --- | --- |
| 작업 전 git 상태 확인 · 작업 브랜치 (AGENTS.md, CLAUDE.md 1) | `git status` / `git log -3` 확인 후 브랜치 생성 |
| 임시 사본 빌드 (CLAUDE.md 3, `temp-build.mjs`) | 모든 빌드를 임시 폴더에서 실행, 프로젝트 `dist/` 무변경 |
| 생성물 직접 수정 금지 (M5) | `dist/**`, `style/*.css` 무변경 |
| 공개 계약 유지 (M4) | 추가만 함 (6절) |
| `var` · `@ts-ignore` 류 금지 (M1, M2) | 0건, ESLint `no-var` |
| 프로젝트 포맷 계열 C 유지, 관계없는 파일 재포맷 금지 (CLAUDE.md 4) | 큰따옴표 · 세미콜론 · LF 유지 |
| 일괄 변환은 스크립트로, 불일치 시 중단 (CLAUDE.md 5) | package.json · SCSS · 타입 수정을 매칭 검사 스크립트로 수행 |
| 수명주기를 destroy 에 연결, 인스턴스 독립 (2.7) | `eventList` · `timerSet` |
| 사용자 템플릿 escaping 경계 확인 (2.7) | `appendHtml` 단일 경계 + source-guard 테스트 |
| 테스트는 `test/`, SCSS 는 별도 Node 프로세스에서 컴파일 (6절) | `test/helpers/compileStyle.js` |
| ui-style 테마 규칙 (CONVENTIONS 6) + **ui-grid 테마 구조 (사용자 요청)** | `style/themes/`, `define-theme-defaults`, `define-themes(…, $prefix: "ddlg")`, `setTheme()` |
| ui-grid 의존성 구성 (사용자 요청) | runtime = core + ui-style, core 는 ESM/CJS external · UMD 번들, `typecheck` · `audit:security` scripts |
| `exports` `{ types, import, require }` (CONFIG 7) | 적용 |
| `sideEffects` 주의 (CONFIG 7) | `["*.scss", "*.css"]` |

적용하지 않은 것 (하네스가 "요청 시에만" 으로 정한 것): JS → TS 전환, 포맷 계열 A 로 재포맷, `export default` 제거, vite 전환, `deploy.yaml` 교체.

## 3. 변경 파일과 주요 차이

34개 파일, +2,553 / −264 (`git diff --stat`, 신규 파일 포함).

### 소스

| 파일 | 변경 전 → 후 |
| --- | --- |
| `src/dialog.js` | 문자열 HTML + `innerHTML` → `createElement` 로 DOM 생성. title · label 은 `sanitizeHtml`, url 은 `isSafeUrl` + `frame.src`, class 는 `classList`, icon 은 허용 목록. `appendHtml`(신뢰 경계), `eventList` / `timerSet` 기반 정리, 멱등 `destroy`, 사후 호출 가드, `touchstart/end/cancel` + 터치 좌표, `toCssLength`, 문자열 · template 없는 옵션 처리, 연 순서 z-index, `role`/`aria-*`/`tabindex`, 키보드 버튼, 포커스 이동 · 복원 · trap, ESC, `theme`/`setTheme`/`isOpen`, JSDoc 타입 |
| `src/index.js` | named export `Dialog` 추가 (default 유지) |
| `src/global.d.ts` | `APP_VERSION` 선언 (신규) |
| `types/index.d.ts` | `any` → `DialogOptions` · `DialogButton` · `DialogSanitize`, 새 메서드, default export |

### 스타일

| 파일 | 내용 |
| --- | --- |
| `style/themes/_index.scss`, `_light.scss`, `_dark.scss` (신규) | dialog 전용 값 `--ddlg-*` (overlay 2, 버튼 18) |
| `style/daracl.dialog.scss` | `define-theme-defaults`, `define-themes(".daracl-dialog-wrapper, .daracl-dialog-overlay", $auto-dark: true, $prefix: "ddlg")`, `ddlg()` 함수, overlay · 버튼 색을 변수로, 버튼 대비 개선, `:focus-visible`, wrapper `:focus` outline 제거 |

`$auto-dark: true` 는 ui-grid 와 다르다. 공통 `--dui-*` 가 OS 다크를 따르는데 전용 값만 light 로 남는 것을 막기 위해서다.

### 빌드 · 설정

| 파일 | 내용 |
| --- | --- |
| `package.json` | deps: +`@daracl/core ^0.0.15`, −`typescript`, −`sass-embedded`. devDeps: +`jest-environment-jsdom`, +`webpack-merge`, +`terser-webpack-plugin`, +`typescript`(이동), 미사용 12개 제거. `main`/`module`/`exports`/`sideEffects`, scripts `yarn`→`npm run`, +`typecheck` `lint` `audit:security(:all)` |
| `build.js` | `define APP_VERSION`, core external, 실패 시 오류 메시지 출력, 미사용 `sass` require 제거 |
| `webpack.common.js` | 미사용 `webpack-node-externals` 제거, babel 이 `@daracl/core` 도 변환 |
| `webpack.dev.js` | style-loader → `MiniCssExtractPlugin` (`dist/daracl.dialog.css`) |
| `.eslintrc.json`, `jest.config.js`, `tsconfig.typecheck.json` (신규) | lint · test · typecheck |
| `.github/workflows/ci.yml` (신규) | lint · typecheck · test · build · audit (배포 없음) |

### 테스트 · 예제 · 문서

`test/` 5개 스위트 105건 + 타입 테스트, `example/index.html`(동작하지 않던 `new Dialog` 수정, 중첩 · sanitize · 테마 데모), `README.md`, `CLAUDE.md`(프로젝트 고유 지침), `docs/` 7개.

## 4. 해결된 보안 문제

SEC-01(url 주입 · 위험 스킴), SEC-02(title · label XSS), SEC-04(class 속성 주입), SEC-05(icon 키), SEC-06(리소스 정리), SEC-07(ESM/CJS 로드 실패), SEC-08(CSS 산출물), SEC-09(접근성). SEC-03(template)은 신뢰 경계 명시 + opt-in sanitize 로 완화. 검증: security.test 60건 · a11y.test 11건 · dialog.test 25건(수명주기 6건 포함) · source-guard 4건 · 산출물 스모크 · Chrome 확인 ([test-report](../testing/test-report.md)).

## 5. 남아 있는 보안 위험

| 위험 | 이유 · 권장 |
| --- | --- |
| template 기본값은 신뢰 HTML | 호환 유지 결정. 외부 값은 `sanitize: true` 또는 Node (README 명시) |
| 개발 도구 audit 47건 (critical 3, high 26) | webpack-dev-server 4 등. 개발 서버 `host: "0.0.0.0"`. major 업그레이드 필요 |
| 런타임 트리 high 3 (sass 하위) | 로컬 lockfile 미갱신. `npm audit fix` 는 사용자 결정 |
| lockfile 미추적 | 사용자 결정 사항 (`deploy.yaml` 은 12절에서 교체) |
| iframe sandbox 없음 | 호환. 새 옵션 검토 권장 |
| core `sanitizeHtml` 정책 · mXSS | 페이로드 12종으로만 확인 |

## 6. API 호환성 결과

- 유지: `Daracl.dialog` 전역, default export, `create`, `setOptions`, `VERSION`, 기존 인스턴스 메서드 · 필드, 기존 옵션 22종(요청서의 14종 포함), 버튼 `{label, styleClass, callback}`, 모든 CSS 클래스 · keyframes, DOM 계층.
- 추가: 옵션 `sanitize` `closeOnEscape` `autoFocus` `theme`, 메서드 `setTheme` `isOpen`, named export, CSS 변수 `--ddlg-*`, `exports` 조건.
- 동작 변경 (opt-out 있음): title · label sanitize, ESC, 포커스 이동, z-index 쌓기 순서, 버튼 글자색, 위험 url 차단 → [migration-guide](../migration/migration-guide.md) 1절.
- 검증: README 예제 회귀 테스트, 기존 class 구조 테스트, UMD · CJS · ESM 스모크.

## 7. 성능 · 구조

- DOM 을 한 번에 조립해 wrapper 에 추가 (문자열 파싱 1회 → 노드 생성). 이벤트는 인스턴스 단위 목록으로 관리해 해제 비용 O(n).
- 200회 생성 · 제거 후 DOM · document 리스너 · 타이머 0 (테스트).
- UMD min gzip 18.4 KB → 23.7 KB (+5.3 KB, core sanitize + polyfill). ESM/CJS 는 core 를 external 로 두어 앱 번들에서 다른 Daracl 컴포넌트와 공유한다.

## 8. 빌드 · 테스트 결과

| 항목 | 결과 |
| --- | --- |
| `npm install` | 성공 (Node 24.20 / npm 11.19). `esbuild` · `core-js` postinstall 은 npm allowScripts 정책으로 실행되지 않았으나 esbuild 는 정상 동작 확인 |
| `npm run build` (temp-build) | 종료 코드 0, dist 18개 파일 |
| `npm test` | 5 스위트, 105 통과 / 0 실패 |
| `npm run lint` | 0 / 0 |
| `npm run typecheck` | 0 오류 |
| `npm audit --omit=dev` | high 3 (5절) |
| harness `audit` / `check-standards` | 오류 0 / 필수 위반 0 |

## 9. 미완료 작업

- GitHub Actions 실제 실행 (push 하지 않음), `npm ci` (lockfile 미추적).
- Chrome 외 브라우저, 스크린리더, 실제 터치 기기 확인.
- 추적되는 생성물 `style/daracl.dialog(.min).css(.map)` 갱신 / 추적 해제 (생성물 · 삭제 → 사용자 결정).
- 하네스 저장소 `config/projects.json` `cssVarPrefix: "ddlg"`, `CONVENTIONS.md` 5절 갱신.
- iframe `sandbox` 옵션 (P2-8). (P2-7 drag 마지막 이동은 13절에서 완료)
- `node_modules/@daracl/ui-style` 이 형제 저장소 링크에서 레지스트리 0.0.8 설치본으로 바뀌었다 (`npm install` 결과, 두 소스 `src/` 동일 확인). 링크를 쓰려면 다시 연결해야 한다.

## 10. 추가 개선 권장

1. lockfile 추적 + CI · 배포에서 `npm ci`. (`publish-npm.yml` 교체는 12절에서 완료)
2. webpack-dev-server 5 / webpack-cli 5 업그레이드, dev 서버 `host` 를 `127.0.0.1` 로.
3. `npm audit fix` 로 sass 체인 갱신 후 SCSS 경고 확인.
4. 버전 올리기 (동작 변경 · 패키지 진입점 변경이 있으므로 0.1.0 권장) 와 CHANGELOG.
5. 필요 시 TypeScript 전환 (하네스 기준: 별도 작업).

## 11. 추가 작업: vite 전환 (사용자 요청 "grid 와 같이 vite로 갱신")


| 항목 | webpack + esbuild (1차 작업 후) | vite (ui-grid 구조) |
| --- | --- | --- |
| 설정 | `webpack.common/dev/dev.server/prod.js`, `build.js` | `vite.common.mjs`, `vite.config.mjs`(ESM/CJS), `vite.config.umd.mjs`(UMD), `scripts/build-files.mjs` |
| scripts | `build:prod` → `build:tsc` → `build:js` | `build:escjs` → `build:umd` → `mergenclean`, `dev` · `start` · `preview` |
| UMD 진입 | webpack `library: ["Daracl","dialog"]` | `src/index.umd.js` 가 `window.Daracl.dialog` 등록 (기존 `window.Daracl` 유지) |
| UMD 대상 | ES5 (babel + core-js, IE 11) | `es2017` (IE 11 제외) |
| UMD min gzip | 23,666 B | **5,139 B** |
| devDependencies 제거 | — | webpack 체인 17개 (webpack, webpack-cli, webpack-dev-server, 로더 · 플러그인, esbuild, esbuild-sass-plugin …) |
| 추가 | — | `vite ~7.3.7` (설치 7.3.8), `sass ^1.107.0` (설치 1.108.2), `engines.node ^20.19.0 \|\| >=22.12.0` (ui-grid 와 같음) |
| `npm audit` 전체 | 47 (critical 3, high 26, moderate 14, low 4) | **12 (critical 0, high 8, moderate 3, low 1)** |
| `npm audit --omit=dev` | high 3 | **high 1** (`picomatch` ← sass → @parcel/watcher → micromatch) |
| 개발 서버 | webpack-dev-server `0.0.0.0:8888` | vite `127.0.0.1:5182`, `/uitest/index.html` |
| 삭제한 파일 (사용자 승인) | — | `webpack.common.js`, `webpack.dev.js`, `webpack.dev.server.js`, `webpack.prod.js`, `build.js`, `src/index.html` |
| 유지 | — | `babel.config.js` (jest 의 babel-jest 전용) |

산출물 이름은 ui-grid 방식(`index(.min).js|.cjs`, `daracl.dialog(.min).css`, `daracl.dialog(.min).umd.js`)으로 만들고, 0.0.7 까지의 공개 이름(`daracl.dialog(.min).js`, `index.css`)도 같은 내용으로 함께 만든다 (`scripts/build-files.mjs legacy`, 공개 경로 유지 — 하네스 M4).

ui-grid 와 다른 점: `aggressiveHtmlMinify` · uitest 목 API · link-core 제외 (ui-grid 고유), UMD `target: "es2017"`(ui-grid 는 esnext), ui-grid `scripts/build.mjs` 의 병렬 staging 빌드 대신 하네스 참조 템플릿의 `npm run` 순차 구조, CJS `output.exports: "named"`(default + named export).


### 검증 (2026-11-24)

| 항목 | 결과 |
| --- | --- |
| `npm install` | 성공 |
| `npm run build` (temp-build) | 종료 코드 0, dist 20개 파일 |
| 산출물 스모크 (jsdom) | UMD 기존 이름 2종 · CJS · ESM 모두 통과, UMD 두 파일 모두 기존 `window.Daracl.grid` 유지, `APP_VERSION` 잔존 0, ESM 의 core external 확인 |
| `npm test` | 106 통과 (source-guard 가 `index.umd.js` 를 함께 검사해 +1) |
| `npm run lint` · `typecheck` | 0 · 0 |
| `npm run dev` + Chrome | uitest 페이지에서 SCSS 주입, sanitize(`onerror` 0), dialog 별 dark, iframe 허용 · `javascript:` 차단, 200회 생성 · 제거 전후 개수 동일, 콘솔 오류 없음 |
| harness check-standards | 필수 0, 권장 4 (필수 scripts 경고 해소). 참고: `pkg.tooling` 이 vite `^5.4` 를 기준으로 보고 — 하네스 baseline 이 ui-grid 실제 버전(~7.3.7)보다 오래됨 |

### 이 단계에서 바뀐 5절(남은 위험)

- 개발 도구 audit: 47 → 12, critical 0. webpack-dev-server 관련 위험(소스 유출, `0.0.0.0` 노출)은 **해소**.
- 런타임 audit: high 3 → 1 (`picomatch@2.3.1`, sass 의 파일 감시 의존. 브라우저 번들에 포함되지 않음).
- IE 11 지원 종료 (migration-guide 2절).

## 12. 추가 작업: 예제 화면 · 자동 배포 (사용자 요청)

### 예제 (`uitest/`, `example/`)

- ui-grid `uitest` 와 같은 디자인(흰 헤더, 카드형 본문, 공통 `asset/examples.css`)으로 다시 만들었다. 사용자 요청으로 iframe 탐색기 대신 **풀페이지**: `index.html`(예제 카드 목록) + 각 예제 상단의 공통 메뉴.
- 예제 8개: `demo`(옵션 빌더 + 코드 표시), `basic`, `buttons`, `modal`, `drag-resize`, `security`, `theme`, `lifecycle`. 공통 도우미 `uitest/asset/page.js`(메뉴 · 테마 · 로그 · 코드).
- 테마 선택은 `localStorage` 에 저장되어 모든 예제에 적용되고, 페이지 크롬도 dark 로 바뀐다. 예제 스타일은 `.daracl-dialog-hidden` 안에 적용되지 않는다.
- `example/index.html`(dist 사용 정적 예제)도 같은 디자인.
- 검증: vite 개발 서버 + Chrome 에서 8개 페이지 모두 오류 없음, 각 페이지 주 버튼으로 dialog 열림, dark 테마 · 스타일 격리 확인, `example/index.html` 은 임시 빌드 dist 로 확인. **스크린샷은 브라우저 캡처가 3회 시간 초과되어 남기지 못했다** (DOM · computed style 로 확인).

### 자동 배포 (`.github/workflows/publish-npm.yml`)

- ui-grid 와 같은 방식: main push 중 version 이 바뀐 경우만 lint · typecheck · test · build 후 `npm publish`, OIDC 기본 / NPM_TOKEN 대안. 설정은 `docs/NPM_PUBLISH.md`.
- `deploy.yaml` 삭제 (사용자 승인). `package.json` 저장소 정보를 `daracl/ui-dialog` 로 수정, `publishConfig` 추가.
- **주의:** 작업 트리의 `package.json` version 이 `0.0.8` (npm 최신 0.0.7)이다. 이 변경을 main 에 push 하면 바로 0.0.8 배포가 실행된다.

## 13. 추가 작업: header 커서 · drag / resize 끊김 (사용자 요청)

- `draggable: false` 이면 header 에 move 커서를 표시하지 않는다. drag 가 켜진 경우만 wrapper 에 `draggable` 클래스를 붙이고 `cursor: move` 는 그 아래에만 적용한다.
- 끊김 원인: mousemove 마다 `moveDelay`(15ms) 타이머를 다시 걸고 이전 타이머를 지우는 방식이라, 마우스를 계속 움직이는 동안 반영이 밀리고 몰려서 처리되었다. 놓을 때는 마지막 이동이 버려졌다 (P2-7).
- 개선: `createFrameUpdater` 로 화면 갱신 주기(`requestAnimationFrame`)마다 마지막 좌표만 한 번 반영하고, 놓을 때 남은 좌표를 바로 반영(flush)한다. 요청 id 는 `frameSet` 에 두고 `destroy()` 에서 취소한다. `moveDelay` 는 호환을 위해 남기며 `requestAnimationFrame` 이 없는 환경의 대체 간격으로만 쓴다.
- 검증: jest 109 통과 (한 프레임 여러 move → 1회 반영, 놓을 때 마지막 좌표 반영, destroy 후 타이머 0). 실제 브라우저의 체감 부드러움은 확인하지 못했다.
