import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIndianPhoneNumber } from '../../js/phone-number.js';

test('Indian OTP phone inputs accept national and E.164 forms and normalize to +91', () => {
  for (const input of ['9876543210', '+919876543210', '+91 98765 43210', '91-9876543210']) {
    assert.deepEqual(normalizeIndianPhoneNumber(input), {
      nationalNumber: '9876543210',
      e164: '+919876543210',
    });
  }
  for (const input of ['', '+91987654321', '+911234567890', '98765432100', 'abc']) {
    assert.equal(normalizeIndianPhoneNumber(input), null);
  }
});
