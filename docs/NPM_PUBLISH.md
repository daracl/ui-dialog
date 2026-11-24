# npm 자동 배포 설정

`.github/workflows/publish-npm.yml` 은 ui-grid 의 배포 워크플로와 같은 방식이다 (하네스 `templates/reference/publish-npm.yml`, `NPM_PUBLISH.md` 기준).

## 동작

1. `main` 에 push 할 때마다 마지막 커밋의 `package.json` `version` 과 직전 커밋(`HEAD^`)의 값을 비교한다.
2. **버전이 같으면** 설치 · 검증 · 배포 job 전체를 건너뛴다 (`publish` job 이 skipped).
3. **버전이 바뀌면** Node.js 24 · npm 11 에서 아래를 차례로 실행한다. 하나라도 실패하면 배포하지 않는다.
   - 이미 게시된 버전인지 확인 (`npm view @daracl/dialog@<version>`)
   - `npm install` → `npm run lint` → `npm run typecheck` → `npx jest --runInBand --ci` → `npm run build`
   - `npm publish --access public --ignore-scripts` (위에서 빌드했으므로 `prepack` 의 중복 빌드를 생략)
4. 여러 커밋을 한 번에 push 해도 비교 대상은 마지막 두 커밋이다. 부모가 없는 최초 커밋은 배포하지 않는다.

ui-grid 와 다른 점: 이 저장소는 npm 프로젝트라 yarn 대신 npm 으로 설치 · 실행한다. lint · typecheck 단계를 더했다.

`package-lock.json` 이 `.gitignore` 대상이라 `npm install` 을 쓴다. 의존성의 정확한 버전 재현은 보장되지 않는다. lockfile 을 커밋하면 설치 명령을 `npm ci` 로 바꾼다.

## 권장: Trusted Publishing (OIDC)

토큰을 저장하지 않는 방식이다.

1. npmjs.com 의 `@daracl/dialog` 패키지 **Settings → Trusted Publisher** 에서 GitHub Actions 를 선택한다.
2. organization/user: `daracl`, repository: `ui-dialog`, workflow filename: `publish-npm.yml` 을 등록한다. environment 는 비워 둔다.
3. GitHub 저장소에서 Actions 를 활성화한다. 저장소 변수 `NPM_AUTH_MODE` 는 생략하거나 `oidc` 로 둔다. `NPM_TOKEN` 은 필요 없다.
4. 예전 `deploy.yaml` 이 쓰던 `NPM_DEPLOY_TOKEN` secret 은 더 이상 쓰지 않으면 npm 에서 폐기하고 GitHub secret 도 지운다.

- `package.json` 의 `repository.url` 은 실제 저장소(`https://github.com/daracl/ui-dialog.git`)와 같아야 한다. (이번 작업에서 `darainfo/daracl.dialog` → `daracl/ui-dialog` 로 수정)
- OIDC 가 실패해도 자동으로 토큰 방식을 재시도하지 않는다.
- 공식 안내: https://docs.npmjs.com/trusted-publishers/

## 대안: NPM_TOKEN

Trusted Publishing 을 쓸 수 없을 때만 설정한다.

1. npm 에서 `@daracl/dialog` 쓰기 권한이 있는 granular access token 을 발급한다. 패키지의 2FA · 토큰 배포 정책에서 비대화형 배포가 허용되어야 한다.
2. GitHub 저장소 **Settings → Secrets and variables → Actions → Secrets** 에 `NPM_TOKEN` 을 등록한다.
3. 같은 화면의 **Variables** 에 `NPM_AUTH_MODE=token` 을 등록한다.

토큰은 publish 단계에만 전달된다.

## 배포 절차

1. `package.json` 의 `version` 을 새 버전으로 올린다. 이미 게시된 버전은 다시 게시할 수 없다.
2. 커밋하고 `main` 에 push 한다.
3. GitHub **Actions → Publish to npm** 에서 버전 비교와 lint / typecheck / test / build / publish 결과를 확인한다.
4. 버전을 바꾸지 않은 커밋에서는 `publish` job 이 skipped 인지 확인한다.

실패한 배포는 원인을 고친 뒤 해당 실행을 다시 실행할 수 있다. 이미 게시된 실행을 다시 실행하면 "already published" 로 실패한다.

## 품질 게이트와의 관계

- `ci.yml` 은 PR · push 마다 lint · typecheck · test · build · audit 을 돌리고 **배포하지 않는다**.
- `publish-npm.yml` 은 버전이 바뀐 push 에서만 같은 검증을 다시 실행한 뒤 배포한다.
