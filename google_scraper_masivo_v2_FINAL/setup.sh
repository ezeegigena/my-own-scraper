#!/bin/bash

# Script de configuración para despliegue
# Este script configura el entorno para ejecutar el Google Scraper Masivo

echo "🚀 Configurando Google Scraper Masivo..."

# Crear directorio de resultados
mkdir -p results

# Instalar dependencias del sistema (si es necesario)
# sudo apt-get update
# sudo apt-get install -y python3-pip python3-venv chromium-browser

# Crear entorno virtual si no existe
if [ ! -d "scraper_interface/venv" ]; then
    echo "📦 Creando entorno virtual..."
    cd scraper_interface
    python3 -m venv venv
    cd ..
fi

# Activar entorno virtual e instalar dependencias
echo "📋 Instalando dependencias..."
cd scraper_interface
source venv/bin/activate
pip install -r requirements.txt

echo "✅ Configuración completada!"
echo ""
echo "Para iniciar la aplicación:"
echo "1. cd scraper_interface"
echo "2. source venv/bin/activate"
echo "3. python src/main.py"
echo ""
echo "Luego abre tu navegador en: http://localhost:5000"

