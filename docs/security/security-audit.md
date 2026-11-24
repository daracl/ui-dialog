# 보안 점검 보고서 — @daracl/dialog

- 점검일: 2026-11-24, 기준 커밋 `5253977` (변경 전), 수정 브랜치 `improve/harness-security-quality`
- 기준: OWASP (XSS · HTML Injection, DOM 기반 XSS, A06 취약한 구성요소), WAI-ARIA APG dialog 패턴
- 구분: **확인됨** = 테스트나 재현으로 실제 동작을 확인함 / **잠재** = 코드상 위험이지만 앱이 신뢰하지 않는 값을 넣어야 성립함

## 요약

> vite 전환 후 갱신: 의존성 audit 은 전체 47 → **12 (critical 0)**, 런타임 high 3 → **1**. webpack-dev-server 관련 위험은 해소. 상세는 맨 아래 "vite 전환 후" 절.

| ID | 항목 | 심각도 | 구분 | 수정 |
| --- | --- | --- | --- | --- |
| SEC-01 | `url` 옵션의 iframe `src` 속성 주입 / `javascript:` URL | High | 확인됨 | 수정 |
| SEC-02 | `title` · 버튼 `label` 의 HTML 삽입 (`innerHTML`) | High | 잠재 | 수정 (기본 sanitize) |
| SEC-03 | `template` 문자열 HTML 삽입 | Medium | 잠재 (설계상 신뢰 HTML) | 신뢰 경계 명시 + `sanitize` 옵션 |
| SEC-04 | `styleClass` · 버튼 `styleClass` 속성 주입 | Medium | 확인됨 | 수정 |
| SEC-05 | `icon` 이 프로토타입 키로 class 생성 | Low | 확인됨 | 수정 |
| SEC-06 | 리소스 정리 누락 (overlay · document 리스너 · 타이머) | Medium | 확인됨 | 수정 |
| SEC-07 | ESM/CJS 산출물이 import 시 `ReferenceError` | High(가용성) | 확인됨 | 수정 |
| SEC-08 | UMD 빌드에 CSS 산출물 없음 (`sideEffects: false`) | Medium(가용성) | 확인됨 | 수정 |
| SEC-09 | 접근성: 키보드 · 포커스 · ARIA 부재 | Medium | 확인됨 | 수정 |
| SEC-10 | 의존성 취약점 (개발 도구) | Medium | 확인됨 | 일부 (불필요 패키지 제거) — 남음 |
| SEC-11 | 런타임 트리의 sass 하위 패키지 (high 3) | Low | 확인됨 | 미수정 — 남음 |
| SEC-12 | lockfile 미추적, CI 가 테스트 없이 publish | Medium | 확인됨 | 일부 (ci.yml 추가) — 남음 |
| SEC-13 | iframe 에 sandbox 없음 | Low | 잠재 | 미수정 — 남음 (호환) |

P0(심각한 데이터 보호 문제)는 발견되지 않았다. 이 라이브러리는 데이터를 저장 · 전송하지 않는다.

---

## SEC-01 `url` 옵션 — iframe 속성 주입 · 위험 URL

- 위치: `src/dialog.js` (변경 전) `dialogTemplate()` — `` `<iframe src="${this.options.url}" class="dialog-frame"></iframe>` ``
- 심각도: High / 확인됨
- 원인: URL 을 따옴표 속성 문자열에 그대로 넣어 `innerHTML`. 스킴 검사 없음.
- 영향: `url` 에 외부 값(쿼리스트링, 서버 데이터)을 넣는 앱에서
  - `https://x/"><img src=x onerror=…>` 로 속성을 탈출해 임의 HTML · 스크립트 실행
  - `javascript:` URL 의 iframe 은 부모 origin 에서 스크립트 실행 (브라우저별 차이)
- 안전한 재현: `test/security.test.js` › "URL (iframe)" — jsdom 안에서 `javascript:alert(1)`, 대소문자 · 공백 · 탭 변형, `vbscript:`, `data:text/html`, `file:` 과 `"><script>` 탈출 시도.
- 개선: iframe 을 `document.createElement` 로 만들고 `frame.src = url` (속성 문자열 없음). `@daracl/core/utils` 의 `isSafeUrl` 로 http · https · mailto · tel · 상대 경로만 허용, 그 외는 iframe 을 만들지 않고 `console.warn`.
- 검증: 해당 테스트 10건 통과, UMD 번들 스모크(`javascript:` 차단) 통과.

## SEC-02 `title` · 버튼 `label` HTML 삽입

