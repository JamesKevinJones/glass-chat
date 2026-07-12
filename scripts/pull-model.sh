#!/usr/bin/env bash
set -euo pipefail
echo "Pulling qwen2.5:3b into Ollama..."
ollama pull qwen2.5:3b
echo "Done. Models available:"
ollama list
