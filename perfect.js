const express = require('express');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ytDlp = require('yt-dlp-exec');
const schedule = require('node-schedule');
const { exec } = require('child_process');

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = process.env.PORT || 5000;
const DOWNLOADS_FOLDER = path.join(__dirname, 'downloads');

if (!fs.existsSync(DOWNLOADS_FOLDER)) {
    fs.mkdirSync(DOWNLOADS_FOLDER);
}

let isDownloading = false;  // Track if a download is in progress

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/downloads', express.static(DOWNLOADS_FOLDER));

// Function to get available formats
async function getFormats(videoUrl) {
    try {
        const result = await ytDlp(videoUrl, { dumpJson: true });
        return result.formats || [];
    } catch (error) {
        console.error('Error getting formats:', error);
        return null;
    }
}

// Function to delete file with retries
function deleteFileWithRetry(filePath, retries = 10, delay = 3000) {
    const attemptDeletion = (retryCount) => {
        try {
            fs.unlinkSync(filePath);
            console.log(`File deleted: ${filePath}`);
        } catch (err) {
            if ((err.code === 'EBUSY' || err.code === 'EPERM') && retryCount > 0) {
                console.log(`File is busy, retrying... Attempts left: ${retryCount}`);
                setTimeout(() => attemptDeletion(retryCount - 1), delay);
            } else {
                console.error(`Failed to delete file: ${filePath}. Error: ${err.message}`);
            }
        }
    };

    attemptDeletion(retries);
}

// Function to create session folder for each download
const createSessionFolder = (sessionId) => {
    const sessionFolder = path.join(DOWNLOADS_FOLDER, sessionId.toString());
    if (!fs.existsSync(sessionFolder)) {
        fs.mkdirSync(sessionFolder);
    }
    return sessionFolder;
};

// Route to download YouTube video
app.post('/download', async (req, res) => {
    isDownloading = true;
    const sessionId = req.body.sessionId || Date.now().toString();
    const downloadFolder = createSessionFolder(sessionId);

    const videoUrl = req.body.url;
    const quality = req.body.quality || 'best';

    if (!videoUrl) {
        isDownloading = false;
        return res.status(400).json({ error: 'No URL provided' });
    }

    let videoName;
    try {
        const formats = await getFormats(videoUrl);
        if (!formats) {
            isDownloading = false;
            return res.status(400).json({ error: 'Invalid URL or video unavailable' });
        }

        const formatMap = {
            best: 'best',
            worst: 'worst',
            '360p': 'bestvideo[height<=360]+bestaudio/best',
            '480p': 'bestvideo[height<=480]+bestaudio/best',
            '720p': 'bestvideo[height<=720]+bestaudio/best',
            '1080p': 'bestvideo[height<=1080]+bestaudio/best'
        };
        const selectedFormat = formatMap[quality] || quality;

        videoName = `video_${Date.now()}.mp4`;
        const videoPath = path.join(downloadFolder, videoName);

        await ytDlp(videoUrl, {
            'format': selectedFormat,
            'output': videoPath,
            'merge-output-format': 'mp4',
            'ffmpeg-location': ffmpegPath,
            'cookies': path.join(__dirname, 'cookies.txt'), 
            'postprocessor-args': '-c:v libx264 -c:a aac -strict experimental -preset fast -crf 23 -movflags +faststart'
        });

        res.json({ download_link: `/downloads/${sessionId}/${videoName}`, status: 'completed' });
        isDownloading = false;
    } catch (error) {
        isDownloading = false;
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to download video', status: 'failed' });
    }
});

// Scheduled server restart every 30 minutes
let restartTimeout;
const restartServer = () => {
    if (!isDownloading) {
        console.log('Server restarting...');
        exec('pm2 restart server10.js', (err, stdout, stderr) => {
            if (err) {
                console.error(`Error restarting server: ${stderr}`);
            } else {
                console.log(stdout);
            }
        });
    } else {
        console.log('Download in progress, server restart delayed.');
    }
};

// Schedule server restart every 30 minutes
schedule.scheduleJob('*/30 * * * *', restartServer);

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://192.168.8.153:${PORT}`);
});
