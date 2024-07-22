require('dotenv').config(); // Load environment variables
const express = require('express');
const path = require('path');
const multer = require('multer');
const http = require('http');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 6969;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

app.use(express.static('public')); // Serve static files

// Custom Authentication Middleware for upload route
function customAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('Authentication required');
    }

    const encodedCredentials = authHeader.split(' ')[1];
    const [username, password] = Buffer.from(encodedCredentials, 'base64').toString('utf8').split(':');

    if (username === process.env.UPLOAD_USER && password === process.env.UPLOAD_PASSWORD) {
        next();
    } else {
        res.status(403).send('Access Denied');
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Protect the upload route with the customAuth middleware
app.post('/upload', customAuth, upload.single('file'), (req, res) => {
    const fileLink = `${req.protocol}://${req.get('host')}/files/${req.file.filename}`;
    res.json({ link: fileLink });
});

app.get('/files/*', (req, res) => {
    const filePath = path.join(uploadsDir, req.params[0]);
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).send('File not found');
        }
        res.sendFile(filePath);
    });
});

app.get('/list-files', (req, res) => {
    fs.readdir(uploadsDir, (err, files) => {
        if (err) {
            return res.status(500).send('Failed to list files');
        }
        res.json({ files: files.map(file => `${req.protocol}://${req.get('host')}/files/${file}`) });
    });
});

http.createServer(app).listen(PORT, () => {
    console.log(`Filehost server running on http://localhost:${PORT}`);
});