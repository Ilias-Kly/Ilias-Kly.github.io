import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  // Manejar IDs mock para desarrollo
  if (id.startsWith('mock')) {
    return handleMockStream(req, res, id);
  }

  try {
    console.log(`Solicitando stream para: ${id}`);
    
    // En una implementación real, aquí procesarías el audio de YouTube
    // Por ahora retornamos información del track
    res.json({
      success: true,
      id: id,
      message: "Stream endpoint - En producción aquí iría el audio real",
      note: "Para audio real, necesitarías implementar yt-dlp o similar en un servidor con más capacidades",
      audioUrl: `https://www.youtube.com/watch?v=${id}`
    });

  } catch (error) {
    console.error('Error en stream:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process audio stream',
      details: error.message 
    });
  }
}

function handleMockStream(req, res, id) {
  res.json({ 
    success: true,
    message: 'Mock audio stream para desarrollo',
    id: id,
    note: 'En producción, este sería audio real de YouTube',
    audioUrl: '#'
  });
}
