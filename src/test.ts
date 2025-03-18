import { EmbeddingApiClient } from "./api.js";

async function testEmbeddingStorage() {
  const apiClient = new EmbeddingApiClient();

  console.log("Testing Embedding Storage API Client");

  // Test storing content
  const storeResult = await apiClient.generateEmbeddings({
    content:
      "This is some test content about artificial intelligence. AI is transforming many industries through machine learning and neural networks.",
    path: "/test/ai-content",
    type: "markdown",
    source: "test-script",
  });

  console.log("\n--- Store Content Result ---");
  console.log(storeResult);

  // Test searching content
  const searchResult = await apiClient.vectorSearch({
    prompt: "Tell me about machine learning",
    match_count: 3,
  });

  console.log("\n--- Search Content Result ---");
  console.log(searchResult);
}

testEmbeddingStorage().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
