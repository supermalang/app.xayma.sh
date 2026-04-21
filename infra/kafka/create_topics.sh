#!/bin/bash

# Xayma.sh Kafka Topic Provisioning Script
# Idempotent topic creation using kafka-topics.sh --if-not-exists
# Safe to run multiple times

set -e

# Configuration
BOOTSTRAP_SERVER="kafka:9092"
RETENTION_7_DAYS=604800000  # milliseconds
RETENTION_30_DAYS=2592000000 # milliseconds

echo "========================================"
echo "Starting Kafka topic provisioning..."
echo "Bootstrap Server: $BOOTSTRAP_SERVER"
echo "========================================"
echo ""

# Function to create a topic with idempotent check
create_topic() {
    local topic=$1
    local partitions=$2
    local retention=$3

    echo "Creating topic: $topic (partitions: $partitions, retention: ${retention}ms)"

    kafka-topics --bootstrap-server $BOOTSTRAP_SERVER \
        --create \
        --if-not-exists \
        --topic $topic \
        --partitions $partitions \
        --replication-factor 1 \
        --config retention.ms=$retention

    if [ $? -eq 0 ]; then
        echo "✓ Topic '$topic' created or already exists"
    else
        echo "✗ Failed to create topic '$topic'"
        exit 1
    fi
    echo ""
}

# Credit topics
create_topic "credit.debit" 3 $RETENTION_7_DAYS
create_topic "credit.topup" 3 $RETENTION_7_DAYS
create_topic "credit.expiry" 1 $RETENTION_7_DAYS

# Deployment topics
create_topic "deployment.created" 3 $RETENTION_7_DAYS
create_topic "deployment.suspend" 3 $RETENTION_7_DAYS
create_topic "deployment.resume" 3 $RETENTION_7_DAYS

# Notification topic (higher throughput for fan-out)
create_topic "notification.send" 6 $RETENTION_7_DAYS

# Audit topic (longer retention)
create_topic "audit.event" 1 $RETENTION_30_DAYS

echo "========================================"
echo "✓ All topics provisioned successfully"
echo "========================================"

# List all topics for verification
echo ""
echo "Verifying created topics:"
kafka-topics --bootstrap-server $BOOTSTRAP_SERVER --list

exit 0
