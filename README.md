# Mem0 AI Memory Service (Bun + MCP + REST)

A **Bun**-based memory service for [Mem0](https://mem0.ai), providing both a **REST API** and a **Model Context Protocol (MCP)** server with **Streamable HTTP** transport.

## 🔗 Production Server

**Endpoint**: `https://mem0-server.onrender.com/mcp`

## Integrations

- **Qdrant** (Vector Store)
- **Neo4j** (Graph Store)
- **Gemini Embedding-001** (Embedder)
- **GLM-4 Flash** (LLM)

## Features

- **REST API**: Standard HTTP endpoints for web applications
- **MCP Server**: Streamable HTTP transport with SSE support
- **API Key Authentication**: Bearer token authentication
- **Bun Runtime**: Fast TypeScript execution

---

## 🔌 MCP Client Integration (Ready to Copy)

### Gemini CLI

Add to `~/.gemini/settings.json` (Linux/Mac) or `%USERPROFILE%\.gemini\settings.json` (Windows):

```json
{
  "mcpServers": {
    "mem0": {
      "url": "https://mem0-server.onrender.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_PASSWORD"
      }
    }
  }
}
```

---

### Claude Desktop / Claude Code

Add to your Claude configuration:

**Locations:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mem0": {
      "transport": "streamable-http",
      "url": "https://mem0-server.onrender.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_PASSWORD"
      }
    }
  }
}
```

---

### Cursor

Add to `.cursor/mcp.json` (project root) or global settings:

```json
{
  "mcpServers": {
    "mem0": {
      "transport": "streamable-http",
      "url": "https://mem0-server.onrender.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_PASSWORD"
      }
    }
  }
}
```

**Or via Settings UI:**
1. Open Cursor Settings (`Ctrl/Cmd + ,`)
2. Navigate to **MCP Servers** → **Add Server**
3. Enter:
   - **Name**: `mem0`
   - **URL**: `https://mem0-server.onrender.com/mcp`
   - **Transport**: `streamable-http`
   - **Headers**: `Authorization: Bearer YOUR_MCP_PASSWORD`

---

### VS Code with Continue Extension

Add to `~/.continue/config.json`:

```json
{
  "mcpServers": [
    {
      "name": "mem0",
      "transport": {
        "type": "streamable-http",
        "url": "https://mem0-server.onrender.com/mcp",
        "headers": {
          "Authorization": "Bearer YOUR_MCP_PASSWORD"
        }
      }
    }
  ]
}
```

---

## 🛠️ Available MCP Tools

| Tool | Description | Required Args |
|------|-------------|---------------|
| `add_memory` | Store a new memory or conversation | `messages`, `user_id` |
| `search_memories` | Semantically search stored memories | `query`, `user_id` |
| `get_all_memories` | Retrieve all memories for a user | `user_id` |
| `delete_memory` | Delete a specific memory | `memory_id` |

---

## 📡 REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/memories` | POST | Add a new memory |
| `/memories/search` | POST | Search memories |
| `/memories/:user_id` | GET | Get all memories for a user |
| `/memories/:memory_id` | DELETE | Delete a memory |

### REST Examples

```bash
# Add memory
curl -X POST https://mem0-server.onrender.com/memories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MCP_PASSWORD" \
  -d '{"messages": "I love TypeScript", "user_id": "user123"}'

# Search memories
curl -X POST https://mem0-server.onrender.com/memories/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MCP_PASSWORD" \
  -d '{"query": "programming", "user_id": "user123", "limit": 5}'
```

---

## 🚀 Local Development

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run development server
bun run dev
```

---

## ☁️ Deployment (Render)

1. **Runtime**: Docker or Bun
2. **Build Command**: `bun install`
3. **Start Command**: `bun run src/index.ts`
4. **Environment Variables**: Add all keys from `.env`

---

## 📋 Environment Variables

| Variable | Description |
|----------|-------------|
| `QDRANT_URL` | Qdrant vector DB URL |
| `QDRANT_API_KEY` | Qdrant API key |
| `NEO4J_URI` | Neo4j connection URI |
| `NEO4J_USERNAME` | Neo4j username |
| `NEO4J_PASSWORD` | Neo4j password |
| `GOOGLE_API_KEY` | Google AI API key (embeddings) |
| `ZHIPU_API_KEY` | ZhipuAI API key (LLM) |
| `MCP_PASSWORD` | Bearer token for API authentication |
| `PORT` | Server port (default: 3000) |

---

## 📚 Resources

- [Model Context Protocol](https://modelcontextprotocol.io)
- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- [Mem0 Documentation](https://docs.mem0.ai)
- [Bun Runtime](https://bun.sh)