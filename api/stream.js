import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { id } = req.query;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Usar yt-dlp-wrap o similar (pero en Vercel necesitas una solución ligera)
    const audioUrl = await getAudioUrl(id);
    
    if (audioUrl) {
      // Redirigir al audio directo
      res.redirect(302, audioUrl);
    } else {
      res.json({ error: 'No se pudo obtener el audio' });
    }
  } catch (error) {
    res.json({ error: error.message });
  }
}

async function getAudioUrl(videoId) {
  // Opción 1: Usar servicios públicos (pueden dejar de funcionar)
  try {
    const response = await fetch(`https://api.example.com/youtube/${videoId}`);
    const data = await response.json();
    return data.audioUrl;
  } catch (error) {
    // Opción 2: Usar URLs directas (limitado)
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
}
