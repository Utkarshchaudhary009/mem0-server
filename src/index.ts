import { Elysia, t } from 'elysia';
import { Memory } from 'mem0ai/oss';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";

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
    vector_store: { ...config.vector_store, config: { ...config.vector_store.config, apiKey: "********", collectionName: "mem0_gemini_test_v3" } },
    graph_store: { ...config.graph_store, config: { ...config.graph_store.config, password: "********" } },
    embedder: { ...config.embedder, config: { ...config.embedder.config, apiKey: "********" } },
    llm: { ...config.llm, config: { ...config.llm.config, apiKey: "********" } }
}, null, 2));

// --- Initialize Core Services ---
const memory = new Memory(config);

// --- MCP Server Setup ---
const mcpServer = new Server(
  {
    name: "mem0-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define Tools
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "add_memory",
        description: "Add a new memory to the system",
        inputSchema: {
          type: "object",
          properties: {
            messages: {
              oneOf: [{ type: "string" }, { type: "array", items: { type: "any" } }],
              description: "The content of the memory (string or array of messages)"
            },
            user_id: { type: "string", description: "The ID of the user" },
            metadata: { type: "object", description: "Optional metadata" }
          },
          required: ["messages", "user_id"]
        }
      },
      {
        name: "search_memory",
        description: "Search for existing memories",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query" },
            user_id: { type: "string", description: "The ID of the user" },
            limit: { type: "number", description: "Max number of results (default 5)" }
          },
          required: ["query", "user_id"]
        }
      },
      {
        name: "get_all_memories",
        description: "Get all memories for a user",
        inputSchema: {
          type: "object",
          properties: {
            user_id: { type: "string", description: "The ID of the user" }
          },
          required: ["user_id"]
        }
      },
      {
        name: "delete_memory",
        description: "Delete a specific memory",
        inputSchema: {
          type: "object",
          properties: {
            memory_id: { type: "string", description: "The ID of the memory to delete" }
          },
          required: ["memory_id"]
        }
      }
    ]
  };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "add_memory": {
        const { messages, user_id, metadata } = args as any;
        const result = await memory.add(messages, { userId: user_id, metadata });
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "search_memory": {
        const { query, user_id, limit } = args as any;
        const result = await memory.search(query, { userId: user_id, limit: limit || 5 });
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "get_all_memories": {
        const { user_id } = args as any;
        const result = await memory.getAll({ userId: user_id });
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "delete_memory": {
        const { memory_id } = args as any;
        await memory.delete(memory_id);
        return { content: [{ type: "text", text: "Memory deleted successfully" }] };
      }
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Initialize Transport
const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
});

// Connect server to transport
await mcpServer.connect(transport);

// --- HTTP Server (REST + MCP) ---
const app = new Elysia()
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

  // --- MCP Endpoints ---
  // The transport handles GET, POST, DELETE automatically.
  .all('/mcp', async ({ request }) => {
      console.log(`MCP Request: ${request.method} ${request.url}`);
      return await transport.handleRequest(request);
  })
  
  .listen({
    port: parseInt(process.env.PORT || "3000"),
    hostname: "0.0.0.0"
  });

console.log(`🧠 Mem0 Service is running at ${app.server?.hostname}:${app.server?.port}`);
console.log(`🔌 MCP Server exposed via /mcp (Streamable HTTP)`);


// Also listen on Stdio for CLI usage
// Note: Running both might be conflicting if they share the same server instance state?
// Actually, `connect` binds the server to a transport. You can connect multiple transports.
// const stdioTransport = new StdioServerTransport();
// mcpServer.connect(stdioTransport);

console.log(`🧠 Mem0 Service is running at ${app.server?.hostname}:${app.server?.port}`);
console.log(`🔌 MCP Server exposed via Stdio and REST`);
