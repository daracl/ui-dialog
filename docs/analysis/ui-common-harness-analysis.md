# ui-common-harness 분석

- 분석일: 2026-11-24
- 대상: `../ui-common-harness` (로컬 체크아웃. Git 저장소 여부는 `git log` 가 출력 없이 끝나 **확인하지 못함**)
- 읽은 파일: `README.md`, `AGENTS.md`, `CLAUDE.md`, `standards/README.md`, `standards/CODING-STANDARDS.md`, `standards/CONFIG-STANDARDS.md`, `docs/CONVENTIONS.md`, `docs/WORKFLOWS.md`, `docs/CODE-PROFILE.md`
- 실행한 도구: `scripts/audit.mjs ui-dialog`, `scripts/check-standards.mjs ui-dialog`, `scripts/compile-scss.mjs ui-dialog`, `scripts/temp-build.mjs ui-dialog`
- 함께 참조한 기준 구현: `../ui-grid` (package.json, jest.config.js, style/themes, vite 설정, CI), `../ui-style` (src/themes/_mixins.scss, _light.scss), `../corejs` (`@daracl/core` 소스)

## 1. 하네스의 성격

11개 Daracl UI 프로젝트(ui-dialog 포함)를 함께 다루기 위한 **규약 + 점검 도구 + 템플릿** 모음이다. 프로젝트를 직접 바꾸지 않고 읽기 · 점검 · 임시 사본 빌드만 하는 것이 기본이다 (README "안전 장치").

| 구성 | 역할 |
| --- | --- |
| `docs/CONVENTIONS.md` | 저장소 · 빌드 · 디렉터리 · 포맷 계열 · 접두사 · 스타일 · 의존 규약 |
| `standards/` | ui-grid 기준 코드 규칙(필수 / 권장 / 참고)과 설정 규칙, `baseline.json` |
| `scripts/` | `audit`, `check-standards`, `compile-scss`, `temp-build`, `install`, `apply-config`, `analyze-code`, `inventory` |
| `templates/` | 프로젝트 `CLAUDE.md`, `.claude/settings.json`, SCSS 훅, 설정 파일, vite · CI 참조 |

## 2. 실제로 확인한 규칙

### 2.1 작업 원칙 (AGENTS.md, CLAUDE.md 규칙 1~9)

- 수정 전 `git status`, `git log -3`, 프로젝트 `CLAUDE.md` / `AGENTS.md` 확인. 사용자 변경 보존.
- 커밋 · 푸시 · 삭제 · 배포는 요청이 있을 때만.
- 빌드 검증은 `temp-build.mjs` 임시 사본에서. 원본 `dist` · `node_modules` 를 바꾸지 않는다.
- 의존성 설치 · `package.json` 의존성 변경은 사용자 확인 후.
- 프로젝트의 `.prettierrc`(포맷 계열)를 따르고 관계없는 파일을 재포맷하지 않는다. 줄바꿈 유지.
- 일괄 변환은 스크립트 파일로 만들고, 매핑되지 않으면 중단, 실행 후 diff 확인.
- 생성물(`dist/**`, 빌드가 만든 `style/*.css`) 직접 수정 금지.
- 실행한 검증 / 실행하지 못한 검증과 이유를 보고.

### 2.2 코드 규칙 (CODING-STANDARDS.md)

| 수준 | 규칙 | ui-dialog 적용 |
| --- | --- | --- |
| 필수 M1 | `@ts-ignore` · `@ts-nocheck` · `@ts-expect-error` 금지 | 준수 (타입 테스트에서도 쓰지 않음) |
| 필수 M2 | `var` 금지 | 준수 (`.eslintrc.json` 의 `no-var: error` 로 강제) |
| 필수 M3 | tsconfig `strict: true` | **미적용** — TypeScript 소스가 없는 JS 프로젝트. check-standards 도 "TypeScript 없음" 으로 판정 |
| 필수 M4 | 공개 계약(export, 옵션 키, `window.Daracl.<이름>`, CSS 클래스 · 변수, exports 경로)을 임의로 바꾸지 않는다 | 준수 — 추가만 했다 (6절, migration-guide) |
| 필수 M5 | 생성물 직접 수정 금지 | 준수 — `dist/`, `style/*.css` 를 건드리지 않음 |
| 필수 M7 | package.json `name, version, license, main, types, exports, files` | 준수 |
| 권장 2.1 | named export 만 | **부분** — `export { Dialog }` 추가, `export default` 는 공개 API 라 유지 (규칙 8: 요청 없이 제거 금지) |
| 권장 2.6 | `console.log` 금지, 대체 동작은 `console.warn` | 준수 — 차단한 url 에 `console.warn` |
| 권장 2.7 | 리스너 · observer · 타이머 · 임시 DOM 은 `destroy()` 에 연결, 인스턴스 독립, 사용자 템플릿의 escaping 경계 확인 | 적용 (improvement-report 3절) |
| 권장 2.8 | 새 주석 한국어, 공개 API JSDoc | 적용 |
| 권장 5 | 새 소스는 TS, 기존 JS 레거시(**ui-dialog `src/*.js` 를 명시**)는 요청 시에만 전환 | JS 유지 |
| 권장 6 | Jest + jsdom, `test/` 에 두고 통합 테스트는 `afterEach` 에서 destroy, SCSS 는 별도 Node 프로세스에서 컴파일 | 적용 (`test/helpers/compileStyle.js`) |

