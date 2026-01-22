# Alert Runbooks

This document provides response procedures for each alert defined in the Vamsa monitoring system.

## Table of Contents

- [HTTP Alerts](#http-alerts)
  - [HighHTTPErrorRate](#highhttperrorrate)
  - [SlowHTTPResponse](#slowhttpresponse)
  - [HTTPRequestRateSpike](#httprequestrratespike)
- [Database Alerts](#database-alerts)
  - [TooManySlowQueries](#toomanyslowqueries)
  - [HighDatabaseErrorRate](#highdatabaseerrorrate)
  - [HighDatabaseQueryLatency](#highdatabasequerylatency)
- [Application Alerts](#application-alerts)
  - [ChartRenderingFailures](#chartrenderingfailures)
  - [HighSearchFailureRate](#highsearchfailurerate)
  - [GEDCOMImportErrors](#gedcomimporterrors)
  - [NoActiveUsers](#noactiveusers)
- [System Alerts](#system-alerts)
  - [PrometheusTargetDown](#prometheustargetdown)
  - [OTELCollectorNoData](#otelcollectornodata)
  - [AlertmanagerDown](#alertmanagerdown)

---

## HTTP Alerts

### HighHTTPErrorRate

**Severity**: Critical
**Component**: HTTP
**Condition**: Error rate >5% for 5 minutes

#### Symptoms

- Users experiencing 500 errors
- Application appears broken or unresponsive
- API calls failing

#### Investigation Steps

1. **Check recent deployments**

   ```bash
   git log --oneline -10
   ```

2. **Check application logs**

   ```bash
   docker logs vamsa-app --tail 100
   # Or in development:
   pnpm dev  # Check console output
   ```

3. **Check error breakdown by endpoint**
   - Open Grafana: http://localhost:3001
   - Navigate to Vamsa dashboard
   - Look at "Error Rate by Endpoint" panel

4. **Check database connectivity**

   ```bash
   docker exec vamsa-postgres pg_isready
   ```

5. **Check memory/CPU usage**
   ```bash
   docker stats vamsa-app
   ```

#### Resolution

1. **If deployment-related**: Roll back to previous version

   ```bash
   git revert HEAD
   pnpm build && pnpm start
   ```

2. **If database issue**: Restart database connection

   ```bash
   docker restart vamsa-postgres
   ```

3. **If resource exhaustion**: Scale or restart application
   ```bash
   docker restart vamsa-app
   ```

---

### SlowHTTPResponse

**Severity**: Warning
**Component**: HTTP
**Condition**: P95 latency >1000ms for 5 minutes

#### Symptoms

- Pages load slowly
- API responses take several seconds
- Users report slowness

#### Investigation Steps

1. **Identify slow endpoints**
   - Check Grafana "Response Time by Endpoint" panel
   - Look for endpoints with high P95 latency

2. **Check database query performance**

   ```sql
   -- Check for long-running queries
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE state != 'idle'
   ORDER BY duration DESC;
   ```

3. **Check application resource usage**

   ```bash
   docker stats vamsa-app
   ```

4. **Check for N+1 query issues**
   - Review recent code changes for new database queries
   - Check Prisma query logs

#### Resolution

1. **Add database indexes** for slow queries
2. **Optimize queries** using Prisma includes/selects
3. **Add caching** for frequently accessed data
4. **Scale horizontally** if under heavy load

---

### HTTPRequestRateSpike

**Severity**: Warning
**Component**: HTTP
**Condition**: Request rate >3x normal for 10 minutes

#### Symptoms

- Unusually high traffic
- Possible bot activity or DDoS
- Server load increasing

#### Investigation Steps

1. **Check traffic sources**
   - Review access logs for IP patterns
   - Check for suspicious user agents

2. **Verify legitimate traffic increase**
   - Check for marketing campaigns
   - Check for viral social media posts

3. **Check for bot patterns**
   - Repeated requests to same endpoints
   - Requests without proper headers

#### Resolution

1. **If legitimate**: Scale infrastructure
2. **If malicious**:
   - Block suspicious IPs at firewall/nginx level
   - Enable rate limiting
3. **Add rate limiting** to prevent future incidents

---

## Database Alerts

### TooManySlowQueries

**Severity**: Warning
**Component**: Database
**Condition**: >0.5 slow queries/sec (>500ms each) for 5 minutes

#### Symptoms

- Application feels sluggish
- Database CPU high
- Query timeouts

#### Investigation Steps

1. **Identify slow queries**

   ```sql
   SELECT query, calls, total_time, mean_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

2. **Check for missing indexes**

   ```sql
   SELECT schemaname, tablename, indexrelname, idx_scan
   FROM pg_stat_user_indexes
   WHERE idx_scan = 0
   ORDER BY relname;
   ```

3. **Review recent schema changes**
   - Check for new queries without proper indexes
   - Check for removed indexes

#### Resolution

1. **Add missing indexes**

   ```prisma
   @@index([fieldName])
   ```

2. **Optimize queries**
   - Use `select` to limit fields
   - Use `include` wisely
   - Consider pagination

3. **VACUUM ANALYZE** tables
   ```sql
   VACUUM ANALYZE tablename;
   ```

---

### HighDatabaseErrorRate

**Severity**: Critical
**Component**: Database
**Condition**: Error rate >1% for 5 minutes

#### Symptoms

- Database queries failing
- Application errors
- Data not saving

#### Investigation Steps

1. **Check PostgreSQL logs**

   ```bash
   docker logs vamsa-postgres --tail 100
   ```

2. **Check connection pool status**

   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```

3. **Check for deadlocks**
   ```sql
   SELECT * FROM pg_locks WHERE NOT granted;
   ```

#### Resolution

1. **Connection pool exhausted**: Increase pool size or fix connection leaks
2. **Deadlocks**: Review transaction patterns, reduce transaction scope
3. **Disk full**: Free up disk space
4. **Restart database** as last resort

---

### HighDatabaseQueryLatency

**Severity**: Warning
**Component**: Database
**Condition**: P95 query time >500ms for 10 minutes

#### Symptoms

- All database operations slow
- Not just specific queries

#### Investigation Steps

1. **Check database server resources**

   ```bash
   docker stats vamsa-postgres
   ```

2. **Check for table bloat**

   ```sql
   SELECT schemaname, tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

3. **Check for lock contention**
   ```sql
   SELECT * FROM pg_stat_activity WHERE wait_event_type = 'Lock';
   ```

#### Resolution

1. **Run VACUUM FULL** during maintenance window
2. **Increase database resources** (memory, CPU)
3. **Add read replicas** for read-heavy workloads
4. **Review and optimize schema**

---

## Application Alerts

### ChartRenderingFailures

**Severity**: Warning
**Component**: Charts
**Condition**: >0.1 chart render errors/sec for 5 minutes

#### Symptoms

- Family tree charts not displaying
- JavaScript errors in browser console
- Blank chart areas

#### Investigation Steps

1. **Check browser console** for JavaScript errors
2. **Check application logs** for chart-related errors
3. **Verify data integrity**
   - Check if persons/relationships exist
   - Check for circular relationships

#### Resolution

1. **Fix data issues** causing rendering failures
2. **Update chart library** if bug is known
3. **Add error boundaries** to prevent full page crashes

---

### HighSearchFailureRate

**Severity**: Info
**Component**: Search
**Condition**: >50% zero-result searches for 10 minutes

#### Symptoms

- Users not finding expected results
- Search feels broken

#### Investigation Steps

1. **Analyze search queries**
   - Check for common misspellings
   - Check for queries that should have results

2. **Verify search index**
   - Check if all records are indexed
   - Check for indexing delays

#### Resolution

1. **Improve search algorithm** (fuzzy matching, synonyms)
2. **Add search suggestions**
3. **Reindex search data**

---

### GEDCOMImportErrors

**Severity**: Warning
**Component**: GEDCOM
**Condition**: >1 GEDCOM error/sec for 5 minutes

#### Symptoms

- GEDCOM imports failing
- Partial data imports
- Error messages during upload

#### Investigation Steps

1. **Check import logs** for specific errors
2. **Validate GEDCOM files** being uploaded
3. **Check for encoding issues** (UTF-8 vs other encodings)

#### Resolution

1. **Fix GEDCOM parser** for edge cases
2. **Provide better error messages** to users
3. **Add GEDCOM validation** before import

---

### NoActiveUsers

**Severity**: Warning
**Component**: Application
**Condition**: No active users for 30 minutes

#### Symptoms

- No user activity
- Application might be inaccessible

#### Investigation Steps

1. **Check application health**

   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Check network accessibility**
   - DNS resolution
   - Load balancer health
   - SSL certificate validity

3. **Check for maintenance or outage announcements**

#### Resolution

1. **If application down**: Restart and investigate root cause
2. **If network issue**: Fix DNS/load balancer/SSL
3. **If expected** (off-hours): Adjust alert threshold

---

## System Alerts

### PrometheusTargetDown

**Severity**: Critical
**Component**: System
**Condition**: Target unreachable for 5 minutes

#### Symptoms

- Metrics collection stopped
- Gaps in Grafana dashboards
- Alerting may be affected

#### Investigation Steps

1. **Check target status in Prometheus**
   - Open http://localhost:9090/targets
   - Identify which target is down

2. **Check target service**
   ```bash
   docker ps -a | grep <target-name>
   docker logs <target-name>
   ```

#### Resolution

1. **Restart failed service**

   ```bash
   docker restart <service-name>
   ```

2. **Check service configuration**
3. **Verify network connectivity** between Prometheus and target

---

### OTELCollectorNoData

**Severity**: Warning
**Component**: Observability
**Condition**: No metrics received for 10 minutes

#### Symptoms

- No new metrics in Prometheus
- Application metrics stale
- Traces not appearing

#### Investigation Steps

1. **Check OTEL Collector logs**

   ```bash
   docker logs vamsa-otel-collector
   ```

2. **Check application is sending data**
   - Verify OTEL_EXPORTER_OTLP_ENDPOINT is set
   - Check for connection errors in app logs

3. **Check collector health**
   ```bash
   curl http://localhost:13133/
   ```

#### Resolution

1. **Restart OTEL Collector**

   ```bash
   docker restart vamsa-otel-collector
   ```

2. **Verify application configuration**
3. **Check network connectivity**

---

### AlertmanagerDown

**Severity**: Critical
**Component**: Alerting
**Condition**: No Alertmanager connected for 5 minutes

#### Symptoms

- Alerts not being sent
- Slack/email notifications stopped
- Prometheus shows 0 Alertmanagers

#### Investigation Steps

1. **Check Alertmanager status**

   ```bash
   docker ps | grep alertmanager
   docker logs vamsa-alertmanager
   ```

2. **Check Alertmanager configuration**
   - Verify alertmanager.yml syntax
   - Check for configuration errors

3. **Check network connectivity**
   - Verify Prometheus can reach Alertmanager

#### Resolution

1. **Restart Alertmanager**

   ```bash
   docker restart vamsa-alertmanager
   ```

2. **Fix configuration errors**
3. **Check Docker network** settings

---

## General Troubleshooting

### Useful Commands

```bash
# Check all observability services
docker-compose -f docker/docker-compose.observability.yml ps

# View all logs
docker-compose -f docker/docker-compose.observability.yml logs -f

# Restart all observability services
docker-compose -f docker/docker-compose.observability.yml restart

# Check Prometheus configuration
curl http://localhost:9090/api/v1/status/config

# Check loaded alert rules
curl http://localhost:9090/api/v1/rules

# Check current alerts
curl http://localhost:9090/api/v1/alerts

# Check Alertmanager alerts
curl http://localhost:9093/api/v2/alerts
```

### Escalation Path

1. **Info alerts**: Monitor, no immediate action needed
2. **Warning alerts**: Investigate within 4 hours
3. **Critical alerts**: Investigate immediately

### Contacts

- **On-call Engineer**: Check PagerDuty/OpsGenie
- **Slack Channel**: #vamsa-alerts
- **Documentation**: https://github.com/vamsa/vamsa/docs
