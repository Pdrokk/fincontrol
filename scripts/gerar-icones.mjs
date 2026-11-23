/**
 * Ícone autoral do FinControl (carteira + moeda).
 * Gera PNG e ICO usando somente módulos nativos do Node — sem dependências extras.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { deflateSync } from 'node:zlib'

const versoes = [16, 24, 32, 48, 64, 128, 256]

function dentroRetanguloArredondado(x, y, x0, y0, x1, y1, raio) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  const cx = Math.max(x0 + raio, Math.min(x, x1 - raio))
  const cy = Math.max(y0 + raio, Math.min(y, y1 - raio))
  return (x - cx) ** 2 + (y - cy) ** 2 <= raio ** 2
}

function corNoPonto(x, y) {
  const ret = (x0, y0, x1, y1, r) =>
    dentroRetanguloArredondado(x, y, x0, y0, x1, y1, r)
  if (!ret(0.05, 0.05, 0.95, 0.95, 0.21)) return [0, 0, 0, 0]

  let cor = [14, 27, 52, 255]
  if (ret(0.18, 0.29, 0.82, 0.76, 0.11)) {
    const t = Math.max(0, Math.min(1, (x - 0.18) / 0.64))
    cor = [Math.round(30 + 35 * t), Math.round(91 + 35 * t), Math.round(201 + 39 * t), 255]
  }
  if (ret(0.23, 0.25, 0.70, 0.34, 0.04)) cor = [203, 223, 252, 255]
  if (ret(0.23, 0.29, 0.71, 0.34, 0.03)) cor = [32, 91, 187, 255]

  if (ret(0.52, 0.42, 0.87, 0.63, 0.055)) cor = [213, 232, 255, 255]
  if (ret(0.53, 0.435, 0.855, 0.615, 0.045)) cor = [18, 49, 108, 255]

  const dx = x - 0.672
  const dy = y - 0.525
  if (dx * dx + dy * dy < 0.047 ** 2) cor = [255, 198, 75, 255]
  return cor
}

function pixels(tamanho) {
  const fora = Buffer.alloc(tamanho * tamanho * 4)
  for (let y = 0; y < tamanho; y++) {
    for (let x = 0; x < tamanho; x++) {
      const acumulado = [0, 0, 0, 0]
      // Supersampling 3 x 3 para suavizar bordas também em ícones pequenos.
      for (let sy = 0; sy < 3; sy++) {
        for (let sx = 0; sx < 3; sx++) {
          const cor = corNoPonto((x + (sx + 0.5) / 3) / tamanho,
            (y + (sy + 0.5) / 3) / tamanho)
          for (let k = 0; k < 4; k++) acumulado[k] += cor[k]
        }
      }
      const pos = (y * tamanho + x) * 4
      for (let k = 0; k < 4; k++) fora[pos + k] = Math.round(acumulado[k] / 9)
    }
  }
  return fora
}

const tabelaCRC = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  tabelaCRC[n] = c >>> 0
}

function checksum(buf) {
  let crc = 0xffffffff
  for (const byte of buf) crc = tabelaCRC[(crc ^ byte) & 255] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function blocoPng(tipo, conteudo) {
  const nome = Buffer.from(tipo)
  const tamanho = Buffer.alloc(4)
  tamanho.writeUInt32BE(conteudo.length)
  const c = Buffer.alloc(4)
  c.writeUInt32BE(checksum(Buffer.concat([nome, conteudo])))
  return Buffer.concat([tamanho, nome, conteudo, c])
}

function png(tamanho) {
  const dados = pixels(tamanho)
  const cabecalho = Buffer.alloc(13)
  cabecalho.writeUInt32BE(tamanho, 0)
  cabecalho.writeUInt32BE(tamanho, 4)
  cabecalho[8] = 8
  cabecalho[9] = 6 // RGBA
  const linhas = Buffer.alloc(tamanho * (1 + tamanho * 4))
  for (let y = 0; y < tamanho; y++) {
    const ini = y * (1 + tamanho * 4)
    linhas[ini] = 0
    dados.copy(linhas, ini + 1, y * tamanho * 4, (y + 1) * tamanho * 4)
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    blocoPng('IHDR', cabecalho),
    blocoPng('IDAT', deflateSync(linhas, { level: 9 })),
    blocoPng('IEND', Buffer.alloc(0))
  ])
}

const imagens = versoes.map(png)
const icoCabecalho = Buffer.alloc(6 + imagens.length * 16)
icoCabecalho.writeUInt16LE(1, 2)
icoCabecalho.writeUInt16LE(imagens.length, 4)
let offset = icoCabecalho.length
for (let i = 0; i < imagens.length; i++) {
  const pos = 6 + i * 16
  const tam = versoes[i]
  icoCabecalho[pos] = tam === 256 ? 0 : tam
  icoCabecalho[pos + 1] = tam === 256 ? 0 : tam
  icoCabecalho.writeUInt16LE(1, pos + 4)
  icoCabecalho.writeUInt16LE(32, pos + 6)
  icoCabecalho.writeUInt32LE(imagens[i].length, pos + 8)
  icoCabecalho.writeUInt32LE(offset, pos + 12)
  offset += imagens[i].length
}

for (const caminho of ['build/generated/icon.ico', 'build/generated/icon.png']) {
  mkdirSync(dirname(caminho), { recursive: true })
  writeFileSync(caminho, caminho.endsWith('.ico')
    ? Buffer.concat([icoCabecalho, ...imagens])
    : imagens[imagens.length - 1])
}

console.info('Ícones FinControl gerados: build/generated/icon.ico e build/generated/icon.png')