### 2.3 설정 규칙 (CONFIG-STANDARDS.md)

- `.eslintrc.json`: `eslint:recommended` + `@typescript-eslint/recommended` + `prettier`, `no-console: warn`, `semi`, `quotes`.
  → ui-dialog 는 JS 만 있어 `@typescript-eslint` 를 빼고, 따옴표는 **이 프로젝트 포맷(계열 C, 큰따옴표)** 을 따랐다 (규칙 4).
- jest: ts-jest + jsdom. → ui-dialog 는 TS 가 없어 `babel-jest` + jsdom (기존 `babel.config.js` 사용).
- package.json: `exports` 는 `{ types, import, require }`, 권장 scripts `typecheck`, `lint`.
- **webpack + esbuild (dialog, multiSelect) 는 vite 기준의 대상이 아니다** (6절, 9절). 빌드 도구는 바꾸지 않았다.
- `sideEffects: false` 이면 스타일 import 가 제거될 수 있다 (7절) → ui-dialog 에서 실제로 발생 (security-audit SEC-08).
- CI: dialog 의 `deploy.yaml` 은 "구식"(Node 16, actions v2~v3, 테스트 없음, 장기 토큰, 모든 push 에서 publish)으로 명시. 배포 자동화는 프로젝트마다 사용자가 결정.

### 2.4 스타일 · 테마 (CONVENTIONS.md 5~6절, 프로젝트 CLAUDE.md)

- 공통 색 · 간격 · z-index 는 `@daracl/ui-style`, 컴포넌트 색은 `themes.themed(키)` → `var(--dui-키, light값)`.
- 프로젝트 전용 값은 **자기 접두사 변수**로, `themes.define-themes($scope, $prefix, $themes)` 로 출력.
- 테마 전환은 `data-daracl-theme` 속성과 OS 설정뿐. 클래스 기반 dark 금지.
- hover / selected / active 는 `*-bg` + `*-color` 쌍.
- 전역 keyframes 는 접두사 (`ddlg-*`).
- 접두사 표: ui-dialog 클래스 `daracl-dialog`, 전용 CSS 변수 **없음(-)**, keyframes `ddlg-fade-*`.

ui-grid 의 실제 구조(사용자 요청으로 적용):
`style/themes/{_index,_light,_dark}.scss` → `@include themes.define-theme-defaults($default)` (공통 `--dui-*` 를 특이도 0 으로 출력) + `@include themes.define-themes('.daracl-grid, …', $prefix: 'dg', $themes)` + 인스턴스별 `setTheme()` 이 루트에 `data-daracl-theme` 지정.

### 2.5 의존성 (ui-grid package.json, 사용자 요청으로 적용)

- 런타임 `dependencies`: `@daracl/core`, `@daracl/ui-style` (+ ui-grid 고유 pdfkit). `typescript`, `sass` 는 devDependencies.
- ESM/CJS 빌드는 `@daracl/core`, `@daracl/core/utils` 를 external, UMD 는 번들.
- scripts: `typecheck`, `audit:security`(`npm audit --omit=dev`), `audit:security:all`.

## 3. 확인하지 못한 항목

| 요청 항목 | 결과 |
| --- | --- |
| 접근성 정책 | 하네스에 **별도 접근성 규칙이 없다**. ui-style `_light.scss` 주석에 명도 대비 수치(예: "body-bg 5.5:1")가 있는 정도. → 이번 접근성 개선은 WAI-ARIA APG dialog 패턴을 근거로 했고, 하네스 규칙으로 표기하지 않았다 |
| 보안 정책 | 하네스 규칙은 "사용자 템플릿 · HTML 렌더러는 기존 escaping 경계를 확인한다. 입력을 안전하게 변환한다고 가정하지 않는다"(2.7) 한 줄. 구체적 sanitize 정책은 `@daracl/core` 의 `sanitizeHtml` / `isSafeUrl` 구현에서 확인 |
| 디자인 토큰 상세 | `ui-style/docs/guide.html` 은 읽지 않았다 (SCSS 소스 `src/themes` 로 확인) |
| 하네스 스킬 · 에이전트 본문 | `.claude/skills/*`, `.claude/agents/*` 는 목록만 확인하고 본문은 읽지 않았다 |
| 하네스 자체 테스트 | `test/portability.test.mjs` 는 실행하지 않았다 |
| 브라우저 지원 정책 | 하네스에 없음. ui-dialog `package.json` `browserslist` 와 README 표만 있음 |

## 4. 하네스 쪽에 반영이 필요한 것 (이 작업에서 고치지 않음 — 다른 저장소)

- `config/projects.json` 의 `ui-dialog.cssVarPrefix` 가 `null` 이라 `audit.mjs` 가 새 `--ddlg-*` 를 "접두사 없는 var" 로 경고한다. `"ddlg"` 로 갱신 필요.
- `docs/CONVENTIONS.md` 5절 표의 ui-dialog 전용 CSS 변수 `-` → `--ddlg-*`.
- `CODE-PROFILE.md` 의 ui-dialog 측정값(테스트 0 등)은 재생성 필요 (`analyze-code.mjs`).
