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

# Passwordless restart/status for this project's own deploy user only, so the
# CI deploy workflow (.github/workflows/deploy.yml) can restart the service
# non-interactively. Validate before installing - never install an unchecked
# sudoers file.
SUDOERS_TMP=$(mktemp)
echo "$(whoami) ALL=(ALL) NOPASSWD: /bin/systemctl restart baileys-bridge, /bin/systemctl is-active baileys-bridge" > "$SUDOERS_TMP"
if sudo visudo -c -f "$SUDOERS_TMP"; then
	sudo cp "$SUDOERS_TMP" /etc/sudoers.d/baileys-bridge
	sudo chmod 440 /etc/sudoers.d/baileys-bridge
	echo "Installed passwordless restart rule at /etc/sudoers.d/baileys-bridge"
else
	echo "Generated sudoers rule failed validation - not installed. See $SUDOERS_TMP" >&2
fi
rm -f "$SUDOERS_TMP"

echo "Service started. Once it's up, pair by opening:"
echo "  http://<pi-lan-ip>:$(grep '^PORT=' .env | cut -d= -f2)/qr?key=<your API_KEY>"
