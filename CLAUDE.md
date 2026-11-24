<!-- managed by ui-common-harness (생성일 2026-10-27). 이 파일은 템플릿에서 생성되었습니다. 프로젝트 고유 내용은 맨 아래 "프로젝트 고유 지침" 구역에만 추가하세요. 하네스를 다시 적용(--update)하면 그 구역 위쪽은 갱신됩니다. -->
# CLAUDE.md

이 파일은 Claude Code 가 `@daracl/dialog` 에서 작업할 때 따르는 지침이다.

## 응답 언어 · 스타일

- 모든 응답과 코드 주석은 한국어로 작성한다. 코드, 변수명, API 명칭, 에러 메시지 원문은 그대로 둔다.
- 간결하게 답하고, 변경 후에는 **무엇을 어떻게 검증했는지**를 함께 알린다. 검증하지 못한 것은 못 했다고 적는다.
- 커밋 · 푸시 · 파일 삭제 · 배포는 사용자가 요청할 때만 한다.

## 프로젝트 개요

- 패키지 `@daracl/dialog` v0.0.7 · 빌드 vite (ui-grid 구조) · 패키지 관리자 npm
- 디렉터리: `src/`, `style/`, `test/`, `uitest/`, `example/`, `types/`, `scripts/`
- 같은 Daracl 프로젝트 의존: `@daracl/core` (`../corejs`, `@daracl/core/utils` 의 `sanitizeHtml` · `isSafeUrl`), `@daracl/ui-style`
- git: 이 폴더는 **독립된 저장소**다 (main 브랜치). 다른 `ui-*` 프로젝트와 저장소가 다르다.

## 명령어

| 명령 | 내용 |
| --- | --- |
| `npm run build` | 배포용 전체 빌드 |
| `npm run build:tsc` | 타입 선언(.d.ts) 생성 |
| `npm run test` | 단위 / 통합 테스트 (jest + jsdom, `test/`) |
| `npm run lint` | ESLint (`src`, `test`, `scripts`, vite 설정) |
| `npm run typecheck` | JSDoc 기반 타입 검사 (`tsconfig.typecheck.json`) |
| `npm run dev` (= `start`) | vite 개발 서버 `127.0.0.1:5182/uitest/index.html` |

- `build` = `build:escjs`(vite.config.mjs, ESM/CJS) → `build:umd`(vite.config.umd.mjs, UMD) → `mergenclean`(dist/unmin 병합 → d.ts → 기존 파일 이름 복사). 공통 설정은 `vite.common.mjs`.
- 기존 공개 파일 이름 `dist/daracl.dialog(.min).js`, `dist/index.css` 는 `scripts/build-files.mjs legacy` 가 만든다. 지우지 않는다 (CDN 호환).

## 코드 스타일

- 포맷 설정(`package.json`): **printWidth 256 · tab 2 · 큰따옴표 · 세미콜론 있음 · trailingComma es5**. 이 프로젝트의 설정을 따르고, 다른 프로젝트의 규칙을 가져오지 않는다 (Daracl 프로젝트마다 설정이 다르다).
- 작업과 관계없는 파일을 재포맷하지 않는다. 기존 파일의 줄바꿈(LF/CRLF)을 유지한다.
- 새 기능을 추가하면 이 프로젝트의 수동 / 시각 테스트 관례(`example/`)를 따른다.

## 스타일(SCSS)

- 진입 파일: `style/daracl.dialog.scss` (+ `_icon.scss`, `themes/`)
- 공통 색상 · 간격 · z-index 는 `@daracl/ui-style` 을 사용한다 (현재 `^0.0.1`). 컴포넌트 색은 `themes.themed(키)` → `var(--dui-키, light값)`.
- 클래스 접두사 `daracl-dialog`, 이 프로젝트 전용 CSS 변수 접두사 `--ddlg-*`, keyframes `ddlg-fade-in / ddlg-fade-out, daradialogHide`.
- 이 프로젝트에서만 쓰는 값은 자기 접두사 변수로 두고, 접두사 없는 CSS 변수(`--border-color` 등)를 선언하지 않는다. 컴포넌트 루트에서 `--dui-*` 를 다시 선언하지 않는다 (앱의 테마 값을 덮어쓴다).
- hover / selected / active 는 `*-bg` 와 `*-color` 를 **쌍으로** 쓴다. 입력 요소 · 버튼 테두리는 `input-border-color`, 패널 · 표 · 탭은 `border-color`.
- 테마 전환은 `data-daracl-theme` 속성과 OS 설정뿐이다. `body.dark` 같은 클래스 방식을 추가하지 않는다. dark 는 앱이 `@daracl/ui-style/theme-vars.css` 를 로드해야 동작한다.
- JS 에서 CSS 변수를 읽으면 비어 있을 수 있으므로 **fallback 을 둔다**.
- 자세한 규칙과 변수 목록: `ui-style/docs/guide.html`, 규칙 전문: `ui-style/CLAUDE.md`. 적용 절차는 하네스의 `/migrate-project` 스킬.

