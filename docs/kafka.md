# Kafka Architecture — Xayma.sh

## Overview

Xayma.sh uses Apache Kafka in **KRaft mode** (Kubernetes Raft consensus, no ZooKeeper dependency) as its event backbone. All asynchronous operations—credit debits, deployments, notifications, and audit events—flow through Kafka topics and are consumed by the workflow engine.

**Deployment:** Single-broker KRaft cluster on Hetzner CX32 (management node). Managed via `docker-compose` with persistent volumes.

**Why Kafka?**
- Decouple Vue frontend from async operations (fire-and-forget webhooks)
- Enable replay and tracing of all state changes (audit stream)
- Support concurrent consumer processing with strong ordering guarantees per partition
- Provide retention for troubleshooting and analytics

---

## Topics

| Topic | Partitions | Retention | Purpose |
|-------|-----------|-----------|---------|
| `credit.debit` | 3 | 7 days | Fired every 15 minutes by WE cron for each active deployment; consumes 1 credit per running instance. Enables idempotent billing. |
| `credit.topup` | 3 | 7 days | Fired when payment IPN completes (Wave/Orange Money) or voucher redeemed. Triggers balance update and resumption checks. |
| `credit.expiry` | 1 | 7 days | Fired by WE cron when a credit bundle reaches its expiration date; triggers suspension if no other active bundle exists. |
| `deployment.created` | 3 | 7 days | Fired when a customer creates a new deployment (POST to workflow engine). Triggers deployment engine provisioning and status tracking. |
| `deployment.suspend` | 3 | 7 days | Fired when a partner's remaining credits drop to 0 after a debit event. Triggers immediate deployment engine stop and UI status update. |
| `deployment.resume` | 3 | 7 days | Fired when a suspended partner tops up credits. Triggers deployment engine start and UI status update. |
| `notification.send` | 6 | 7 days | Fan-out trigger for all four notification channels (in-app, email, SMS, push). High partition count allows concurrent delivery. |
| `audit.event` | 1 | 30 days | General audit stream for all INSERT/UPDATE/DELETE on core tables (partners, deployments, credit_transactions, users). Single partition preserves global ordering for compliance. |

---

## Consumer Groups

| Consumer Group | Topic(s) | Workflow Engine Action |
|---|---|---|
| `we-credit-debit-consumer` | `credit.debit` | Decrements `partners.remainingCredits`, writes row to `credit_transactions` with type=DEBIT, publishes `deployment.suspend` if balance ≤ 0. |
| `we-credit-topup-consumer` | `credit.topup` | Increments `partners.remainingCredits`, writes row to `credit_transactions` with type=TOPUP, publishes `deployment.resume` for each suspended deployment of that partner. |
| `we-credit-expiry-consumer` | `credit.expiry` | Marks expired bundle as inactive in `credit_bundles`, checks if partner has other active bundles; if not, publishes `deployment.suspend` for all deployments. |
| `we-suspend-consumer` | `deployment.suspend` | Calls deployment engine `/api/deployments/{deploymentId}/stop`, updates deployment status to SUSPENDED in database. |
| `we-resume-consumer` | `deployment.resume` | Calls deployment engine `/api/deployments/{deploymentId}/start`, updates deployment status to RUNNING in database. |
| `we-notification-fanout` | `notification.send` | Fans out to 4 parallel producers: `notification.send.inapp`, `notification.send.email`, `notification.send.sms`, `notification.send.push` (one message per channel). |

---

## Producer Rules

**Golden Rule:** Only the workflow engine publishes to Kafka topics. Never from the Vue frontend.

**Flow:**

```
Vue Frontend
  ↓
Calls workflow engine webhook (via src/services/workflow-engine.ts)
  ↓
Workflow engine validates + executes business logic
  ↓
Publishes to Kafka topic(s)
  ↓
Consumers process async (fire-and-forget from Vue perspective)
  ↓
Database updates via RLS
  ↓
Vue subscribes to Realtime changes (database notifications)
  ↓
UI reflects final state
```

**Examples:**

- **Deployment created:** Vue → POST `/api/deployments` webhook → WE validates → publishes `deployment.created` → consumer provisions → updates status → Vue sees change via Realtime
- **Credit debit:** WE cron (every 15 min) → publishes `credit.debit` → consumer updates balance → if 0, publishes `deployment.suspend` → consumer stops instance → database updates → Vue sees Realtime change
- **Top-up:** Payment gateway IPN → WE webhook → publishes `credit.topup` → consumer resumes deployments → WE cron detects running instances again

---

## Infrastructure

### Cluster Configuration

| Key | Value |
|---|---|
| Cluster ID | `xayma-kafka-cluster-01` |
| Mode | KRaft (Kubernetes Raft, no ZooKeeper) |
| Broker Count | 1 (single node on CX32) |
| Docker Internal Bootstrap | `kafka:9092` (Docker network) |
| Kafka UI | `https://kafka-ui.xayma.sh` (Traefik BasicAuth, admin-only access) |

### KRaft Process Roles

```
KAFKA_PROCESS_ROLES=broker,controller
KAFKA_CONTROLLER_QUORUM_VOTERS=1@kafka:9093
KAFKA_NODE_ID=1
```

