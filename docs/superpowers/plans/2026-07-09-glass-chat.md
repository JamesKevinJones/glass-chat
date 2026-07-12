# Glass Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate Electron desktop chat app with an Apple/VisionOS-inspired glass UI and default Ollama integration.

**Architecture:** Vite + React + TypeScript run inside Electron. The renderer owns chat state and calls a focused Ollama client module for model listing and streaming chat responses.

**Tech Stack:** Electron, Vite, React, TypeScript, Vitest, Testing Library, CSS.

## Global Constraints

- Project path: `C:\Users\kj638\glass-chat`.
- Default backend: `http://localhost:11434`.
- Keep this app separate from Odysseus.
- First version is local-only with no accounts, database, cloud sync, or RAG.
- UI direction: translucent Apple/VisionOS-inspired glass panels, blurred gradients, floating sidebar, chat canvas, and composer.

---

## File Structure

- `package.json`: scripts and dependencies.
- `index.html`: Vite renderer entry shell.
- `tsconfig.json`: shared TypeScript configuration.
- `tsconfig.node.json`: Electron main TypeScript configuration.
- `tsconfig.web.json`: renderer TypeScript configuration.
- `vite.config.ts`: Vite React and test configuration.
- `electron/main.ts`: Electron BrowserWindow lifecycle.
- `src/main.tsx`: React renderer entry.
- `src/App.tsx`: app composition and chat state.
- `src/ollama/client.ts`: Ollama HTTP client and NDJSON streaming parser.
- `src/ollama/client.test.ts`: unit tests for Ollama behavior.
- `src/App.test.tsx`: UI behavior tests.
- `src/styles.css`: glass interface styling.

### Task 1: Scaffold Electron/Vite/React Project

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.web.json`
- Create: `vite.config.ts`
- Create: `electron/main.ts`
- Create: `src/main.tsx`
- Create: `src/vite-env.d.ts`

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm run test`.
- Produces: Electron main process loading `VITE_DEV_SERVER_URL` during development and `dist/index.html` in production.

- [ ] **Step 1: Create project metadata and scripts**

Create `package.json`:

```json
{
  "name": "glass-chat",
  "version": "0.1.0",
  "private": true,
  "description": "A local Ollama desktop chat app with a glass interface.",
  "main": "dist-electron/main.js",
  "type": "module",
  "scripts": {
    "dev": "concurrently -k -n vite,electron -c cyan,magenta \"vite --host 127.0.0.1\" \"wait-on tcp:5173 && cross-env VITE_DEV_SERVER_URL=http://127.0.0.1:5173 electron .\"",
    "build": "npm run typecheck && vite build && tsc -p tsconfig.node.json",
    "preview": "vite preview --host 127.0.0.1",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.web.json --noEmit && tsc -p tsconfig.node.json --noEmit"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.1.1",
    "electron": "^39.2.6",
    "react": "^19.2.1",
    "react-dom": "^19.2.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^22.19.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "concurrently": "^9.2.1",
    "cross-env": "^7.0.3",
    "jsdom": "^27.3.0",
    "typescript": "^5.9.3",
    "vite": "^7.2.6",
    "vitest": "^4.1.8",
    "wait-on": "^9.0.3"
  }
}
```

- [ ] **Step 2: Create TypeScript and Vite configuration**

Create `tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.web.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Create `tsconfig.web.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "vite.config.ts"]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist-electron",
    "types": ["node"]
  },
  "include": ["electron"]
}
```

Create `vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
```

- [ ] **Step 3: Create Electron and renderer entries**

Create `electron/main.ts`:

```ts
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#10151f',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    await win.loadURL(devServerUrl);
    win.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  await win.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
```

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Glass Chat</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Create `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 4: Run scaffold verification**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

Run: `npm run typecheck`

Expected: fails because `src/App.tsx` does not exist yet.

### Task 2: Implement Ollama Client With Tests

**Files:**
- Create: `src/ollama/client.ts`
- Create: `src/ollama/client.test.ts`
- Create: `src/test/setup.ts`

**Interfaces:**
- Produces: `type OllamaModel = { name: string }`.
- Produces: `type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }`.
- Produces: `class OllamaClient`.
- Produces: `OllamaClient.listModels(): Promise<OllamaModel[]>`.
- Produces: `OllamaClient.streamChat(args, onToken): Promise<void>`.

