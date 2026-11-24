// UMD 진입점 : 브라우저 전역 window.Daracl.dialog 로 등록한다. (ui-grid src/index.umd.ts 와 같은 방식)
// 이전 webpack 설정(library: ["Daracl", "dialog"], type: "window", export: "default")과 같은 전역이다.
import Dialog from "./dialog";

import "../style/daracl.dialog.scss";

if (typeof window !== "undefined") {
  window.Daracl = window.Daracl || {};
  window.Daracl.dialog = Dialog;
}
