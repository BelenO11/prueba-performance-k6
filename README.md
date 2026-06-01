# Ejercicio de Performance - Prueba de Carga Login | K6

Prueba de carga sobre el endpoint de autenticación de [FakeStore API](https://fakestoreapi.com/auth/login) usando **K6**.

## Objetivo

Validar que el servicio de login soporte al menos **20 TPS** cumpliendo:
Tiempo de respuesta (P95) ≤ **1500 ms**
Tasa de error < **3%**

## Tecnologías utilizadas

Tecnología y Versión 
K6 - 0.54.0+ 
Node.js  18+
Sistema Operativo - Windows 

##  Estructura del proyecto

ejercicio-performance/
  k6-script/
        login_load_test.js   --> Script principal de K6
        usuarios.csv         --> Datos de entrada parametrizados
reporte
     resumen-prueba.txt   --> Generado automáticamente al ejecutar
  README.md
  conclusiones.txt

##  Pre-requisitos

## Instalar K6

**Windows (con Chocolatey):**
```bash
choco install k6
```

**Windows (descarga directa):**
Descargar el instalador desde: https://github.com/grafana/k6/releases/latest
→ Elegir el archivo `.msi` para Windows

**Verificar instalación:**
```bash
k6 version

##  Instrucciones de ejecución

### 1. Clonar el repositorio
```bash
https://github.com/BelenO11/prueba-api-karate-demoblaze.git
```
### 2. Ejecutar la prueba
```bash
k6 run k6-script/login_load_test.js
```
### 3. Ejecutar con reporte JSON (opcional)
```bash
k6 run --out json=reporte/resultados.json k6-script/login_load_test.js
```
### 4. Ejecutar con reporte HTML (opcional, requiere k6-reporter)
```bash
k6 run --out json=reporte/resultados.json k6-script/login_load_test.js
```
##  Escenario de carga

```
TPS
 20 │          ┌──────────────────┐
    │         /│                  │\
 10 │        / │                  │ \
    │       /  │                  │  \
  1 │──────/   │                  │   \──
    └──────────────────────────────────── tiempo
       30s  30s        60s          20s
```

| Fase | Duración | TPS objetivo |
|---|---|---|
| Rampa subida inicial | 30s | 1 → 10 TPS |
| Rampa subida final | 30s | 10 → 20 TPS |
| Carga sostenida | 60s | 20 TPS |
| Rampa bajada | 20s | 20 → 0 TPS |
| **Total** | **140s** | |


## Validaciones por petición

Cada request valida:
1. HTTP Status = 200
2. Body contiene campo `token`
3. Tiempo de respuesta ≤ 1500 ms

##  Datos de entrada (usuarios.csv)

Los usuarios se cargan desde `k6-script/usuarios.csv` y se seleccionan aleatoriamente en cada iteración:

| username | password |
|---|---|
| donero | ewedon |
| kevinryan | kev02937@ |
| johnd | m38rmF$ |
| derek | jklg*_56 |
| mor_2314 | 83r5^_ |


## Hallazgos y conclusiones

Ver el archivo `conclusiones.txt` para los hallazgos de la prueba.