- 위치: 변경 전 `dialogTemplate()` — `${this.options.title ?? ""}`, `` `<span class="dialog-btn …">${button.label}</span>` ``
- 심각도: High / 잠재 (앱이 사용자 입력을 제목 · 버튼명에 넣을 때 성립. 제목에 사용자 이름 · 파일명을 넣는 것은 흔한 사용)
- 원인: 텍스트 성격의 값을 HTML 로 해석.
- 영향: `<img src=x onerror=…>` 등으로 페이지 origin 에서 스크립트 실행 (DOM 기반 XSS).
- 재현: `test/security.test.js` › 페이로드 12종 × title / label.
- 개선 (사용자 결정: **@daracl/core 로 HTML 처리**): 문자열은 `@daracl/core/utils` 의 `sanitizeHtml`(허용 목록, `<template>` 로 파싱해 파싱 중 실행 없음, `on*` · 위험 URL · `url()` style 제거)을 거쳐 DocumentFragment 로 추가. 서식 태그(`b`, `span`, `a` …)는 유지되어 하위 호환. `Node` 를 넘기면 그대로 추가. 이전 동작이 필요하면 `sanitize: false`.
- 검증: 24건 통과, 서식 유지 테스트 통과, Chrome 실제 확인(`onerror` 0건).

## SEC-03 `template` 문자열

- 위치: 변경 전 `dialogHtml.push(this.options.template)`
- 심각도: Medium / 잠재 — template 은 README 예제부터 HTML(링크 · 폼)을 쓰는 **설계상 신뢰 HTML** 이다. 기본으로 sanitize 하면 `form` · `input` · `button` 이 제거되어 기존 사용이 깨진다 (core `sanitizeHtml` 의 DROP_TAGS).
- 개선: 기본은 기존 동작 유지(신뢰 경계로 명시, `appendHtml` 한 곳에서만 `insertAdjacentHTML`). 외부 값을 표시할 때를 위해 `sanitize: true`(core sanitize) · `sanitize: 함수`(앱 sanitizer) · `template` 에 `Node` 전달을 지원.
- 남은 위험: 앱이 신뢰하지 않는 값을 `sanitize` 없이 template 에 넣으면 여전히 XSS. README "HTML 보안" 에 명시.
- 검증: `sanitize: true` 페이로드 12건, 신뢰 template 의 form 유지, `source-guard` 테스트(삽입 지점이 `appendHtml` 밖에 생기면 실패).

## SEC-04 class 속성 주입

- 위치: `` `daracl-dialog ${styleClass}` `` (className 대입), `` `class="dialog-btn … ${styleClass}"` `` (HTML 문자열)
- 심각도: Medium / 확인됨 — 버튼 `styleClass` 에 `x" onmouseover="…` 를 넣으면 속성 탈출.
- 개선: 모든 class 를 공백으로 나눠 `classList.add`. 속성 문자열을 만들지 않는다.
- 검증: `security.test.js` › "속성 · class 주입" — 모든 요소에 `on*` 속성 0.

## SEC-05 `icon` 프로토타입 키

- 위치: `iconStyleMap[this.options.icon] ?? ""`
- 심각도: Low / 확인됨 — `icon: "constructor"` → class 에 함수 소스 문자열이 들어감 (기능 오류, 주입 경로는 아님).
- 개선: `hasOwnProperty` 로 허용 목록만.
- 검증: 4건 통과.

## SEC-06 리소스 정리 누락

| 문제 | 재현 | 수정 |
| --- | --- | --- |
| 열린 모달을 `destroy()` 하면 overlay 가 남아 페이지 전체가 클릭 불가 | `dialog.test.js` › destroy | destroy 에서 overlay 제거 |
| drag / resize 중 destroy 하면 document 리스너 · 지연 타이머가 남고, 타이머가 `null.style` 접근 | › "drag 중에 destroy" | 모든 리스너를 `eventList` 에 기록해 destroy 에서 해제, 타이머는 `timerSet` 으로 관리 |
| destroy 두 번 / destroy 후 show · hide 호출 시 예외 | › destroy | 멱등 처리, 가드 |
| 외부에서 overlay 를 지우면 hide 에서 예외 | › "외부에서 overlay 를 지워도" | `parentNode` 확인 |
| 같은 리스너 중복 등록 | › addEvent | 같은 대상 · 이벤트 · 핸들러는 1회만 |

검증: 200회 생성 · 제거 후 wrapper · overlay 0개, document 리스너 0개, 타이머 0개 (jest fake timers).

