// 빌드시 주입되는 값 (webpack DefinePlugin, esbuild define, jest globals)
declare const APP_VERSION: string;

// UMD 전역 (src/index.umd.js). 다른 Daracl 컴포넌트(grid 등)와 같은 객체를 공유한다.
interface Window {
  Daracl?: { [name: string]: unknown };
}
