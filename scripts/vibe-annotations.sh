#!/bin/bash

# Vibe Annotations Helper Script
# Manages UI annotations from the vibe-annotations-server

ANNOTATIONS_SERVER="http://127.0.0.1:3846"

case "$1" in
  pending)
    echo "📝 Fetching pending annotations..."
    curl -s "${ANNOTATIONS_SERVER}/api/annotations?status=pending" | jq '.' 2>/dev/null || echo "❌ Server not running. Start with: npm run dev"
    ;;

  watch)
    INTERVAL="${2:-5}"
    echo "👀 Watching for annotations (refresh every ${INTERVAL}s)..."
    while true; do
      clear
      curl -s "${ANNOTATIONS_SERVER}/api/annotations?status=pending" | jq '.' 2>/dev/null || echo "⏳ Waiting for server..."
      sleep "$INTERVAL"
    done
    ;;

  resolve)
    ANNOTATION_ID="$2"
    if [ -z "$ANNOTATION_ID" ]; then
      echo "❌ Usage: vibe-annotations.sh resolve <annotation_id>"
      exit 1
    fi
    echo "✅ Marking annotation $ANNOTATION_ID as resolved..."
    curl -s -X POST "${ANNOTATIONS_SERVER}/api/annotations/${ANNOTATION_ID}/resolve" | jq '.' 2>/dev/null || echo "❌ Failed to resolve annotation"
    ;;

  *)
    echo "Vibe Annotations Helper"
    echo "Usage: $0 {pending|watch|resolve}"
    echo ""
    echo "Commands:"
    echo "  pending              Show all pending annotations"
    echo "  watch [interval]     Watch for new annotations (default: 5s)"
    echo "  resolve <id>         Mark annotation as resolved"
    exit 1
    ;;
esac
