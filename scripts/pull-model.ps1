# Aura Setup Helpers (PowerShell / bash-friendly via npm scripts)
#
# Pull a starter model into a running Ollama instance (native or Docker).
Write-Host "Pulling qwen2.5:3b into Ollama..."
ollama pull qwen2.5:3b
Write-Host "Done. Models available:"
ollama list
