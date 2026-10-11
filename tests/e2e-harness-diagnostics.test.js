'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { findPolicyBlockedFailure } = require('../e2e/diagnostics');

test('E2E diagnostics classify browser admin navigation blocks separately', () => {
  const failures = [
    { url: 'http://127.0.0.1:8080/index.html', errorText: 'net::ERR_BLOCKED_BY_ADMINISTRATOR' },
    { url: 'http://127.0.0.1:8080/app.js', errorText: 'net::ERR_ABORTED' }
  ];
  assert.equal(findPolicyBlockedFailure(failures), failures[0]);
  assert.equal(findPolicyBlockedFailure([{ errorText: 'net::ERR_CONNECTION_REFUSED' }]), null);
  assert.equal(findPolicyBlockedFailure(null), null);
});
