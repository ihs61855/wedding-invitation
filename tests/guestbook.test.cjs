const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scope = { fetch, atob, AbortController, setTimeout, clearTimeout, TypeError, Error };
vm.createContext(scope);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../guestbook.js'), 'utf8'), scope);
const GuestbookApi = scope.GuestbookApi;
const makeApi = request => new GuestbookApi('https://example.supabase.co/', 'sb_publishable_example', request);
const success = body => ({ ok: true, json: async () => body });

test('page requests use the RPC contract and publishable key without a fake JWT', async () => {
  const calls = [];
  const api = makeApi(async (url, options) => {
    calls.push({ url, options });
    return success({ page: 2, pages: 2, total: 11, comments: [{ name: '마지막 방문자' }] });
  });
  const result = await api.list(2);
  assert.equal(calls[0].url, 'https://example.supabase.co/rest/v1/rpc/list_guestbook');
  assert.deepEqual(JSON.parse(calls[0].options.body), { p_page: 2 });
  assert.equal(calls[0].options.headers.apikey, 'sb_publishable_example');
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.equal(result.total, 11);
  assert.equal(result.comments[0].name, '마지막 방문자');
  await api.list(-3);
  assert.equal(JSON.parse(calls[1].options.body).p_page, 1);
});

test('new comments send a side and trimmed plain text without a delete password', async () => {
  const api = makeApi(async (url, options) => {
    assert.match(url, /add_guestbook$/);
    assert.deepEqual(JSON.parse(options.body), { p_side: 'bride', p_name: '친구', p_message: '<b>축하해!</b>' });
    return success({ ok: true, id: 'comment-id' });
  });
  assert.equal((await api.add('bride', ' 친구 ', ' <b>축하해!</b> ')).ok, true);
});

test('password verification is delegated to the delete RPC', async () => {
  const api = makeApi(async (url, options) => {
    assert.match(url, /delete_guestbook$/);
    assert.deepEqual(JSON.parse(options.body), { p_id: 'comment-id', p_password: 'test-password' });
    return success({ ok: false, reason: 'invalid_password' });
  });
  assert.equal((await api.remove('comment-id', 'test-password')).reason, 'invalid_password');
});

test('legacy anon JWT works, while secret and service_role keys are rejected', async () => {
  const jwt = role => 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ role })).toString('base64url') + '.signature';
  const key = jwt('anon');
  const api = new GuestbookApi('https://example.supabase.co', key, async (url, options) => {
    assert.equal(options.headers.Authorization, `Bearer ${key}`);
    return success({ comments: [] });
  });
  await api.list();
  assert.throws(() => new GuestbookApi('https://example.supabase.co', 'sb_secret_private'), /공개/);
  assert.throws(() => new GuestbookApi('https://example.supabase.co', jwt('service_role')), /anon/);
});

test('HTTP failures show a useful message instead of server internals', async () => {
  const api = makeApi(async () => ({ ok: false, json: async () => ({ detail: 'private database detail' }) }));
  await assert.rejects(api.list(), /방명록에 연결하지 못했어요/);
});

test('connection failures become a retryable Korean message', async () => {
  const api = makeApi(async () => { throw new TypeError('fetch failed'); });
  await assert.rejects(api.list(), /인터넷 연결을 확인/);
});
