#!/bin/bash
# ===========================================
# vps.sh - Script de conexion y despliegue al VPS de Tupelukeria
# Uso:
#   ./vps.sh "comando"           -> Ejecuta un comando arbitrario en el VPS
#   ./vps.sh status              -> Muestra estado general del VPS
#   ./vps.sh logs [n]            -> Muestra ultimos n logs (default 50)
#   ./vps.sh deploy              -> Despliega frontend + backend
#   ./vps.sh deploy-front        -> Solo frontend (build local -> upload)
#   ./vps.sh deploy-back         -> Solo backend (upload src/prisma + restart)
#   ./vps.sh restart             -> Reinicia backend con PM2
#   ./vps.sh                     -> Sin args, muestra status
#
# NOTA IMPORTANTE sobre el deploy (verificado 2026-06-02):
#   Ni el backend ni el frontend en produccion son repos git. NO se hace
#   "git pull" en el servidor. El despliegue real es:
#     - FRONTEND: se compila LOCALMENTE (npm run build, usa .env.production)
#       y se SUBE la carpeta build/ ya compilada al servidor. El src/ del
#       servidor esta congelado y NO se usa para compilar.
#     - BACKEND: se suben src/ + prisma/ + package.json, se corre
#       npm install + prisma generate y se reinicia el proceso PM2.
#   El repo git de la app vive en local (este repo). El repo viejo del VPS
#   (/home/vps/tupelukeria-new) esta abandonado, no usarlo.
# ===========================================

VPS_USER="vps"
VPS_HOST="185.177.116.213"
VPS_DIR="/home/vps/tupelukeria"
VPS_PASS="62dd33d6347d132ab70ed7a53b944d2a134ac1a27f5f79ad30ce37eef71f7a2c"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10"
REMOTE="${VPS_USER}@${VPS_HOST}"

# Rutas en el servidor
REMOTE_FRONT="${VPS_DIR}/frontend"          # sirve Apache desde frontend/build
REMOTE_BACK="${VPS_DIR}/backend"            # PM2 corre backend/src/index.js
PM2_APP="tupelukeria-back"

# Rutas locales (relativas a la ubicacion de este script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_FRONT="${SCRIPT_DIR}/front"
LOCAL_BACK="${SCRIPT_DIR}/back"

# Cargar NVM en el VPS para tener node/npm/npx/pm2 disponibles
NVM_PREFIX='export NVM_DIR="/home/vps/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" &&'

run_remote() {
    if command -v sshpass >/dev/null 2>&1; then
        sshpass -p "$VPS_PASS" ssh $SSH_OPTS "${REMOTE}" "$1"
    else
        ssh $SSH_OPTS "${REMOTE}" "$1"
    fi
}

# upload <archivo_local> <ruta_remota>
upload() {
    if command -v sshpass >/dev/null 2>&1; then
        sshpass -p "$VPS_PASS" scp $SSH_OPTS "$1" "${REMOTE}:$2"
    else
        scp $SSH_OPTS "$1" "${REMOTE}:$2"
    fi
}

deploy_front() {
    echo "=== Deploy FRONTEND ==="
    echo "1. Compilando localmente (npm run build, .env.production)..."
    ( cd "$LOCAL_FRONT" && npm run build ) || { echo "ERROR: build fallo, aborta"; return 1; }

    echo "2. Empaquetando build/..."
    tar czf /tmp/tpl-front.tar.gz -C "$LOCAL_FRONT/build" . || return 1

    echo "3. Subiendo al servidor..."
    upload /tmp/tpl-front.tar.gz /tmp/tpl-front.tar.gz || return 1

    echo "4. Backup + swap atomico en el servidor..."
    run_remote "set -e; cd ${REMOTE_FRONT}; TS=\$(date +%Y%m%d-%H%M%S); \
        cp -a build \"build.bak.\$TS\"; \
        rm -rf build.new && mkdir build.new && tar xzf /tmp/tpl-front.tar.gz -C build.new; \
        rm -rf build.old && mv build build.old && mv build.new build && rm -rf build.old; \
        rm -f /tmp/tpl-front.tar.gz; \
        ls build/index.html >/dev/null && echo \"   OK -> build actualizado (backup: build.bak.\$TS)\""

    rm -f /tmp/tpl-front.tar.gz
    echo "=== Frontend desplegado ==="
}

deploy_back() {
    echo "=== Deploy BACKEND ==="
    echo "1. Empaquetando src/ + prisma/ + package.json..."
    tar czf /tmp/tpl-back.tar.gz -C "$LOCAL_BACK" src prisma package.json package-lock.json 2>/dev/null \
        || tar czf /tmp/tpl-back.tar.gz -C "$LOCAL_BACK" src prisma package.json || return 1

    echo "2. Subiendo al servidor..."
    upload /tmp/tpl-back.tar.gz /tmp/tpl-back.tar.gz || return 1

    echo "3. Backup, extraccion, npm install, prisma generate y restart..."
    run_remote "${NVM_PREFIX} set -e; cd ${REMOTE_BACK}; TS=\$(date +%Y%m%d-%H%M%S); \
        cp -a src \"src.bak.\$TS\"; \
        tar xzf /tmp/tpl-back.tar.gz -C ${REMOTE_BACK}; \
        npm install --omit=dev; \
        npx prisma generate; \
        pm2 restart ${PM2_APP}; \
        rm -f /tmp/tpl-back.tar.gz; \
        echo \"   OK -> backend actualizado y reiniciado (backup: src.bak.\$TS)\""

    rm -f /tmp/tpl-back.tar.gz
    echo "=== Backend desplegado ==="
}

case "${1}" in
    status)
        echo "=== Estado del VPS ==="
        run_remote "${NVM_PREFIX} \
            echo '--- PM2 Procesos ---'; pm2 list 2>/dev/null || echo 'PM2 no disponible'; echo ''; \
            echo '--- Disco ---'; df -h / | tail -1; echo ''; \
            echo '--- Memoria ---'; free -h | grep Mem; echo ''; \
            echo '--- Apache ---'; systemctl is-active apache2 2>/dev/null || echo 'apache2 no activo'; echo ''; \
            echo '--- API Health ---'; curl -s --max-time 5 http://localhost:5000/health 2>/dev/null || echo 'API no responde'; echo ''; \
            echo '--- Sites habilitados ---'; ls /etc/apache2/sites-enabled/ 2>/dev/null"
        ;;
    logs)
        LINES=${2:-50}
        echo "=== Ultimos $LINES logs ==="
        run_remote "${NVM_PREFIX} \
            echo '--- PM2 Logs Backend ---'; pm2 logs --nostream --lines $LINES 2>/dev/null || echo 'Sin logs PM2'; echo ''; \
            echo '--- Apache Error Log ---'; tail -${LINES} /var/log/apache2/error.log 2>/dev/null || echo 'Sin acceso a logs Apache'"
        ;;
    restart)
        echo "=== Reiniciando backend ==="
        run_remote "${NVM_PREFIX} pm2 restart ${PM2_APP}"
        ;;
    deploy)
        deploy_front && deploy_back
        echo "=== Deploy completo ==="
        ;;
    deploy-front)
        deploy_front
        ;;
    deploy-back)
        deploy_back
        ;;
    "")
        # Sin argumentos = status
        $0 status
        ;;
    *)
        # Comando personalizado
        run_remote "$1"
        ;;
esac
