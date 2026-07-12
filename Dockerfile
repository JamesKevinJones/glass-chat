# Optional standalone Open WebUI image.
# Prefer `docker compose up` from docker-compose.yml for Aura + Ollama.
FROM ghcr.io/open-webui/open-webui:main

EXPOSE 8080

CMD ["bash", "start.sh"]
