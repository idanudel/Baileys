#!/bin/sh
# First-time setup for the Baileys bridge on the Pi.
# Run from inside the Bridge/ directory: sh deploy/setup.sh
set -eu

BRIDGE_DIR=$(pwd)
LOG_DIR=/var/log/baileys-bridge

if [ ! -f .env ]; then
	cp .env.example .env
	echo "Created .env from .env.example - edit API_KEY and WEBHOOK_URLS before starting the service."
fi

npm ci --omit=dev

mkdir -p "$(grep '^AUTH_DIR=' .env | cut -d= -f2 | sed "s|^\./||")" 2>/dev/null || true
chmod 700 "$(grep '^AUTH_DIR=' .env | cut -d= -f2 | sed "s|^\./||")" 2>/dev/null || true

sudo mkdir -p "$LOG_DIR"
sudo chown "$(whoami)":"$(whoami)" "$LOG_DIR"

sed "s|__BRIDGE_DIR__|$BRIDGE_DIR|g" deploy/baileys-bridge.service | sudo tee /etc/systemd/system/baileys-bridge.service > /dev/null

sudo systemctl daemon-reload
sudo systemctl enable --now baileys-bridge

echo "Service started. Once it's up, pair by opening:"
echo "  http://<pi-lan-ip>:$(grep '^PORT=' .env | cut -d= -f2)/qr?key=<your API_KEY>"
