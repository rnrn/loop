param(
    [string]$Dir = "$PSScriptRoot\offline"
)

# Установка Claude Code из локальной папки, без обращения к сети.
#
#   powershell -ExecutionPolicy Bypass -File setup\install-claude-offline.ps1
#
# Повторяет проверки официального claude.ai/install.ps1: разрядность,
# выбор платформы, сверка SHA256 с манифестом. Отличие одно — берёт файлы
# с диска, а не скачивает, и не удаляет их после установки.
#
# Папку готовит модератор: node setup/fetch-claude.mjs

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not [Environment]::Is64BitProcess) {
    Write-Error "Claude Code не поддерживает 32-битную Windows."
    exit 1
}

if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { $platform = 'win32-arm64' }
else { $platform = 'win32-x64' }

# Версия не задана — берём самую свежую из имеющихся папок
$versionDir = Get-ChildItem -Path $Dir -Directory -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending | Select-Object -First 1

if (-not $versionDir) {
    Write-Error "В $Dir нет ни одной версии. Модератор готовит папку так: node setup/fetch-claude.mjs"
    exit 1
}

$exe = Join-Path $versionDir.FullName "claude-$platform.exe"
$manifestPath = Join-Path $versionDir.FullName 'manifest.json'

if (-not (Test-Path $exe)) {
    Write-Error "Нет файла для вашей платформы: $exe"
    exit 1
}

Write-Host "Версия:   $($versionDir.Name)"
Write-Host "Платформа: $platform"

# Сверка контрольной суммы — та же защита, что в официальном установщике
if (Test-Path $manifestPath) {
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    $expected = $manifest.platforms.$platform.checksum
    $actual = (Get-FileHash -Path $exe -Algorithm SHA256).Hash.ToLower()
    if ($expected -and $actual -ne $expected.ToLower()) {
        Write-Error "Контрольная сумма не совпала. Файл повреждён или подменён — установка отменена."
        exit 1
    }
    Write-Host "SHA256:   сверен"
} else {
    Write-Warning "manifest.json отсутствует — проверить подлинность файла нечем."
}

Write-Host ""
Write-Host "Установка..."
& $exe install
$code = $LASTEXITCODE

if ($code -ne 0) {
    Write-Error "Установка завершилась с ошибкой (код $code)"
    exit $code
}

Write-Host ""
Write-Host "Установлено. Осталось авторизоваться:" -ForegroundColor Green
Write-Host "  claude" -ForegroundColor White
Write-Host ""
Write-Host "Авторизация требует интернета — офлайн-установка её не заменяет." -ForegroundColor DarkGray
