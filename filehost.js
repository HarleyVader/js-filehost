require('dotenv').config(); // Load environment variables
const express = require('express');
const path = require('path');
const multer = require('multer');
const http = require('http');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT;

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

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => { 
    res.sendFile(path.join(__dirname, 'index.html'));	
});

// Middleware to limit access to local network
function limitToLocalNetwork(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    console.log(`Request IP: ${ip}`); // Log the IP address of the request
    // Check if IP address starts with "192.168." or "172.30."
    if (ip.startsWith('84.115.142.3')) {
        next(); 
    } else {
        res.status(403).json({ error: 'Access denied.' });
    }
}

// Protect the upload route with the customAuth middleware
app.post('/upload',/* limitToLocalNetwork, */ upload.single('file'), (req, res) => {
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

server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`);
});