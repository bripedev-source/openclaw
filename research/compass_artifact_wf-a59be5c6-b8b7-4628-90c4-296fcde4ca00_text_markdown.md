# OpenClaw: the open-source AI assistant taking over GitHub

**OpenClaw is a self-hosted, model-agnostic AI agent written in TypeScript that connects to your messaging platforms and autonomously executes real-world tasks on your hardware.** With **217,000+ GitHub stars** and **900+ contributors**, it is one of the fastest-growing open-source projects in history — gaining 60,000 stars in 72 hours after going viral in late January 2026. Created by Peter Steinberger (founder of PSPDFKit, who announced joining OpenAI on February 14, 2026), OpenClaw acts as a persistent personal assistant accessible through WhatsApp, Telegram, Slack, Discord, Signal, iMessage, and seven other messaging platforms simultaneously. It executes shell commands, controls browsers, manages calendars and email, and extends through **5,700+ community-built skills**. However, its power comes with serious security implications: **Bitdefender found 135,000 exposed instances**, three high-severity CVEs have been published, and Cisco documented active data exfiltration through malicious skills.

The project was originally named "Clawdbot" (November 2025), renamed "Moltbot" after an Anthropic trademark complaint (January 27, 2026), then finally "OpenClaw" on January 30, 2026. It is MIT-licensed, distributed via npm, and runs on everything from a Raspberry Pi to cloud VPS. No connection to @paxncs was found in any OpenClaw documentation, contributor lists, or community resources.

---

## What OpenClaw does and how it works

OpenClaw follows a **hub-and-spoke architecture** centered on a single Node.js process called the **Gateway**, which serves as the control plane at `ws://127.0.0.1:18789`. The Gateway handles message routing from all connected chat platforms, session management, tool dispatch, LLM orchestration, and state persistence. There is no service mesh, no message broker, no distributed state — the Gateway owns everything.

The system is **model-agnostic**, supporting Anthropic Claude, OpenAI GPT, Google Gemini, DeepSeek, and local models via Ollama. Model references use `provider/model` format (e.g., `anthropic/claude-sonnet-4-5`, `ollama/llama3.3`), and you can switch models mid-conversation with the `/model` command. Fallback chains provide automatic failover between providers.

Key architectural components include **Channels** (adapters that normalize platform-specific messages), **Skills** (Markdown-based capability extensions with YAML frontmatter), a **Heartbeat System** (proactive wake-ups every 30 minutes during active hours), and a **Canvas/A2UI** visual workspace on port 18793. Memory is stored as plain Markdown files — `MEMORY.md` for long-term curated facts and `memory/YYYY-MM-DD.md` for daily logs — backed by a per-agent SQLite vector search index using hybrid BM25 + embedding search.

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Node.js ≥ 22 | JavaScript runtime |
| Language | TypeScript | Primary codebase |
| Package manager | pnpm 10.x | Monorepo workspace management |
| Distribution | npm (`openclaw`) | Primary install method |
| License | MIT | Fully open source |
| Gateway port | 18789 | WebSocket + Control UI + HTTP API |
| Canvas port | 18793 | Agent-driven visual workspace |
| Browser port | 18791 | Chrome DevTools Protocol control |
| Config format | JSON5 | `~/.openclaw/openclaw.json` |

---

## Building from source on Linux and macOS

### Prerequisites for both platforms

OpenClaw requires **Node.js ≥ 22.12.0** and **pnpm 10.23.0** (specified in `package.json`). The build produces compiled JavaScript in `dist/`, a CLI entry point (`openclaw.mjs`), Plugin SDK type declarations, and bundled Canvas UI components.

**On Debian/Ubuntu:**

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential

# Node.js 22+ via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # verify ≥22.12.0

npm install -g pnpm

# Optional: browser automation dependencies
sudo apt install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2
```

**On macOS:**

```bash
brew install node@22
npm install -g pnpm
xcode-select --install  # build tools for native modules

# If sharp build fails (Homebrew libvips conflict):
export SHARP_IGNORE_GLOBAL_LIBVIPS=1
```

### Clone, build, and run

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install        # install all workspace dependencies
pnpm ui:build       # build the web UI
pnpm build          # full TypeScript compilation

# Link CLI globally
pnpm link --global

# Run onboarding wizard (installs daemon automatically)
openclaw onboard --install-daemon
```

