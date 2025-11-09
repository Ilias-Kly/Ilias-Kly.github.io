import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { q } = req.query;
  
  // Evitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Usar una API pública o scraping simple
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    const response = await fetch(searchUrl);
    const html = await response.text();
    
    // Extraer IDs de videos del HTML (simplificado)
    const videoIds = extractVideoIds(html);
    const results = await getVideoDetails(videoIds);
    
    res.json({ success: true, results });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message,
      // Datos de ejemplo para desarrollo
      results: generateMockResults(q)
    });
  }
}

function extractVideoIds(html) {
  // Expresión regular simple para extraer video IDs
  const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
  const matches = [...html.matchAll(regex)];
  return [...new Set(matches.map(match => match[1]))].slice(0, 10);
}

async function getVideoDetails(videoIds) {
  // Usar oembed para obtener detalles básicos
  const promises = videoIds.map(async (id) => {
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
      const data = await response.json();
      return {
        id,
        title: data.title,
        artist: data.author_name,
        thumbnail: data.thumbnail_url,
        duration: '3:45' // Placeholder
      };
    } catch (error) {
      return {
        id,
        title: `Video ${id}`,
        artist: 'Unknown Artist',
        thumbnail: '',
        duration: '0:00'
      };
    }
  });
  
  return Promise.all(promises);
}

function generateMockResults(query) {
  return [
    {
      id: 'dQw4w9WgXcQ',
      title: `${query} - Example 1`,
      artist: 'Artist 1',
      thumbnail: '',
      duration: '3:45'
    },
    {
      id: 'dQw4w9WgXcQ',
      title: `${query} - Example 2`,
      artist: 'Artist 2',
      thumbnail: '',
      duration: '4:20'
    }
  ];
}
