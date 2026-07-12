#!/bin/sh
# Self-contained startup: clone/refresh the toolkit into the data volume,
# wire git identity + optional push credential, ensure the evals project
# exists, then hand off to the server. All mutable state lives under /data
# (HOME), backed by a named volume.
set -eu

TOOLKIT_REPO="${TOOLKIT_REPO:-https://github.com/vezril/claude-toolkit.git}"
TOOLKIT_DIR="${TOOLKIT_DIR:-/data/claude-toolkit}"
PROJECT_ROOT="${PROJECT_ROOT:-/data/evals}"
GIT_AUTHOR_NAME="${GIT_AUTHOR_NAME:-AI Toolkit UI}"
GIT_AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-ai-toolkit-ui@localhost}"

git config --global user.name "$GIT_AUTHOR_NAME"
git config --global user.email "$GIT_AUTHOR_EMAIL"
git config --global --add safe.directory "$TOOLKIT_DIR"

# GITHUB_TOKEN (repo scope) enables Ship (push + PR). Clone of a public repo
# works without it; absent token = read-only toolkit (Ship disabled).
if [ -n "${GITHUB_TOKEN:-}" ]; then
  git config --global \
    "url.https://x-access-token:${GITHUB_TOKEN}@github.com/.insteadOf" \
    "https://github.com/"
fi

if [ -d "$TOOLKIT_DIR/.git" ]; then
  echo "[entrypoint] refreshing toolkit at $TOOLKIT_DIR"
  git -C "$TOOLKIT_DIR" pull --ff-only 2>/dev/null || echo "[entrypoint] pull skipped (offline or diverged)"
else
  echo "[entrypoint] cloning $TOOLKIT_REPO -> $TOOLKIT_DIR"
  git clone --depth 1 "$TOOLKIT_REPO" "$TOOLKIT_DIR"
fi

mkdir -p "$PROJECT_ROOT"

exec "$@"
