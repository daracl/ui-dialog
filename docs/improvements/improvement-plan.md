# 개선 계획

근거: [ui-dialog-analysis.md](../analysis/ui-dialog-analysis.md), [security-audit.md](../security/security-audit.md), [ui-common-harness-analysis.md](../analysis/ui-common-harness-analysis.md)

## 사용자 결정 사항 (작업 중 확인)

| 질문 | 결정 |
| --- | --- |
| 작업 대상 | GitHub 원격이 아닌 **현재 로컬 폴더** (`F:\09.opensource\daracl\ui-dialog`) |
| HTML 처리 | **`@daracl/core` 를 추가해서 처리** (`@daracl/core/utils` 의 `sanitizeHtml`, `isSafeUrl`) |
| 의존성 정리 | **ui-grid 를 참조해서 정리** |
| 테스트 환경 | `jest-environment-jsdom` devDependency 추가 후 설치 |
| 테마 | **ui-grid 스타일로 변경** (`style/themes/`, `define-theme-defaults`, 전용 변수, `setTheme`) |

## 원칙

1. 공개 API(옵션 · 메서드 · 전역 · CSS 클래스 · keyframes)는 **추가만** 한다. 이름 변경 · 제거 없음.
2. 기능 변경 전에 회귀 테스트(README 예제, 기존 class 구조)를 먼저 만든다.
3. 빌드 도구(webpack + esbuild)는 바꾸지 않는다 (하네스 CONFIG-STANDARDS 6절: 이 기준의 대상 아님).
4. JS → TS 전환, 코드 재포맷, `export default` 제거는 하지 않는다 (하네스 규칙 8).

## P0 — 심각한 보안 · 데이터 보호

발견 없음.

## P1 — 기능 오류 · XSS · 리소스 누수 · API 안정성

| ID | 내용 | 근거 | 상태 |
| --- | --- | --- | --- |
| P1-1 | `url` iframe: DOM 속성 지정 + `isSafeUrl` | SEC-01 | 완료 |
| P1-2 | title · label 을 core `sanitizeHtml` 로 처리, `Node` 허용, `sanitize` 옵션 | SEC-02/03 | 완료 |
| P1-3 | class 를 `classList` 로, icon 허용 목록 | SEC-04/05 | 완료 |
| P1-4 | destroy 에서 overlay · 리스너 · 타이머 정리, 멱등, 사후 호출 가드 | SEC-06 | 완료 |
| P1-5 | esbuild `define APP_VERSION` (ESM/CJS 로드 실패) | SEC-07 | 완료 |
| P1-6 | `sideEffects` 수정, webpack 이 CSS 산출 | SEC-08 | 완료 |
| P1-7 | 터치 이벤트 이름(`touchstart/end/cancel`), 터치 좌표 | 분석 4절 | 완료 |
| P1-8 | `create("문자열")` · template 없는 옵션의 예외 | 분석 2절 | 완료 |
| P1-9 | width/height `"150px"` → `"150pxpx"` | 분석 2절 | 완료 |
| P1-10 | `package.json` `main` · `exports` (CJS require 조건, types) | 분석 8절 | 완료 |

## P2 — 구조 · 접근성 · 타입 · 테마

| ID | 내용 | 상태 |
| --- | --- | --- |
| P2-1 | 접근성: role · aria-modal · aria-label, 키보드 버튼, 포커스 이동 / 복원, focus trap, ESC, focus-visible | 완료 |
| P2-2 | 모달 중첩: 연 순서대로 z-index 쌓기 | 완료 |
| P2-3 | ui-grid 테마 구조 (`style/themes`, `--ddlg-*`, `theme` 옵션, `setTheme()`) | 완료 |
| P2-4 | 버튼 대비 개선 | 완료 |
| P2-5 | JSDoc 타입 + `checkJs` 타입 검사, `types/index.d.ts` 를 실제 API 와 일치, named export 추가 | 완료 |
| P2-6 | 의존성 정리 (ui-grid 기준) | 완료 |
| P2-7 | drag 를 놓을 때 마지막 지연 이동이 버려짐 (기존 동작) | 보류 — 동작 변경, 별도 결정 |
| P2-8 | iframe `sandbox` 옵션 | 보류 — 새 옵션, 별도 결정 |
| P2-9 | **빌드를 vite 로 전환 (ui-grid 구조, 사용자 요청)**, 기존 산출물 이름 유지, 구 빌드 파일 6개 삭제(사용자 승인) | 완료 |

## P3 — 문서 · 개발 편의 · CI

| ID | 내용 | 상태 |
| --- | --- | --- |
| P3-1 | README (옵션 · 메서드 · HTML 보안 · 테마 · 브라우저 · 테스트) | 완료 |
| P3-2 | `example/index.html` 수정 (`new Dialog` → `Daracl.dialog.create`), 중첩 · sanitize · 테마 데모 | 완료 |
| P3-3 | `ci.yml` (lint · typecheck · test · build · audit) | 완료 |
| P3-4 | ESLint 설정, `lint` · `typecheck` · `audit:security` scripts | 완료 |
| P3-5 | scripts 의 `yarn` → `npm run` | 완료 |
| P3-6 | `deploy.yaml` → ui-grid 방식 `publish-npm.yml` (사용자 요청, deploy.yaml 삭제 승인). lockfile 추적은 보류 | 완료 (lockfile 제외) |
| P3-7 | 추적되는 생성물 `style/daracl.dialog(.min).css(.map)` 재생성 또는 추적 해제 | 보류 — 생성물 · 삭제는 사용자 결정 |
| P3-8 | 하네스 `config/projects.json` 의 `cssVarPrefix: "ddlg"` | 보류 — 다른 저장소 |
| P3-9 | webpack-dev-server 5 등 개발 도구 major 업그레이드 | P2-9 로 해소 (webpack 제거) |

## 진행 순서 (실제 수행 순서)

1. 의존성 정리 · 설치 → 2. `dialog.js` 재작성 (DOM API, core sanitize, 수명주기, 접근성, 테마) → 3. 빌드 설정 (esbuild define / external, webpack babel include) → 4. 테마 SCSS → 5. 테스트 작성 · 실행 → 6. lint · typecheck → 7. temp-build + 산출물 스모크 → 8. CSS 산출 문제 발견 · 수정 → 9. Chrome 실제 확인 → 10. 문서.
