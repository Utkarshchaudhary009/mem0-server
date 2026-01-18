import { Elysia, t } from 'elysia';
import { Memory } from 'mem0ai/oss';
import { randomUUID } from 'crypto';

// --- Configuration ---
const config = {
  vector_store: {
    provider: "qdrant",
    config: {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: "mem0_gemini_test_v3"
    }
  },
  graph_store: {
    provider: "neo4j",
    config: {
      url: process.env.NEO4J_URI,
      username: process.env.NEO4J_USERNAME,
      password: process.env.NEO4J_PASSWORD,
    }
  },
  embedder: {
    provider: "gemini",
    config: {
      model: "models/gemini-embedding-001",
      apiKey: process.env.GOOGLE_API_KEY
    }
  },
  llm: {
    provider: "openai",
    config: {
      model: "glm-4.5-flash",
      apiKey: process.env.ZHIPU_API_KEY,
      baseURL: "https://api.z.ai/api/paas/v4/"
    }
  }
};

console.log("Configuration loaded:", JSON.stringify({
  ...config,
  vector_store: { ...config.vector_store, config: { ...config.vector_store.config, apiKey: "********" } },
  graph_store: { ...config.graph_store, config: { ...config.graph_store.config, password: "********" } },
  embedder: { ...config.embedder, config: { ...config.embedder.config, apiKey: "********" } },
  llm: { ...config.llm, config: { ...config.llm.config, apiKey: "********" } }
}, null, 2));

// --- Initialize Core Services ---
const memory = new Memory(config);

// --- MCP Session Management ---
const sessions: Map<string, { createdAt: Date; lastAccess: Date }> = new Map();

// Clean up old sessions (older than 1 hour)
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastAccess.getTime() > 3600000) {
      sessions.delete(sessionId);
      console.log(`Session expired: ${sessionId}`);
    }
  }
}, 60000);

// --- MCP Tool Definitions ---
const MCP_TOOLS = [
  {
    name: 'add_memory',
    description: 'Store a new memory or conversation for a user. Use this to save important information, preferences, or context that should be remembered.',
    inputSchema: {
      type: 'object',
      properties: {
        messages: {
          anyOf: [{ type: 'string' }, { type: 'array' }],
          description: 'Message content or conversation to store'
        },
        user_id: { type: 'string', description: 'Unique user identifier' },
        metadata: { type: 'object', description: 'Optional metadata to attach' }
      },
      required: ['messages', 'user_id']
    }
  },
  {
    name: 'search_memories',
    description: 'Semantically search through stored memories. Use this to find relevant past information, preferences, or context.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        user_id: { type: 'string', description: 'User ID to search memories for' },
        limit: { type: 'number', description: 'Maximum number of results (default: 5)' }
      },
      required: ['query', 'user_id']
    }
  },
  {
    name: 'get_all_memories',
    description: 'Retrieve all memories for a specific user. Use this to get a complete history of stored information.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'User ID to retrieve memories for' }
      },
      required: ['user_id']
    }
  },
  {
    name: 'delete_memory',
    description: 'Delete a specific memory by its ID. Use this to remove outdated or incorrect information.',
    inputSchema: {
      type: 'object',
      properties: {
        memory_id: { type: 'string', description: 'The unique identifier of the memory to delete' }
      },
      required: ['memory_id']
    }
  }
];

// --- MCP Server Info ---
const MCP_SERVER_INFO = {
  name: 'mem0-memory-server',
  version: '1.0.0'
};

const MCP_CAPABILITIES = {
  tools: {},
  resources: {},
  prompts: {},
  logging: {}
};

// --- MCP Tool Execution ---
async function executeTool(name: string, args: Record<string, any>): Promise<{ content: any[]; isError?: boolean }> {
  try {
    switch (name) {
      case 'add_memory': {
        const result = await memory.add(args.messages, {
          userId: args.user_id,
          metadata: args.metadata
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, data: result }, null, 2)
          }]
        };
      }

      case 'search_memories': {
        const result = await memory.search(args.query, {
          userId: args.user_id,
          limit: args.limit || 5
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, data: result }, null, 2)
          }]
        };
      }

      case 'get_all_memories': {
        const result = await memory.getAll({ userId: args.user_id });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, data: result }, null, 2)
          }]
        };
      }

      case 'delete_memory': {
        await memory.delete(args.memory_id);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, message: 'Memory deleted successfully' })
          }]
        };
      }

      default:
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: false, error: `Unknown tool: ${name}` })
          }],
          isError: true
        };
    }
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ success: false, error: error.message })
      }],
      isError: true
    };
  }
}

// --- MCP JSON-RPC Handler ---
async function handleMcpMethod(method: string, params: any, sessionId: string | null): Promise<any> {
  switch (method) {
    case 'initialize':
      // Create new session
      const newSessionId = randomUUID();
      sessions.set(newSessionId, { createdAt: new Date(), lastAccess: new Date() });
      console.log(`MCP Session initialized: ${newSessionId}`);

      return {
        _sessionId: newSessionId, // Special field to indicate new session
        protocolVersion: '2025-11-25',
        capabilities: MCP_CAPABILITIES,
        serverInfo: MCP_SERVER_INFO
      };

    case 'initialized':
      // Client acknowledgment - no response needed
      return null;

    case 'tools/list':
      return { tools: MCP_TOOLS };

    case 'tools/call':
      const toolResult = await executeTool(params.name, params.arguments || {});
      return toolResult;

    case 'resources/list':
      return { resources: [] };

    case 'prompts/list':
      return { prompts: [] };

    case 'ping':
      return {};

    default:
      throw { code: -32601, message: `Method not found: ${method}` };
  }
}

