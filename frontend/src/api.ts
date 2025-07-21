import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

interface Nanny {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  create_time: string;
  favourite: string;
  state: string;
  [key: string]: any; // For additional fields
}

interface ApiResponse {
  data: Nanny[];
  total: number;
}

export const fetchNannies = async (search = "", sort = "create_time", order = "desc", page = 1, limit = 100): Promise<ApiResponse> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/nannies`, {
      params: { search, sort, order, page, limit }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching nannies:", error);
    return { data: [], total: 0 };
  }
};

export const fetchNannyById = async (id: number): Promise<Nanny | null> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/nannies/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching nanny with ID ${id}:`, error);
    return null;
  }
};

// Generate a pre-signed URL for a file
export const getFileDownloadUrl = async (key: string): Promise<string | null> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/files/presigned-url`, {
      params: { key }
    });
    return response.data.url;
  } catch (error) {
    console.error('Error generating download URL:', error);
    return null;
  }
};
