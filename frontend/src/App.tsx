import React from "react";
import Table from "./components/Table";
import './App.css';

const App = () => {
  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100">
      <div className="bg-white p-6 shadow-lg rounded-lg">
        <h1 className="text-xl font-bold mb-4">MySQL Data Table</h1>
        <Table />
      </div>
    </div>
  );
};

export default App;
