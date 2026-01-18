const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function testMcp() {
  console.log("🚀 Starting MCP Tests (Streamable HTTP)...");

  try {
    // 1. Send 'initialize' request via POST
    console.log(`Sending 'initialize' to ${BASE_URL}/mcp ...`);
    
    const initRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "test-client",
          version: "1.0.0"
        }
      }
    };

    const initRes = await fetch(`${BASE_URL}/mcp`, {
      method: "POST",
      headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json, text/event-stream",
          "Authorization": "Bearer qwertyuiop1234567890"
      },
      body: JSON.stringify(initRequest)
    });

    if (!initRes.ok) {
         const text = await initRes.text();
         throw new Error(`Initialize failed: ${initRes.status} - ${text}`);
    }

    const sessionId = initRes.headers.get("x-session-id") || initRes.headers.get("X-Session-Id");
    console.log(`✅ Session ID received: ${sessionId}`);
    console.log("Response Headers:", JSON.stringify(Object.fromEntries(initRes.headers.entries()), null, 2));
    
    const text = await initRes.text();
    console.log("Raw Response Body:", text);

    try {
        const initData = JSON.parse(text);
        console.log("Initialize Response (Parsed):", JSON.stringify(initData, null, 2));
    } catch (e) {
        console.error("Failed to parse JSON response:", e);
    }

    if (!sessionId) {
        console.warn("⚠️ No Session ID returned in headers. Running in stateless mode?");
    }

    // 2. Send 'notifications/initialized'
    console.log("Sending 'notifications/initialized'...");
    await fetch(`${BASE_URL}/mcp`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "Authorization": "Bearer qwertyuiop1234567890",
            ...(sessionId ? { "x-session-id": sessionId } : {})
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "notifications/initialized"
        })
    });

    // 3. List Tools
    const listToolsRequest = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    };

    console.log(`Sending tools/list to ${BASE_URL}/mcp ...`);
    const listRes = await fetch(`${BASE_URL}/mcp`, {
      method: "POST",
      headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json, text/event-stream",
          "Authorization": "Bearer qwertyuiop1234567890",
          ...(sessionId ? { "x-session-id": sessionId } : {})
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

    // 4. Call Tool (e.g., get_all_memories)
    const callToolRequest = {
      jsonrpc: "2.0",
      id: 3,
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
          "Accept": "application/json, text/event-stream",
          "Authorization": "Bearer qwertyuiop1234567890",
          ...(sessionId ? { "x-session-id": sessionId } : {})
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