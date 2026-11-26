import assert from 'node:assert/strict'
import test from 'node:test'
import { origemIPCConfiavel } from '../src/main/segurancaIPC.ts'

const arquivo = 'file:///C:/FinControl/resources/app.asar/out/renderer/index.html'

test('IPC aceita o documento local registrado e fragmentos internos', () => {
  assert.equal(origemIPCConfiavel(arquivo, arquivo, true), true)
  assert.equal(origemIPCConfiavel(arquivo + '#contas', arquivo, true), true)
})

test('IPC rejeita subframes, janelas não registradas e remetentes ausentes', () => {
  assert.equal(origemIPCConfiavel(arquivo, arquivo, false), false)
  assert.equal(origemIPCConfiavel(arquivo, undefined, true), false)
  assert.equal(origemIPCConfiavel(undefined, arquivo, true), false)
})

test('IPC rejeita documentos locais distintos e origens externas', () => {
  for (const origem of [
    'file:///C:/FinControl/outro.html',
    arquivo + '?origem=externa',
    'https://example.org/',
    'about:blank',
    'data:text/html,teste',
    'inválida'
  ]) {
    assert.equal(origemIPCConfiavel(origem, arquivo, true), false)
  }
  assert.equal(origemIPCConfiavel(arquivo, 'inválida', true), false)
  assert.equal(origemIPCConfiavel('about:blank', 'about:blank', true), false)
})

test('IPC em desenvolvimento exige URL, porta e caminho registrados', () => {
  const documento = 'http://localhost:5173/'
  assert.equal(origemIPCConfiavel(documento, documento, true), true)
  for (const origem of [
    'http://localhost:5174/',
    'http://localhost:5173/outra',
    'http://localhost.example.org:5173/',
    'https://localhost:5173/'
  ]) {
    assert.equal(origemIPCConfiavel(origem, documento, true), false)
  }
})
