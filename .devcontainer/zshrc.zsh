export ZSH="$HOME/.oh-my-zsh"

ZSH_THEME="robbyrussell"

plugins=(
  git
  node
  npm
  zsh-autosuggestions
  zsh-syntax-highlighting
  fzf
)

source $ZSH/oh-my-zsh.sh

# npm global path
export PATH="$HOME/.npm-global/bin:$PATH"

# ── Aliases: DataBridge dev shortcuts ──────────────────────────────────────

# Dev server
alias dev="npm run dev"
alias build="npm run build"
alias preview="npm run preview"

# Tests
alias test="npm run test"
alias testrun="npx vitest run"
alias coverage="npx vitest run --coverage"
alias e2e="npm run test:e2e"
alias e2eui="npm run test:e2e:ui"

# Type & lint
alias tc="npm run type-check"
alias lint="npm run lint"
alias fix="npm run lint:fix"
alias check="npm run type-check && npm run lint"

# Supabase
alias sbstart="npx supabase start"
alias sbstop="npx supabase stop"
alias sbpush="npx supabase db push"
alias sbreset="npx supabase db reset"
alias sbtypes="npx supabase gen types typescript --local > src/types/supabase.ts && echo '✅ Types regenerated → src/types/supabase.ts'"
alias sbstudio="echo 'Supabase Studio → http://localhost:54323'"

# Claude Code
alias cc="claude"
alias ccp="claude --dangerously-skip-permissions"

# Git shortcuts
alias gs="git status"
alias gd="git diff"
alias ga="git add -A"
alias gc="git commit -m"
alias gp="git push"
alias gpl="git pull"
alias gco="git checkout"
alias gcb="git checkout -b"
alias gl="git log --oneline --graph --decorate -15"
alias gundo="git reset --soft HEAD~1"

# Handy
alias cls="clear"
alias ll="ls -la"
alias cat="bat --style=plain" 2>/dev/null || alias cat="cat"

# ── FZF config ─────────────────────────────────────────────────────────────
export FZF_DEFAULT_OPTS="--height 40% --layout=reverse --border"

# ── Welcome message ────────────────────────────────────────────────────────
echo ""
echo "🌉 DataBridge Dev Container"
echo "   dev        → start Vite (localhost:5173)"
echo "   sbstart    → start Supabase"
echo "   sbstudio   → open Supabase Studio URL"
echo "   cc         → Claude Code"
echo "   check      → type-check + lint"
echo "   testrun    → run all tests"
echo ""
