#!/usr/bin/env bash
# Installs MySQL, restricts it to the private network and creates the app database/user.
# Used by Vagrant (local DB VM). On AWS, RDS replaces this script.
set -euo pipefail

DB_NAME="${DB_NAME:-grouptask}"
DB_USER="${DB_USER:-grouptask}"
DB_PASS="${DB_PASS:-GroupTask2026}"
DB_BIND_IP="${DB_BIND_IP:-192.168.56.11}"   # interface MySQL listens on
APP_IP="${APP_IP:-192.168.56.10}"           # only this host may connect

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y mysql-server ufw

# Listen only on the private interface (not on the NAT interface)
sed -i "s/^bind-address.*/bind-address = ${DB_BIND_IP}/" /etc/mysql/mysql.conf.d/mysqld.cnf
systemctl restart mysql

mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;
CREATE USER IF NOT EXISTS '${DB_USER}'@'${APP_IP}' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'${APP_IP}';
FLUSH PRIVILEGES;
SQL

# VM-level firewall: SSH for Vagrant, MySQL only from the app VM
ufw allow 22/tcp
ufw allow from "${APP_IP}" to any port 3306 proto tcp
ufw --force enable

echo "DB VM ready: ${DB_NAME} on ${DB_BIND_IP}:3306 (user ${DB_USER}, allowed from ${APP_IP})"