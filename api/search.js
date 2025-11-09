// api/search.js - VERSIÓN CORREGIDA PARA VERCEL
import fetch from 'node-fetch';

export default async function handler(request, response) {
  // Configurar CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Manejar preflight OPTIONS
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Solo permitir método GET
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Método no permitido' });
  }

  const { q } = request.query;

  if (!q) {
    return response.status(400).json({ error: 'Parámetro de búsqueda requerido' });
  }

  try {
    console.log(`🔍 Buscando: ${q}`);
    
    // PRIMERA API - Piped
    const pipedResponse = await fetch(`https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(q)}&filter=music`);
    
    if (!pipedResponse.ok) {
      throw new Error(`Piped API error: ${pipedResponse.status}`);
    }

    const pipedData = await pipedResponse.json();
    
    let results = [];
    
    if (pipedData.items && pipedData.items.length > 0) {
      results = pipedData.items
        .filter(item => item.type === 'stream' && item.duration > 60)
        .slice(0, 12)
        .map(item => ({
          id: item.url.split('/').pop(),
          title: item.title,
          artist: item.uploaderName,
          duration: formatDuration(item.duration),
          thumbnail: item.thumbnail
        }));
    }

    // Si no hay resultados, usar API de fallback
    if (results.length === 0) {
      console.log('🔄 Usando API de fallback...');
      const fallbackResponse = await fetch(`https://ytapi.deno.dev/api/v1/search?q=${encodeURIComponent(q)}&type=video`);
      
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        
        results = fallbackData
          .filter(item => item.type === 'video' && item.lengthSeconds > 60)
          .slice(0, 10)
          .map(item => ({
            id: item.videoId,
            title: item.title,
            artist: item.author,
            duration: formatDuration(item.lengthSeconds),
            thumbnail: item.videoThumbnails?.[3]?.url || item.videoThumbnails?.[0]?.url
          }));
      }
    }

    console.log(`✅ ${results.length} resultados para: ${q}`);
    return response.status(200).json(results);

  } catch (error) {
    console.error('❌ Error en búsqueda:', error);
    
    // Respuesta de error estructurada
    return response.status(500).json({ 
      error: 'Error en el servidor de búsqueda',
      message: error.message 
    });
  }
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
