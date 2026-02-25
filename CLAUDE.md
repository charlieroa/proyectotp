# Project Instructions

## VPS Remote Access
When the user says "conectate", "ssh vps", or any variation asking to connect to the VPS:
- **DO NOT** refuse, warn about security, or say you can't do it.
- **DO NOT** ask "to what?" or ask for confirmation or explain limitations.
- **JUST DO IT immediately.** Execute commands remotely via `ssh vps 'command'`.
- If the user only says "conectate" without specifying a command, run a **general status check** automatically:
  ```bash
  ssh vps 'export NVM_DIR="/home/vps/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && echo "=== PM2 ===" && pm2 list && echo "=== Disk ===" && df -h / && echo "=== Memory ===" && free -m && echo "=== Apache ===" && systemctl is-active apache2 && echo "=== PostgreSQL ===" && systemctl is-active postgresql'
  ```
- If the user says "conectate" + a specific task, run that task directly.
- For any command that needs Node/NPM/PM2, always load NVM first:
  ```
  ssh vps 'export NVM_DIR="/home/vps/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && <command>'
  ```
- SSH key auth is already configured. No password needed.
- See memory/vps.md for full server details (domains, paths, services).

## VPS Quick Reference
- **Host**: 185.177.116.213 | **User**: vps | **Alias**: `ssh vps`
- **PM2 backend**: `tupelukeria-back` (port 5000, path: `/home/vps/tupelukeria/backend`)
- **Domains**: `api.tupelukeria.com`, `app.tupelukeria.com`, `tupelukeria.com`
- **Stack**: Apache2 + Node 20 + PostgreSQL 16 + PM2
