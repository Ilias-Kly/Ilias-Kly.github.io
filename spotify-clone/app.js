// app.js - REPRODUCCIÓN SIN ANUNCIOS
class MusicApp {
    constructor() {
        this.currentTrack = null;
        this.playlist = JSON.parse(localStorage.getItem('miPlaylist')) || [];
        this.searchAPIs = [
            'https://vid.puffyan.us',
            'https://inv.tux.pizza',
            'https://invidious.snopyta.org'
        ];
        this.audioPlayer = new Audio();
        this.isPlaying = false;
        
        this.init();
    }

    init() {
        console.log("🎵 Iniciando Mi Música App SIN ANUNCIOS...");
        this.setupEventListeners();
        this.loadPlaylist();
        this.setupServiceWorker();
    }

    setupEventListeners() {
        // Búsqueda
        const searchBtn = document.querySelector('.search-btn');
        const searchInput = document.querySelector('.search-input');
        
        searchBtn.addEventListener('click', () => this.searchMusic());
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchMusic();
        });

        // Controles del reproductor
        this.audioPlayer.addEventListener('ended', () => {
            this.isPlaying = false;
            this.updatePlayButton();
        });

        console.log("✅ Event listeners configurados");
    }

    async searchMusic() {
        const query = document.querySelector('.search-input').value.trim();
        if (!query) {
            this.showMessage('Escribe algo para buscar 🎵');
            return;
        }

        this.showLoading();
        console.log(`🔍 Buscando: ${query}`);

        try {
            for (const apiBase of this.searchAPIs) {
                try {
                    const results = await this.searchWithAPI(apiBase, query);
                    this.displaySearchResults(results);
                    console.log(`✅ Búsqueda exitosa con: ${apiBase}`);
                    return;
                } catch (error) {
                    console.log(`❌ Falló API: ${apiBase}`, error);
                    continue;
                }
            }
            throw new Error('Todas las APIs fallaron');
        } catch (error) {
            console.error('Error en búsqueda:', error);
            this.showFallbackResults();
        }
    }

    async searchWithAPI(apiBase, query) {
        const searchUrl = `${apiBase}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
        
        const response = await fetch(searchUrl);
        if (!response.ok) throw new Error('API no respondió');
        
        const data = await response.json();
        
        return data
            .filter(item => 
                item.type === 'video' && 
                !item.title.toLowerCase().includes('podcast') &&
                !item.title.toLowerCase().includes('live') &&
                item.lengthSeconds > 120
            )
            .slice(0, 12)
            .map(item => ({
                id: item.videoId,
                title: item.title,
                artist: item.author,
                duration: this.formatDuration(item.lengthSeconds),
                thumbnail: item.videoThumbnails?.[3]?.url || item.videoThumbnails?.[0]?.url
            }));
    }

    displaySearchResults(results) {
        const container = document.getElementById('search-results');
        
        if (!results || results.length === 0) {
            container.innerHTML = '<div class="no-results">🎵 No se encontraron resultados</div>';
            return;
        }

        container.innerHTML = results.map(song => `
            <div class="music-card">
                <div class="card-cover" style="background-image: url('${song.thumbnail}')"></div>
                <div class="card-title">${this.cleanTitle(song.title)}</div>
                <div class="card-artist">${song.artist}</div>
                <div class="card-duration">${song.duration}</div>
                <button class="play-btn" onclick="app.playSong('${song.id}', '${song.title}', '${song.artist}')">
                    ▶️
                </button>
                <button class="add-btn" onclick="app.addToPlaylist(${JSON.stringify(song).replace(/"/g, '&quot;')})">
                    ➕
                </button>
            </div>
        `).join('');
    }

    async playSong(videoId, title, artist) {
        console.log(`🎵 Reproduciendo: ${title}`);
        
        this.currentTrack = { id: videoId, title, artist };
        this.updatePlayer();
        
        try {
            // Usar servicio de audio directo (sin anuncios)
            const audioUrl = await this.getAudioUrl(videoId);
            
            this.audioPlayer.src = audioUrl;
            this.audioPlayer.play();
            this.isPlaying = true;
            this.updatePlayButton();
            
            this.showMessage(`🎵 Reproduciendo: ${this.cleanTitle(title)}`);
            
        } catch (error) {
            console.error('Error al reproducir:', error);
            this.showMessage('❌ Error al reproducir. Probando alternativa...');
            // Fallback: reproducir usando yt-audio.com
            this.audioPlayer.src = `https://yt-audio.com/stream/${videoId}`;
            this.audioPlayer.play();
        }
    }

    async getAudioUrl(videoId) {
        // Intentar diferentes servicios de audio
        const audioServices = [
            `https://corsproxy.io/?https://yt-audio.com/stream/${videoId}`,
            `https://corsproxy.io/?https://yt-downloader.com/audio/${videoId}`,
            `https://api.rss2json.com/v1/api.json?rss_url=https://www.youtube.com/feeds/videos.xml?channel_id=${videoId}`
        ];

        for (const service of audioServices) {
            try {
                const response = await fetch(service);
                if (response.ok) {
                    return service;
                }
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('No se pudo obtener audio');
    }

    togglePlay() {
        if (!this.currentTrack) {
            this.showMessage('🎵 Selecciona una canción primero');
            return;
        }

        if (this.isPlaying) {
            this.audioPlayer.pause();
            this.isPlaying = false;
        } else {
            this.audioPlayer.play();
            this.isPlaying = true;
        }
        this.updatePlayButton();
    }

    updatePlayButton() {
        // Aquí puedes actualizar el botón de play/pause en la UI
        const playButton = document.querySelector('.player-controls button');
        if (playButton) {
            playButton.innerHTML = this.isPlaying ? '⏸️' : '▶️';
        }
    }

    stopPlayback() {
        this.audioPlayer.pause();
        this.audioPlayer.currentTime = 0;
        this.isPlaying = false;
        this.updatePlayButton();
    }

    addToPlaylist(song) {
        if (!this.playlist.find(s => s.id === song.id)) {
            this.playlist.push(song);
            this.savePlaylist();
            this.showMessage(`✅ "${this.cleanTitle(song.title)}" añadida a playlist`);
        } else {
            this.showMessage('⚠️ Ya está en la playlist');
        }
    }

    loadPlaylist() {
        const container = document.getElementById('playlist-songs');
        
        if (this.playlist.length === 0) {
            container.innerHTML = '<div class="no-results">📋 Tu playlist está vacía</div>';
            return;
        }

        container.innerHTML = this.playlist.map(song => `
            <div class="music-card">
                <div class="card-cover" style="background-image: url('${song.thumbnail}')"></div>
                <div class="card-title">${this.cleanTitle(song.title)}</div>
                <div class="card-artist">${song.artist}</div>
                <div class="card-duration">${song.duration}</div>
                <button class="play-btn" onclick="app.playSong('${song.id}', '${song.title}', '${song.artist}')">
                    ▶️
                </button>
                <button class="remove-btn" onclick="app.removeFromPlaylist('${song.id}')">
                    ❌
                </button>
            </div>
        `).join('');
    }

    removeFromPlaylist(songId) {
        this.playlist = this.playlist.filter(song => song.id !== songId);
        this.savePlaylist();
        this.loadPlaylist();
        this.showMessage('🗑️ Canción eliminada');
    }

    savePlaylist() {
        localStorage.setItem('miPlaylist', JSON.stringify(this.playlist));
    }

    updatePlayer() {
        if (this.currentTrack) {
            document.querySelector('.player-title').textContent = this.currentTrack.title;
            document.querySelector('.player-artist').textContent = this.currentTrack.artist;
        }
    }

    // Utilidades
    cleanTitle(title) {
        return title
            .replace(/\(official music video\)/gi, '')
            .replace(/\(official audio\)/gi, '')
            .replace(/\(lyrics\)/gi, '')
            .replace(/\[.*\]/g, '')
            .replace(/\(.*\)/g, '')
            .replace(/\\u0026/g, '&')
            .trim();
    }

    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    showLoading() {
        document.getElementById('search-results').innerHTML = `
            <div class="loading">
                <div class="spinner">🎵</div>
                <p>Buscando música...</p>
            </div>
        `;
    }

    showFallbackResults() {
        const fallbackSongs = [
            {
                id: 'kJQP7kiw5Fk',
                title: 'Despacito - Luis Fonsi ft. Daddy Yankee',
                artist: 'Luis Fonsi',
                duration: '4:41',
                thumbnail: 'https://img.youtube.com/vi/kJQP7kiw5Fk/mqdefault.jpg'
            },
            {
                id: 'JGwWNGJdvx8',
                title: 'Shape of You - Ed Sheeran',
                artist: 'Ed Sheeran',
                duration: '4:23',
                thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/mqdefault.jpg'
            }
        ];
        
        this.displaySearchResults(fallbackSongs);
        this.showMessage('⚠️ Usando música de respaldo');
    }

    showMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: #1DB954;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            z-index: 1000;
            font-size: 14px;
        `;
        messageEl.textContent = message;
        document.body.appendChild(messageEl);
        
        setTimeout(() => messageEl.remove(), 3000);
    }

    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('./sw.js');
                console.log('✅ Service Worker registrado');
            } catch (error) {
                console.log('❌ Service Worker falló:', error);
            }
        }
    }
}

// Inicializar la app
const app = new MusicApp();