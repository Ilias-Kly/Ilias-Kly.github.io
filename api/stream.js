import ytdl from 'ytdl-core';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Falta ID del video' });
  }

  try {
    console.log(`🎵 Obteniendo audio para: ${id}`);
    
    const info = await ytdl.getInfo(id);
    const audioFormat = ytdl.chooseFormat(info.formats, { 
      quality: 'highestaudio',
      filter: 'audioonly'
    });
    
    if (!audioFormat) {
      return res.status(404).json({ error: 'No se encontró formato de audio' });
    }
    
    console.log(`✅ Audio obtenido: ${audioFormat.url.substring(0, 50)}...`);
    res.json({ url: audioFormat.url });
    
  } catch (error) {
    console.error('❌ Error obteniendo audio:', error);
    res.status(500).json({ error: 'Error al obtener audio' });
  }
}
