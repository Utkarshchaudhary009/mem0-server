# Mem0 AI Memory Service (Bun + MCP + REST)

This is a **Bun**-based service for [Mem0](https://mem0.ai), providing both a **REST API** and a **Model Context Protocol (MCP)** server.

It is integrated with:
- **Qdrant** (Vector Store)
- **Neo4j** (Graph Store)
- **Gemini Embedding-004** (Embedder)
- **GLM-4 Flash** (LLM)

## Features

- **REST API**: Standard HTTP endpoints for web applications.
- **MCP Server**: Compatible with Claude Desktop and other MCP clients (exposed via Stdio and SSE).
- **Bun**: Fast runtime and package manager.

## Setup

1. **Install Bun**: [https://bun.sh](https://bun.sh)
2. **Install Dependencies**:
   ```bash
   bun install
   ```
3. **Configure Environment**:
   - Copy `.env.example` to `.env`
   - Fill in your API keys for Qdrant, Neo4j, Google, and ZhipuAI.

## Usage

### Run Server

```bash
bun start
```
The server listens on port 3000 (default).

### REST API

- `POST /memories`: Add a new memory.
  - Body: `{ "messages": "string", "user_id": "string", "metadata": {} }`
- `POST /memories/search`: Search memories.
  - Body: `{ "query": "string", "user_id": "string", "limit": 5 }`
- `GET /memories/:user_id`: Get all history for a user.
- `DELETE /memories/:memory_id`: Delete a memory.

### MCP (Model Context Protocol)

**Stdio**:
Run the server directly as an MCP tool:
```json
{
  "mcpServers": {
    "mem0": {
      "command": "bun",
      "args": ["run", "path/to/mem0-server/src/index.ts"]
    }
  }
}
```

**SSE (Server-Sent Events)**:
- Endpoint: `http://localhost:3000/mcp/sse`
- Message Endpoint: `http://localhost:3000/mcp/messages`

## Deployment

### Render / Vercel / Railway

1. **Runtime**: Bun
2. **Build Command**: `bun install`
3. **Start Command**: `bun run src/index.ts`
4. **Environment Variables**: Add all keys from `.env`.