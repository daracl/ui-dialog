// SCSS 를 별도 Node 프로세스에서 컴파일한다. (jsdom 안에서는 sass 의 파일 탐색이 동작하지 않는다. 하네스 "알려진 함정")
// 사용 : node test/helpers/compileStyle.js <scss 파일>  → 표준 출력으로 CSS
const path = require("path");
const sass = require("sass");

const file = process.argv[2] || path.resolve(__dirname, "../../style/daracl.dialog.scss");
const result = sass.compile(file, { loadPaths: [path.resolve(__dirname, "../../node_modules")], style: "expanded" });
process.stdout.write(result.css);
