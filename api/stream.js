import { getAudioStream } from '../../utils/youtube.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  // Handle mock IDs for development
  if (id.startsWith('mock')) {
    return handleMockStream(req, res, id);
  }

  try {
    console.log(`Streaming audio for video: ${id}`);
    
    const audioInfo = await getAudioStream(id);
    
    if (!audioInfo || !audioInfo.url) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    // Set appropriate headers for audio streaming
    res.setHeader('Content-Type', audioInfo.mimeType || 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // If it's a direct URL, redirect to it
    if (audioInfo.isDirect) {
      return res.redirect(302, audioInfo.url);
    }

    // Otherwise, proxy the audio stream
    const audioResponse = await fetch(audioInfo.url);
    
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`);
    }

    // Pipe the audio stream to response
    const arrayBuffer = await audioResponse.arrayBuffer();
    res.setHeader('Content-Length', arrayBuffer.byteLength);
    res.send(Buffer.from(arrayBuffer));

  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ 
      error: 'Failed to stream audio',
      details: error.message 
    });
  }
}

function handleMockStream(req, res, id) {
  // Return a mock audio response for development
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-cache');
  
  // You could return a short silent MP3 or mock audio
  res.json({ 
    message: 'Mock audio stream',
    id: id,
    note: 'In production, this would be real audio from YouTube'
  });
}
