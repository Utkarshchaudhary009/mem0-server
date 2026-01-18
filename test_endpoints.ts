const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function testEndpoints() {
  console.log("🚀 Starting API Tests...");

  // 1. Test Health Check
  try {
    const health = await fetch(`${BASE_URL}/`);
    console.log(`[GET /] Status: ${health.status}`);
    if (health.status !== 200) throw new Error("Health check failed");
    console.log("✅ Health Check Passed");
  } catch (e) {
    console.error("❌ Health Check Failed:", e);
    process.exit(1);
  }

  // 2. Add Memory
  const userId = "test_user_123";
  let memoryId = "";
  try {
    const res = await fetch(`${BASE_URL}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: "I am a test user helping to verify the Mem0 system integration.",
        user_id: userId,
        metadata: { source: "test_script" }
      })
    });
    const data = await res.json();
    console.log(`[POST /memories] Response:`, data);
    if (!data.success) throw new Error("Add memory failed: " + data.error);
    // Assuming Mem0 returns the added memory ID or similar structure. 
    // Adjust based on actual response if needed.
    // Mem0 add response usually contains 'results' array.
    if (data.data && data.data.results && data.data.results.length > 0) {
        memoryId = data.data.results[0].id; // Capture ID for deletion
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
        query: "verify system",
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

  // 5. Delete Memory (if we captured an ID)
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

// Wait for server to start (simple retry mechanism)
async function waitForServer(retries = 10, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            await fetch(`${BASE_URL}/`);
            return true;
        } catch (e) {
            console.log(`Waiting for server... (${i + 1}/${retries})`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    return false;
}

(async () => {
    if (await waitForServer()) {
        await testEndpoints();
    } else {
        console.error("❌ Server did not start in time.");
        process.exit(1);
    }
})();
