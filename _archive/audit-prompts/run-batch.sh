#!/usr/bin/env bash
# Usage: bash audit-prompts/run-batch.sh <batch_number>
# Reads token from .github-token, injects it, prints the ready-to-use prompt.

set -e

BATCH=${1:-}
if [ -z "$BATCH" ]; then
  echo "Usage: bash audit-prompts/run-batch.sh <batch_number>"
  exit 1
fi

NN=$(printf "%02d" "$BATCH")
PROMPT_FILE="audit-prompts/batch${NN}.md"

if [ ! -f "$PROMPT_FILE" ]; then
  echo "Error: $PROMPT_FILE not found"
  exit 1
fi

TOKEN_FILE=".github-token"
if [ ! -f "$TOKEN_FILE" ]; then
  echo "Error: .github-token not found in $(pwd)"
  echo "Create it with just your GitHub token on one line."
  exit 1
fi

TOKEN=$(cat "$TOKEN_FILE" | tr -d '[:space:]')

if [ -z "$TOKEN" ]; then
  echo "Error: .github-token is empty"
  exit 1
fi

# Inject token and execute
sed "s/TOKEN_HERE/${TOKEN}/g" "$PROMPT_FILE"
