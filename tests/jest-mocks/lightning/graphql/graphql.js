import { createTestWireAdapter } from '@salesforce/wire-service-jest-util';
export const graphql = createTestWireAdapter(jest.fn());
export const gql = (strings) => strings.join('');