## SEC-07 ESM/CJS 산출물 ReferenceError (가용성)

- 위치: `build.js` 에 `define` 없음 → `dist/index.js`, `dist/index.cjs` 에 `static VERSION = APP_VERSION;` 이 그대로 남음.
- 재현 (실행함): 기존 작업 트리 `dist/index.js` 를 jsdom 전역과 함께 import → `ReferenceError: APP_VERSION is not defined`.
- 영향: `import Dialog from "@daracl/dialog"` 로 쓰는 모든 앱이 로드 단계에서 실패.
- 개선: esbuild `define: { APP_VERSION }`.
- 검증: 새 빌드 ESM import → `ESM OK 0.0.7`, CJS require 정상.

## SEC-08 UMD CSS 산출물 없음 (가용성)

- 원인: `"sideEffects": false` 때문에 webpack 이 `import "../style/daracl.dialog.scss"` 를 제거. `dist/daracl.dialog.min.css` 는 VS Code Live Sass Compiler 가 만들던 파일이라 CI · 다른 개발 환경 빌드에는 없다.
- 개선: `sideEffects: ["*.scss", "*.css"]`, webpack dev 빌드도 `MiniCssExtractPlugin` 으로 추출 (JS 에 스타일 주입 없음 확인).
- 검증: temp-build 산출물에 `daracl.dialog.css`, `daracl.dialog.min.css` 생성, UMD JS 에 style 주입 코드 0건.

## SEC-09 접근성 (보안 · UX)

| 항목 | 변경 전 | 변경 후 | 검증 |
| --- | --- | --- | --- |
| ARIA | 없음 | wrapper `role="dialog"`, 모달 `aria-modal="true"`, 제목 텍스트 → `aria-label`, 아이콘 버튼 `aria-label` | a11y.test |
| 키보드 버튼 | span, 포커스 불가 | `role="button"` `tabindex="0"`, Enter / Space | a11y.test, Chrome |
| 포커스 이동 · 복원 | 없음 | 열 때 본문 → 푸터 → dialog 순, 닫을 때 이전 요소로 | a11y.test, Chrome |
| Focus trap | 없음 | 모달에서 Tab / Shift+Tab 순환 | a11y.test, Chrome(Tab 7회) |
| ESC | 없음 | `closeOnEscape`(기본 true, 닫기 버튼이 있을 때만) | a11y.test, Chrome |
| 포커스 표시 | 없음 | `:focus-visible` outline | style.test, Chrome 스크린샷 |
| 대비 | 흰 글자 버튼 1.2~1.4:1 | 같은 계열 진한 글자 | style.test (값) |

스크린리더 실제 낭독은 **검증하지 못함** (NVDA / VoiceOver 미실행).

## SEC-10 의존성 (개발 도구)

- 변경 전 `npm audit`: 48건 (critical 3, high 26, moderate 14, low 5). 거의 모두 webpack-dev-server · babel · css-minimizer 등 **개발 도구** 체인이다. 배포 번들에 포함되지 않는다.
- 조치: 쓰이지 않는 devDependencies 12개 제거, 빌드 도구를 runtime dependencies 에서 제외 (ui-grid 기준). 변경 후 47건 (critical 3, high 26, moderate 14, low 4).
- 남은 위험: `webpack-dev-server@4`(소스 유출 advisory) — `npm start` 로 개발 서버를 띄운 상태에서 악성 사이트에 접속하면 소스가 노출될 수 있다. 개발 서버 `host: "0.0.0.0"` 설정도 같은 네트워크에 노출한다. major 업그레이드(webpack-dev-server 5, webpack-cli 5)가 필요해 이번 범위에서 제외.
- 라이선스: 런타임 의존 `@daracl/core`(MIT, 의존 없음), `@daracl/ui-style`(MIT).

## SEC-11 런타임 트리의 high 3건

- `npm audit --omit=dev`: high 3 (`immutable@4.3.7`, `picomatch@2.3.1`, `source-map-js@1.2.1`).
- 경로: `@daracl/ui-style` → optional peer `sass@1.80.3` → 위 패키지. SCSS 컴파일러이며 브라우저 번들에 포함되지 않는다.
- 새로 설치하면 `sass` 최신(1.108.2, immutable 5)으로 풀린다. 로컬 lockfile 은 고치지 않았다 (`npm audit fix` 가 빌드 도구 전체를 바꾸므로 사용자 결정 사항). CI 의 `--audit-level=high` 게이트가 이 상태의 lockfile 로는 실패한다 — CI 는 lockfile 없이 설치하므로 통과할 것으로 예상하지만 **검증하지 못함**.

