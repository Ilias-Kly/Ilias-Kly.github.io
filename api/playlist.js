export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Para Vercel, usamos una "base de datos" en memoria (se reinicia en cada deploy)
  // En producción, conectarías a una base de datos real
  let playlists = [];

  try {
    const { action, playlistId, name } = req.query;
    const body = req.method === 'POST' ? req.body : {};

    switch (req.method) {
      case 'GET':
        if (playlistId) {
          const playlist = playlists.find(p => p.id === playlistId);
          if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
          }
          return res.json({ success: true, playlist });
        }
        return res.json({ success: true, playlists });

      case 'POST':
        if (action === 'create') {
          const newPlaylist = {
            id: Date.now().toString(),
            name: name || `Playlist ${Date.now()}`,
            tracks: [],
            created: new Date().toISOString(),
            modified: new Date().toISOString()
          };
          playlists.push(newPlaylist);
          return res.json({ success: true, playlist: newPlaylist });
        }
        break;

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

    res.json({ success: true, message: 'Operation completed' });

  } catch (error) {
    console.error('Playlist error:', error);
    res.status(500).json({ error: error.message });
  }
}