- [ ] **Step 1: Write failing client tests**

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Create `src/ollama/client.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OllamaClient } from './client';

afterEach(() => {
  vi.restoreAllMocks();
});

function response(body: string, init: ResponseInit = {}): Response {
  return new Response(body, { status: 200, ...init });
}

describe('OllamaClient', () => {
  it('lists model names from /api/tags', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(JSON.stringify({
      models: [{ name: 'llama3.2:latest' }, { name: 'mistral:latest' }],
    }))));

    const client = new OllamaClient('http://localhost:11434');

    await expect(client.listModels()).resolves.toEqual([
      { name: 'llama3.2:latest' },
      { name: 'mistral:latest' },
    ]);
  });

  it('throws a readable error when model listing fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response('offline', { status: 503 })));

    const client = new OllamaClient('http://localhost:11434');

    await expect(client.listModels()).rejects.toThrow('Ollama returned 503');
  });

  it('streams assistant tokens from /api/chat NDJSON', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('{"message":{"content":"Hel"},"done":false}\n'));
        controller.enqueue(encoder.encode('{"message":{"content":"lo"},"done":true}\n'));
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(stream)));

    const client = new OllamaClient('http://localhost:11434');
    const tokens: string[] = [];

    await client.streamChat({
      model: 'llama3.2:latest',
      messages: [{ role: 'user', content: 'Hi' }],
    }, (token) => tokens.push(token));

    expect(tokens).toEqual(['Hel', 'lo']);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/ollama/client.test.ts`

Expected: FAIL with an import error for `./client`.

- [ ] **Step 3: Implement client**

Create `src/ollama/client.ts`:

