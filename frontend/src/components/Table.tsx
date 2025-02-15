import React, { useEffect, useState } from "react";
import { fetchData } from "../api";

interface DataItem {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  create_time: string;
}

const Table = () => {
  const [data, setData] = useState<DataItem[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("create_time");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    const loadData = async () => {
      const response = await fetchData(search, sort, order, page, limit);
      setData(response.data);
      setTotal(response.total);
    };
    loadData();
  }, [search, sort, order, page]);

  const toggleSort = (column: string) => {
    setSort(column);
    setOrder(order === "asc" ? "desc" : "asc");
  };

  return (
    <div className="p-6">
      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 p-2 border rounded"
      />

      {/* Table */}
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2 cursor-pointer" onClick={() => toggleSort("id")}>ID</th>
            <th className="border p-2 cursor-pointer" onClick={() => toggleSort("first_name")}>First Name</th>
            <th className="border p-2 cursor-pointer" onClick={() => toggleSort("last_name")}>Last Name</th>
            <th className="border p-2 cursor-pointer" onClick={() => toggleSort("email")}>Email</th>
            <th className="border p-2 cursor-pointer" onClick={() => toggleSort("create_time")}>Created At</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={5} className="p-4 text-center">No data found</td></tr>
          ) : (
            data.map((item) => (
              <tr key={item.id} className="border">
                <td className="p-2">{item.id}</td>
                <td className="p-2">{item.first_name}</td>
                <td className="p-2">{item.last_name}</td>
                <td className="p-2">{item.email}</td>
                <td className="p-2">{new Date(item.create_time).toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="mt-4 flex justify-between">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Prev
        </button>
        <span>Page {page}</span>
        <button
          onClick={() => setPage((p) => (p * limit < total ? p + 1 : p))}
          disabled={page * limit >= total}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Table;
