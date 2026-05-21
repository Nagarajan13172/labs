-- Creates a remotely-accessible admin user for the DBaaS layer on first init.
-- Run automatically by the MySQL/MariaDB entrypoint (as root@localhost).
-- Dev credentials; must match DBAAS_SQL_ADMIN_USER / DBAAS_SQL_ADMIN_PASSWORD.
CREATE USER IF NOT EXISTS 'ysadmin'@'%' IDENTIFIED BY 'ys_admin_pw';
GRANT ALL PRIVILEGES ON *.* TO 'ysadmin'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
