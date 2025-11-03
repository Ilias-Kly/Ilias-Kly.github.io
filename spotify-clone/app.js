class SpotifyClone {
    constructor() {
        this.player = null;
        this.currentTrack = null;
        this.isPlaying = false;
        this.isMobile = window.innerWidth <= 768;
        
        this.initializeApp();
    }

    initializeApp() {
        this.setupEventListeners();
        this.generateRecommendations();
        this.loadYouTubeAPI();
        console.log('✅ App iniciada');
    }

    loadYouTubeAPI() {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(tag);
        }
        
        window.onYouTubeIframeAPIReady = () => {
            console.log('🎵 YouTube API lista');
            this.createPlayer();
        };
    }

    createPlayer() {
        // Crear elemento para el reproductor
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
                    console.log('✅ Reproductor listo');
                },
                'onStateChange': (event) => {
                    console.log('Estado:', event.data);
                    if (event.data === YT.PlayerState.PLAYING) {
                        this.isPlaying = true;
                        this.updatePlayButton();
                    } else if (event.data === YT.PlayerState.PAUSED) {
                        this.isPlaying = false;
                        this.updatePlayButton();
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

        // Controles
        document.getElementById('playBtn').addEventListener('click', () => this.togglePlay());
        document.getElementById('prevBtn').addEventListener('click', () => this.previousTrack());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextTrack());

        // Player expandido
        const expandBtn = document.querySelector('.expand-player-btn');
        const closeBtn = document.querySelector('.close-expanded');
        if (expandBtn) expandBtn.addEventListener('click', () => this.togglePlayerExpanded());
        if (closeBtn) closeBtn.addEventListener('click', () => this.togglePlayerExpanded());

        // Categorías
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', () => this.searchByGenre(card.dataset.genre));
        });
    }

    showSection(sectionId) {
        document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');
        
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelectorAll(`[data-section="${sectionId}"]`).forEach(item => {
            item.classList.add('active');
        });
    }

    async searchMusic() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) {
            alert('Escribe algo para buscar');
            return;
        }

        console.log('Buscando:', query);
        this.showLoading();

        try {
            // Usar API directa
            const response = await fetch(`https://inv.odyssey346.dev/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
            const data = await response.json();
            
            const musicVideos = data.slice(0, 12).map(video => ({
                id: { videoId: video.videoId },
                snippet: {
                    title: video.title,
                    channelTitle: video.author,
                    thumbnails: {
                        medium: { url: video.videoThumbnails?.[3]?.url || video.videoThumbnails?.[0]?.url }
                    }
                }
            }));

            this.displaySearchResults({ items: musicVideos });
        } catch (error) {
            console.log('Error en búsqueda:', error);
            this.displayFallbackResults();
        }
    }

    displaySearchResults(data) {
        const container = document.getElementById('searchResults');
        if (!container) return;

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
                <img src="${video.snippet.thumbnails.medium.url}" alt="${video.snippet.title}">
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
            .replace(/\[.*\]/g, '')
            .replace(/\(.*\)/g, '')
            .trim();
    }

    playTrack(track) {
        console.log('🎵 Reproduciendo:', track);
        this.currentTrack = track;
        this.updatePlayerUI();
        
        if (this.player && this.player.loadVideoById) {
            this.player.loadVideoById(track.id);
            this.player.playVideo();
        } else {
            console.log('⚠️ Abriendo en YouTube');
            window.open(`https://www.youtube.com/watch?v=${track.id}`, '_blank');
        }
    }

    updatePlayerUI() {
        if (!this.currentTrack) return;

        document.querySelector('.track-name').textContent = this.currentTrack.title;
        document.querySelector('.track-artist').textContent = this.currentTrack.artist;
        document.querySelector('.expanded-track-name').textContent = this.currentTrack.title;
        document.querySelector('.expanded-track-artist').textContent = this.currentTrack.artist;

        const trackImage = document.querySelector('.track-image');
        const expandedCover = document.querySelector('.expanded-cover');
        
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
        
        [playBtn, expandedPlayBtn].forEach(btn => {
            if (!btn) return;
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
        console.log('Siguiente canción');
    }

    previousTrack() {
        console.log('Canción anterior');
    }

    togglePlayerExpanded() {
        const expandedPlayer = document.querySelector('.player-expanded');
        expandedPlayer.classList.toggle('active');
        document.body.style.overflow = expandedPlayer.classList.contains('active') ? 'hidden' : '';
    }

    showLoading() {
        const container = document.getElementById('searchResults');
        if (!container) return;

        container.innerHTML = `
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
                <p>Intenta con otros términos</p>
            </div>
        `;
    }

    displayFallbackResults() {
        const popularSongs = [
            {
                id: { videoId: 'kJQP7kiw5Fk' },
                snippet: {
                    title: 'Despacito - Luis Fonsi',
                    channelTitle: 'Luis Fonsi',
                    thumbnails: { medium: { url: 'https://img.youtube.com/vi/kJQP7kiw5Fk/mqdefault.jpg' } }
                }
            },
            {
                id: { videoId: 'JGwWNGJdvx8' },
                snippet: {
                    title: 'Shape of You - Ed Sheeran', 
                    channelTitle: 'Ed Sheeran',
                    thumbnails: { medium: { url: 'https://img.youtube.com/vi/JGwWNGJdvx8/mqdefault.jpg' } }
                }
            }
        ];
        
        this.displaySearchResults({ items: popularSongs });
    }

    searchByGenre(genre) {
        const queries = {
            pop: 'pop music 2024',
            rock: 'rock music',
            hiphop: 'hip hop music', 
            electronic: 'electronic music'
        };
        
        document.getElementById('searchInput').value = queries[genre];
        this.searchMusic();
    }

    generateRecommendations() {
        const recommendations = [
            {
                id: { videoId: 'kJQP7kiw5Fk' },
                snippet: {
                    title: 'Despacito - Luis Fonsi',
                    channelTitle: 'Luis Fonsi',
                    thumbnails: { medium: { url: 'https://img.youtube.com/vi/kJQP7kiw5Fk/mqdefault.jpg' } }
                }
            },
            {
                id: { videoId: 'JGwWNGJdvx8' },
                snippet: {
                    title: 'Shape of You - Ed Sheeran',
                    channelTitle: 'Ed Sheeran', 
                    thumbnails: { medium: { url: 'https://img.youtube.com/vi/JGwWNGJdvx8/mqdefault.jpg' } }
                }
            }
        ];

        const container = document.getElementById('recommended');
        if (!container) return;

        recommendations.forEach(video => {
            const card = this.createMusicCard(video);
            container.appendChild(card);
        });
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    window.spotifyApp = new SpotifyClone();
});

// YouTube API
window.onYouTubeIframeAPIReady = () => {
    console.log('YouTube API Ready');
    if (window.spotifyApp && window.spotifyApp.createPlayer) {
        window.spotifyApp.createPlayer();
    }
};