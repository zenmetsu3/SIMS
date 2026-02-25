# Cloudflare SIMS Architecture

## Overview
Edge-native student management using Cloudflare Workers, D1 (SQLite), KV, R2, and CDN cache.

## Data Model
- Students(id, email, first_name, last_name, course, year_level)
- Courses(id, code, title, units)
- Enrollments(id, student_id, course_id, semester)
- Grades(id, enrollment_id, grade)
- Announcements(id, title, content, priority, timestamp, author)

See `schema.sql` for DDL and indexes.

## API (JWT-secured)
- GET /api/students?q=:query
- GET /api/courses
- POST /api/enrollments {student_id, course_id, semester}
- POST /api/grades {enrollment_id, grade}
- GET /api/announcements
- WS /ws for realtime notifications

Authorization: `Authorization: Bearer <JWT>` using HS256 with `JWT_SECRET`.

## Caching & Optimization
- CDN Cache-Control headers for read-heavy endpoints
- KV/Cache API for short TTLs at edge
- Parameterized SQL with indexes

## Backups & DR
- Scheduled Worker dumps D1 tables hourly to R2 (`BACKUPS`) with ISO timestamp keys.
- RPO 1 hour via hourly backups; RTO 15 minutes by restoring to D1 from R2 object.

## Realtime Sync
- Durable Object `SyncHub` fans out JSON messages to WebSocket clients on data changes.
- Clients subscribe to `/ws`, receive events: `enrollment_created`, `grade_recorded`.

## Privacy & Compliance
- Minimized PII exposure, access logged to Analytics Engine dataset `sims_analytics`.
- Role-based access via JWT claims; data-at-rest in D1, encrypted in R2; TLS in transit.
- Data minimization, subject access, and deletion workflows supported via targeted SQL.

## Deployment
```bash
cd cloudflare
wrangler d1 create sims-d1
wrangler d1 execute sims-d1 --file=schema.sql
wrangler kv:namespace create SIMS_CACHE
wrangler r2 bucket create sims-backups
wrangler publish
```
Set secrets:
```bash
wrangler secret put JWT_SECRET
wrangler secret put JWT_ISS
wrangler secret put JWT_AUD
```

## Monitoring
- Use Cloudflare Analytics Engine queries on `sims_analytics` for performance and activity.
- Grafana dashboards via Cloudflare Analytics API for latency, status codes, and event counts.

## Load Testing
- See `tests/k6-load.js`. Target: 10k virtual users, p95 < 100ms globally with CDN cache.

## Integration
- Replace current Express endpoints gradually by pointing frontend to Worker routes.
- JWTs can be issued by the existing server or by a Worker auth service.
