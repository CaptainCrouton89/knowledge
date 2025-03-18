#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { EmbeddingApiClient } from "./api.js";
// Create the MCP server
const server = new McpServer({
  name: "embedding-storage",
  version: "1.0.0",
});

// Create the API client
const apiClient = new EmbeddingApiClient();

// Tool: Store content with embeddings
server.tool(
  "save-memory",
  "Save content to vector database",
  {
    content: z.string().describe("The content to store"),
    path: z.string().describe("Unique identifier path for the content"),
    type: z.string().optional().describe("Content type (e.g., 'markdown')"),
    source: z.string().optional().describe("Source of the content"),
    parentPath: z
      .string()
      .optional()
      .describe("Path of the parent content (if applicable)"),
  },
  async ({ content, path, type, source, parentPath }) => {
    const request = {
      content,
      path,
      type: type || "markdown",
      source: source || "api",
      parentPath,
    };

    const response = await apiClient.generateEmbeddings(request);

    if (!response.success) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error storing content: ${response.error || "Unknown error"}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully stored content at path: ${path}\nSections processed: ${
            response.sections || 0
          }`,
        },
      ],
    };
  }
);

// Tool: Search content using vector similarity
server.tool(
  "search-memory",
  "Search for information in vector database",
  {
    query: z.string().describe("The search query"),
    maxMatches: z
      .number()
      .optional()
      .describe("Maximum number of matches to return"),
  },
  async ({ query, maxMatches }) => {
    const request = {
      prompt: query,
      match_count: maxMatches,
    };

    const response = await apiClient.vectorSearch(request);

    if (response.error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error searching content: ${response.error}`,
          },
        ],
      };
    }

    if (!response.contextText || response.contextText.trim() === "") {
      return {
        content: [
          {
            type: "text",
            text: "No matching content found for your query.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: response.contextText,
        },
      ],
    };
  }
);

// Add a prompt to help store new content
server.prompt(
  "save-memory",
  {
    path: z.string().describe("Unique identifier path for the content"),
    content: z.string().describe("The content to store"),
  },
  ({ path, content }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please help me store the following content with path "${path}":\n\n${content}\n\nYou can use the save-memory tool to save this information.`,
        },
      },
    ],
  })
);

// Add a prompt for searching content
server.prompt(
  "search-memory",
  {
    query: z.string().describe("The search query"),
  },
  ({ query }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please search for information about: ${query}\n\nYou can use the search-memory tool to find relevant information.`,
        },
      },
    ],
  })
);

// Start the server
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Embedding Storage Server running...");
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main().catch(console.error);
