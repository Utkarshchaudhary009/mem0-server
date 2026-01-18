const BASE_URL = "https://mem0-server.onrender.com";

async function testEndpoints() {
  console.log("🚀 Starting API Tests against Render...");

  // 1. Test Health Check
  try {
    const health = await fetch(`${BASE_URL}/`);
    console.log(`[GET /] Status: ${health.status}`);
    if (health.status !== 200) throw new Error("Health check failed");
    console.log("✅ Health Check Passed");
  } catch (e) {
    console.error("❌ Health Check Failed:", e);
    // Don't exit immediately on health check failure for remote tests, might be waking up
  }

  // 2. Add Memory
  const userId = "test_user_render_1";
  let memoryId = "";
  try {
    const res = await fetch(`${BASE_URL}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: "I am verifying the production deployment on Render.",
        user_id: userId,
        metadata: { source: "render_verification_script" }
      })
    });
    
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (err) {
        console.error("Failed to parse JSON response:", text);
        throw new Error("Invalid JSON response");
    }

    console.log(`[POST /memories] Response:`, data);
    
    if (!data.success) throw new Error("Add memory failed: " + data.error);
    
    // Mem0 structure handling
    if (data.data && data.data.results && data.data.results.length > 0) {
        memoryId = data.data.results[0].id; 
    } else if (data.data && data.data.id) {
        memoryId = data.data.id;
    }
    console.log("✅ Add Memory Passed");
  } catch (e) {
    console.error("❌ Add Memory Failed:", e);
  }

  // 3. Search Memory
  try {
    const res = await fetch(`${BASE_URL}/memories/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "production deployment",
        user_id: userId
      })
    });
    const data = await res.json();
    console.log(`[POST /memories/search] Response:`, JSON.stringify(data, null, 2));
    if (!data.success) throw new Error("Search memory failed: " + data.error);
    console.log("✅ Search Memory Passed");
  } catch (e) {
    console.error("❌ Search Memory Failed:", e);
  }

  // 4. Get All Memories
  try {
    const res = await fetch(`${BASE_URL}/memories/${userId}`);
    const data = await res.json();
    console.log(`[GET /memories/:id] Response:`, JSON.stringify(data, null, 2));
    if (!data.success) throw new Error("Get all memories failed: " + data.error);
    console.log("✅ Get All Memories Passed");
  } catch (e) {
    console.error("❌ Get All Memories Failed:", e);
  }

  // 5. Delete Memory
  if (memoryId) {
      try {
        const res = await fetch(`${BASE_URL}/memories/${memoryId}`, {
            method: "DELETE"
        });
        const data = await res.json();
        console.log(`[DELETE /memories/:id] Response:`, data);
        if (!data.success) throw new Error("Delete memory failed: " + data.error);
        console.log("✅ Delete Memory Passed");
      } catch (e) {
        console.error("❌ Delete Memory Failed:", e);
      }
  } else {
      console.log("⚠️ Skipping Delete Test (No Memory ID captured)");
  }
}

testEndpoints();
