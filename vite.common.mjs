// vite 공통 설정 (ui-grid vite.common.mjs · 하네스 templates/reference/vite.common.js 기준)
// ui-grid 에서 제외한 것 : aggressiveHtmlMinify(html`` 템플릿 전용), uitest 목 API, link-core(core 소스 연결)
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export const topBanner = `/*!
* ${packageJson.name} v${packageJson.version}
* Copyright 2024-${new Date().getUTCFullYear()} darainfo and other contributors;
* Licensed ${packageJson.license}
*/`;

export const MODULE_NAME = "daracl.dialog";

/** 공통 asset 설정 : css 파일 이름을 daracl.dialog(.min).css 로 고정한다 */
export const createAssetFileNames = (isProd) => {
  return (assetInfo) => {
    if ((assetInfo.names ?? [assetInfo.name]).some((name) => name?.endsWith(".css"))) {
      return isProd ? `${MODULE_NAME}.min.[ext]` : `${MODULE_NAME}.[ext]`;
    }
    return "assets/[name].[ext]";
  };
};

export const createCommonConfig = () => ({
  // Vite 기본값(none)이 Rollup 배너까지 제거하지 않도록 배포 라이선스를 보존한다.
  esbuild: { legalComments: "inline" },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern",
      },
    },
  },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },

  // package.json 의 version 을 빌드 시 주입한다. (src 에서 APP_VERSION 으로 사용)
  define: {
    APP_VERSION: JSON.stringify(packageJson.version),
  },

  optimizeDeps: { exclude: ["@daracl/core/utils"] },

  preview: { host: "127.0.0.1" },

  server: {
    fs: { strict: true, allow: [__dirname] },
    host: "127.0.0.1",
    port: 5182,
    open: "/uitest/index.html",
    watch: {
      ignored: ["!**/src/**"],
    },
  },
});
