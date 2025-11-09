// api/stream.js
import ytdl from 'ytdl-core';

const allowCors = (fn) => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  return await fn(req, res);
};

async function streamHandler(req, res) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Video ID is required'
      });
    }

    // Validate YouTube video ID format
    if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid video ID format'
      });
    }

    console.log(`🎵 Getting audio for: ${id}`);

    const info = await ytdl.getInfo(id);
    const audioFormat = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly'
    });

    if (!audioFormat) {
      return res.status(404).json({
        success: false,
        error: 'No audio format available for this video'
      });
    }

    console.log(`✅ Audio obtained for: ${id}`);

    return res.status(200).json({
      success: true,
      url: audioFormat.url,
      title: info.videoDetails.title,
      artist: info.videoDetails.author?.name || 'Unknown Artist',
      duration: parseInt(info.videoDetails.lengthSeconds),
      thumbnail: info.videoDetails.thumbnails[0]?.url
    });

  } catch (error) {
    console.error('❌ Stream error:', error);

    // Handle specific ytdl errors
    if (error.message.includes('Video unavailable')) {
      return res.status(404).json({
        success: false,
        error: 'Video not available or private'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to get audio stream',
      message: error.message
    });
  }
}

// Export the handler with CORS
export default allowCors(streamHandler);
