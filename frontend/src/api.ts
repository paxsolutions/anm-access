import axios from "axios";

const API_URL = "http://localhost:5000/api/data";

export const fetchData = async (search = "", sort = "create_time", order = "desc", page = 1, limit = 100) => {
  try {
    console.log("Fetching data from API...");
    const response = await axios.get(API_URL, { params: { search, sort, order, page, limit } });
    console.log("API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    return { data: [], total: 0 };
  }
};
