import fetch from 'node-fetch';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Falta parámetro q' });
  }

  try {
    console.log(`🔍 Buscando: ${q}`);
    
    // API de Piped para búsqueda
    const response = await fetch(`https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(q)}&filter=music`);
    const data = await response.json();
    
    const results = data.items
      .filter(item => item.type === 'stream' && item.duration > 60)
      .slice(0, 12)
      .map(item => ({
        id: item.url.split('/').pop(),
        title: item.title,
        artist: item.uploaderName,
        duration: formatDuration(item.duration),
        thumbnail: item.thumbnail
      }));

    console.log(`✅ ${results.length} resultados para: ${q}`);
    res.json(results);
    
  } catch (error) {
    console.error('❌ Error en búsqueda:', error);
    
    // Fallback a otra API
    try {
      const backupResponse = await fetch(`https://ytapi.deno.dev/api/v1/search?q=${encodeURIComponent(q)}&type=video`);
      const backupData = await backupResponse.json();
      
      const backupResults = backupData
        .filter(item => item.type === 'video')
        .slice(0, 10)
        .map(item => ({
          id: item.videoId,
          title: item.title,
          artist: item.author,
          duration: formatDuration(item.lengthSeconds),
          thumbnail: item.videoThumbnails?.[3]?.url || item.videoThumbnails?.[0]?.url
        }));
        
      res.json(backupResults);
    } catch (fallbackError) {
      res.status(500).json({ error: 'Todas las APIs fallaron' });
    }
  }
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
