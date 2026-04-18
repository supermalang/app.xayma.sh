# Vibe Annotations Setup

## Overview

The Vibe Annotations MCP server is automatically started when the dev container starts, allowing you to capture and track UI design annotations directly in Claude Code.

## How It Works

1. **Server**: `vibe-annotations-server` runs on `http://127.0.0.1:3846` (automatically started)
2. **Configuration**: Set up in `~/.claude/.claude.json` under `mcpServers.vibe-annotations`
3. **Workflow**: Annotate UI elements in browser → Access annotations in Claude → Implement fixes

## Helper Script

Use the convenient CLI helper to manage annotations:

```bash
# List all annotations
./scripts/vibe-annotations.sh list

# Show only pending annotations
./scripts/vibe-annotations.sh pending

# Watch annotations (auto-refresh every 5 seconds)
./scripts/vibe-annotations.sh watch

# Count total annotations
./scripts/vibe-annotations.sh count

# Mark annotation as resolved
./scripts/vibe-annotations.sh resolve <annotation-id>
```

## Workflow

### Step 1: Start Dev Environment
```bash
npm run dev                    # Vite on :5173
vibe-annotations-server start # Already running from postStartCommand
```

### Step 2: Open Browser and Annotate
1. Navigate to `http://localhost:5173/<page>`
2. Open browser DevTools (F12)
3. Use Vibe extension to annotate UI elements
4. Comments are saved automatically

### Step 3: Review & Implement in Claude
1. In Claude Code terminal, run:
   ```bash
   ./scripts/vibe-annotations.sh pending
   ```
2. Copy annotation details
3. Implement fixes in code
4. Test in browser

### Step 4: Mark as Done
Once implemented:
```bash
curl -X PATCH http://127.0.0.1:3846/api/annotations/<id> \
  -H "Content-Type: application/json" \
  -d '{"status":"resolved"}'
```

Or use the helper:
```bash
./scripts/vibe-annotations.sh resolve <id>
```

## Accessing Annotations Programmatically

The Vibe server exposes a REST API:

```bash
# Get all annotations (JSON)
curl http://127.0.0.1:3846/api/annotations

# Get specific annotation
curl http://127.0.0.1:3846/api/annotations/<id>

# Filter by status
curl 'http://127.0.0.1:3846/api/annotations?status=pending'
```

## Key Files

- **Server Config**: `~/.claude/.claude.json` (MCP server URL)
- **Container Config**: `.devcontainer/devcontainer.json` (postStartCommand)
- **Helper Script**: `scripts/vibe-annotations.sh` (CLI tool)
- **This Guide**: `.devcontainer/VIBE_ANNOTATIONS.md`

## Troubleshooting

### Server not running?
```bash
# Check if running
pgrep -f vibe-annotations-server

# Start manually
vibe-annotations-server start &
```

### Can't access annotations?
1. Ensure browser tab is open to `http://localhost:5173`
2. Verify server is running: `curl http://127.0.0.1:3846/api/annotations`
3. Check Vibe extension is enabled in browser DevTools

### Want to clear all annotations?
```bash
# Kill and restart server
pkill -f vibe-annotations-server
sleep 2
vibe-annotations-server start &
```

## Advanced Usage

### Stream annotations in terminal
```bash
watch -c './scripts/vibe-annotations.sh pending'
```

### Export annotations to JSON
```bash
curl -s http://127.0.0.1:3846/api/annotations | jq . > annotations.json
```

### Filter by URL path
```bash
curl 'http://127.0.0.1:3846/api/annotations' | jq '.annotations[] | select(.url_path == "/signup")'
```
