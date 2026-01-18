const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function testMcp() {
  console.log("🚀 Starting MCP Tests (Streamable HTTP)...");

  try {
    // 1. Initiate connection (GET /mcp)
    console.log(`Connecting to ${BASE_URL}/mcp ...`);
    const response = await fetch(`${BASE_URL}/mcp`);
    if (!response.ok) throw new Error(`Failed to connect: ${response.status}`);

    const sessionId = response.headers.get("x-session-id") || response.headers.get("X-Session-Id");
    console.log(`✅ Session ID received: ${sessionId}`);

    if (!sessionId) throw new Error("No session ID received in headers");

    // 2. List Tools via JSON-RPC (POST /mcp with Session-ID)
    const listToolsRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {}
    };

    console.log(`Sending tools/list to ${BASE_URL}/mcp ...`);
    const listRes = await fetch(`${BASE_URL}/mcp`, {
      method: "POST",
      headers: { 
          "Content-Type": "application/json",
          "x-session-id": sessionId
      },
      body: JSON.stringify(listToolsRequest)
    });

    const listData = await listRes.json();
    console.log("List Tools Response:", JSON.stringify(listData, null, 2));
    
    if (listData.result && listData.result.tools) {
      console.log(`✅ Successfully listed ${listData.result.tools.length} tools`);
    } else {
      throw new Error("Failed to list tools or invalid response format");
    }

    // 3. Call Tool (e.g., get_all_memories)
    const callToolRequest = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "get_all_memories",
        arguments: {
          user_id: "test_user_123"
        }
      }
    };

    console.log(`Calling tool 'get_all_memories' ...`);
    const callRes = await fetch(`${BASE_URL}/mcp`, {
      method: "POST",
      headers: { 
          "Content-Type": "application/json",
          "x-session-id": sessionId
      },
      body: JSON.stringify(callToolRequest)
    });

    const callData = await callRes.json();
    console.log("Call Tool Response:", JSON.stringify(callData, null, 2));

    if (callData.result && !callData.error) {
        console.log("✅ Tool Call Successful");
    } else {
        throw new Error("Tool call failed: " + JSON.stringify(callData.error));
    }

    process.exit(0);

  } catch (e) {
    console.error("❌ MCP Test Failed:", e);
    process.exit(1);
  }
}

testMcp();
