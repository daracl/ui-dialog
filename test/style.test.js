/** @jest-environment node */
// 스타일 테스트 : SCSS 를 별도 Node 프로세스에서 컴파일해 테마 구조를 검증한다.
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
let css = "";

beforeAll(() => {
  css = execFileSync(process.execPath, [path.join(root, "test/helpers/compileStyle.js"), path.join(root, "style/daracl.dialog.scss")], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
});

describe("daracl.dialog.scss", () => {
  it("공통 테마 기본값(--dui-*)은 특이도 0(:where)으로만 선언한다", () => {
    // :where 밖에서 --dui-* 를 선언하면 앱의 theme-vars.css 값을 덮어쓴다.
    const blocks = css.split("}").map((b) => b.split("{"));
    blocks.forEach(([selector, body]) => {
      if (body && /--dui-[\w-]+\s*:/.test(body)) {
        expect(selector.trim()).toMatch(/^(:where\(|@media[^{]*\{?\s*:where\()/);
      }
    });
    expect(css).toContain(":where(:root, [data-daracl-theme=light])");
    expect(css).toContain(":where([data-daracl-theme=dark])");
  });

  it("dialog 전용 변수는 --ddlg-* 이고 전역 · dialog 별 · OS 다크 테마를 모두 출력한다", () => {
    expect(css).toMatch(/\.daracl-dialog-wrapper\[data-daracl-theme=dark\][^{]*\{[^}]*--ddlg-overlay-bg: #000000/);
    expect(css).toMatch(/\[data-daracl-theme=dark\] \.daracl-dialog-wrapper/);
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)\s*\{\s*:where\(:root:not\(\[data-daracl-theme\]\)\) \.daracl-dialog-wrapper/);
    expect(css).toContain("background: var(--ddlg-overlay-bg, #aaaaaa)");
    expect(css).toContain("color: var(--ddlg-btn-primary-color, #004085)");
  });

  it("접두사 없는 CSS 변수를 선언하지 않는다", () => {
    const declared = css.match(/(^|[;{\s])--[\w-]+\s*:/g) || [];
    declared.forEach((d) => {
      expect(d.trim().replace(/^[;{]/, "").trim()).toMatch(/^--(dui|ddlg)-/);
    });
  });

  it("기존 공개 class 와 keyframes 이름을 유지한다", () => {
    [".daracl-dialog-hidden", ".daracl-dialog-overlay", ".daracl-dialog-wrapper", ".dialog-header", ".dialog-body", ".dialog-footer", ".dialog-btn", ".resizer", ".maximise", ".transform-disable", ".move-on"].forEach((c) => expect(css).toContain(c));
    expect(css).toContain("@keyframes ddlg-fade-in");
    expect(css).toContain("@keyframes ddlg-fade-out");
    expect(css).toContain("@keyframes daradialogHide");
  });

  it("키보드 포커스 표시(:focus-visible)가 있다", () => {
    expect(css).toMatch(/\.dialog-btn:focus-visible/);
  });
});
