const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Sanitize filename and add timestamp to prevent conflicts
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    cb(null, `${timestamp}_${sanitized}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: function (req, file, cb) {
    // Only accept PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

// Serve static files from public directory
app.use(express.static('public'));

// Serve uploaded PDFs
app.use('/uploads', express.static(uploadsDir));

// API endpoint to upload a book
app.post('/api/upload', upload.single('book'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const bookInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadDate: new Date().toISOString(),
      path: `/uploads/${req.file.filename}`
    };

    res.json({
      message: 'Book uploaded successfully!',
      book: bookInfo
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload book' });
  }
});

// API endpoint to get list of all books
app.get('/api/books', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    const books = files
      .filter(file => file.endsWith('.pdf'))
      .map(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);

        // Extract original name (remove timestamp prefix)
        const originalName = file.replace(/^\d+_/, '');

        return {
          filename: file,
          originalName: originalName,
          size: stats.size,
          uploadDate: stats.mtime.toISOString(),
          path: `/uploads/${file}`
        };
      })
      .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

    res.json({ books });
  } catch (error) {
    console.error('Error reading books:', error);
    res.status(500).json({ error: 'Failed to retrieve books' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Book Sharing Platform running on port ${PORT}`);
  console.log(`📚 Upload directory: ${uploadsDir}`);
});
