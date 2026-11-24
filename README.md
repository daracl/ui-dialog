# dialog

Simple dialog message

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/daracl/ui-dialog/blob/main/LICENSE)
[![npm version](https://badge.fury.io/js/@daracl%2Fdialog.svg)](https://badge.fury.io/js/@daracl%2Fdialog)
[![npm](https://img.shields.io/npm/dt/@daracl%2Fdialog)](https://github.com/daracl/ui-dialog/releases)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/@daracl%2Fdialog)](https://bundlephobia.com/package/@daracl%2Fdialog)

## Browser Support

![Chrome](https://raw.github.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png) | ![Firefox](https://raw.github.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png) | ![Safari](https://raw.github.com/alrra/browser-logos/master/src/safari/safari_48x48.png) | ![Opera](https://raw.github.com/alrra/browser-logos/master/src/opera/opera_48x48.png) | ![Edge](https://raw.github.com/alrra/browser-logos/master/src/edge/edge_48x48.png)
--- | --- | --- | --- | --- |
Latest ✔ | Latest ✔ | Latest ✔ | Latest ✔ | Latest ✔ |

- 빌드는 vite 다 (ui-grid 와 같은 구조). UMD 는 `es2017`, ESM/CJS 는 vite 기본 대상(최신 브라우저)으로 만든다. **IE 11 은 지원하지 않는다** (0.0.7 까지는 webpack + babel 로 ES5 를 만들었다).
- 자동 테스트는 jsdom, 수동 확인은 Chrome 에서 했다 ([docs/testing/test-report.md](docs/testing/test-report.md)). 그 외 브라우저는 실제로 확인하지 않았다.


<p>
<img src="https://github.com/daracl/ui-dialog/blob/main/demo.gif?raw=true"/>
</p>

# 설치

```
npm install @daracl/dialog
```

- ESM / CJS : `import Dialog from "@daracl/dialog"` 또는 `import { Dialog } from "@daracl/dialog"`. 런타임 의존 `@daracl/core` 가 함께 설치된다. CSS 는 `@daracl/dialog/dist/daracl.dialog.min.css` (기존 경로 `dist/index.css` 도 유지).
- UMD (CDN) : `dist/daracl.dialog.min.umd.js` + `dist/daracl.dialog.min.css`. 기존 이름 `dist/daracl.dialog.min.js` · `daracl.dialog.js` 도 같은 파일로 계속 제공한다. `@daracl/core` 가 포함되어 있어 다른 스크립트가 필요 없다. 전역 `Daracl.dialog` (이미 있는 `window.Daracl` 의 다른 컴포넌트는 유지된다).

# build
```
npm run build        # vite: build:escjs(ESM/CJS) → build:umd(UMD) → mergenclean(병합 · d.ts · 기존 이름 복사)
npm run dev          # 개발 서버 http://127.0.0.1:5182/uitest/index.html
npm test             # jest (jsdom)
npm run lint
npm run typecheck
npm run audit:security
```

# 사용방법
```
var dialogObj = Daracl.dialog.create({
    title: 'dialog', width: 500, height: 'auto', icon: "info", isModal: true, resizable: true, autoOpen: false, template: '<a href="https://varsql.com" target="_blank">링크 이동</a>', buttons: [
    {
        label: 'ok', styleClass: "info", callback: function (e) {
            alert('ok')
        }
    }
    , {
        label: 'Cancel', callback: function (e) {
            dialogObj.hide();
        }
    }
    ], afterOpen: function () {
        console.log('after open')
    }
});
```
  

# dialog 옵션
| key | 설명 | 기본값 | 옵션값 |
|-----|------|-----|-----|
| title | 제목. 문자열은 sanitize 된다 (HTML 보안 참고) | | string, Node |
| template | 본문. 문자열은 **신뢰된 HTML** 로 그대로 표시한다 | | string, Node, function |
| url | iframe 으로 표시할 주소. http, https, mailto, tel, 상대 경로만 | | |
| width | 넓이. 숫자는 px | 400 | number, "auto", "50%", "150px" … |
| height | 높이. 숫자는 px | 300 | |
| styleClass | css class | |  |
| isModal |모달 사용여부  | false |  |
| icon | icon |  | primary, secondary, info, success, warning, danger |
| autoOpen | 자동 열기 여부 | true |  |
| draggable | drag 가능여부 | true |  |
| resizable | 창 리사이즈 여부  | false |  |
| enableHeader | 헤더 영역 보일지 여부  | true |  |
| enableFooter | 하단 버튼 영역 보일지 여부  | true |  |
| enableMaxButton | 최대화 버튼 | true |  |
| enableCloseButton | 닫기 버튼 활성화 여부  | true |  |
| closeOnEscape | ESC 로 닫기 (enableCloseButton 이 false 이면 동작 안 함) | true |  |
| autoFocus | 열 때 dialog 안으로 포커스 이동, 닫을 때 복원 | true |  |
| sanitize | HTML 정리 방식 (아래 HTML 보안) | 지정 안 함 | true, false, function |
| theme | dialog 별 테마. 지정하지 않으면 상위 요소의 `data-daracl-theme` 를 따른다 | | light, dark |
| minHeight | 최소 높이 | 130 |  |
| minWidth | 최소 넓이 | 230 |  |
| zIndex | css z-index | 10000 |  |
| dragOverflow | drag 시 창 밖으로 넘어갈 수 있는지 여부 | true |  |
| buttons | dialog 하단 버튼 | [] |  |
| moveDelay | drag delay time  | 15 |  |
| afterOpen | 오픈후 발생할 이벤트 (`this` 는 dialog, 인자는 wrapper 요소) | false |  |


# dialog button 옵션
| key | 설명 | 기본값 | 옵션값 |
|-----|------|-----|-----|
| label |  버튼명. 문자열은 sanitize 된다 |  '' | string, Node |
| styleClass | 버튼 class | success | primary, secondary, info, success, warning, danger, 사용자 class |
| callback |  클릭(mousedown) 또는 Enter / Space 시 callback |   |  |

# 메서드

| 메서드 | 설명 |
|-----|------|
| `Dialog.create(options)` | 생성 (`new Dialog(options)` 와 같다). 문자열을 넘기면 본문으로 쓴다 |
| `Dialog.setOptions(options)` | 기본 옵션 변경 |
| `Dialog.VERSION` | 버전 |
| `show()` / `hide()` | 열기 / 닫기. 인스턴스를 반환한다 |
| `isOpen()` | 열려 있는지 |
| `maximise()` / `isMaximise()` | 최대화 전환 / 상태 |
| `setTheme(name?)` | dialog 별 테마. 빈 값이면 해제 |
| `destroy()` | DOM · overlay · 이벤트 · 타이머 정리. 여러 번 호출해도 된다 |

# 키보드 · 접근성

- wrapper 는 `role="dialog"`, 모달이면 `aria-modal="true"`, 제목 텍스트가 `aria-label` 이 된다.
- 닫기 · 최대화 · 하단 버튼은 Tab 으로 이동하고 Enter / Space 로 실행한다.
- 모달은 Tab / Shift+Tab 이 dialog 안에서 순환한다. ESC 로 닫힌다.

# HTML 보안

문자열 HTML 은 `@daracl/core` 의 `sanitizeHtml`(허용 목록: 서식 태그 유지, `script` · `iframe` · `form` · `input` · `svg` 등 제거, `on*` 속성 · `javascript:` URL · `url()` style 제거)로 정리한다.

| sanitize | title · 버튼 label | template |
|-----|-----|-----|
| 지정 안 함 (기본) | sanitize | **그대로 (신뢰된 HTML)** |
| `true` | sanitize | sanitize |
| `false` | 그대로 | 그대로 (0.0.7 동작) |
| `(html) => string \| Node` | 지정한 함수 | 지정한 함수 |

- **template 에 사용자 입력 · 서버 데이터 같은 신뢰할 수 없는 값을 넣을 때는 `sanitize: true` 를 지정하거나 DOM `Node` 를 넘긴다.** 기본값이 template 을 그대로 두는 이유는 폼(`input`, `button`)을 쓰는 기존 사용을 유지하기 위해서다.
- `url` 은 http, https, mailto, tel, 상대 경로만 iframe 으로 연다. 그 외(`javascript:` 등)는 열지 않고 `console.warn` 을 남긴다. 외부 사이트를 띄울 때는 `afterOpen` 에서 iframe 에 `sandbox` 를 지정하는 것을 권장한다.

```js
Daracl.dialog.create({ title: userName, template: userComment, sanitize: true });
```

# 테마

ui-grid 와 같은 구조다. 공통 색(글자 / 배경 / 테두리)은 [`@daracl/ui-style`](https://www.npmjs.com/package/@daracl/ui-style) 의 `--dui-*`, dialog 전용 색(overlay, 버튼)은 `--ddlg-*` 변수를 쓴다 (`style/themes/`).

dialog CSS 가 공통 변수 기본값을 특이도 0(`:where`)으로 포함하므로 **`theme-vars.css` 없이도** light / dark / OS 설정이 동작한다. 앱이 `theme-vars.css` 를 로드하거나 `:root` 에 값을 지정하면 그 값이 우선한다.

```js
// 전체 전환
document.documentElement.setAttribute('data-daracl-theme', 'dark');

// dialog 하나만
Daracl.dialog.create({ title: 'dark', theme: 'dark', template: '...' });
dialogObj.setTheme('light');
dialogObj.setTheme();          // 해제 → 상위 요소를 따른다

// 색 재정의
// :root { --ddlg-btn-primary-bg: #0d6efd; --ddlg-btn-primary-color: #fff; }
```

> `style/` 의 SCSS 원본을 직접 컴파일하는 경우 `@daracl/ui-style` 을 찾을 수 있어야 합니다. (sass CLI : `--load-path=node_modules`)

# 빌드 산출물 (dist)

| 파일 | 내용 |
|-----|------|
| `index.js` · `index.min.js` | ESM (`@daracl/core` external) |
| `index.cjs` · `index.min.cjs` | CJS |
| `daracl.dialog.umd.js` · `daracl.dialog.min.umd.js` | UMD (`window.Daracl.dialog`, core 포함) |
| `daracl.dialog.css` · `daracl.dialog.min.css` | 스타일 |
| `daracl.dialog.js` · `daracl.dialog.min.js` · `index.css` | 0.0.7 까지의 이름 (UMD · CSS 와 같은 내용) |
| `index.d.ts` · `dialog.d.ts` | 타입 선언 |

# 문서

- [마이그레이션 가이드](docs/migration/migration-guide.md)
- [npm 자동 배포 설정](docs/NPM_PUBLISH.md) · 예제: `npm run dev` → `uitest/index.html`
- [보안 점검](docs/security/security-audit.md) · [테스트 보고서](docs/testing/test-report.md) · [개선 보고서](docs/improvements/improvement-report.md)
