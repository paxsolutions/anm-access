require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "abc123",
  database: process.env.DB_NAME || "anmlocal",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Get all nannies with pagination and search
app.get("/api/nannies", (req, res) => {
  const { search = "", sort = "create_time", order = "desc", page = 1, limit = 100 } = req.query;
  const offset = (page - 1) * limit;

  let query = `SELECT * FROM nannies_nanny WHERE CONCAT_WS('', favourite, first_name, last_name, email, state) LIKE ? ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`;
  let values = [`%${search}%`, parseInt(limit), parseInt(offset)];

  db.query(query, values, (err, results) => {
    if (err) {
      console.error("Query Error:", err);
      return res.status(500).json({ error: err.message });
    }

    db.query(
      "SELECT COUNT(*) AS total FROM nannies_nanny WHERE CONCAT_WS('', favourite, first_name, last_name, email, state) LIKE ?",
      [`%${search}%`],
      (countErr, countResults) => {
        if (countErr) {
          console.error("Count Query Error:", countErr);
          return res.status(500).json({ error: countErr.message });
        }
        res.json({ data: results, total: countResults[0].total });
      }
    );
  });
});

// Get a single nanny by ID with all fields
app.get("/api/nannies/:id", (req, res) => {
  const { id } = req.params;

  db.query('SELECT * FROM nannies_nanny WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error("Query Error:", err);
      return res.status(500).json({ error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Nanny not found' });
    }

    res.json(results[0]);
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
