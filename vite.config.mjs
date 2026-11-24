// ESM / CJS 라이브러리 빌드 (ui-grid vite.config.mjs 기준)
// production → dist/index.min.js, index.min.cjs, daracl.dialog.min.css
// development → dist/unmin/index.js, index.cjs, daracl.dialog.css  (mergenclean 이 dist 로 병합)
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import { createAssetFileNames, createCommonConfig, topBanner } from "./vite.common.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  return {
    ...createCommonConfig(isProd),

    build: {
      outDir: isProd ? "dist" : "dist/unmin",
      emptyOutDir: true,
      sourcemap: true,
      reportCompressedSize: false,
      minify: isProd ? "esbuild" : false,

      lib: {
        entry: path.resolve(__dirname, "src/index.js"),
        name: "Daracl",
        formats: ["es", "cjs"],
        fileName: (format) => {
          if (format === "es") {
            return isProd ? "index.min.js" : "index.js";
          }

          return isProd ? "index.min.cjs" : "index.cjs";
        },
      },
      rollupOptions: {
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
        },
        // dependencies 의 @daracl/core 는 번들하지 않는다 (ui-grid 와 동일). UMD 는 번들한다.
        external: ["@daracl/core", "@daracl/core/utils"],
        output: {
          banner: topBanner,
          extend: true,
          // default + named export 를 함께 내보내므로 CJS 는 exports.default / exports.Dialog 로 낸다.
          exports: "named",
          assetFileNames: createAssetFileNames(isProd),
          globals: {
            "@daracl/core": "Daracl",
          },
        },
        // 번들 크기 보고서(rollup-plugin-visualizer)는 필요할 때만 주석을 풀어서 쓴다. open: true 는 커밋하지 않는다.
        // plugins: [visualizer({ filename: 'bundle-report.html', open: true, gzipSize: true, brotliSize: true })],
      },
    },
  };
});
