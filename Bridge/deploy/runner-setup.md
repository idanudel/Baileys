# Registering the self-hosted GitHub Actions runner (one-time, on the Pi)

`.github/workflows/deploy.yml` targets `runs-on: self-hosted`, which requires a
runner registered specifically for this repo. Do this once, as your normal Pi user
(not the diagnostic `claude` user, which has no access to project files or a
general sudoers allowlist).

## 1. Get a registration token

Registration tokens expire after about an hour, so generate one right before you
need it rather than in advance. Either:

- Ask for one to be generated via `gh api -X POST repos/idanudel/Baileys/actions/runners/registration-token`
  (needs `gh` authenticated as an account with admin on the repo), or
- Get one from the GitHub UI: **Settings → Actions → Runners → New self-hosted
  runner** on `idanudel/Baileys`.

## 2. Install the runner (on the Pi)

```sh
mkdir -p ~/actions-runner-baileys-bridge && cd ~/actions-runner-baileys-bridge

# Get the latest linux-arm (32-bit Pi) runner package version/URL from
# https://github.com/actions/runner/releases before running this - the
# filename below is illustrative, not guaranteed current.
curl -o actions-runner.tar.gz -L https://github.com/actions/runner/releases/download/vX.Y.Z/actions-runner-linux-arm-X.Y.Z.tar.gz
tar xzf actions-runner.tar.gz

./config.sh --url https://github.com/idanudel/Baileys --token <TOKEN FROM STEP 1>
```

Accept the defaults (runner name, work folder) unless you want to distinguish it
from other projects' runners on this Pi - each project already gets its own
directory (`~/actions-runner-<project>`), so the default name is fine.

## 3. Install as a systemd service (not `./run.sh`)

`./run.sh` only runs in the foreground and dies when the terminal closes or the
Pi reboots - install it as a service instead:

```sh
sudo ./svc.sh install
sudo ./svc.sh start
```

This creates `actions.runner.idanudel-Baileys.<hostname>.service`. Confirm it's
up with `sudo ./svc.sh status`.

## 4. Also required (separate step)

Run (or re-run) `Bridge/deploy/setup.sh` if you haven't already - it installs the
passwordless sudoers rule (`/etc/sudoers.d/baileys-bridge`) that
`.github/workflows/deploy.yml`'s restart step depends on.

## Verifying end-to-end

Push a commit touching anything under `Bridge/` (not just `.md` files) to
`master`, then watch **Actions** on the repo, or just wait for the Pushover
notification.
