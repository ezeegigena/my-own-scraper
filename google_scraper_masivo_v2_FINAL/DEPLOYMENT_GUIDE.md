# Guía de Despliegue - Google Scraper Masivo

## 🚀 Despliegue Completo para Hosting

Esta guía te ayudará a desplegar el Google Scraper Masivo en cualquier servidor web o hosting que soporte Python.

### 📋 Requisitos del Servidor

**Mínimos:**
- Python 3.8 o superior
- 1 GB RAM
- 2 GB espacio en disco
- Conexión a internet estable

**Recomendados:**
- Python 3.11
- 2 GB RAM o más
- 5 GB espacio en disco
- Servidor con Ubuntu 20.04+ o CentOS 7+

### 🔧 Instalación Paso a Paso

#### 1. Preparar el Servidor
```bash
# Actualizar sistema
sudo apt-get update && sudo apt-get upgrade -y

# Instalar dependencias del sistema
sudo apt-get install -y python3 python3-pip python3-venv chromium-browser unzip wget curl

# Verificar instalación
python3 --version
chromium-browser --version
```

#### 2. Subir y Configurar Archivos
```bash
# Descomprimir archivo ZIP en el servidor
unzip google_scraper_masivo_v2.zip
cd google_scraper_masivo_v2

# Ejecutar configuración automática
chmod +x setup.sh
./setup.sh
```

#### 3. Configurar para Producción
```bash
# Instalar servidor WSGI
cd scraper_interface
source venv/bin/activate
pip install gunicorn

# Crear archivo de configuración
cat > gunicorn.conf.py << EOF
bind = "0.0.0.0:5000"
workers = 4
worker_class = "sync"
worker_connections = 1000
timeout = 300
keepalive = 2
max_requests = 1000
max_requests_jitter = 100
preload_app = True
EOF
```

#### 4. Crear Servicio Systemd (Opcional)
```bash
# Crear archivo de servicio
sudo tee /etc/systemd/system/scraper.service > /dev/null << EOF
[Unit]
Description=Google Scraper Masivo
After=network.target

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=/path/to/scraper_interface
Environment=PATH=/path/to/scraper_interface/venv/bin
ExecStart=/path/to/scraper_interface/venv/bin/gunicorn -c gunicorn.conf.py src.main:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Habilitar y iniciar servicio
sudo systemctl daemon-reload
sudo systemctl enable scraper.service
sudo systemctl start scraper.service
```

### 🌐 Configuración de Nginx (Recomendado)

```nginx
# /etc/nginx/sites-available/scraper
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location /static {
        alias /path/to/scraper_interface/src/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/scraper /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 🔒 Configuración SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com

# Verificar renovación automática
sudo certbot renew --dry-run
```

### 📊 Monitoreo y Logs

#### Ver Logs de la Aplicación
```bash
# Logs del servicio
sudo journalctl -u scraper.service -f

# Logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

#### Configurar Rotación de Logs
```bash
# Crear configuración de logrotate
sudo tee /etc/logrotate.d/scraper << EOF
/path/to/scraper_interface/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload scraper
    endscript
}
EOF
```

### 🛡️ Seguridad

#### Firewall
```bash
# Configurar UFW
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

#### Permisos de Archivos
```bash
# Configurar permisos correctos
sudo chown -R www-data:www-data /path/to/scraper_interface
sudo chmod -R 755 /path/to/scraper_interface
sudo chmod -R 777 /path/to/scraper_interface/results
```

### 🔧 Configuración de Variables de Entorno

```bash
# Crear archivo .env
cat > scraper_interface/.env << EOF
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=tu-clave-secreta-muy-segura
HEADLESS_MODE=true
MAX_WORKERS=4
RESULTS_DIR=results
CSV_FILENAME=scraped_data.csv
EOF
```

### 📈 Optimización de Rendimiento

#### Configurar Swap (si es necesario)
```bash
# Crear archivo swap de 2GB
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Hacer permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### Optimizar Chrome para Servidor
```bash
# Crear script de optimización
cat > scraper_interface/optimize_chrome.sh << EOF
#!/bin/bash
export CHROME_FLAGS="
--no-sandbox
--disable-dev-shm-usage
--disable-gpu
--disable-web-security
--disable-features=VizDisplayCompositor
--headless
--remote-debugging-port=9222
--disable-background-timer-throttling
--disable-backgrounding-occluded-windows
--disable-renderer-backgrounding
"
EOF

chmod +x scraper_interface/optimize_chrome.sh
```

### 🔄 Backup y Restauración

#### Script de Backup
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/scraper"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup de archivos
tar -czf $BACKUP_DIR/scraper_files_$DATE.tar.gz /path/to/scraper_interface

# Backup de resultados
tar -czf $BACKUP_DIR/scraper_results_$DATE.tar.gz /path/to/scraper_interface/results

# Limpiar backups antiguos (mantener últimos 7 días)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completado: $DATE"
```

#### Cron para Backup Automático
```bash
# Agregar a crontab
crontab -e

# Backup diario a las 2:00 AM
0 2 * * * /path/to/backup.sh >> /var/log/scraper_backup.log 2>&1
```

### 🚨 Troubleshooting

#### Problemas Comunes

**Error: "Chrome crashed"**
```bash
# Verificar memoria disponible
free -h

# Reiniciar servicio
sudo systemctl restart scraper.service
```

**Error: "Permission denied"**
```bash
# Verificar permisos
ls -la /path/to/scraper_interface/results/
sudo chown -R www-data:www-data /path/to/scraper_interface/results/
```

**Error: "Port already in use"**
```bash
# Verificar qué está usando el puerto
sudo netstat -tlnp | grep :5000
sudo kill -9 PID_DEL_PROCESO
```

### 📞 Soporte Post-Despliegue

#### Comandos Útiles
```bash
# Estado del servicio
sudo systemctl status scraper.service

# Reiniciar aplicación
sudo systemctl restart scraper.service

# Ver uso de recursos
htop
df -h

# Verificar conectividad
curl -I http://localhost:5000
```

#### Monitoreo de Salud
```bash
# Script de health check
#!/bin/bash
# health_check.sh

URL="http://localhost:5000/api/status"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $RESPONSE -eq 200 ]; then
    echo "✅ Servicio funcionando correctamente"
    exit 0
else
    echo "❌ Servicio no responde (HTTP $RESPONSE)"
    sudo systemctl restart scraper.service
    exit 1
fi
```

### 🎯 Checklist de Despliegue

- [ ] Servidor configurado con Python 3.8+
- [ ] Chrome/Chromium instalado
- [ ] Archivos descomprimidos y permisos configurados
- [ ] Entorno virtual creado y dependencias instaladas
- [ ] Servicio systemd configurado (opcional)
- [ ] Nginx configurado como proxy reverso
- [ ] SSL configurado con Let's Encrypt
- [ ] Firewall configurado
- [ ] Logs configurados y rotación habilitada
- [ ] Backup automático configurado
- [ ] Health checks implementados
- [ ] Pruebas de funcionamiento completadas

---

**✅ Con esta guía tendrás tu Google Scraper Masivo funcionando en producción de manera segura y escalable.**

