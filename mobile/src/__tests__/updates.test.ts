import { newer } from '../lib/updates';

test('version comparison', () => {
  expect(newer('1.0.1', '1.0.0')).toBe(true);
  expect(newer('1.10.0', '1.9.9')).toBe(true);
  expect(newer('2.0.0', '1.99.99')).toBe(true);
  expect(newer('1.0.0', '1.0.0')).toBe(false);
  expect(newer('1.0.0', '1.0.1')).toBe(false);
});
