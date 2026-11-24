#!/usr/bin/env bash
# Builds and deploys the app tier: Nginx (React build) + Spring Boot (systemd service).
# Same script for the local Vagrant VM and the AWS EC2 instance -> only the variables change.
#
#   Vagrant : DB_HOST=192.168.56.11  SRC_DIR=/project
#   AWS EC2 : DB_HOST=<rds-endpoint> SRC_DIR=$HOME/projet_cloud DB_USER=admin DB_PASS=...
#
# Tip: use an alphanumeric DB password (no $ ` " # characters).
set -euo pipefail

: "${DB_HOST:?DB_HOST is required (db VM IP or RDS endpoint)}"
DB_NAME="${DB_NAME:-grouptask}"
DB_USER="${DB_USER:-grouptask}"
DB_PASS="${DB_PASS:-GroupTask2026}"
SRC_DIR="${SRC_DIR:-/project}"

export DEBIAN_FRONTEND=noninteractive

# Small machines (e.g. t3.micro): add swap so the Maven/npm builds do not run out of memory
if [ "$(free -m | awk '/^Mem:/{print $2}')" -lt 1800 ] && [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
fi

# Java version taken from pom.xml (<java.version>), default 17
JAVA_VERSION="$(grep -oP '(?<=<java.version>)[0-9]+' "${SRC_DIR}/backend/pom.xml" || echo 17)"

apt-get update -y
apt-get install -y "openjdk-${JAVA_VERSION}-jdk-headless" nginx rsync curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Build in a local copy (faster than the shared folder, and avoids Windows line-ending issues)
BUILD=/tmp/build
rm -rf "${BUILD}" && mkdir -p "${BUILD}"
rsync -a --exclude node_modules --exclude target --exclude dist --exclude .git --exclude .vagrant "${SRC_DIR}/" "${BUILD}/"

# ---------- Backend (Spring Boot) ----------
cd "${BUILD}/backend"
sed -i 's/\r$//' mvnw && chmod +x mvnw
./mvnw -q -DskipTests package
mkdir -p /opt/grouptask
cp target/*.jar /opt/grouptask/app.jar

id grouptask &>/dev/null || useradd --system --no-create-home --shell /usr/sbin/nologin grouptask
chown -R grouptask:grouptask /opt/grouptask

# Spring Boot reads these environment variables directly (no change to application.properties needed)
cat > /etc/grouptask.env <<EOF
SPRING_DATASOURCE_URL=jdbc:mysql://${DB_HOST}:3306/${DB_NAME}?allowPublicKeyRetrieval=true&useSSL=false
SPRING_DATASOURCE_USERNAME=${DB_USER}
SPRING_DATASOURCE_PASSWORD=${DB_PASS}
SPRING_JPA_HIBERNATE_DDL_AUTO=update
EOF
chmod 600 /etc/grouptask.env

cat > /etc/systemd/system/grouptask.service <<EOF
[Unit]
Description=GroupTask Spring Boot backend
After=network.target

[Service]
User=grouptask
EnvironmentFile=/etc/grouptask.env
ExecStart=/usr/bin/java -jar /opt/grouptask/app.jar
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# ---------- Frontend (React + Nginx) ----------
cd "${BUILD}/frontend"
npm ci
npm run build
rm -rf /var/www/grouptask && mkdir -p /var/www/grouptask
cp -r dist/. /var/www/grouptask/

cat > /etc/nginx/sites-available/grouptask <<'EOF'
server {
    listen 80 default_server;
    root /var/www/grouptask;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    # the browser only talks to Nginx; /api is forwarded to Spring Boot on localhost
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF
ln -sf /etc/nginx/sites-available/grouptask /etc/nginx/sites-enabled/grouptask
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

systemctl daemon-reload
systemctl enable grouptask
systemctl restart grouptask

echo "App tier ready -> http://<this-machine>/   (backend logs: journalctl -u grouptask -f)"