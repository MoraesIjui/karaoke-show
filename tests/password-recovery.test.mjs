import test from 'node:test';
import assert from 'node:assert/strict';
import { consumePasswordRecoveryRedirect } from '../src/cloud.js';

async function withRedirect({ hash = '', search = '', pathname = '/karaoke-show/redefinir-senha.html' }, fn) {
  const priorLocation = globalThis.location;
  const priorHistory = globalThis.history;
  let cleaned = '';
  globalThis.location = { hash, search, pathname };
  globalThis.history = { replaceState: (_state, _title, path) => { cleaned = path; } };
  try { return await fn(() => cleaned); }
  finally {
    if (priorLocation === undefined) delete globalThis.location; else globalThis.location = priorLocation;
    if (priorHistory === undefined) delete globalThis.history; else globalThis.history = priorHistory;
  }
}

test('acesso normal sem token não simula recuperação', async () => {
  await withRedirect({}, async () => {
    assert.equal(await consumePasswordRecoveryRedirect(), null);
  });
});

test('fragmento de recuperação abre redefinição e remove token da URL', async () => {
  await withRedirect({ hash: '#access_token=token-teste&type=recovery&expires_in=3600' }, async cleaned => {
    assert.deepEqual(await consumePasswordRecoveryRedirect(), { status: 'ready' });
    assert.equal(cleaned(), '/karaoke-show/redefinir-senha.html');
  });
});

test('erro de recuperação não abre painel e remove parâmetros', async () => {
  await withRedirect({ hash: '#error=access_denied&error_description=token_expired' }, async cleaned => {
    const response = await consumePasswordRecoveryRedirect();
    assert.equal(response.status, 'error');
    assert.equal(cleaned(), '/karaoke-show/redefinir-senha.html');
  });
});

test('retorno de código desconhecido mostra erro em vez da home', async () => {
  await withRedirect({ search: '?code=invalid-flow' }, async cleaned => {
    const response = await consumePasswordRecoveryRedirect();
    assert.equal(response.status, 'error');
    assert.equal(cleaned(), '/karaoke-show/redefinir-senha.html');
  });
});
