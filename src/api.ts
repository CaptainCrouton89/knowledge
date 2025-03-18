import axios from "axios";

const API_BASE_URL = "https://ai-embeddings.vercel.app";

export interface GenerateEmbeddingsRequest {
  content: string;
  path: string;
  type?: string;
  source?: string;
  parentPath?: string;
  meta?: Record<string, any>;
}

export interface GenerateEmbeddingsResponse {
  success: boolean;
  page?: {
    id: number;
    path: string;
    type: string;
    source: string;
  };
  sections?: number;
  error?: string;
}

export interface VectorSearchRequest {
  prompt: string;
  match_count?: number;
}

export interface VectorSearchResponse {
  contextText: string;
  error?: string;
}

export class EmbeddingApiClient {
  async generateEmbeddings(
    request: GenerateEmbeddingsRequest
  ): Promise<GenerateEmbeddingsResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/generate-embeddings`,
        request
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        return {
          success: false,
          error: error.response.data.error || "Failed to generate embeddings",
        };
      }
      return {
        success: false,
        error: "Failed to connect to embedding service",
      };
    }
  }

  async vectorSearch(
    request: VectorSearchRequest
  ): Promise<VectorSearchResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/vector-search`,
        request
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        return {
          contextText: "",
          error: error.response.data.error || "Failed to perform vector search",
        };
      }
      return {
        contextText: "",
        error: "Failed to connect to embedding service",
      };
    }
  }
}
