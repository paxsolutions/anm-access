import axios, { AxiosInstance } from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

interface Nanny {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  create_time: string;
  favourite: string;
  state: string;
  [key: string]: any;
}

export interface ApiResponse {
  data: Nanny[];
  total: number;
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if not authenticated
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Export the API functions
export const fetchNannies = async (
  search = "",
  sort = "create_time",
  order = "desc",
  page = 1,
  limit = 100
): Promise<ApiResponse> => {
  const response = await api.get<ApiResponse>("/api/nannies", {
    params: { search, sort, order, page, limit },
  });
  return response.data;
};

export const fetchNannyById = async (id: number): Promise<Nanny | null> => {
  try {
    const response = await api.get<Nanny>(`/api/nannies/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching nanny:", error);
    return null;
  }
};

// Generate a pre-signed URL for a file
export const getFileDownloadUrl = async (key: string): Promise<string | null> => {
  try {
    const response = await api.get<{ url: string }>(`/api/files/url`, {
      params: { key }
    });
    return response.data.url;
  } catch (error) {
    console.error("Error getting file URL:", error);
    return null;
  }
};