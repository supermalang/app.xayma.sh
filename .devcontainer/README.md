# DataBridge Dev Container

## First Time Setup

### Prerequisites (on your host machine)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [VS Code](https://code.visualstudio.com/)
- [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) (`ms-vscode-remote.remote-containers`)

### Start the container
1. Open the project folder in VS Code
2. When prompted "Reopen in Container" → click it
   - Or: `Cmd+Shift+P` → `Dev Containers: Reopen in Container`
3. Wait ~3 minutes for first build (subsequent starts are instant)
4. You'll see **"DataBridge Dev Container"** in the bottom-left status bar

### Authenticate Claude Code (first time only)
```bash
claude  # follow the OAuth prompt in your browser
```

### Set up environment
```bash
cp .env.example .env
# Fill in your online Supabase, n8n, and other service values in .env
```

### Start the dev server
```bash
dev             # Vite on http://localhost:5173
```

---

## Daily Workflow

```
Open VS Code → container auto-starts → terminal ready

dev             start Vite dev server
cc              start Claude Code (--dangerously-skip-permissions is auto-set)
check           type-check + lint before committing
testrun         run all unit tests
e2e             run Playwright E2E tests
sbtypes         regenerate Supabase TypeScript types after schema changes
sbpush          push schema changes to remote Supabase
```

---

## Shell Aliases (full list)

| Alias | Command |
|-------|---------|
| `dev` | `npm run dev` |
| `build` | `npm run build` |
| `tc` | `npm run type-check` |
| `lint` | `npm run lint` |
| `fix` | `npm run lint:fix` |
| `check` | type-check + lint |
| `test` | `npm run test` (watch) |
| `testrun` | `npx vitest run` |
| `coverage` | vitest with coverage |
| `e2e` | Playwright E2E |
| `e2eui` | Playwright UI mode |
| `sbpush` | push schema to remote Supabase |
| `sbtypes` | regenerate TS types from remote |
| `cc` | `claude` |
| `gs` | `git status` |
| `gd` | `git diff` |
| `ga` | `git add -A` |
| `gcb` | `git checkout -b` |
| `gl` | git log (pretty) |

---

## Ports

| Port | Service |
|------|---------|
| 5173 | Vite dev server |
| 3846 | Vibe Annotations MCP server |

---

## Installed Extensions

| Category | Extensions |
|----------|-----------|
| Claude Code | `anthropic.claude-code` |
| Vue / TS | Volar, TypeScript Next |
| Styling | Tailwind IntelliSense |
| i18n | i18n Ally (shows EN+FR inline) |
| Testing | Vitest Explorer, Playwright |
| Database | Supabase, SQLTools + PG driver |
| Git | GitLens, Git Graph, GitHub PRs |
| API | REST Client (test n8n webhooks via `tests/api/webhooks.http`) |
| DX | Error Lens, Path IntelliSense, Spell Checker, Icons |

---

## Testing n8n Webhooks from VS Code

Open `tests/api/webhooks.http` in VS Code.
Click **"Send Request"** above any request to test it against your n8n instance.
Set your JWT token at the top of the file.

---

## Rebuilding the Container

After changing `devcontainer.json` or `Dockerfile`:
```
Cmd+Shift+P → Dev Containers: Rebuild Container
```

Your Claude config, npm globals, and ZSH history are stored in Docker volumes — they persist across rebuilds.
