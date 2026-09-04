// Скачивает бинарник Claude Code для офлайн-раздачи участникам.
// Делает то же, что claude.ai/install.ps1, но НЕ устанавливает и не удаляет файл,
// а складывает его рядом с манифестом — чтобы раздать флешкой или локальной шарой.
//
//   node setup/fetch-claude.mjs                    текущая версия, обе платформы Windows
//   node setup/fetch-claude.mjs 2.1.0              конкретная версия
//   node setup/fetch-claude.mjs latest win32-x64   только одна платформа
//
// Результат кладётся в setup/offline/<версия>/.

import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const BASE = 'https://downloads.claude.ai/claude-code-releases';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), 'offline');

const [askedVersion = 'latest', ...askedPlatforms] = process.argv.slice(2);
const platforms = askedPlatforms.length ? askedPlatforms : ['win32-x64', 'win32-arm64'];

async function text(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return (await res.text()).trim();
}

const version =
  askedVersion === 'latest' || askedVersion === 'stable'
    ? await text(`${BASE}/${askedVersion}`)
    : askedVersion;

if (!/^\d+\.\d+\.\d+/.test(version)) {
  throw new Error(`Сервис вернул не номер версии: ${version.slice(0, 80)}`);
}
console.log(`Версия: ${version}`);

const manifestRaw = await text(`${BASE}/${version}/manifest.json`);
const manifest = JSON.parse(manifestRaw);

const dir = join(OUT, version);
await mkdir(dir, { recursive: true });
await writeFile(join(dir, 'manifest.json'), manifestRaw);

for (const platform of platforms) {
  const entry = manifest.platforms?.[platform];
  if (!entry?.checksum) {
    console.log(`  ${platform}: в манифесте нет — пропущено`);
    continue;
  }

  const url = `${BASE}/${version}/${platform}/claude.exe`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  const bytes = Buffer.from(await res.arrayBuffer());

  // Та же проверка, что в официальном установщике: SHA256 против манифеста.
  const actual = createHash('sha256').update(bytes).digest('hex').toLowerCase();
  if (actual !== String(entry.checksum).toLowerCase()) {
    throw new Error(`${platform}: контрольная сумма не совпала — файл не сохранён`);
  }

  const file = join(dir, `claude-${platform}.exe`);
  await writeFile(file, bytes);
  const mb = (bytes.length / 1024 / 1024).toFixed(1);
  console.log(`  ${platform}: ${mb} МБ, SHA256 сверен`);
}

console.log(`\nГотово: setup/offline/${version}/`);
console.log('Раздайте эту папку участникам вместе с setup/install-claude-offline.ps1');
