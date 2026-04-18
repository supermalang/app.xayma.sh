# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/devcontainers/javascript-node:20-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    zsh \
    fzf \
    ripgrep \
    bat \
    curl \
    wget \
    jq \
    git \
    git-lfs \
    htop \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Configure npm global directory for node user (avoids permission issues)
USER node
RUN mkdir -p /home/node/.npm-global && \
    npm config set prefix '/home/node/.npm-global'

ENV PATH="/home/node/.npm-global/bin:$PATH"

# Install global CLI tools via npm
RUN npm install -g \
    @anthropic-ai/claude-code \
    @playwright/mcp \
    typescript \
    tsx

# Install ZSH plugins (syntax highlighting + autosuggestions)
RUN git clone --depth=1 https://github.com/zsh-users/zsh-autosuggestions \
        ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions 2>/dev/null || true && \
    git clone --depth=1 https://github.com/zsh-users/zsh-syntax-highlighting \
        ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting 2>/dev/null || true

# Custom .zshrc
COPY --chown=node:node zshrc.zsh /home/node/.zshrc

USER root

# Install Supabase CLI via official binary installer (must run as root)
RUN curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | bash