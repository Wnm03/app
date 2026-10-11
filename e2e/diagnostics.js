'use strict';

/** Classify browser navigation failures without treating environment blocks as app failures. */
function findPolicyBlockedFailure(failures) {
  if (!Array.isArray(failures)) return null;
  return failures.find((failure) => failure && /ERR_BLOCKED_BY_ADMINISTRATOR/.test(String(failure.errorText || ''))) || null;
}

module.exports = { findPolicyBlockedFailure };
