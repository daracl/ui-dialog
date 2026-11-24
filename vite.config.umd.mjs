// UMD 빌드 (ui-grid vite.config.umd.mjs 기준). src/index.umd.js 가 window.Daracl.dialog 로 등록한다.
// production → dist/daracl.dialog.min.umd.js / development → dist/unmin/daracl.dialog.umd.js
// 기존 이름(daracl.dialog(.min).js)은 mergenclean 의 copy-legacy 가 함께 만든다.
// @daracl/core 를 번들하므로 CDN 사용 시 다른 스크립트가 필요 없다.
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import { createAssetFileNames, createCommonConfig, MODULE_NAME, topBanner } from "./vite.common.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  return {
    ...createCommonConfig(isProd),

    build: {
      outDir: isProd ? "dist" : "dist/unmin",
      // 앞서 만든 ESM/CJS 결과를 지우지 않는다. (build:escjs 이후에 실행)
      emptyOutDir: false,
      sourcemap: !isProd,
      reportCompressedSize: false,

      // ES/CJS와 동일한 esbuild 경로로 압축한다.
      minify: isProd ? "esbuild" : false,

      // ui-grid 는 production 에서 esnext 이다. 이 패키지는 CDN 직접 사용이 많아 es2017 로 낮춘다.
      target: "es2017",

      lib: {
        entry: path.resolve(__dirname, "src/index.umd.js"),
        name: "Daracl",
        formats: ["umd"],
        fileName: () => (isProd ? `${MODULE_NAME}.min.umd.js` : `${MODULE_NAME}.umd.js`),
      },

      rollupOptions: {
        output: {
          banner: topBanner,
          assetFileNames: createAssetFileNames(isProd),

          // production 일때만 코드 최적화
          generatedCode: isProd ? "es2015" : undefined,
        },
      },
    },
  };
});
