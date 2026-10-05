---
name: performance-optimization
description: >-
  Profiles, benchmarks, and optimizes application performance across database queries,
  backend ML inference, network latency, and frontend client bundles.
---

# Performance Optimization Skill

## When to Use It
Activate this skill when investigating slow API response times, high CPU/memory usage, long frontend load times, or database query bottlenecks.

## Prerequisites
- Benchmarking and profiling tools (network timing, database EXPLAIN queries, bundle analyzers).

## Step-by-Step Procedure
1. **Identify Bottlenecks:**
   - Measure request duration and database query execution times.
   - Profile slow endpoints to pinpoint whether delays stem from network, I/O, or CPU computation.
2. **Database Optimization:**
   - Add targeted indexes on foreign keys and frequently filtered columns (`user_id`, `created_at`).
   - Eliminate N+1 query patterns by using eager loading (`joinedload`, `selectinload`).
3. **Frontend & Network Optimization:**
   - Eliminate hanging proxy rewrites on cloud deployments.
   - Compress image uploads on client-side before transmission (`downscaleImage`).
   - Use dynamic imports for heavy charting libraries (`recharts`).
4. **Benchmarking:**
   - Compare before-and-after response times and memory usage.

## Verification Checklist
- [ ] API endpoints respond within target SLA (<200ms for standard queries).
- [ ] Frontend bundle sizes remain lean with efficient code splitting.
- [ ] Database query plans use indexes rather than sequential scans.

## Failure Recovery
- If an index slows down write operations, re-evaluate index utility and retain only critical search indexes.

## Safety Constraints
- Never sacrifice data consistency or correctness for premature optimization.
