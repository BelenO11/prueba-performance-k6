import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend } from 'k6/metrics';

// ─── Métricas personalizadas ───────────────────────────────────────────────
const errorRate   = new Rate('tasa_error');
const loginTrend  = new Trend('duracion_login_ms', true);

// ─── Carga de usuarios desde CSV ──────────────────────────────────────────
const usuarios = new SharedArray('usuarios', function () {
  return open('./usuarios.csv')
    .split('\n')
    .slice(1)                        // quita encabezado
    .filter(line => line.trim())     // quita líneas vacías
    .map(line => {
      const [user, passwd] = line.split(',');
      return { user: user.trim(), passwd: passwd.trim() };
    });
});

// ─── Configuración del escenario ──────────────────────────────────────────
// Objetivo: alcanzar y sostener ≥ 20 TPS
// Con tiempo de respuesta ≤ 1500 ms y tasa de error < 3%
export const options = {
  scenarios: {
    carga_login: {
      executor: 'ramping-arrival-rate',   // controla TPS directamente
      startRate: 1,                        // TPS inicial
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 100,
      stages: [
        { duration: '30s', target: 10 },  // rampa de subida a 10 TPS
        { duration: '30s', target: 20 },  // rampa a 20 TPS
        { duration: '60s', target: 20 },  // sostener 20 TPS por 1 minuto
        { duration: '20s', target: 0  },  // rampa de bajada
      ],
    },
  },

  thresholds: {
    // Tiempo de respuesta máximo permitido: 1500 ms (percentil 95)
    'http_req_duration': ['p(95)<1500'],

    // Tasa de error < 3%
    'tasa_error': ['rate<0.03'],

    // Métrica personalizada de login también bajo el umbral
    'duracion_login_ms': ['p(95)<1500'],
  },
};

// ─── URL y headers ────────────────────────────────────────────────────────
const BASE_URL = 'https://fakestoreapi.com';
const HEADERS  = { 'Content-Type': 'application/json' };

// ─── Función principal (VU) ───────────────────────────────────────────────
export default function () {
  // Selecciona un usuario aleatorio del CSV
  const usuario = usuarios[Math.floor(Math.random() * usuarios.length)];

  const payload = JSON.stringify({
    username: usuario.user,
    password: usuario.passwd,
  });

  const start = Date.now();

  const res = http.post(`${BASE_URL}/auth/login`, payload, {
    headers: HEADERS,
    timeout: '60s',
    tags: { endpoint: 'login' },
  });

  const duracion = Date.now() - start;
  loginTrend.add(duracion);

  // ─── Validaciones ────────────────────────────────────────────────────
  const ok = check(res, {
    'status es 200':             (r) => r.status === 200,
    'body contiene token':       (r) => r.json('token') !== undefined,
    'tiempo respuesta <= 1500ms': (r) => r.timings.duration <= 1500,
  });

  // Registra error si alguna validación falló
  errorRate.add(!ok);

  sleep(0.1); // pequeña pausa entre iteraciones del mismo VU
}

// ─── Resumen final en consola ─────────────────────────────────────────────
export function handleSummary(data) {
  const totalReq   = data.metrics.http_reqs?.values?.count ?? 0;
  const errorCount = data.metrics.tasa_error?.values?.passes ?? 0;
  const errorPct   = ((errorCount / totalReq) * 100).toFixed(2);
  const p95        = data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(0) ?? 'N/A';
  const avgTPS     = (totalReq / 140).toFixed(2); // duración total ~140s

  const resumen = `
=====================================
  RESUMEN PRUEBA DE CARGA - LOGIN
=====================================
  Total peticiones : ${totalReq}
  TPS promedio     : ${avgTPS} req/s
  Tasa de error    : ${errorPct}%
  P95 tiempo resp. : ${p95} ms
  Umbral tiempo    : 1500 ms  ${Number(p95) <= 1500 ? '✓ CUMPLE' : '✗ NO CUMPLE'}
  Umbral error     : 3%       ${Number(errorPct) < 3 ? '✓ CUMPLE' : '✗ NO CUMPLE'}
=====================================
`;
  console.log(resumen);

  return {
    'reporte/resumen-prueba.txt': resumen,
    stdout: resumen,
  };
}
