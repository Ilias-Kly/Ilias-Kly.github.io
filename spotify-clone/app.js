class SpotifyClone {
    constructor() {
        this.searchAPIs = [
            'https://inv.odyssey346.dev/api/v1/search',
            'https://invidious.snopyta.org/api/v1/search',
            'https://y.com.sb/api/v1/search'
        ];
        
        this.currentAPI = 0;
        this.player = null;
        this.currentTrack = null;
        this.playlist = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.isShuffled = false;
        this.isRepeating = false;
        this.volume = 50;
        this.progressInterval = null;
        this.isMobile = this.checkMobile();
        this.isPlayerExpanded = false;
        
        this.likedSongs = JSON.parse(localStorage.getItem('likedSongs')) || [];
        this.userPlaylists = JSON.parse(localStorage.getItem('userPlaylists')) || [
            { id: 'liked', name: 'Tus me gusta', tracks: this.likedSongs },
            { id: 'recent', name: 'Recientes', tracks: [] }
        ];
        
        this.initializeApp();
    }

    checkMobile() {
        return window.innerWidth <= 768 || 
               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    initializeApp() {
        this.loadYouTubeAPI();
        this.setupEventListeners();
        this.setupMobileFeatures();
        this.loadPlaylists();
        this.setupPWA();
        this.generateRecommendations();
        this.updateMobileUI();
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
        this.player = new YT.Player('player', {
            height: '0',
            width: '0',
            playerVars: {
                'playsinline': 1,
                'controls': 0,
                'modestbranding': 1,
                'rel': 0,
                'enablejsapi': 1
            },
            events: {
                'onReady': this.onPlayerReady.bind(this),
                'onStateChange': this.onPlayerStateChange.bind(this)
            }
        });
    }

    onPlayerReady() {
        console.log('Reproductor de YouTube listo');
        this.setVolume(this.volume);
    }

    onPlayerStateChange(event) {
        switch(event.data) {
            case YT.PlayerState.PLAYING:
                this.isPlaying = true;
                this.updatePlayButton();
                this.startProgressTracking();
                break;
            case YT.PlayerState.PAUSED:
                this.isPlaying = false;
                this.updatePlayButton();
                this.stopProgressTracking();
                break;
            case YT.PlayerState.ENDED:
                this.nextTrack();
                break;
        }
    }

    setupEventListeners() {
        // Navegación
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(item.dataset.section);
            });
        });

        // Búsqueda
        document.getElementById('searchBtn').addEventListener('click', () => this.searchMusic());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchMusic();
        });

        // Controles del reproductor
        document.getElementById('playBtn').addEventListener('click', () => this.togglePlay());
        document.getElementById('prevBtn').addEventListener('click', () => this.previousTrack());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextTrack());
        document.getElementById('shuffleBtn').addEventListener('click', () => this.toggleShuffle());
        document.getElementById('repeatBtn').addEventListener('click', () => this.toggleRepeat());

        // Controles expandidos
        document.getElementById('expandedPlayBtn')?.addEventListener('click', () => this.togglePlay());
        document.getElementById('expandedPrevBtn')?.addEventListener('click', () => this.previousTrack());
        document.getElementById('expandedNextBtn')?.addEventListener('click', () => this.nextTrack());

        // Volumen
        document.getElementById('volumeSlider')?.addEventListener('input', (e) => this.setVolume(e.target.value));
        document.getElementById('volumeBtn')?.addEventListener('click', () => this.toggleMute());

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
            this.setupTouchEvents();
            this.setupPlayerExpansion();
            this.preventZoom();
        }
    }

    setupTouchEvents() {
        let touchStartX = 0;
        let touchEndX = 0;

        document.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        });

        document.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe(touchStartX, touchEndX);
        });
    }

    handleSwipe(startX, endX) {
        if (!this.isPlayerExpanded) return;
        
        const swipeThreshold = 50;
        const diff = startX - endX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                this.nextTrack();
            } else {
                this.previousTrack();
            }
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

    preventZoom() {
        document.addEventListener('touchstart', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                e.preventDefault();
            }
        }, { passive: false });
    }

    updateMobileUI() {
        if (this.isMobile) {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
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

        if (this.isMobile) {
            document.querySelector('.content-area').scrollTop = 0;
        }
    }

    async searchMusic() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) return;

        this.showLoading();

        try {
            const results = await this.trySearch(query);
            this.displaySearchResults(results);
        } catch (error) {
            console.log('Búsqueda fallida, usando fallback');
            this.displayFallbackResults(query);
        } finally {
            this.hideLoading();
        }
    }

    async trySearch(query) {
        const apiUrl = this.searchAPIs[this.currentAPI];
        const searchUrl = `${apiUrl}?q=${encodeURIComponent(query + ' official music video')}&type=video`;
        
        const response = await fetch(searchUrl);
        if (!response.ok) throw new Error('API failed');
        
        const data = await response.json();
        
        const musicVideos = data
            .filter(video => this.isMusicVideo(video))
            .slice(0, 15)
            .map(video => ({
                id: { videoId: video.videoId },
                snippet: {
                    title: video.title,
                    channelTitle: video.author,
                    thumbnails: {
                        medium: { 
                            url: video.videoThumbnails?.find(t => t.quality === 'medium')?.url ||
                                 video.videoThumbnails?.[0]?.url ||
                                 `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`
                        }
                    }
                }
            }));

        return { items: musicVideos };
    }

    isMusicVideo(video) {
        if (!video || !video.title) return false;
        
        const title = video.title.toLowerCase();
        const excludeKeywords = ['podcast', 'live', 'concert', 'interview', 'full album'];
        const hasExcluded = excludeKeywords.some(keyword => title.includes(keyword));
        
        const reasonableLength = video.lengthSeconds && 
                                video.lengthSeconds >= 120 && 
                                video.lengthSeconds <= 600;
        
        return !hasExcluded && reasonableLength;
    }

    displaySearchResults(data) {
        const container = document.getElementById('searchResults');
        
        if (!data.items || data.items.length === 0) {
            this.displayNoResults();
            return;
        }

        container.innerHTML = '';
        
        data.items.forEach((video, index) => {
            const card = this.createMusicCard(video, index);
            container.appendChild(card);
        });
    }

    createMusicCard(video, index) {
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
            <div class="card-actions">
                <button class="action-btn add-to-playlist" title="Agregar a playlist"><i class="bi bi-plus-lg"></i></button>
                <button class="action-btn like-btn-card" title="Me gusta"><i class="bi bi-heart"></i></button>
            </div>
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

        card.querySelector('.add-to-playlist').addEventListener('click', (e) => {
            e.stopPropagation();
            this.addToPlaylist({
                id: video.id.videoId,
                title: this.cleanTitle(video.snippet.title),
                artist: video.snippet.channelTitle,
                cover: video.snippet.thumbnails.medium.url
            });
        });

        card.querySelector('.like-btn-card').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSongLike({
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
        this.currentTrack = track;
        this.updatePlayerUI();
        
        if (this.player) {
            this.player.loadVideoById(track.id);
            this.player.playVideo();
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
            trackImage.style.backgroundPosition = 'center';
        }
        
        if (expandedCover) {
            expandedCover.style.backgroundImage = `url(${this.currentTrack.cover})`;
            expandedCover.style.backgroundSize = 'cover';
            expandedCover.style.backgroundPosition = 'center';
        }
    }

    updatePlayButton() {
        const playBtns = document.querySelectorAll('#playBtn, #expandedPlayBtn');
        playBtns.forEach(btn => {
            const icon = btn.querySelector('.bi');
            if (this.isPlaying) {
                icon.classList.remove('bi-play-fill');
                icon.classList.add('bi-pause-fill');
                btn.classList.add('playing');
            } else {
                icon.classList.remove('bi-pause-fill');
                icon.classList.add('bi-play-fill');
                btn.classList.remove('playing');
            }
        });
    }

    togglePlay() {
        if (!this.currentTrack && this.playlist.length > 0) {
            this.playTrack(this.playlist[0]);
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

    toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        const shuffleBtns = document.querySelectorAll('#shuffleBtn, #expandedShuffleBtn');
        shuffleBtns.forEach(btn => {
            btn.style.color = this.isShuffled ? 'var(--spotify-green)' : '';
        });
    }

    toggleRepeat() {
        this.isRepeating = !this.isRepeating;
        const repeatBtns = document.querySelectorAll('#repeatBtn, #expandedRepeatBtn');
        repeatBtns.forEach(btn => {
            btn.style.color = this.isRepeating ? 'var(--spotify-green)' : '';
        });
    }

    setVolume(volume) {
        this.volume = volume;
        if (this.player) {
            this.player.setVolume(volume);
        }
    }

    toggleMute() {
        if (this.player) {
            const isMuted = this.player.isMuted();
            const volumeBtn = document.getElementById('volumeBtn');
            const icon = volumeBtn.querySelector('.bi');
            
            if (isMuted) {
                this.player.unMute();
                icon.classList.remove('bi-volume-mute');
                icon.classList.add('bi-volume-up');
            } else {
                this.player.mute();
                icon.classList.remove('bi-volume-up');
                icon.classList.add('bi-volume-mute');
            }
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
        
        const likedPlaylist = this.userPlaylists.find(p => p.id === 'liked');
        if (likedPlaylist) {
            likedPlaylist.tracks = this.likedSongs;
            this.savePlaylists();
        }
    }

    startProgressTracking() {
        this.stopProgressTracking();
        this.progressInterval = setInterval(() => {
            if (this.player && this.player.getCurrentTime) {
                const current = this.player.getCurrentTime();
                const duration = this.player.getDuration();
                const progress = (current / duration) * 100;
                
                document.getElementById('progress').style.width = `${progress}%`;
                document.querySelector('.progress-expanded').style.width = `${progress}%`;
                document.querySelector('.time-current').textContent = this.formatTime(current);
                document.querySelector('.time-total').textContent = this.formatTime(duration);
            }
        }, 1000);
    }

    stopProgressTracking() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    addToRecent(track) {
        const recentPlaylist = this.userPlaylists.find(p => p.id === 'recent');
        if (recentPlaylist) {
            recentPlaylist.tracks = recentPlaylist.tracks.filter(t => t.id !== track.id);
            recentPlaylist.tracks.unshift(track);
            recentPlaylist.tracks = recentPlaylist.tracks.slice(0, 50);
            this.savePlaylists();
        }
    }

    addToPlaylist(song) {
        const defaultPlaylist = this.userPlaylists.find(p => p.id === 'liked');
        if (defaultPlaylist && !defaultPlaylist.tracks.find(s => s.id === song.id)) {
            defaultPlaylist.tracks.push(song);
            this.savePlaylists();
            this.showNotification('Canción agregada a favoritos');
        }
    }

    showNotification(message) {
        // Notificación simple
        console.log('Notification:', message);
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
        this.displayPlaylistContent(playlist);
    }

    displayPlaylistContent(playlist) {
        const container = document.getElementById('libraryContent');
        if (!container) return;

        container.innerHTML = `
            <div class="playlist-header">
                <div class="playlist-cover" style="background: linear-gradient(135deg, #450af5, #c4efd9); width: 120px; height: 120px; border-radius: 8px;"></div>
                <div class="playlist-info">
                    <h2>${playlist.name}</h2>
                    <p>${playlist.tracks.length} canciones</p>
                </div>
            </div>
            <div class="tracks-list" style="margin-top: 20px;">
                ${playlist.tracks.map((track, index) => `
                    <div class="track-row" data-index="${index}" style="display: flex; align-items: center; padding: 8px; border-radius: 4px; cursor: pointer; margin-bottom: 8px;">
                        <div class="track-number" style="width: 30px; color: var(--spotify-gray);">${index + 1}</div>
                        <div class="track-info" style="flex: 1;">
                            <div class="track-name" style="font-weight: 500;">${track.title}</div>
                            <div class="track-artist" style="color: var(--spotify-gray); font-size: 12px;">${track.artist}</div>
                        </div>
                        <button class="track-like" style="background: none; border: none; color: var(--spotify-gray); cursor: pointer;"><i class="bi bi-heart"></i></button>
                    </div>
                `).join('')}
            </div>
        `;

        container.querySelectorAll('.track-row').forEach(row => {
            row.addEventListener('click', () => {
                const index = parseInt(row.dataset.index);
                this.currentIndex = index;
                this.playTrack(playlist.tracks[index]);
            });
        });
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
                <p>Buscando "${document.getElementById('searchInput').value}"...</p>
            </div>
        `;
    }

    hideLoading() {
        // Se maneja automáticamente
    }

    displayNoResults() {
        const container = document.getElementById('searchResults');
        if (!container) return;

        const query = document.getElementById('searchInput').value;
        container.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon"><i class="bi bi-search"></i></div>
                <h3>No se encontraron resultados</h3>
                <p>No hay resultados para "${query}"</p>
                <button class="retry-btn" onclick="spotifyApp.displayFallbackResults('${query}')">
                    Mostrar música popular
                </button>
            </div>
        `;
    }

    displayFallbackResults(query) {
        const popularSongs = this.getPopularSongs();
        const filteredSongs = this.filterSongsByQuery(popularSongs, query);
        this.displaySearchResults({ items: filteredSongs });
    }

    getPopularSongs() {
        return [
            {
                id: { videoId: 'kJQP7kiw5Fk' },
                snippet: {
                    title: 'Despacito - Luis Fonsi ft. Daddy Yankee',
                    channelTitle: 'LuisFonsiVEVO',
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
                    channelTitle: 'TheWeekndVEVO',
                    thumbnails: {
                        medium: { url: 'https://img.youtube.com/vi/60ItHLz5WEA/mqdefault.jpg' }
                    }
                }
            }
        ];
    }

    filterSongsByQuery(songs, query) {
        if (!query) return songs.slice(0, 6);
        
        const queryLower = query.toLowerCase();
        const filtered = songs.filter(song => 
            song.snippet.title.toLowerCase().includes(queryLower) ||
            song.snippet.channelTitle.toLowerCase().includes(queryLower)
        );
        
        return filtered.length > 0 ? filtered.slice(0, 6) : songs.slice(0, 6);
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

    quickPlay(playlistId) {
        const playlist = this.userPlaylists.find(p => p.id === playlistId);
        if (playlist) {
            this.loadPlaylist(playlist);
            if (playlist.tracks.length > 0) {
                this.playTrack(playlist.tracks[0]);
            }
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
                .then(() => console.log('Service Worker registrado'))
                .catch(err => console.log('Error SW:', err));
        }
        
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
        });
    }
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    window.spotifyApp = new SpotifyClone();
});

// Manejar la API de YouTube
window.onYouTubeIframeAPIReady = () => {
    if (window.spotifyApp) {
        window.spotifyApp.createPlayer();
    }
};

// Ajustes responsive
window.addEventListener('resize', () => {
    if (window.spotifyApp) {
        window.spotifyApp.updateMobileUI();
    }
});

window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        if (window.spotifyApp) {
            window.spotifyApp.updateMobileUI();
        }
    }, 100);
});
