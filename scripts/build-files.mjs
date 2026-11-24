// 빌드 산출물 정리 (ui-grid scripts/build-files.mjs 기준)
//   unmin        : dist/unmin 을 dist 로 복사 (development 산출물 병합)
//   clean-unmin  : dist/unmin 삭제
//   legacy       : 0.0.7 까지의 공개 파일 이름을 유지한다
//                  daracl.dialog(.min).umd.js → daracl.dialog(.min).js, daracl.dialog.css → index.css
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

// 기존 이름 → 새 이름 (CDN · import 경로 호환)
export const LEGACY_FILES = [
  ["daracl.dialog.min.js", "daracl.dialog.min.umd.js"],
  ["daracl.dialog.js", "daracl.dialog.umd.js"],
  ["daracl.dialog.js.map", "daracl.dialog.umd.js.map"],
  ["index.css", "daracl.dialog.css"],
  ["index.css.map", "daracl.dialog.css.map"],
];

// 출력 경로에 링크가 있으면 저장소 밖에 쓸 수 있으므로 중단한다.
function assertNotLink(target) {
  try {
    if (lstatSync(target).isSymbolicLink()) throw new Error(`출력 경로에 링크를 사용할 수 없습니다: ${target}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function copyTree(source, destination) {
  if (!existsSync(source)) return;
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const input = join(source, entry.name);
    const output = join(destination, entry.name);
    assertNotLink(output);
    if (entry.isDirectory()) copyTree(input, output);
    else {
      mkdirSync(dirname(output), { recursive: true });
      copyFileSync(input, output);
    }
  }
}

export function buildFiles(command) {
  assertNotLink(dist);
  const unmin = join(dist, "unmin");
  if (command === "unmin") copyTree(unmin, dist);
  else if (command === "clean-unmin") rmSync(unmin, { recursive: true, force: true });
  else if (command === "legacy") {
    for (const [legacy, source] of LEGACY_FILES) {
      const from = join(dist, source);
      if (!existsSync(from)) {
        // .map 은 production 에서 만들지 않을 수 있다. 본 파일이 없으면 빌드 오류다.
        if (source.endsWith(".map")) continue;
        throw new Error(`산출물이 없습니다: dist/${source}`);
      }
      const to = join(dist, legacy);
      assertNotLink(to);
      copyFileSync(from, to);
    }
  } else throw new Error(`지원하지 않는 작업: ${command}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new Error("작업 하나만 지정하세요. (unmin | clean-unmin | legacy)");
  buildFiles(process.argv[2]);
}