## 공통 규칙 (모든 Daracl UI 프로젝트)

1. **작업 전에** `git status`, `git log -3` 로 현재 상태를 확인한다. 원격 변경과 충돌한 상태(`<<<<<<<`)가 커밋되어 있을 수 있다.
2. **생성물은 직접 수정하지 않는다**: `dist/**`, 빌드가 만든 `style/*.css`, 문서 생성 결과.
3. **의존성 설치(`npm install` 등)와 `package.json` 의 의존성 변경은 사용자 확인 후** 한다. 설치되지 않은 도구가 있으면 "검증하지 못함"으로 보고한다.
4. `file:` 로 연결된 의존(없음)은 배포 전에 버전 범위로 바꿔야 한다. 배포는 하지 않는다.
5. 빌드 검증은 가능하면 **임시 사본**에서 한다 (`ui-common-harness/scripts/temp-build.mjs`). 이 프로젝트의 `dist` 와 작업 트리를 덮어쓰지 않는다. `vite.config` 의 `visualizer({ open: true })` 는 빌드할 때마다 브라우저를 연다.
6. 공개 API(옵션 이름, CSS 클래스, CSS 변수, 내보내기 경로)를 바꾸면 소비하는 앱이 깨진다. 이름을 바꾸기 전에 사용자에게 알린다.
7. 변경을 마친 뒤 `node ../ui-common-harness/scripts/audit.mjs ui-dialog` 로 점검할 수 있다.

## 프로젝트 고유 지침

<!-- ui-common-harness:custom-start -->
(여기에 이 프로젝트에만 해당하는 규칙을 적는다. 이 구역은 하네스를 다시 적용해도 유지된다.)

- **HTML 처리**: DOM 은 `createElement` 로 만든다. 문자열 HTML 은 `Dialog#appendHtml` 한 곳에서만 넣고(`test/source-guard.test.js` 가 검사), title · 버튼 label 은 `@daracl/core/utils` 의 `sanitizeHtml`, url 은 `isSafeUrl` 을 거친다. template 은 신뢰된 HTML 이 기본이며 `sanitize` 옵션으로 바꾼다 (README "HTML 보안").
- **의존성**: ui-grid 기준. 런타임 `dependencies` 는 `@daracl/core`, `@daracl/ui-style` 만. ESM/CJS(vite.config.mjs)는 core 를 external, UMD(vite.config.umd.mjs)는 번들.
- **테마**: ui-grid 구조. 전용 값은 `style/themes/_light.scss` · `_dark.scss` 에 추가하고 `ddlg(키)` 로 참조한다. dialog 별 테마는 `theme` 옵션 / `setTheme()` (wrapper · overlay 의 `data-daracl-theme`).
- **수명주기**: 리스너는 `addEvent`(→ `eventList`), 지연 실행은 `setTimer`(→ `timerSet`)로 등록해야 `destroy()` 에서 정리된다.
- `package.json` 의 `sideEffects` 를 `false` 로 되돌리지 않는다. 번들러가 스타일 import 를 제거할 수 있다 (0.0.7 의 webpack 빌드에서 실제로 CSS 가 생성되지 않았다).
- `babel.config.js` 는 jest(babel-jest) 전용이다. 빌드는 babel 을 쓰지 않는다.
- 빌드 대상: ESM/CJS 는 vite 기본값, UMD 는 `es2017`. IE 11 은 지원하지 않는다.
- 추적되는 `style/daracl.dialog(.min).css(.map)` 은 2024-10 생성물로 현재 SCSS 와 다르다. 직접 수정하지 않는다.
- 분석 · 보안 · 테스트 기록: `docs/`.
<!-- ui-common-harness:custom-end -->
