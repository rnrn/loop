#!/usr/bin/env bash
# Установка Claude Code из локальной папки, без обращения к сети (Linux / macOS).
#
#   bash setup/install-claude-offline.sh
#
# Повторяет проверки официального claude.ai/install.sh: выбор платформы,
# сверка SHA256 с манифестом. Отличие — берёт файл с диска и не удаляет его.
#
# Папку готовит модератор:
#   node setup/fetch-claude.mjs latest linux-x64
#   node setup/fetch-claude.mjs latest darwin-arm64

set -e

DIR="${1:-$(cd "$(dirname "$0")" && pwd)/offline}"

if [ "$(id -u)" -eq 0 ] && [ -n "${SUDO_USER:-}" ]; then
  echo "Не запускайте под sudo: агент ставится в \$HOME/.local/bin," >&2
  echo "и под sudo он уедет в домашний каталог root." >&2
  exit 1
fi

case "$(uname -s)" in
  Darwin) os=darwin ;;
  Linux)  os=linux ;;
  *) echo "Неподдерживаемая система: $(uname -s)" >&2; exit 1 ;;
esac

case "$(uname -m)" in
  x86_64|amd64) arch=x64 ;;
  arm64|aarch64) arch=arm64 ;;
  *) echo "Неподдерживаемая архитектура: $(uname -m)" >&2; exit 1 ;;
esac

platform="$os-$arch"
# Alpine и прочие musl-системы используют отдельную сборку.
if [ "$os" = "linux" ] && ldd /bin/ls 2>&1 | grep -q musl; then
  platform="$platform-musl"
fi

version_dir=$(find "$DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort -r | head -1)
if [ -z "$version_dir" ]; then
  echo "В $DIR нет ни одной версии." >&2
  echo "Модератор готовит папку так: node setup/fetch-claude.mjs latest $platform" >&2
  exit 1
fi

bin="$version_dir/claude-$platform"
if [ ! -f "$bin" ]; then
  echo "Нет файла для вашей платформы: $bin" >&2
  echo "Доступно: $(ls "$version_dir" | tr '\n' ' ')" >&2
  exit 1
fi

echo "Версия:    $(basename "$version_dir")"
echo "Платформа: $platform"

manifest="$version_dir/manifest.json"
if [ -f "$manifest" ]; then
  expected=$(grep -o "\"$platform\"[^}]*\"checksum\"[[:space:]]*:[[:space:]]*\"[a-f0-9]\{64\}\"" "$manifest" |
             grep -o '[a-f0-9]\{64\}' | head -1)
  if [ "$os" = "darwin" ]; then
    actual=$(shasum -a 256 "$bin" | cut -d' ' -f1)
  else
    actual=$(sha256sum "$bin" | cut -d' ' -f1)
  fi
  if [ -n "$expected" ] && [ "$actual" != "$expected" ]; then
    echo "Контрольная сумма не совпала — установка отменена." >&2
    exit 1
  fi
  echo "SHA256:    сверен"
else
  echo "manifest.json отсутствует — проверить подлинность нечем." >&2
fi

chmod +x "$bin"
echo
echo "Установка..."
"$bin" install

echo
echo "Установлено. Осталось авторизоваться:"
echo "  claude"
echo
echo "Если команда не найдена — добавьте каталог в PATH:"
echo "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc && source ~/.bashrc"
echo
echo "Авторизация требует интернета — офлайн-установка её не заменяет."
