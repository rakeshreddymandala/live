const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:8000';

export interface ChatRequest {
  message: string;
  voice?: string;
}

export interface ChatResponse {
  text: string;
  audio: string; // base64 encoded audio
}

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiService = {
  async sendMessage(message: string, voice: string = 'default'): Promise<ChatResponse> {
    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          voice
        } as ChatRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new ApiError(
          errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      const data: ChatResponse = await response.json();
      
      if (!data.text || !data.audio) {
        throw new ApiError('Invalid response from server');
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network or other errors
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to connect to server'
      );
    }
  },

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/`);
      return response.ok;
    } catch {
      return false;
    }
  }
};