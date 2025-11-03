class SpotifyClone {
    constructor() {
        this.searchAPIs = [
            'https://inv.odyssey346.dev/api/v1/search',
            'https://invidious.snopyta.org/api/v1/search'
        ];
        
        this.currentAPI = 0;
        this.player = null;
        this.currentTrack = null;
        this.playlist = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.isMobile = this.checkMobile();
        
        this.likedSongs = JSON.parse(localStorage.getItem('likedSongs')) || [];
        this.userPlaylists = JSON.parse(localStorage.getItem('userPlaylists')) || [
            { id: 'liked', name: 'Tus me gusta', tracks: this.likedSongs },
            { id: 'recent', name: 'Recientes', tracks: [] }
        ];
        
        this.initializeApp();
    }

    checkMobile() {
        return window.innerWidth <= 768;
    }

    initializeApp() {
        this.setupEventListeners();
        this.setupMobileFeatures();
        this.loadPlaylists();
        this.setupPWA();
        this.generateRecommendations();
        this.loadYouTubeAPI();
    }

    loadYouTubeAPI() {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
        
        window.onYouTubeIframeAPIReady = () => this.createPlayer();
    }

    createPlayer() {
        // Crear un div oculto para el reproductor
        const playerDiv = document.createElement('div');
        playerDiv.id = 'youtube-player';
        playerDiv.style.display = 'none';
        document.body.appendChild(playerDiv);

        this.player = new YT.Player('youtube-player', {
            height: '0',
            width: '0',
            playerVars: {
                'playsinline': 1,
                'controls': 0,
                'modestbranding': 1,
                'rel': 0
            },
            events: {
                'onReady': () => {
                    console.log('✅ YouTube Player listo');
                    this.player.setVolume(50);
                },
                'onStateChange': (event) => {
                    if (event.data === YT.PlayerState.PLAYING) {
                        this.isPlaying = true;
                        this.updatePlayButton();
                    } else if (event.data === YT.PlayerState.PAUSED) {
                        this.isPlaying = false;
                        this.updatePlayButton();
                    } else if (event.data === YT.PlayerState.ENDED) {
                        this.nextTrack();
                    }
                }
            }
        });
    }

    setupEventListeners() {
        // Navegación
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(item.dataset.section);
            });
        });

        // Búsqueda - ARREGLADO
        document.getElementById('searchBtn').addEventListener('click', () => this.searchMusic());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchMusic();
        });

        // Controles del reproductor
        document.getElementById('playBtn').addEventListener('click', () => this.togglePlay());
        document.getElementById('prevBtn').addEventListener('click', () => this.previousTrack());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextTrack());

        // Like
        document.querySelector('.like-btn').addEventListener('click', () => this.toggleLike());

        // Categorías de búsqueda
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', () => this.searchByGenre(card.dataset.genre));
        });

        // Play rápido
        document.querySelectorAll('.quick-play-card').forEach(card => {
            card.addEventListener('click', () => this.quickPlay(card.dataset.playlist));
        });
    }

    setupMobileFeatures() {
        if (this.isMobile) {
            this.setupPlayerExpansion();
        }
    }

    setupPlayerExpansion() {
        const expandBtn = document.querySelector('.expand-player-btn');
        const closeBtn = document.querySelector('.close-expanded');

        if (expandBtn && closeBtn) {
            expandBtn.addEventListener('click', () => this.togglePlayerExpanded());
            closeBtn.addEventListener('click', () => this.togglePlayerExpanded());
        }
    }

    togglePlayerExpanded() {
        const expandedPlayer = document.querySelector('.player-expanded');
        this.isPlayerExpanded = !this.isPlayerExpanded;
        
        if (this.isPlayerExpanded) {
            expandedPlayer.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            expandedPlayer.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    showSection(sectionId) {
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        document.querySelectorAll(`[data-section="${sectionId}"]`).forEach(item => {
            item.classList.add('active');
        });

        document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');
    }

    async searchMusic() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) {
            alert('Escribe algo para buscar');
            return;
        }

        this.showLoading();

        try {
            const results = await this.trySearch(query);
            this.displaySearchResults(results);
        } catch (error) {
            console.log('Búsqueda fallida, usando música popular');
            this.displayFallbackResults();
        }
    }

    async trySearch(query) {
        const apiUrl = this.searchAPIs[this.currentAPI];
        const searchUrl = `${apiUrl}?q=${encodeURIComponent(query)}&type=video`;
        
        console.log('Buscando:', searchUrl);
        
        const response = await fetch(searchUrl);
        if (!response.ok) throw new Error('API failed');
        
        const data = await response.json();
        
        const musicVideos = data
            .filter(video => this.isMusicVideo(video))
            .slice(0, 12)
            .map(video => ({
                id: { videoId: video.videoId },
                snippet: {
                    title: video.title,
                    channelTitle: video.author,
                    thumbnails: {
                        medium: { 
                            url: video.videoThumbnails?.[3]?.url || video.videoThumbnails?.[0]?.url
                        }
                    }
                }
            }));

        return { items: musicVideos };
    }

    isMusicVideo(video) {
        if (!video || !video.title) return false;
        
        const title = video.title.toLowerCase();
        const excludeKeywords = ['podcast', 'live', 'concert', 'interview'];
        const hasExcluded = excludeKeywords.some(keyword => title.includes(keyword));
        
        return !hasExcluded;
    }

    displaySearchResults(data) {
        const container = document.getElementById('searchResults');
        
        if (!data.items || data.items.length === 0) {
            this.displayNoResults();
            return;
        }

        container.innerHTML = '';
        
        data.items.forEach((video) => {
            const card = this.createMusicCard(video);
            container.appendChild(card);
        });
    }

    createMusicCard(video) {
        const card = document.createElement('div');
        card.className = 'music-card';
        card.innerHTML = `
            <div class="card-cover">
                <img src="${video.snippet.thumbnails.medium.url}" 
                     alt="${video.snippet.title}"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMyMCIgaGVpZ2h0PSIxODAiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSIxNjAiIHk9IjkwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0Ij7wn5GtPC90ZXh0Pjwvc3ZnPg=='">
                <button class="play-button"><i class="bi bi-play-fill"></i></button>
            </div>
            <div class="card-title">${this.cleanTitle(video.snippet.title)}</div>
            <div class="card-description">${video.snippet.channelTitle}</div>
        `;

        card.querySelector('.play-button').addEventListener('click', (e) => {
            e.stopPropagation();
            this.playTrack({
                id: video.id.videoId,
                title: this.cleanTitle(video.snippet.title),
                artist: video.snippet.channelTitle,
                cover: video.snippet.thumbnails.medium.url
            });
        });

        card.addEventListener('click', () => {
            this.playTrack({
                id: video.id.videoId,
                title: this.cleanTitle(video.snippet.title),
                artist: video.snippet.channelTitle,
                cover: video.snippet.thumbnails.medium.url
            });
        });

        return card;
    }

    cleanTitle(title) {
        return title
            .replace(/\(official music video\)/gi, '')
            .replace(/\(official audio\)/gi, '')
            .replace(/\(lyrics\)/gi, '')
            .replace(/\[official video\]/gi, '')
            .replace(/\|.*$/, '')
            .replace(/\([^)]*\)/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    playTrack(track) {
        console.log('🎵 Reproduciendo:', track.title);
        
        this.currentTrack = track;
        this.updatePlayerUI();
        
        if (this.player && this.player.loadVideoById) {
            this.player.loadVideoById(track.id);
            this.player.playVideo();
            this.isPlaying = true;
            this.updatePlayButton();
        } else {
            console.log('⚠️ Reproductor no está listo');
            // Fallback: abrir en YouTube
            window.open(`https://www.youtube.com/watch?v=${track.id}`, '_blank');
        }

        this.addToRecent(track);
    }

    updatePlayerUI() {
        if (!this.currentTrack) return;

        const trackImage = document.querySelector('.track-image');
        const expandedCover = document.querySelector('.expanded-cover');
        
        document.querySelector('.track-name').textContent = this.currentTrack.title;
        document.querySelector('.track-artist').textContent = this.currentTrack.artist;
        document.querySelector('.expanded-track-name').textContent = this.currentTrack.title;
        document.querySelector('.expanded-track-artist').textContent = this.currentTrack.artist;

        if (trackImage) {
            trackImage.style.backgroundImage = `url(${this.currentTrack.cover})`;
            trackImage.style.backgroundSize = 'cover';
        }
        
        if (expandedCover) {
            expandedCover.style.backgroundImage = `url(${this.currentTrack.cover})`;
            expandedCover.style.backgroundSize = 'cover';
        }
    }

    updatePlayButton() {
        const playBtn = document.getElementById('playBtn');
        const expandedPlayBtn = document.getElementById('expandedPlayBtn');
        
        const playBtns = [playBtn, expandedPlayBtn].filter(btn => btn);
        
        playBtns.forEach(btn => {
            const icon = btn.querySelector('.bi');
            if (this.isPlaying) {
                icon.classList.remove('bi-play-fill');
                icon.classList.add('bi-pause-fill');
            } else {
                icon.classList.remove('bi-pause-fill');
                icon.classList.add('bi-play-fill');
            }
        });
    }

    togglePlay() {
        if (!this.currentTrack) {
            alert('Selecciona una canción primero');
            return;
        }

        if (this.player) {
            if (this.isPlaying) {
                this.player.pauseVideo();
            } else {
                this.player.playVideo();
            }
        }
    }

    nextTrack() {
        if (this.playlist.length > 0) {
            this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
            this.playTrack(this.playlist[this.currentIndex]);
        }
    }

    previousTrack() {
        if (this.playlist.length > 0) {
            this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
            this.playTrack(this.playlist[this.currentIndex]);
        }
    }

    toggleLike() {
        const likeBtn = document.querySelector('.like-btn');
        likeBtn.classList.toggle('liked');
        
        if (this.currentTrack) {
            this.toggleSongLike(this.currentTrack);
        }
    }

    toggleSongLike(song) {
        const existingIndex = this.likedSongs.findIndex(s => s.id === song.id);
        
        if (existingIndex >= 0) {
            this.likedSongs.splice(existingIndex, 1);
        } else {
            this.likedSongs.push(song);
        }
        
        localStorage.setItem('likedSongs', JSON.stringify(this.likedSongs));
    }

    addToRecent(track) {
        const recentPlaylist = this.userPlaylists.find(p => p.id === 'recent');
        if (recentPlaylist) {
            recentPlaylist.tracks = recentPlaylist.tracks.filter(t => t.id !== track.id);
            recentPlaylist.tracks.unshift(track);
            recentPlaylist.tracks = recentPlaylist.tracks.slice(0, 20);
            this.savePlaylists();
        }
    }

    loadPlaylists() {
        const container = document.getElementById('savedPlaylists');
        if (!container) return;

        container.innerHTML = '';

        this.userPlaylists.forEach(playlist => {
            const div = document.createElement('div');
            div.className = 'nav-item';
            div.innerHTML = `
                <span class="nav-icon"><i class="bi bi-music-note-list"></i></span>
                <span>${playlist.name}</span>
            `;
            div.addEventListener('click', () => this.loadPlaylist(playlist));
            container.appendChild(div);
        });
    }

    loadPlaylist(playlist) {
        this.playlist = playlist.tracks;
        this.currentIndex = 0;
        this.showSection('library');
    }

    savePlaylists() {
        localStorage.setItem('userPlaylists', JSON.stringify(this.userPlaylists));
    }

    showLoading() {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Buscando música...</p>
            </div>
        `;
    }

    displayNoResults() {
        const container = document.getElementById('searchResults');
        if (!container) return;

        container.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon"><i class="bi bi-search"></i></div>
                <h3>No se encontraron resultados</h3>
                <p>Intenta con otros términos de búsqueda</p>
            </div>
        `;
    }

    displayFallbackResults() {
        const popularSongs = this.getPopularSongs();
        this.displaySearchResults({ items: popularSongs });
    }

    getPopularSongs() {
        return [
            {
                id: { videoId: 'kJQP7kiw5Fk' },
                snippet: {
                    title: 'Despacito - Luis Fonsi',
                    channelTitle: 'Luis Fonsi',
                    thumbnails: {
                        medium: { url: 'https://img.youtube.com/vi/kJQP7kiw5Fk/mqdefault.jpg' }
                    }
                }
            },
            {
                id: { videoId: 'JGwWNGJdvx8' },
                snippet: {
                    title: 'Shape of You - Ed Sheeran',
                    channelTitle: 'Ed Sheeran',
                    thumbnails: {
                        medium: { url: 'https://img.youtube.com/vi/JGwWNGJdvx8/mqdefault.jpg' }
                    }
                }
            },
            {
                id: { videoId: '60ItHLz5WEA' },
                snippet: {
                    title: 'Blinding Lights - The Weeknd',
                    channelTitle: 'The Weeknd',
                    thumbnails: {
                        medium: { url: 'https://img.youtube.com/vi/60ItHLz5WEA/mqdefault.jpg' }
                    }
                }
            }
        ];
    }

    searchByGenre(genre) {
        const queries = {
            pop: 'pop music',
            rock: 'rock music',
            hiphop: 'hip hop',
            electronic: 'electronic music'
        };
        
        document.getElementById('searchInput').value = queries[genre];
        this.searchMusic();
    }

    quickPlay(playlistId) {
        const playlist = this.userPlaylists.find(p => p.id === playlistId);
        if (playlist && playlist.tracks.length > 0) {
            this.playlist = playlist.tracks;
            this.currentIndex = 0;
            this.playTrack(playlist.tracks[0]);
        } else {
            alert('No hay canciones en esta playlist');
        }
    }

    generateRecommendations() {
        const recommendations = this.getPopularSongs();
        const container = document.getElementById('recommended');
        if (!container) return;

        recommendations.forEach(video => {
            const card = this.createMusicCard(video);
            container.appendChild(card);
        });
    }

    setupPWA() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(() => console.log('✅ Service Worker registrado'))
                .catch(err => console.log('❌ Error SW:', err));
        }
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    window.spotifyApp = new SpotifyClone();
    console.log('🎵 Spotify Clone iniciado');
});

// YouTube API
window.onYouTubeIframeAPIReady = () => {
    if (window.spotifyApp) {
        window.spotifyApp.createPlayer();
    }
};