The onboarding wizard walks through: security disclaimer → mode selection → LLM provider and API key → model selection → channel setup (Telegram, WhatsApp, etc.) → skills installation → daemon registration. It writes `~/.openclaw/openclaw.json` and creates the workspace at `~/.openclaw/workspace/`.

On **Linux**, `--install-daemon` creates a systemd user service at `~/.config/systemd/user/openclaw-gateway.service`. On **macOS**, it creates a launchd LaunchAgent at `~/Library/LaunchAgents/com.openclaw.gateway.plist`. For headless Linux servers, enable lingering so services start before login: `sudo loginctl enable-linger $(whoami)`.

**Alternative install methods** include `npm install -g openclaw@latest` (end users), `curl -fsSL https://openclaw.ai/install.sh | bash` (one-liner), `brew install openclaw-cli` (macOS Homebrew), and Docker via the included `docker-setup.sh`.

### Configuration files you need to know

The primary config lives at **`~/.openclaw/openclaw.json`** (JSON5 format, supports comments). API keys and secrets go in **`~/.openclaw/.env`** with `chmod 600`. Environment variable precedence (highest to lowest): process env → `./.env` (project root) → `~/.openclaw/.env` → `openclaw.json` env block.

Essential environment variables:

```bash
OPENCLAW_GATEWAY_TOKEN=<openssl rand -hex 32>  # Gateway auth
ANTHROPIC_API_KEY=sk-ant-...                    # or OPENAI_API_KEY, etc.
OPENCLAW_HOME=/opt/openclaw                     # optional custom path
```

### Docker Compose deployment

```bash
git clone https://github.com/openclaw/openclaw.git && cd openclaw
./docker-setup.sh  # builds image, runs onboard wizard, starts gateway
```

The Docker Compose file runs the Gateway as the `node` user (uid 1000), mounts `~/.openclaw` for config and workspace, and exposes ports 18789 (gateway) and 18790 (bridge). Fix host permissions with `sudo chown -R 1000:$(id -g) ~/.openclaw`.

---

## Securing OpenClaw on a Linux VPS

The security situation around OpenClaw is severe. **42,665 exposed instances** were found by researcher Maor Dayan, with 93.4% having authentication bypasses. SecurityScorecard identified **12,812 instances exploitable via RCE**. Three high-severity CVEs have been published, including **CVE-2026-25253** (CVSS 8.8, one-click RCE chain). Approximately **800 malicious skills** (~20% of the ClawHub registry) were distributing the Atomic macOS Stealer. Security researcher Simon Willison calls OpenClaw the "lethal trifecta": access to private data + exposure to untrusted content + ability to communicate externally.

### The openclaw-ansible hardened deployment

