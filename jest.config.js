const { jestConfig } = require('@salesforce/sfdx-lwc-jest/config');
module.exports = { ...jestConfig, watchman: false, moduleNameMapper: {
 '^lightning/graphql$': '<rootDir>/tests/jest-mocks/lightning/graphql/graphql.js',
 '^lightning/modal$': '<rootDir>/tests/jest-mocks/lightning/modal/modal.js',
 ...jestConfig.moduleNameMapper
} };
