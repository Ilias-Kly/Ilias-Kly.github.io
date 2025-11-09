import { searchVideos, getVideoDetails } from '../../utils/youtube.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { q, limit = 20 } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    console.log(`Searching for: ${q}`);
    
    const searchResults = await searchVideos(q, parseInt(limit));
    const videoDetails = await getVideoDetails(searchResults.map(video => video.id));
    
    // Combinar resultados
    const results = searchResults.map(video => {
      const details = videoDetails.find(d => d.id === video.id) || {};
      return {
        id: video.id,
        title: this.cleanTitle(video.title),
        artist: video.channel?.name || 'Unknown Artist',
        duration: this.formatDuration(details.duration),
        thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
        views: details.viewCount || 0,
        uploadDate: video.uploadDate || '',
        audioUrl: `/api/stream?id=${video.id}`
      };
    });

    res.json({
      success: true,
      query: q,
      results,
      total: results.length
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      results: this.generateFallbackResults(q)
    });
  }
}

function cleanTitle(title) {
  return title
    .replace(/\[[^\]]*\]/g, '') // Remove brackets content
    .replace(/\([^\)]*\)/g, '') // Remove parentheses content
    .replace(/official video|official audio|lyrics|video oficial|audio oficial/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function generateFallbackResults(query) {
  const mockTitles = [
    `${query} - Official Audio`,
    `${query} - Extended Mix`,
    `${query} - Acoustic Version`,
    `Best of ${query}`,
    `${query} - Live Performance`
  ];

  return mockTitles.map((title, index) => ({
    id: `mock${index + 1}`,
    title,
    artist: `Artist ${index + 1}`,
    duration: `${3 + index}:${(index * 10).toString().padStart(2, '0')}`,
    thumbnail: '',
    views: Math.floor(Math.random() * 1000000),
    audioUrl: `/api/stream?id=mock${index + 1}`
  }));
}