## SEC-12 공급망 · 배포

- `package-lock.json` 이 `.gitignore` 대상 → CI 와 개발자가 서로 다른 버전을 설치하고 `npm ci` 를 쓸 수 없다.
- `deploy.yaml` 은 main push 마다 테스트 없이 장기 토큰으로 publish 시도.
- 조치: 배포와 분리된 `ci.yml`(lint · typecheck · test · build · audit) 추가. 이후 사용자 요청으로 `deploy.yaml` 을 삭제하고 ui-grid 방식 `publish-npm.yml` 로 교체 (아래 "자동 배포 워크플로").

## SEC-13 iframe sandbox

- `url` iframe 에 `sandbox` 가 없다. 같은 origin 페이지를 띄우는 기존 사용(관리 화면 팝업 등)을 깨뜨릴 수 있어 기본값을 바꾸지 않았다. 외부 사이트를 띄우는 앱은 `afterOpen` 에서 `sandbox` 속성을 지정하거나, 향후 옵션 추가를 권장.

## 위험으로 분류하지 않은 것

- `afterOpen` · 버튼 `callback` 은 앱 코드 (신뢰 경계 안).
- `sanitize: false` 는 명시적 opt-out.
- `@daracl/core` `sanitizeHtml` 의 허용 목록 자체(예: `style` 속성 허용, `img` 허용)는 core 의 정책이다. 우회 가능성은 이번 테스트의 페이로드 12종 범위에서만 확인했다 (mXSS 전수 검증 아님).

## vite 전환 후 (2026-11-24)

| ID | 변경 |
| --- | --- |
| SEC-10 | webpack 체인 17개 제거. `npm audit` 12건 (critical 0, high 8, moderate 3, low 1) — 남은 것은 babel(jest 용) · eslint · glob 계열 개발 도구. webpack-dev-server 의 소스 유출 advisory 와 `host: "0.0.0.0"` 노출은 **해소** (vite 개발 서버는 `127.0.0.1`, `server.fs.strict`) |
| SEC-11 | 런타임 트리 high 1 (`picomatch@2.3.1` ← `sass@1.108.2` → `@parcel/watcher` → `micromatch`). 브라우저 번들에 포함되지 않음. CI `--audit-level=high` 게이트는 이 1건으로 실패할 수 있다 — 사용자 결정 필요 (ui-style 의 sass peer 정리 또는 게이트 수준 조정) |
| SEC-08 | vite 도 lib 모드에서 CSS 를 추출한다 (`daracl.dialog(.min).css`). `sideEffects` 설정은 유지 |

## 자동 배포 워크플로 (2026-11-24, 사용자 요청)

| 항목 | 이전 `deploy.yaml` | `publish-npm.yml` (ui-grid 방식) |
| --- | --- | --- |
| 실행 조건 | main push 마다 publish 시도 | main push 중 **package.json version 이 바뀐 경우만** |
| 검증 | 없음 | 미게시 버전 확인 → lint → typecheck → test → build, 실패 시 배포 안 함 |
| 인증 | 장기 토큰 `NPM_DEPLOY_TOKEN` 을 `~/.npmrc` 에 기록 | **OIDC Trusted Publishing**(기본, 토큰 없음) 또는 `NPM_TOKEN` 을 publish 단계에만 임시 파일로 전달 |
| 권한 | 기본 (명시 없음) | `contents: read`, publish job 만 `id-token: write` |
| 실행 환경 | Node 16, actions v2 / v3, yarn | Node 24, npm 11, actions v4, `persist-credentials: false` |
| 동시 실행 | 제한 없음 | `concurrency: publish-npm` (취소 없이 순차) |

- `package.json` `repository` · `homepage` · `bugs` 를 실제 저장소(`daracl/ui-dialog`)로 수정 (OIDC 는 저장소 정보가 맞아야 한다), `publishConfig` 추가.
- 남은 일 (사용자): npmjs.com 에 Trusted Publisher 등록, 쓰지 않는 `NPM_DEPLOY_TOKEN` 폐기. 절차는 `docs/NPM_PUBLISH.md`.
- 검증: YAML 파싱 확인, 버전 비교 스크립트를 로컬에서 실행해 `0.0.7 -> 0.0.8; publish` 출력 확인. **GitHub Actions 실제 실행은 하지 않았다** (push 안 함).