// --- HTTP Server (REST + MCP) ---
const app = new Elysia()
  .onRequest(({ request, set }) => {
    const url = new URL(request.url);
    if (url.pathname === "/") return; // Allow health check

    const authHeader = request.headers.get("Authorization");
    const expectedToken = `Bearer ${process.env.MCP_PASSWORD}`;

    if (authHeader !== expectedToken) {
      set.status = 401;
      return {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Unauthorized: Invalid or missing token"
        }
      };
    }
  })
  .get('/', () => ({ status: "running", service: "Mem0 AI Memory (MCP + REST)" }))

  // --- REST Endpoints ---
  .post('/memories', async ({ body }) => {
    const { messages, user_id, metadata } = body;
    try {
      const result = await memory.add(messages, { userId: user_id, metadata });
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, {
    body: t.Object({
      messages: t.Union([t.String(), t.Array(t.Any())]),
      user_id: t.String(),
      metadata: t.Optional(t.Object({}))
    })
  })

  .post('/memories/search', async ({ body }) => {
    const { query, user_id, limit } = body;
    try {
      const result = await memory.search(query, { userId: user_id, limit: limit || 5 });
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, {
    body: t.Object({
      query: t.String(),
      user_id: t.String(),
      limit: t.Optional(t.Number())
    })
  })

  .get('/memories/:user_id', async ({ params: { user_id } }) => {
    try {
      const result = await memory.getAll({ userId: user_id });
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  })

  .delete('/memories/:memory_id', async ({ params: { memory_id } }) => {
    try {
      await memory.delete(memory_id);
      return { success: true, message: "Memory deleted" };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  })

  // --- MCP Streamable HTTP Endpoint ---
  .post('/mcp', async ({ request, set }) => {
    const sessionId = request.headers.get('mcp-session-id');

    let body: any;
    try {
      body = await request.json();
    } catch {
      set.status = 400;
      return {
        jsonrpc: "2.0",
        error: { code: -32700, message: "Parse error" },
        id: null
      };
    }

    console.log(`MCP POST - Session: ${sessionId || 'new'}, Method: ${body?.method}`);

    // Validate session for non-initialize requests
    if (body?.method !== 'initialize' && body?.method !== 'initialized') {
      if (!sessionId || !sessions.has(sessionId)) {
        set.status = 400;
        return {
          jsonrpc: "2.0",
          error: { code: -32000, message: "Invalid or missing session ID" },
          id: body?.id || null
        };
      }
      // Update last access
      const session = sessions.get(sessionId);
      if (session) session.lastAccess = new Date();
    }

    try {
      const result = await handleMcpMethod(body.method, body.params || {}, sessionId);

      // Handle notifications (no response needed)
      if (result === null) {
        set.status = 202;
        return null;
      }

      // Check if this is an initialize response with new session
      if (result._sessionId) {
        const newSessionId = result._sessionId;
        delete result._sessionId;
        set.headers['mcp-session-id'] = newSessionId;
        set.headers['mcp-protocol-version'] = '2025-11-25';
      }

      return {
        jsonrpc: "2.0",
        result,
        id: body.id
      };
    } catch (error: any) {
      return {
        jsonrpc: "2.0",
        error: {
          code: error.code || -32603,
          message: error.message || "Internal error"
        },
        id: body?.id || null
      };
    }
  })

  // GET for SSE stream (server-initiated notifications)
  .get('/mcp', async ({ request, set }) => {
    const sessionId = request.headers.get('mcp-session-id');

    if (!sessionId || !sessions.has(sessionId)) {
      set.status = 400;
      return { error: "Invalid or missing session ID" };
    }

    // Update last access
    const session = sessions.get(sessionId);
    if (session) session.lastAccess = new Date();

    console.log(`MCP GET SSE - Session: ${sessionId}`);

    // Return SSE stream for server notifications
    set.headers['content-type'] = 'text/event-stream';
    set.headers['cache-control'] = 'no-cache';
    set.headers['connection'] = 'keep-alive';

    // For now, return a simple connected event
    // Full SSE would require streaming response handling
    return new Response(
      new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode('event: open\ndata: {"type":"connected"}\n\n'));

          // Keep connection alive with periodic pings
          const pingInterval = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(': ping\n\n'));
            } catch {
              clearInterval(pingInterval);
            }
          }, 30000);

          // Clean up on close
          setTimeout(() => {
            clearInterval(pingInterval);
            controller.close();
          }, 300000); // 5 minute timeout
        }
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  })

  // DELETE for session termination
  .delete('/mcp', async ({ request, set }) => {
    const sessionId = request.headers.get('mcp-session-id');

    if (!sessionId) {
      set.status = 400;
      return { error: "Missing session ID" };
    }

    if (sessions.has(sessionId)) {
      sessions.delete(sessionId);
      console.log(`MCP Session terminated: ${sessionId}`);
      set.status = 202;
      return null;
    }

    set.status = 404;
    return { error: "Session not found" };
  })

  .listen({
    port: parseInt(process.env.PORT || "3000"),
    hostname: "0.0.0.0"
  });

console.log(`🧠 Mem0 Service is running at ${app.server?.hostname}:${app.server?.port}`);
console.log(`🔌 MCP Server exposed via /mcp (Streamable HTTP)`);
console.log(`📝 REST API available at /memories`);
console.log(`🔐 Authentication: Bearer token required`);