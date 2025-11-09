let playlists = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, playlistId, trackId, name } = req.query;

  try {
    switch (req.method) {
      case 'GET':
        if (playlistId) {
          return getPlaylist(req, res, playlistId);
        }
        return listPlaylists(req, res);

      case 'POST':
        if (action === 'create') {
          return createPlaylist(req, res, name);
        }
        if (action === 'add' && playlistId && trackId) {
          return addToPlaylist(req, res, playlistId, trackId);
        }
        break;

      case 'DELETE':
        if (playlistId) {
          return deletePlaylist(req, res, playlistId);
        }
        break;

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Playlist error:', error);
    res.status(500).json({ error: error.message });
  }
}

function createPlaylist(req, res, name) {
  const id = Date.now().toString();
  const playlist = {
    id,
    name: name || `Playlist ${id}`,
    tracks: [],
    created: new Date().toISOString(),
    modified: new Date().toISOString()
  };
  
  playlists.set(id, playlist);
  res.json({ success: true, playlist });
}

function addToPlaylist(req, res, playlistId, trackId) {
  const playlist = playlists.get(playlistId);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }

  // Get track details from request body
  const trackData = req.body || { id: trackId };
  
  if (!playlist.tracks.find(t => t.id === trackId)) {
    playlist.tracks.push({
      ...trackData,
      added: new Date().toISOString()
    });
    playlist.modified = new Date().toISOString();
  }

  res.json({ success: true, playlist });
}

function getPlaylist(req, res, playlistId) {
  const playlist = playlists.get(playlistId);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  res.json({ success: true, playlist });
}

function listPlaylists(req, res) {
  const playlistArray = Array.from(playlists.values());
  res.json({ success: true, playlists: playlistArray });
}

function deletePlaylist(req, res, playlistId) {
  if (playlists.has(playlistId)) {
    playlists.delete(playlistId);
    res.json({ success: true, message: 'Playlist deleted' });
  } else {
    res.status(404).json({ error: 'Playlist not found' });
  }
}
