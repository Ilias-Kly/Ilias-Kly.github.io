import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { q, limit = 10 } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    console.log(`Buscando: ${q}`);
    
    // Usar YouTube Data API si hay clave, sino usar método alternativo
    const results = await searchYouTube(q, parseInt(limit));
    
    res.json({
      success: true,
      query: q,
      results: results,
      total: results.length
    });

  } catch (error) {
    console.error('Error en búsqueda:', error);
    
    // Fallback a resultados de ejemplo
    res.json({
      success: true,
      query: q,
      results: generateMockResults(q, limit),
      note: "Usando datos de ejemplo"
    });
  }
}

async function searchYouTube(query, limit) {
  try {
    // Método 1: Intentar con YouTube Data API si existe clave
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey) {
      return await searchWithOfficialAPI(query, limit, apiKey);
    }

    // Método 2: Búsqueda alternativa
    return await searchWithAlternative(query, limit);
    
  } catch (error) {
    console.error('Búsqueda de YouTube falló:', error);
    return generateMockResults(query, limit);
  }
}

async function searchWithOfficialAPI(query, limit, apiKey) {
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${limit}&q=${encodeURIComponent(query)}&key=${apiKey}`
  );
  
  const data = await response.json();
  
  return data.items.map(item => ({
    id: item.id.videoId,
    title: item.snippet.title,
    artist: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails.default.url,
    duration: '0:00', // La API de búsqueda no da duración
    audioUrl: `/api/stream?id=${item.id.videoId}`
  }));
}

async function searchWithAlternative(query, limit) {
  // Simular búsqueda (en un caso real, usarías web scraping o APIs alternativas)
  console.log('Usando búsqueda alternativa para:', query);
  
  // Retornar resultados mock por ahora
  return generateMockResults(query, limit);
}

function generateMockResults(query, limit) {
  const genres = ['Pop', 'Rock', 'Hip Hop', 'Electronic', 'R&B', 'Jazz', 'Classical'];
  const artists = [
    'The Weekend', 'Taylor Swift', 'Bad Bunny', 'Dua Lipa', 
    'Ed Sheeran', 'Billie Eilish', 'Drake', 'Ariana Grande'
  ];
  
  return Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
    id: `mock_${Date.now()}_${i}`,
    title: `${query} - ${genres[i % genres.length]} Mix ${i + 1}`,
    artist: artists[i % artists.length],
    duration: `${3 + (i % 3)}:${(i * 13 % 60).toString().padStart(2, '0')}`,
    thumbnail: `https://picsum.photos/200/200?random=${i}`,
    audioUrl: `/api/stream?id=mock_${Date.now()}_${i}`,
    isMock: true
  }));
}
