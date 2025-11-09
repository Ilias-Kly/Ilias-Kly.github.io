// api/stream.js - VERSIÓN CORREGIDA PARA VERCEL
import ytdl from 'ytdl-core';

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

  const { id } = request.query;

  if (!id) {
    return response.status(400).json({ error: 'ID de video requerido' });
  }

  // Validar formato del ID de YouTube
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) {
    return response.status(400).json({ error: 'ID de video inválido' });
  }

  try {
    console.log(`🎵 Obteniendo audio para: ${id}`);
    
    const info = await ytdl.getInfo(id);
    const audioFormat = ytdl.chooseFormat(info.formats, { 
      quality: 'highestaudio',
      filter: 'audioonly'
    });
    
    if (!audioFormat) {
      return response.status(404).json({ error: 'No se encontró formato de audio disponible' });
    }
    
    console.log(`✅ Audio obtenido para: ${id}`);
    return response.status(200).json({ 
      url: audioFormat.url,
      title: info.videoDetails.title,
      duration: info.videoDetails.lengthSeconds
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo audio:', error);
    
    return response.status(500).json({ 
      error: 'Error al obtener el stream de audio',
      message: error.message 
    });
  }
}
