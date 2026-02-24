#!/bin/bash
# ===========================================
# vps.sh - Script de conexion al VPS de Tupelukeria
# Uso:
#   ./vps.sh "comando"           -> Ejecuta un comando en el VPS
#   ./vps.sh status              -> Muestra estado general del VPS
#   ./vps.sh logs [n]            -> Muestra ultimos n logs (default 50)
#   ./vps.sh deploy              -> Despliega backend y frontend
#   ./vps.sh restart             -> Reinicia backend con PM2
#   ./vps.sh                     -> Sin args, muestra status
# ===========================================

VPS_USER="vps"
VPS_HOST="185.177.116.213"
VPS_DIR="/home/vps/tupelukeria"
VPS_PASS="62dd33d6347d132ab70ed7a53b944d2a134ac1a27f5f79ad30ce37eef71f7a2c"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10"

run_remote() {
    if command -v sshpass >/dev/null 2>&1; then
        sshpass -p "$VPS_PASS" ssh $SSH_OPTS "${VPS_USER}@${VPS_HOST}" "$1"
    else
        ssh $SSH_OPTS "${VPS_USER}@${VPS_HOST}" "$1"
    fi
}

case "${1}" in
    status)
        echo "=== Estado del VPS ==="
        run_remote "
            echo '--- PM2 Procesos ---'
            pm2 list 2>/dev/null || echo 'PM2 no disponible'
            echo ''
            echo '--- Disco ---'
            df -h / | tail -1
            echo ''
            echo '--- Memoria ---'
            free -h | grep Mem
            echo ''
            echo '--- Apache ---'
            systemctl is-active apache2 2>/dev/null || echo 'apache2 no activo'
            echo ''
            echo '--- API Health ---'
            curl -s --max-time 5 http://localhost:5000/health 2>/dev/null || echo 'API no responde'
            echo ''
            echo '--- Sites habilitados ---'
            ls /etc/apache2/sites-enabled/ 2>/dev/null
        "
        ;;
    logs)
        LINES=${2:-50}
        echo "=== Ultimos $LINES logs ==="
        run_remote "
            echo '--- PM2 Logs Backend ---'
            pm2 logs --nostream --lines $LINES 2>/dev/null || echo 'Sin logs PM2'
            echo ''
            echo '--- Apache Error Log ---'
            tail -${LINES} /var/log/apache2/error.log 2>/dev/null || echo 'Sin acceso a logs Apache'
        "
        ;;
    restart)
        echo "=== Reiniciando backend ==="
        run_remote "cd ${VPS_DIR}/back && pm2 restart all"
        ;;
    deploy)
        echo "=== Desplegando en VPS ==="
        echo "1. Subiendo cambios..."
        run_remote "cd ${VPS_DIR} && git pull origin main"
        echo "2. Instalando dependencias backend..."
        run_remote "cd ${VPS_DIR}/back && npm install"
        echo "3. Generando Prisma Client..."
        run_remote "cd ${VPS_DIR}/back && npx prisma generate"
        echo "4. Reiniciando backend..."
        run_remote "cd ${VPS_DIR}/back && pm2 restart all"
        echo "5. Instalando dependencias frontend..."
        run_remote "cd ${VPS_DIR}/front && npm install"
        echo "6. Compilando frontend..."
        run_remote "cd ${VPS_DIR}/front && npm run build"
        echo "=== Deploy completo ==="
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