```ts
export type OllamaModel = {
  name: string;
};

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type TagsResponse = {
  models?: Array<{ name?: unknown }>;
};

type ChatChunk = {
  message?: { content?: unknown };
  done?: boolean;
  error?: string;
};

export class OllamaClient {
  constructor(private readonly baseUrl = 'http://localhost:11434') {}

  async listModels(): Promise<OllamaModel[]> {
    const res = await fetch(`${this.baseUrl}/api/tags`);
    if (!res.ok) {
      throw new Error(`Ollama returned ${res.status} while listing models`);
    }

    const data = (await res.json()) as TagsResponse;
    return (data.models ?? [])
      .map((model) => model.name)
      .filter((name): name is string => typeof name === 'string' && name.length > 0)
      .map((name) => ({ name }));
  }

  async streamChat(
    args: { model: string; messages: ChatMessage[] },
    onToken: (token: string) => void,
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: args.model,
        messages: args.messages,
        stream: true,
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama returned ${res.status} while chatting`);
    }
    if (!res.body) {
      throw new Error('Ollama response did not include a stream');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        this.consumeChatLine(line, onToken);
      }
    }

    if (buffer.trim()) {
      this.consumeChatLine(buffer, onToken);
    }
  }

  private consumeChatLine(line: string, onToken: (token: string) => void): void {
    const trimmed = line.trim();
    if (!trimmed) return;

    const chunk = JSON.parse(trimmed) as ChatChunk;
    if (chunk.error) {
      throw new Error(chunk.error);
    }

    const token = chunk.message?.content;
    if (typeof token === 'string' && token.length > 0) {
      onToken(token);
    }
  }
}
```

- [ ] **Step 4: Run client tests**

Run: `npm run test -- src/ollama/client.test.ts`

Expected: PASS for all three client tests.

### Task 3: Implement Chat UI Behavior With Tests

**Files:**
- Create: `src/App.tsx`
- Create: `src/App.test.tsx`

**Interfaces:**
- Consumes: `OllamaClient`, `ChatMessage`, `OllamaModel`.
- Produces: default React component `App`.

- [ ] **Step 1: Write failing UI tests**

Create `src/App.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('App', () => {
  it('shows an offline state when Ollama cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('connect ECONNREFUSED');
    }));

    render(<App />);

    expect(await screen.findByText(/Ollama offline/i)).toBeInTheDocument();
    expect(screen.getByText(/ollama serve/i)).toBeInTheDocument();
  });

  it('lists models and sends a message', async () => {
    const encoder = new TextEncoder();
    vi.stubGlobal('fetch', vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).endsWith('/api/tags')) {
        return new Response(JSON.stringify({ models: [{ name: 'llama3.2:latest' }] }));
      }

      return new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('{"message":{"content":"Hello from Ollama"},"done":true}\n'));
          controller.close();
        },
      }));
    }));

    render(<App />);

    expect(await screen.findByText('llama3.2:latest')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/message/i), 'Hi');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(await screen.findByText('Hi')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Hello from Ollama')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/App.test.tsx`

Expected: FAIL with an import error for `./App`.

- [ ] **Step 3: Implement App component**

Create `src/App.tsx`:

```tsx
import { FormEvent, useEffect, useRef, useState } from 'react';
import { ChatMessage, OllamaClient, OllamaModel } from './ollama/client';

type UiMessage = ChatMessage & {
  id: string;
};

const client = new OllamaClient();

function createId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function App() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    client.listModels()
      .then((availableModels) => {
        if (!alive) return;
        setModels(availableModels);
        setSelectedModel(availableModels[0]?.name ?? '');
        setStatus('online');
      })
      .catch(() => {
        if (!alive) return;
        setStatus('offline');
        setError('Ollama offline. Start it with: ollama serve');
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || !selectedModel || isStreaming) return;

    const userMessage: UiMessage = { id: createId(), role: 'user', content: text };
    const assistantMessage: UiMessage = { id: createId(), role: 'assistant', content: '' };
    const nextMessages = [...messages, userMessage, assistantMessage];

    setMessages(nextMessages);
    setInput('');
    setIsStreaming(true);
    setError('');

    try {
      await client.streamChat({
        model: selectedModel,
        messages: [...messages, userMessage].map(({ role, content }) => ({ role, content })),
      }, (token) => {
        setMessages((current) => current.map((message) => (
          message.id === assistantMessage.id
            ? { ...message, content: message.content + token }
            : message
        )));
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Chat request failed';
      setError(message);
      setMessages((current) => current.map((entry) => (
        entry.id === assistantMessage.id && entry.content.length === 0
          ? { ...entry, content: `Connection failed: ${message}` }
          : entry
      )));
    } finally {
      setIsStreaming(false);
    }
  }

  const canSend = status === 'online' && selectedModel.length > 0 && input.trim().length > 0 && !isStreaming;

  return (
    <main className="app-shell">
      <div className="aurora aurora-a" />
      <div className="aurora aurora-b" />
      <aside className="sidebar glass-panel">
        <div>
          <p className="eyebrow">Local AI Desktop</p>
          <h1>Glass Chat</h1>
          <p className="subtitle">A clean Ollama interface for focused desktop conversations.</p>
        </div>

        <section className="status-card">
          <span className={`status-dot ${status}`} />
          <div>
            <strong>{status === 'online' ? 'Ollama online' : status === 'checking' ? 'Checking Ollama' : 'Ollama offline'}</strong>
            <p>{status === 'online' ? 'Connected to localhost:11434' : 'Run ollama serve to connect.'}</p>
          </div>
        </section>

        <label className="model-picker">
          <span>Model</span>
          <select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} disabled={models.length === 0}>
            {models.length === 0 ? <option>No models found</option> : models.map((model) => (
              <option key={model.name} value={model.name}>{model.name}</option>
            ))}
          </select>
        </label>

        {models.length === 0 && status === 'online' ? (
          <div className="hint-card">
            Install a model with <code>ollama pull llama3.2</code>.
          </div>
        ) : null}
      </aside>

      <section className="chat-stage glass-panel">
        <header className="chat-header">
          <div>
            <p className="eyebrow">VisionOS-style workspace</p>
            <h2>{selectedModel || 'Waiting for a model'}</h2>
          </div>
          <button className="ghost-button" type="button" onClick={() => setMessages([])}>New Chat</button>
        </header>

        {status === 'offline' ? (
          <div className="offline-card">
            <h3>Ollama offline</h3>
            <p>Start Ollama locally, then relaunch or refresh this app.</p>
            <code>ollama serve</code>
          </div>
        ) : null}

        <div className="messages" aria-live="polite">
          {messages.length === 0 && status !== 'offline' ? (
            <div className="empty-state">
              <span>Ask locally. Keep it private.</span>
              <p>Select a model, type a message, and Ollama will stream the answer here.</p>
            </div>
          ) : messages.map((message) => (
            <article key={message.id} className={`message ${message.role}`}>
              <span>{message.role === 'user' ? 'You' : 'Ollama'}</span>
              <p>{message.content || 'Thinking...'}</p>
            </article>
          ))}
          <div ref={bottomRef} />
        </div>

        {error ? <p className="error-line">{error}</p> : null}

        <form className="composer" onSubmit={sendMessage}>
          <label className="sr-only" htmlFor="message-input">Message</label>
          <textarea
            id="message-input"
            aria-label="Message"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Message your local model..."
            rows={2}
            disabled={status !== 'online'}
          />
          <button type="submit" disabled={!canSend}>{isStreaming ? 'Streaming' : 'Send'}</button>
        </form>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run UI tests**

Run: `npm run test -- src/App.test.tsx`

Expected: PASS for both UI tests.

### Task 4: Implement Glass Interface Styling

**Files:**
- Create: `src/styles.css`

**Interfaces:**
- Consumes: class names rendered by `src/App.tsx`.
- Produces: responsive Apple/VisionOS-inspired desktop layout.

- [ ] **Step 1: Create styling**

Create `src/styles.css`:

```css
@font-face {
  font-family: 'Space Grotesk';
  src: local('Space Grotesk');
  font-display: swap;
}

:root {
  color-scheme: dark;
  --ink: #f5f7fb;
  --muted: rgba(245, 247, 251, 0.68);
  --glass: rgba(255, 255, 255, 0.12);
  --glass-strong: rgba(255, 255, 255, 0.18);
  --stroke: rgba(255, 255, 255, 0.22);
  --shadow: rgba(0, 0, 0, 0.35);
  --blue: #7cc8ff;
  --mint: #9cf6d4;
  --coral: #ff9b8a;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  height: 100%;
  margin: 0;
}

body {
  min-width: 960px;
  background:
    radial-gradient(circle at 18% 18%, rgba(124, 200, 255, 0.28), transparent 28%),
    radial-gradient(circle at 78% 10%, rgba(156, 246, 212, 0.20), transparent 26%),
    linear-gradient(135deg, #0b1020 0%, #151826 48%, #10151f 100%);
  color: var(--ink);
  font-family: 'Space Grotesk', 'Segoe UI Variable Display', 'Aptos Display', sans-serif;
  overflow: hidden;
}

button,
select,
textarea {
  font: inherit;
}

.app-shell {
  position: relative;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 22px;
  height: 100%;
  padding: 28px;
}

.aurora {
  position: fixed;
  width: 420px;
  height: 420px;
  border-radius: 999px;
  filter: blur(12px);
  opacity: 0.7;
  pointer-events: none;
  animation: drift 14s ease-in-out infinite alternate;
}

.aurora-a {
  left: 28%;
  top: -130px;
  background: radial-gradient(circle, rgba(124, 200, 255, 0.28), transparent 65%);
}

.aurora-b {
  right: -100px;
  bottom: -140px;
  background: radial-gradient(circle, rgba(255, 155, 138, 0.24), transparent 68%);
  animation-delay: -5s;
}

.glass-panel {
  position: relative;
  z-index: 1;
  border: 1px solid var(--stroke);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.17), rgba(255, 255, 255, 0.07)),
    var(--glass);
  box-shadow: 0 24px 80px var(--shadow), inset 0 1px 0 rgba(255, 255, 255, 0.30);
  backdrop-filter: blur(28px) saturate(145%);
  -webkit-backdrop-filter: blur(28px) saturate(145%);
}

