const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, '.github', 'workflows', 'ci.yml');

function readWorkflow() {
  return fs.readFileSync(workflowPath, 'utf8');
}

test('S2428 CI workflow exists and triggers on push and pull_request', () => {
  const workflow = readWorkflow();
  assert.match(workflow, /^name:\s*CI\s*$/m);
  assert.match(workflow, /^\s*push:\s*$/m);
  assert.match(workflow, /^\s*pull_request:\s*$/m);
});

test('S2428 CI requires a real npm lockfile before npm ci', () => {
  const workflow = readWorkflow();
  assert.match(workflow, /package-lock\.json/);
  assert.match(workflow, /npm-shrinkwrap\.json/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /CI BLOCKED: package-lock\.json or npm-shrinkwrap\.json is required/);
});

test('S2428 CI runs the repository release-grade check after locked install', () => {
  const workflow = readWorkflow();
  const installIndex = workflow.indexOf('run: npm ci');
  const checkIndex = workflow.indexOf('run: npm run check');
  assert.ok(installIndex >= 0, 'npm ci step missing');
  assert.ok(checkIndex > installIndex, 'npm run check must execute after npm ci');
});
