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

// Ensure downloads directory exists
if (!fs.existsSync(DOWNLOADS_FOLDER)) {
    fs.mkdirSync(DOWNLOADS_FOLDER);
}

let isDownloading = false;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/downloads', express.static(DOWNLOADS_FOLDER));

// Get video formats
async function getFormats(videoUrl) {
    try {
        const result = await ytDlp(videoUrl, { dumpJson: true });
        return result.formats || [];
    } catch (error) {
        console.error('Error getting formats:', error);
        return null;
    }
}

// Delete file with retry logic
function deleteFileWithRetry(filePath, retries = 10, delay = 3000) {
    const attempt = (count) => {
        try {
            fs.unlinkSync(filePath);
            console.log(`Deleted: ${filePath}`);
        } catch (err) {
            if ((err.code === 'EBUSY' || err.code === 'EPERM') && count > 0) {
                console.log(`File busy, retrying... (${count} attempts left)`);
                setTimeout(() => attempt(count - 1), delay);
            } else {
                console.error(`Failed to delete ${filePath}:`, err.message);
            }
        }
    };
    attempt(retries);
}

// Create unique session folder
function createSessionFolder(sessionId) {
    const sessionPath = path.join(DOWNLOADS_FOLDER, sessionId.toString());
    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath);
    }
    return sessionPath;
}

// Main download endpoint
app.post('/download', async (req, res) => {
    const sessionId = req.body.sessionId || Date.now().toString();
    const downloadFolder = createSessionFolder(sessionId);
    const videoUrl = req.body.url;
    const quality = req.body.quality || 'best';

    if (!videoUrl) {
        return res.status(400).json({ error: 'No URL provided' });
    }

    let videoName = `video_${Date.now()}.mp4`;
    const videoPath = path.join(downloadFolder, videoName);

    const formatMap = {
        best: 'best',
        worst: 'worst',
        '360p': 'bestvideo[height<=360]+bestaudio/best',
        '480p': 'bestvideo[height<=480]+bestaudio/best',
        '720p': 'bestvideo[height<=720]+bestaudio/best',
        '1080p': 'bestvideo[height<=1080]+bestaudio/best'
    };

    try {
        isDownloading = true;

        const formats = await getFormats(videoUrl);
        if (!formats) {
            isDownloading = false;
            return res.status(400).json({ error: 'Invalid URL or no formats available' });
        }

        const selectedFormat = formatMap[quality] || quality;

        await ytDlp(videoUrl, {
            format: selectedFormat,
            output: videoPath,
            'merge-output-format': 'mp4',
            'ffmpeg-location': ffmpegPath,
            cookies: path.join(__dirname, 'cookies.txt'),
            'postprocessor-args': [
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-preset', 'fast',
                '-crf', '23',
                '-movflags', '+faststart'
            ]
        });

        res.json({
            status: 'completed',
            download_link: `/downloads/${sessionId}/${videoName}`
        });
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Failed to download video', status: 'failed' });
    } finally {
        isDownloading = false;
    }
});

// Auto-restart every 30 minutes
const restartServer = () => {
    if (!isDownloading) {
        console.log('Restarting server via PM2...');
        exec('pm2 restart server10.js', (err, stdout, stderr) => {
            if (err) {
                console.error('Restart error:', stderr);
            } else {
                console.log('Restart success:', stdout);
            }
        });
    } else {
        console.log('Download in progress, delaying restart...');
    }
};

// Schedule restart
schedule.scheduleJob('*/30 * * * *', restartServer);

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://192.168.8.153:${PORT}`);
});
