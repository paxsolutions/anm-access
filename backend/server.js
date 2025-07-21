require("dotenv").config({ path: "../.env" });
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Configure AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const S3_BUCKET = process.env.S3_BUCKET_NAME;

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
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

// Generate pre-signed URL for S3 object
const generatePresignedUrl = async (key, expiresIn = 3600) => {
  if (!key) return null;

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key
  });

  try {
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    return null;
  }
};

// Endpoint to get pre-signed URL for a file
app.get('/api/files/presigned-url', async (req, res) => {
  const { key } = req.query;

  if (!key) {
    return res.status(400).json({ error: 'Key is required' });
  }

  try {
    const url = await generatePresignedUrl(key);
    if (!url) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json({ url });
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
});
