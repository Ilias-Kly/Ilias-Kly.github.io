// api/search.js
import fetch from 'node-fetch';

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

async function searchHandler(req, res) {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ 
        success: false,
        error: 'Query parameter is required' 
      });
    }

    console.log(`🔍 Searching: ${q}`);

    // Try Piped API first
    let results = [];
    try {
      const pipedResponse = await fetch(`https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(q)}&filter=music`);
      
      if (pipedResponse.ok) {
        const pipedData = await pipedResponse.json();
        
        results = pipedData.items
          ?.filter(item => item.type === 'stream' && item.duration > 60)
          ?.slice(0, 12)
          ?.map(item => ({
            id: item.url.split('/').pop(),
            title: item.title,
            artist: item.uploaderName,
            duration: formatDuration(item.duration),
            thumbnail: item.thumbnail
          })) || [];
      }
    } catch (pipedError) {
      console.log('Piped API failed, trying fallback...');
    }

    // Fallback to YouTube API
    if (results.length === 0) {
      try {
        const fallbackResponse = await fetch(`https://ytapi.deno.dev/api/v1/search?q=${encodeURIComponent(q)}&type=video`);
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          
          results = fallbackData
            ?.filter(item => item.type === 'video' && item.lengthSeconds > 60)
            ?.slice(0, 10)
            ?.map(item => ({
              id: item.videoId,
              title: item.title,
              artist: item.author,
              duration: formatDuration(item.lengthSeconds),
              thumbnail: item.videoThumbnails?.[3]?.url || item.videoThumbnails?.[0]?.url
            })) || [];
        }
      } catch (fallbackError) {
        console.log('Fallback API also failed');
      }
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No results found',
        results: []
      });
    }

    console.log(`✅ Found ${results.length} results for: ${q}`);
    
    return res.status(200).json({
      success: true,
      results: results
    });

  } catch (error) {
    console.error('❌ Search error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Export the handler with CORS
export default allowCors(searchHandler);
