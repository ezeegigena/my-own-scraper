# 🚀 INSTRUCCIONES DE DESPLIEGUE RÁPIDO

## ⚡ Inicio Rápido (5 minutos)

### 1. Descomprimir
```bash
unzip google_scraper_masivo_v2_completo.zip
cd google_scraper_masivo_v2_completo
```

### 2. Configurar Automáticamente
```bash
chmod +x setup.sh
./setup.sh
```

### 3. Ejecutar
```bash
cd scraper_interface
source venv/bin/activate
python src/main.py
```

### 4. Usar
- Abrir navegador en: `http://localhost:5000`
- Los archivos CSV se guardan en: `results/scraped_data.csv`

## 🆕 Nuevas Funcionalidades

✅ **Facebook incluido** - Ahora busca también en Facebook  
✅ **Sin duplicados** - Elimina automáticamente leads repetidos  
✅ **Datos predeterminados** - Extrae nombre, teléfono, email y sitio web automáticamente  
✅ **Progreso en tiempo real** - Ve el avance del scraping  
✅ **Descarga directa** - Botón para descargar el CSV  
✅ **Ubicación clara** - Sabes exactamente dónde se guarda el archivo  

## 📋 Lo que necesitas

- Python 3.8+ 
- Conexión a internet
- 1 GB RAM mínimo
- Chrome/Chromium (se instala automáticamente)

## 🌐 Para Hosting/VPS

Ver archivo `DEPLOYMENT_GUIDE.md` para instrucciones completas de despliegue en servidor.

## ❓ Problemas

**Error de permisos:**
```bash
chmod +x setup.sh
sudo chown -R $USER:$USER .
```

**Chrome no encontrado:**
```bash
sudo apt-get install chromium-browser
```

**Puerto ocupado:**
```bash
sudo kill -9 $(sudo lsof -t -i:5000)
```

---
**¡Listo para usar en menos de 5 minutos!** 🎯

