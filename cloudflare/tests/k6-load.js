import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    burst: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10000 },
        { duration: '3m', target: 10000 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<100'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const base = __ENV.BASE_URL || 'https://your-worker.yourdomain.workers.dev';
  const res = http.get(`${base}/api/students`);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(0.5);
}
