// Jest 설정 (CommonJS). 소스가 JavaScript 이므로 ts-jest 대신 babel-jest 를 쓴다. (하네스 기준은 ts-jest + jsdom)
const packageJson = require("./package.json");

module.exports = {
  verbose: true,
  testEnvironment: "jest-environment-jsdom",
  testMatch: ["<rootDir>/test/**/*.test.js"],
  transform: {
    "^.+\.js$": "babel-jest",
  },
  moduleNameMapper: {
    // 스타일 import 는 jsdom 에서 의미가 없으므로 빈 모듈로 바꾼다. (SCSS 검증은 test/style.test.js 가 별도 프로세스로 한다)
    "\.(css|scss)$": "<rootDir>/test/__mocks__/styleMock.js",
  },
  globals: {
    APP_VERSION: packageJson.version,
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
