const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, 'admin-app');
assert.match(fs.readFileSync(path.join(root, 'login.html'), 'utf8'), /href="forgot-password.html">Forgot password\?/);
const source = fs.readFileSync(path.join(root, 'forgot-password.js'), 'utf8');
async function run(reply, valid = true) {
  let submit, request;
  const elements = {
    recoveryForm: {addEventListener: (_, fn) => { submit = fn; }, reportValidity: () => valid},
    email: {value: ' staff@example.test '}, sendReset: {disabled: false}, status: {textContent: ''}
  };
  vm.runInNewContext(source, {
    document: {getElementById: id => elements[id]},
    fetch: async (url, options) => { request = {url, options}; return reply(); }
  });
  await submit({preventDefault() {}});
  assert.equal(elements.sendReset.disabled, false);
  return {elements, request};
}
(async () => {
  const success = await run(() => ({ok: true, json: async () => ({ok: true})}));
  assert.equal(JSON.parse(success.request.options.body).email, 'staff@example.test');
  assert.match(success.request.url, /\/api\/admin\/email-reset-request$/);
  assert.match(success.elements.status.textContent, /inbox and spam/);
  const failure = await run(() => ({ok: false, json: async () => ({error: 'internal details'})}));
  assert.match(failure.elements.status.textContent, /Unable to send/);
  assert.doesNotMatch(failure.elements.status.textContent, /internal details/);
  const offline = await run(() => { throw new Error('Offline'); });
  assert.equal(offline.elements.status.textContent, 'Offline');
  const invalid = await run(() => { throw new Error('Must not call'); }, false);
  assert.equal(invalid.request, undefined);
  console.log('Admin recovery: link, request, success, failure, offline and invalid-input checks passed.');
})();
