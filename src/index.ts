#!/usr/bin/env node

import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
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
  "Store content to memory",
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
  "Retrieve content from memory",
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

// Resource: Search content and return as a resource
server.resource(
  "search-results",
  new ResourceTemplate("search://{query}", { list: undefined }),
  async (uri, { query }) => {
    try {
      // Ensure query is a string (could be a string[] from URI template)
      const searchQuery = Array.isArray(query) ? query[0] : query;

      const response = await apiClient.vectorSearch({ prompt: searchQuery });

      if (response.error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error searching content: ${response.error}`,
            },
          ],
        };
      }

      if (!response.contextText || response.contextText.trim() === "") {
        return {
          contents: [
            {
              uri: uri.href,
              text: "No matching content found for your query.",
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.href,
            text: response.contextText,
            mimeType: "text/markdown",
          },
        ],
      };
    } catch (error: unknown) {
      console.error("Error in search resource:", error);
      return {
        contents: [
          {
            uri: uri.href,
            text: "An error occurred while searching content.",
          },
        ],
      };
    }
  }
);

// Add a prompt to help store new content
server.prompt(
  "save-memory",
  "A prompt to help store new content with embeddings",
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
          text: `Please help me store the following content with path "${path}":\n\n${content}\n\nYou can use the store-content tool to save this information.`,
        },
      },
    ],
  })
);

// Add a prompt for searching content
server.prompt(
  "search-memory",
  "A prompt to search for knowledge",
  {
    query: z.string().describe("The search query"),
  },
  ({ query }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please search for information about: ${query}\n\nYou can use the search-content tool to find relevant information.`,
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