.sidebar {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 22px;
  border-radius: 34px;
  padding: 28px;
}

.eyebrow {
  margin: 0 0 10px;
  color: var(--mint);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 12px;
  font-size: clamp(2.25rem, 4vw, 3.7rem);
  line-height: 0.92;
  letter-spacing: -0.08em;
}

h2 {
  margin-bottom: 0;
  font-size: 1.55rem;
  letter-spacing: -0.04em;
}

.subtitle,
.status-card p,
.empty-state p,
.offline-card p,
.hint-card {
  color: var(--muted);
  line-height: 1.6;
}

.status-card,
.hint-card {
  display: flex;
  gap: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 24px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.08);
}

.status-dot {
  width: 12px;
  height: 12px;
  margin-top: 5px;
  border-radius: 999px;
  background: #ffbe73;
  box-shadow: 0 0 22px currentColor;
}

.status-dot.online {
  background: var(--mint);
}

.status-dot.offline {
  background: var(--coral);
}

.model-picker {
  display: grid;
  gap: 10px;
  color: var(--muted);
  font-size: 0.9rem;
}

.model-picker select {
  width: 100%;
  border: 1px solid var(--stroke);
  border-radius: 18px;
  padding: 12px 14px;
  color: var(--ink);
  background: rgba(5, 10, 20, 0.46);
  outline: none;
}

.chat-stage {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  min-width: 0;
  border-radius: 38px;
  padding: 24px;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 4px 6px 18px;
}

