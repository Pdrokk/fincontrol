import { test } from 'node:test'
import assert from 'node:assert/strict'
import { remetenteIPCConfiavel, urlExternaPermitida } from '../src/main/seguranca.ts'

test('IPC permite somente o documento registrado no frame principal', () => {
  const documento = 'file:///C:/FinControl/resources/app/renderer/index.html'
  assert.equal(remetenteIPCConfiavel(documento, documento, true), true)
  assert.equal(remetenteIPCConfiavel(documento + '#relatorios', documento, true), true)
  assert.equal(remetenteIPCConfiavel(documento, documento, false), false)
  assert.equal(remetenteIPCConfiavel(documento, undefined, true), false)
  assert.equal(remetenteIPCConfiavel(undefined, documento, true), false)
})

test('IPC rejeita outro arquivo, documento remoto e URL inválida', () => {
  const documento = 'file:///C:/FinControl/index.html'
  for (const url of ['file:///C:/FinControl/outro.html', 'https://example.org', 'about:blank',
    'data:text/html,teste', 'blob:https://example.org/teste', 'inválido']) {
    assert.equal(remetenteIPCConfiavel(url, documento, true), false)
  }
})

test('IPC de desenvolvimento exige a URL exata configurada', () => {
  const documento = 'http://localhost:5173/'
  assert.equal(remetenteIPCConfiavel(documento, documento, true), true)
  for (const url of ['http://localhost:5174/', 'http://localhost:5173/outro',
    'http://localhost:5173/?origem=externa', 'http://localhost.example.org:5173/']) {
    assert.equal(remetenteIPCConfiavel(url, documento, true), false)
  }
})

test('links externos restringem protocolo, domínio, porta e credenciais', () => {
  assert.equal(urlExternaPermitida('https://github.com/Pdrokk/fincontrol'), true)
  assert.equal(urlExternaPermitida('https://electronjs.org/docs'), true)
  for (const url of ['http://github.com', 'https://github.com.example.org', 'https://github.com:8443',
    'https://usuario@github.com', 'file:///C:/arquivo', 'javascript:alert(1)', 'inválido']) {
    assert.equal(urlExternaPermitida(url), false)
  }
})
