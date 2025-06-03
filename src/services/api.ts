import { ref } from "vue";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useApi() {
  const loading = ref(false);

  async function request<T>(
    endpoint: string,
    method: HttpMethod = "GET",
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    loading.value = true;
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          // Add auth headers if needed
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as T;
      return { data, error: null, loading: false };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : "Unknown error",
        loading: false,
      };
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    request,
    get: <T>(endpoint: string) => request<T>(endpoint),
    post: <T>(endpoint: string, body: unknown) =>
      request<T>(endpoint, "POST", body),
    put: <T>(endpoint: string, body: unknown) =>
      request<T>(endpoint, "PUT", body),
    patch: <T>(endpoint: string, body: unknown) =>
      request<T>(endpoint, "PATCH", body),
    delete: <T>(endpoint: string) => request<T>(endpoint, "DELETE"),
  };
}
