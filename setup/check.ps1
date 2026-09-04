# Проверка ноутбука перед мастер-классом (Windows).
#
#   powershell -ExecutionPolicy Bypass -File setup\check.ps1
#
# Запускать ДО занятия. Ничего не устанавливает, только проверяет.

$ErrorActionPreference = 'SilentlyContinue'
$problems = 0
$warnings = 0

function Ok($m)   { Write-Host "[ OK ] $m" -ForegroundColor Green }
function Soft($m) { Write-Host "[ !! ] $m" -ForegroundColor Yellow; $script:warnings++ }
function Bad($m)  { Write-Host "[ НЕТ ] $m" -ForegroundColor Red; $script:problems++ }
function Info($m) { Write-Host "       $m" -ForegroundColor DarkGray }

Write-Host ""
Write-Host "Проверка окружения мастер-класса" -ForegroundColor White
Write-Host ""

# --- Node.js: единственная обязательная зависимость ------------------------

$node = (& node --version) 2>$null
if ($node -match 'v(\d+)\.') {
  $major = [int]$Matches[1]
  if ($major -ge 20) { Ok "Node.js $node" }
  else {
    Bad "Node.js $node — нужна версия 20 или новее"
    Info "winget install OpenJS.NodeJS.LTS"
  }
} else {
  Bad "Node.js не установлен"
  Info "winget install OpenJS.NodeJS.LTS"
  Info "затем ЗАКРЫТЬ и открыть терминал заново"
}

$npm = (& npm --version) 2>$null
if ($npm) { Ok "npm $npm" } else { Bad "npm недоступен (ставится вместе с Node.js)" }

# --- git: нужен, чтобы забрать проект --------------------------------------

$git = (& git --version) 2>$null
if ($git) { Ok $git } else {
  Bad "git не установлен"
  Info "winget install Git.Git"
  Info "Без него проект можно получить ZIP-архивом от модератора"
}

# --- Браузер: нужен настоящий микрофон -------------------------------------

$browsers = @(
  @{ n = 'Google Chrome'; p = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe" },
  @{ n = 'Google Chrome'; p = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe" },
  @{ n = 'Microsoft Edge'; p = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe" },
  @{ n = 'Microsoft Edge'; p = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" }
)
$found = $browsers | Where-Object { Test-Path $_.p } | Select-Object -First 1
if ($found) { Ok "Браузер: $($found.n)" } else {
  Soft "Chrome или Edge не найдены в стандартных путях"
  Info "Подойдёт любой Chromium-браузер с поддержкой микрофона"
}

# --- Микрофон ---------------------------------------------------------------

$mic = Get-CimInstance Win32_PnPEntity | Where-Object {
  $_.PNPClass -eq 'AudioEndpoint' -or $_.Name -match 'Микрофон|Microphone'
}
if ($mic) { Ok "Аудиоустройство найдено: $(($mic | Select-Object -First 1).Name)" }
else { Soft "Микрофон не обнаружен — потребуется гарнитура или mock-режим" }

# --- Coding agent -----------------------------------------------------------

$agents = @('claude', 'cursor', 'code', 'codex', 'aider')
$agentFound = @()
foreach ($a in $agents) {
  if (Get-Command $a -ErrorAction SilentlyContinue) { $agentFound += $a }
}
if ($agentFound.Count -gt 0) { Ok "Coding agent в PATH: $($agentFound -join ', ')" }
else {
  Soft "Coding agent не найден в PATH"
  Info "Например: npm install -g @anthropic-ai/claude-code"
  Info "ВАЖНО: агент должен быть не только установлен, но и авторизован"
}

# --- Порты ------------------------------------------------------------------

foreach ($port in 5173, 5199) {
  $busy = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($busy) { Soft "Порт $port занят" } else { Ok "Порт $port свободен" }
}

# --- Итог -------------------------------------------------------------------

Write-Host ""
if ($problems -gt 0) {
  Write-Host "Не хватает обязательного: $problems" -ForegroundColor Red
  Write-Host "Установите недостающее ДО занятия — во время практики на это нет времени." -ForegroundColor DarkGray
} elseif ($warnings -gt 0) {
  Write-Host "Обязательное на месте. Замечаний: $warnings" -ForegroundColor Yellow
  Write-Host "Занятие провести можно, но проверьте пункты выше." -ForegroundColor DarkGray
} else {
  Write-Host "Ноутбук готов." -ForegroundColor Green
}
Write-Host ""
Write-Host "Дальше: git clone <url> loop; cd loop; npm run bootstrap" -ForegroundColor DarkGray
Write-Host ""

exit $(if ($problems -gt 0) { 1 } else { 0 })
