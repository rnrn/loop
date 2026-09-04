#!/usr/bin/env bash
# Проверка ноутбука перед мастер-классом (macOS / Linux).
#
#   bash setup/check.sh
#
# Запускать ДО занятия. Ничего не устанавливает, только проверяет.

problems=0
warnings=0

G='\033[1;92m'; Y='\033[1;93m'; R='\033[1;91m'; D='\033[2m'; N='\033[0m'
[ -t 1 ] || { G=''; Y=''; R=''; D=''; N=''; }

ok()   { printf "${G}[ OK ]${N} %s\n" "$1"; }
soft() { printf "${Y}[ !! ]${N} %s\n" "$1"; warnings=$((warnings+1)); }
bad()  { printf "${R}[ НЕТ ]${N} %s\n" "$1"; problems=$((problems+1)); }
info() { printf "${D}       %s${N}\n" "$1"; }

echo
echo "Проверка окружения мастер-класса"
echo

# --- Node.js: единственная обязательная зависимость ------------------------

if command -v node >/dev/null 2>&1; then
  ver=$(node --version)
  major=$(echo "$ver" | sed 's/^v//' | cut -d. -f1)
  if [ "$major" -ge 20 ] 2>/dev/null; then
    ok "Node.js $ver"
  else
    bad "Node.js $ver — нужна версия 20 или новее"
    info "macOS: brew install node   |   Linux: см. https://nodejs.org/"
  fi
else
  bad "Node.js не установлен"
  info "macOS: brew install node   |   Linux: см. https://nodejs.org/"
fi

command -v npm >/dev/null 2>&1 && ok "npm $(npm --version)" || bad "npm недоступен"

# --- git --------------------------------------------------------------------

command -v git >/dev/null 2>&1 && ok "$(git --version)" || {
  bad "git не установлен"
  info "macOS: xcode-select --install   |   Linux: apt install git"
}

# --- Браузер ----------------------------------------------------------------

browser=""
for c in "/Applications/Google Chrome.app" "/Applications/Microsoft Edge.app"; do
  [ -d "$c" ] && browser="$c" && break
done
[ -z "$browser" ] && for c in google-chrome chromium chromium-browser microsoft-edge; do
  command -v "$c" >/dev/null 2>&1 && browser="$c" && break
done
[ -n "$browser" ] && ok "Браузер: $(basename "$browser")" || {
  soft "Chrome или Edge не найдены"
  info "Подойдёт любой Chromium-браузер с поддержкой микрофона"
}

# --- Coding agent -----------------------------------------------------------

agents=""
for a in claude cursor code codex aider; do
  command -v "$a" >/dev/null 2>&1 && agents="$agents $a"
done
if [ -n "$agents" ]; then
  ok "Coding agent в PATH:$agents"
else
  soft "Coding agent не найден в PATH"
  info "Например: npm install -g @anthropic-ai/claude-code"
  info "ВАЖНО: агент должен быть не только установлен, но и авторизован"
fi

# --- Порты ------------------------------------------------------------------

for port in 5173 5199; do
  if command -v lsof >/dev/null 2>&1 && lsof -i ":$port" >/dev/null 2>&1; then
    soft "Порт $port занят"
  else
    ok "Порт $port свободен"
  fi
done

# --- Итог -------------------------------------------------------------------

echo
if [ "$problems" -gt 0 ]; then
  printf "${R}Не хватает обязательного: %s${N}\n" "$problems"
  info "Установите недостающее ДО занятия — во время практики на это нет времени."
elif [ "$warnings" -gt 0 ]; then
  printf "${Y}Обязательное на месте. Замечаний: %s${N}\n" "$warnings"
  info "Занятие провести можно, но проверьте пункты выше."
else
  printf "${G}Ноутбук готов.${N}\n"
fi
echo
info "Дальше: git clone <url> loop && cd loop && npm run bootstrap"
echo

[ "$problems" -gt 0 ] && exit 1 || exit 0
