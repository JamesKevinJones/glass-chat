# Glass Chat Design

## Goal

Build a separate lightweight desktop chat app with an Apple/VisionOS-inspired glass interface that connects to Ollama at `http://localhost:11434` by default.

## Scope

The first version is a local-only Electron desktop app. It provides a polished chat UI, lists available Ollama models, sends messages to Ollama, streams assistant responses, and shows a clear offline state when Ollama is unavailable.

Out of scope for the first version: accounts, cloud sync, databases, multi-chat persistence, RAG, plugins, tool calling, and integration with Odysseus.

## Architecture

Use Vite, React, TypeScript, and Electron. The renderer owns UI state and local chat history. A small Ollama API client isolates network calls, so the UI can render offline, loading, and streaming states without mixing transport details into components.

Electron loads the Vite app during development and built static files in production. No separate backend server is needed because Ollama already exposes a local HTTP API.

## UI Design

The visual direction is a floating glass workspace: translucent panes, blurred background gradients, subtle highlights, rounded controls, and a desktop-app composition. The layout includes:

- A left glass sidebar with app identity, Ollama connection status, model picker, and session controls.
- A main chat canvas with user and assistant bubbles on layered translucent cards.
- A bottom composer with a large rounded input, send button, and streaming/disabled states.
- An offline panel that explains Ollama is not reachable and shows `ollama serve`.

## Data Flow

On launch, the app calls `GET http://localhost:11434/api/tags` and fills the model picker from `models[].name`. When the user sends a message, the app appends the user message locally, sends the conversation to `POST http://localhost:11434/api/chat`, and reads NDJSON streaming chunks. Each chunk updates the current assistant message until `done: true`.

## Error Handling

If model listing fails, show “Ollama offline” and disable send. If chat streaming fails mid-response, keep the partial assistant message and append a short error note. If no models are installed, show a command hint such as `ollama pull llama3.2`.

## Testing

Unit tests cover the Ollama client’s tag parsing, streaming parser, and error behavior. Component tests cover offline rendering, model selection, and sending a message with mocked client responses. A production build verifies the app compiles.