The official **[openclaw-ansible](https://github.com/openclaw/openclaw-ansible)** playbook (390 stars) implements a multi-layer defense for Debian/Ubuntu. It executes roles in order: `tailscale.yml` → `user.yml` → `docker.yml` → `firewall.yml` → `nodejs.yml` → `clawdbot.yml`. Quick start:

```bash
sudo apt update && sudo apt install -y ansible git
git clone https://github.com/openclaw/openclaw-ansible.git
cd openclaw-ansible
ansible-galaxy collection install -r requirements.yml
./run-playbook.sh
```

This configures: a dedicated non-root `openclaw` user, UFW firewall (default deny incoming), Tailscale VPN (gateway accessible only via mesh), Docker isolation with custom `DOCKER-USER` iptables chain, Fail2ban (5 retries, 1-hour ban), systemd hardening (NoNewPrivileges, PrivateTmp), unattended-upgrades, and restricted sudo.

### SSH hardening

Edit `/etc/ssh/sshd_config`:

```
Port 2222                        # non-standard port
PasswordAuthentication no        # key-only
PermitRootLogin no
MaxAuthTries 3
AllowUsers openclaw              # restrict to dedicated user
```

Generate an Ed25519 key pair (`ssh-keygen -t ed25519`), deploy the public key to `/home/openclaw/.ssh/authorized_keys` (chmod 600), and restart sshd. Install Fail2ban for brute-force protection.

### UFW firewall configuration

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 2222/tcp                                      # SSH (non-standard)
sudo ufw allow 41641/udp                                     # Tailscale
# Allow OpenClaw ONLY over VPN:
sudo ufw allow from 100.64.0.0/10 to any port 18789 proto tcp
sudo ufw logging on
sudo ufw enable
```

**Critical Docker fix** — Docker bypasses UFW by default. Add to `/etc/ufw/after.rules` before COMMIT:

```
*filter
:DOCKER-USER - [0:0]
-A DOCKER-USER -i tailscale0 -j ACCEPT
-A DOCKER-USER -j DROP
COMMIT
```

Then `sudo ufw reload && sudo systemctl restart docker`. Test with `docker run -d -p 80:80 nginx && curl http://YOUR_SERVER_IP:80` — it should timeout.

### IPv6 considerations

If you don't need IPv6, disable it in UFW (`/etc/default/ufw`: set `IPV6=no`) and in sysctl (`net.ipv6.conf.all.disable_ipv6=1`). If you do need it, replicate all UFW rules for IPv6 and ensure the Docker DOCKER-USER chain also covers ip6tables.

### WireGuard VPN tunnel

```bash
sudo apt install wireguard
wg genkey | tee /etc/wireguard/server_private.key | wg pubkey > /etc/wireguard/server_public.key
```

Server config (`/etc/wireguard/wg0.conf`):
```ini
[Interface]
PrivateKey = <server_private_key>
Address = 10.8.0.1/24
ListenPort = 51820
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
PublicKey = <client_public_key>
AllowedIPs = 10.8.0.2/32
```

Then: `sudo ufw allow 51820/udp` and `sudo ufw allow in on wg0 proto tcp to any port 18789`. Alternatively, **Tailscale** (built on WireGuard) is simpler and what the official ansible playbook uses: `sudo tailscale up --authkey tskey-auth-xxxxx`.

### SystemD service with security hardening

```ini
# /etc/systemd/system/openclaw-gateway.service
[Unit]
Description=OpenClaw Gateway
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=openclaw
Group=openclaw
WorkingDirectory=/home/openclaw
EnvironmentFile=/home/openclaw/.openclaw/.env
ExecStart=/usr/local/bin/openclaw gateway --force
Restart=always
RestartSec=10

# Security hardening directives
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/openclaw/.openclaw /home/openclaw/workspace

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway
sudo journalctl -u openclaw-gateway -f  # monitor logs
```

### Docker isolation best practices

Run with maximum restriction: `docker run -d --read-only --cap-drop=ALL --security-opt=no-new-privileges openclaw`. Bind ports to localhost only (`127.0.0.1:18789:18789`). Enable per-agent sandbox isolation in config (`agents.defaults.sandbox` with `scope: "agent"`). Mount only necessary volumes. The container runs as the non-root `node` user (uid 1000) by default.

### Unattended security upgrades

```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
# Verify: sudo unattended-upgrade --dry-run
```

The openclaw-ansible playbook configures this automatically with automatic reboots disabled.

---

## Running OpenClaw on local hardware instead of a VPS

A dedicated local machine provides the strongest physical isolation. The **Mac Mini M4** is the most popular choice for consumer deployment — Apple Silicon's unified memory architecture handles both the Gateway and local model inference efficiently at under 7W idle. Pair OpenClaw with Ollama for fully self-hosted inference (7B–13B parameter models) at zero ongoing API cost.

A **Raspberry Pi 5** (8GB model) can run the Gateway with cloud LLM APIs (~300MB RAM under load), but cannot handle local model inference. Use an NVMe SSD via M.2 HAT rather than an SD card for reliability. **PicoClaw**, an ultra-lightweight Go alternative, targets Pi Zero/Pi 3 at under 10MB RAM.

For any local deployment, **network isolation is essential**. Place the machine on a dedicated VLAN or isolated subnet. Bind the Gateway exclusively to `127.0.0.1` and access it via SSH tunnel (`ssh -L 18789:localhost:18789 user@local-machine`) or Tailscale mesh. Never expose port 18789 to your home network — a compromised IoT device could reach it. Run the dedicated `openclaw` user with minimal filesystem permissions and restrict the workspace to `/opt/openclaw` or `/home/openclaw/.openclaw` rather than dumping files in `$HOME`. The official ansible playbook **removed macOS support** on February 6, 2026, citing security risks — if deploying on macOS locally, apply the same hardening principles manually.

Hardware recommendations scale with use:

| Use Case | Hardware | RAM | Storage | Concurrent Users |
|----------|----------|-----|---------|-----------------|
| Personal/testing | Raspberry Pi 5 | 8 GB | 32 GB NVMe | 1–2 |
| Daily driver | Mac Mini M3/M4 | 16 GB | 256 GB | 5–10 |
| Multi-user/heavy | Dedicated Linux box | 16–64 GB | 40+ GB NVMe | 10–100 |
| Local inference | GPU workstation | 32+ GB + 12GB VRAM | 100 GB | 3–5 |

---

## Security hardening checklist for internet-facing AI agents

This checklist synthesizes OpenClaw-specific risks with general AI agent security principles. The core threat model is the **RAK framework**: Root risk (host compromise), Agency risk (unintended destructive actions), and Keys risk (credential theft).

- **Never run on your primary machine.** Use a dedicated VPS, container, or isolated hardware. OpenClaw has full shell access and can read/write any file the user can reach.
- **Create a dedicated non-root user** (`useradd -r -m -d /home/openclaw -s /bin/bash openclaw`) with restricted sudo (only `systemctl start/stop/restart openclaw` and `journalctl`).
- **Bind the Gateway to loopback only** (`gateway.bind: "loopback"` in config). The Gateway refuses to start if bind is non-loopback and auth is disabled — do not override this.
- **Generate a strong gateway token** (`openssl rand -hex 32`) and set it via `OPENCLAW_GATEWAY_TOKEN`. Never use short or guessable tokens — 93.4% of exposed instances had auth bypasses.
- **Set file permissions**: `chmod 600 ~/.openclaw/openclaw.json ~/.openclaw/.env`. API keys are stored in plaintext.
- **Use VPN for all remote access** (Tailscale or WireGuard). Never expose port 18789 publicly. SSH tunneling (`ssh -L 18789:localhost:18789`) is acceptable for personal use.
- **Configure UFW with default-deny incoming.** Only allow SSH (non-standard port) and VPN. Apply the DOCKER-USER iptables fix to prevent Docker from bypassing the firewall.
- **Restrict tool access in config**: deny `group:automation`, `group:runtime`, `group:fs` by default. Set `exec.security: "deny"` and `exec.ask: "always"` to require confirmation for shell commands. Disable elevated tools.
- **Use pairing codes and allowlists** for messaging channels. Set `dmPolicy: "pairing"` — never use `"open"`.
- **Use only burner accounts** for messaging integrations. Never connect primary email, banking, password managers, work accounts, or cryptocurrency wallets.
- **Vet skills before installation.** ~20% of ClawHub skills were found distributing malware. Prefer bundled skills. Run `openclaw security audit --deep` regularly.
- **Keep OpenClaw updated** — `openclaw update --channel stable`. Patch CVEs immediately; CVE-2026-25253 (CVSS 8.8) was patched in v2026.1.29.
- **Enable unattended-upgrades** for OS-level security patches.
- **Monitor logs**: `journalctl -u openclaw-gateway -f`, UFW logs at `/var/log/ufw.log`, and Docker logs. Set up external port scanning on a cron to verify only expected ports are open.

## Conclusion

OpenClaw represents a genuinely new category of software — a self-hosted AI agent with deep system access, messaging integration, and autonomous action capability. Its architecture is elegant: a single Node.js Gateway process that routes messages from any platform to a model-agnostic agent runtime with persistent Markdown-based memory. Building from source is straightforward (clone → `pnpm install` → `pnpm build` → `openclaw onboard --install-daemon`), and it runs on hardware ranging from a Raspberry Pi to enterprise cloud infrastructure.

The critical insight is that **OpenClaw's power is precisely what makes it dangerous**. The "lethal trifecta" — private data access, untrusted input exposure, and external communication ability — means that every deployment decision is a security decision. The official openclaw-ansible playbook, Tailscale VPN isolation, Docker sandboxing with DOCKER-USER iptables chains, and strict tool permission deny-lists are not optional hardening — they are baseline requirements. The 135,000+ exposed instances with authentication bypasses demonstrate what happens when this is treated as a casual install. Treat OpenClaw like you would treat giving someone SSH access to your server, because that is functionally what it is.