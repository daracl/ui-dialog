/** @jest-environment node */
// 기본 보안 검사 : src 에 위험한 DOM / 실행 API 가 새로 들어오지 않게 막는다. (CI 품질 게이트)
const fs = require("fs");
const path = require("path");

const srcDir = path.resolve(__dirname, "../src");
const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".js"));
const read = (f) => fs.readFileSync(path.join(srcDir, f), "utf8");

describe("src 위험 API 사용 금지", () => {
  it.each(files)("%s : innerHTML / outerHTML / document.write / eval / new Function 을 쓰지 않는다", (file) => {
    const code = read(file);
    expect(code).not.toMatch(/\.(innerHTML|outerHTML)\s*=/);
    expect(code).not.toMatch(/document\.write(ln)?\s*\(/);
    expect(code).not.toMatch(/\beval\s*\(/);
    expect(code).not.toMatch(/new\s+Function\s*\(/);
  });

  it("insertAdjacentHTML 은 appendHtml(신뢰 경계) 안에서만 쓴다", () => {
    const code = read("dialog.js");
    const start = code.indexOf("  appendHtml(target, value, trusted) {");
    const end = code.indexOf("\n  }\n", start);
    expect(start).toBeGreaterThan(-1);
    const inside = code.slice(start, end);
    const total = (code.match(/insertAdjacentHTML/g) || []).length;
    const inAppend = (inside.match(/insertAdjacentHTML/g) || []).length;
    expect(inAppend).toBe(total);
  });

  it("iframe src 는 isSafeUrl 검사 뒤에만 지정한다", () => {
    const code = read("dialog.js");
    expect(code.indexOf("isSafeUrl(url)")).toBeGreaterThan(-1);
    expect(code.indexOf("isSafeUrl(url)")).toBeLessThan(code.indexOf("frame.src = url"));
  });
});