.ghost-button,
.composer button {
  border: 1px solid var(--stroke);
  border-radius: 999px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
}

.ghost-button {
  padding: 10px 16px;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 8px 20px;
}

.message {
  max-width: min(760px, 78%);
  border: 1px solid rgba(255, 255, 255, 0.17);
  border-radius: 26px;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.10);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
}

.message.user {
  align-self: flex-end;
  background: linear-gradient(145deg, rgba(124, 200, 255, 0.26), rgba(156, 246, 212, 0.12));
}

.message.assistant {
  align-self: flex-start;
}

.message span {
  display: block;
  margin-bottom: 8px;
  color: var(--mint);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.message p {
  margin-bottom: 0;
  white-space: pre-wrap;
  line-height: 1.6;
}

.empty-state,
.offline-card {
  margin: auto;
  max-width: 560px;
  text-align: center;
}

.empty-state span {
  display: block;
  margin-bottom: 14px;
  font-size: clamp(2rem, 5vw, 4.6rem);
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: -0.08em;
}

.offline-card {
  border: 1px solid rgba(255, 155, 138, 0.35);
  border-radius: 28px;
  padding: 28px;
  background: rgba(255, 155, 138, 0.10);
}

code {
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 10px;
  padding: 2px 7px;
  background: rgba(0, 0, 0, 0.24);
  color: var(--mint);
}

.error-line {
  margin: 0 8px 10px;
  color: var(--coral);
}

.composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  border: 1px solid var(--stroke);
  border-radius: 28px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.10);
}

.composer textarea {
  min-height: 58px;
  max-height: 160px;
  resize: vertical;
  border: 0;
  border-radius: 20px;
  padding: 16px;
  color: var(--ink);
  background: rgba(0, 0, 0, 0.18);
  outline: none;
}

.composer button {
  min-width: 104px;
  padding: 0 22px;
  background: linear-gradient(135deg, rgba(124, 200, 255, 0.88), rgba(156, 246, 212, 0.78));
  color: #06111c;
  font-weight: 800;
}

.composer button:disabled,
.ghost-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

@keyframes drift {
  from {
    transform: translate3d(-24px, 18px, 0) scale(1);
  }
  to {
    transform: translate3d(28px, -12px, 0) scale(1.08);
  }
}

@media (max-width: 900px) {
  body {
    min-width: 0;
    overflow: auto;
  }

  .app-shell {
    grid-template-columns: 1fr;
    min-height: 100%;
    height: auto;
    padding: 14px;
  }

  .sidebar,
  .chat-stage {
    border-radius: 26px;
  }
}
```

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully.

### Task 5: Add Launch Helpers and Verify App

**Files:**
- Create: `launch-glass-chat.bat`
- Modify: `README.md`

**Interfaces:**
- Consumes: `npm run dev`.
- Produces: Windows launcher and README startup instructions.

- [ ] **Step 1: Create README**

Create `README.md`:

```md
# Glass Chat

Glass Chat is a lightweight local desktop chat interface for Ollama. It uses Electron, Vite, React, and a glass-style interface inspired by Apple VisionOS.

## Requirements

- Node.js 20 or newer
- Ollama installed locally
- At least one Ollama model, for example:

```powershell
ollama pull llama3.2
```

## Run

Start Ollama:

```powershell
ollama serve
```

Install dependencies:

```powershell
npm install
```

Launch the desktop app:

```powershell
npm run dev
```

On Windows, you can also run:

```powershell
.\launch-glass-chat.bat
```
```

- [ ] **Step 2: Create Windows launcher**

Create `launch-glass-chat.bat`:

```bat
@echo off
cd /d "%~dp0"
npm run dev
```

- [ ] **Step 3: Run final verification**

Run: `npm run test`

Expected: all tests pass.

Run: `npm run build`

Expected: production build succeeds.

Run: `npm run dev`

Expected: Electron opens Glass Chat. If Ollama is running at `http://localhost:11434`, the model picker shows installed models. If Ollama is stopped, the UI shows “Ollama offline” and `ollama serve`.

## Self-Review

- Spec coverage: The plan covers separate project creation, Electron desktop shell, Ollama model listing, streaming chat, offline state, glass UI, tests, README, and launcher.
- Placeholder scan: No TBD/TODO placeholders remain.
- Type consistency: `ChatMessage`, `OllamaModel`, and `OllamaClient` signatures are introduced in Task 2 and consumed consistently in Task 3.
