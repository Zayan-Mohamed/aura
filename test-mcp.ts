import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const product = "watch"

async function testKaprukaFetch() {
  console.log("Initializing Kapruka MCP connection...");

  // 1. Configure the Streamable HTTP transport with Kapruka's endpoint
  const transport = new StreamableHTTPClientTransport(
    new URL("https://mcp.kapruka.com/mcp")
  );

  // 2. Initialize the MCP client
  const client = new Client(
    { name: "kapruka-test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    // 3. Connect to the server
    await client.connect(transport);
    console.log("Connected successfully! No API keys required.");

    console.log(`Fetching search results for '${product}'...`);

    // 4. Call the search tool to test data retrieval
    const result = await client.callTool({
      name: "kapruka_search_products",
      arguments: {
        params: {
          q: product,
          limit: 3 // Keep it small for the test
        }
      }
    });

    // 5. Output the result to the console
    console.log("Success! Here is the data:");
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    // 6. Clean up the connection
    // Note: The official client handles cleanup, but if you're using 
    // the @ai-sdk/mcp wrapper later, you'll explicitly call close()
    console.log("Test finished.");
    process.exit(0);
  }
}

testKaprukaFetch();