Each broker acts as both broker and controller. Single node = quorum of one.

### Volumes

```
kafka_data:        /var/lib/kafka/data
kafka_logs:        /var/log/kafka
```

Persistent Docker volumes ensure data survives restarts.

---

## Setup

### 1. Start Kafka Cluster

```bash
cd infra/kafka
docker compose up -d
```

This starts:
- `xayma-kafka` (broker + controller)
- `xayma-kafka-ui` (web UI for topic/consumer management)

### 2. Create Topics

```bash
docker exec -it xayma-kafka /bin/bash infra/kafka/create_topics.sh
```

Script idempotently creates all 8 topics with correct partition and retention settings. Safe to re-run.

### 3. Verify Topics

```bash
docker exec xayma-kafka kafka-topics.sh --list --bootstrap-server kafka:9092
```

Expected output:
```
credit.debit
credit.topup
credit.expiry
deployment.created
deployment.suspend
deployment.resume
notification.send
audit.event
```

### 4. Check Kafka UI

Navigate to `https://kafka-ui.xayma.sh` (requires Traefik BasicAuth credentials from ops team).

Topics panel shows:
- Topic list with partition counts
- Current offset for each partition
- Consumer group lag

---

## Monitoring

### Consumer Lag

Workflow engine cron job `kafka-lag-monitor` polls consumer group offsets every 5 minutes.

```
Lag = Latest Offset - Consumer Group Committed Offset
```

Exported to Datadog as:
```
kafka.consumer.lag {
  consumer_group: <group_name>,
  topic: <topic_name>,
  partition: <partition_id>,
  value: <lag_count>
}
```

**Thresholds:**

- Lag < 100: Normal
- Lag 100–1000: Investigate (consumer may be slow)
- Lag > 1000: Alert (possible consumer crash or throughput issue)

### Common Issues

| Issue | Diagnosis | Resolution |
|---|---|---|
| Consumer lag growing | Check WE logs for errors in consumer handler | Restart consumer group: `docker logs xayma-workflow-engine` |
| Topics missing after restart | `create_topics.sh` did not run | Re-run provisioning script |
| Kafka UI 403 Forbidden | No BasicAuth credentials | Contact ops; credentials in 1Password |
| Broker unreachable from WE | Network isolation or broker down | Check `docker ps`; verify `kafka:9092` in WE config |

### Log Access

Workflow engine consumer logs:
```bash
docker logs xayma-workflow-engine | grep "kafka\|consumer\|lag"
```

Broker logs:
```bash
docker exec xayma-kafka tail -f /var/log/kafka/server.log
```

---

## Schema & Message Format

All Kafka messages are JSON. Example:

### credit.debit
```json
{
  "partnerId": "123e4567-e89b-12d3-a456-426614174000",
  "deploymentId": "223e4567-e89b-12d3-a456-426614174001",
  "debitAmount": 1,
  "reason": "scheduled_debit",
  "timestamp": "2026-04-21T14:30:00Z",
  "idempotencyKey": "debit-223e4567-e89b-12d3-a456-426614174001-2026-04-21-14-30"
}
```

### deployment.created
```json
{
  "deploymentId": "223e4567-e89b-12d3-a456-426614174001",
  "partnerId": "123e4567-e89b-12d3-a456-426614174000",
  "appName": "my-nodejs-app",
  "dockerImage": "node:18-alpine",
  "domains": ["my-app.xayma.sh"],
  "timestamp": "2026-04-21T14:30:00Z",
  "userId": "user-123"
}
```

### notification.send
```json
{
  "notificationId": "notif-uuid",
  "partnerId": "123e4567-e89b-12d3-a456-426614174000",
  "userId": "user-123",
  "subject": "Deployment Created",
  "body": "Your deployment my-nodejs-app is now live.",
  "channels": ["inapp", "email", "sms", "push"],
  "timestamp": "2026-04-21T14:30:00Z"
}
```

Message format is validated by workflow engine schema; consumers assume valid JSON.

---

## Access & Security

### Who Can Access?

| Role | Kafka UI | Produce | Consume |
|---|---|---|---|
| DevOps/Ops | Yes (BasicAuth) | Via WE only | Via WE only |
| Workflow Engine | No UI needed | Yes (internal Docker network) | Yes (internal Docker network) |
| Frontend | No | No | No |

### Network

Kafka bootstrap server `kafka:9092` is **internal to Docker network only**. No external exposure (no port binding to host).

Kafka UI is exposed via Traefik on `https://kafka-ui.xayma.sh` with BasicAuth (admin-only).

---

## Related Documentation

- **Workflow Engine Contracts:** `docs/workflow-engine/` — Webhook contracts, Kafka publishing points, and automation specs (`sprint4-contracts.md`, `sprint5-contracts.md`)
- **Database Design:** `docs/specs/SPEC_05_DATABASE_DESIGN.md` — Table schemas for credit_transactions, deployments, etc.
- **Infrastructure:** `docs/SPEC_08_DEPLOYMENT_INFRASTRUCTURE.md` — Full DevOps setup (Hetzner, Traefik, monitoring)
