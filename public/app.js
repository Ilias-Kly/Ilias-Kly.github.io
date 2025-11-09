class MusicApp {
    constructor() {
        this.audio = document.getElementById('audio-element');
        this.currentTrack = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.volume = 0.8;
        this.queue = [];
        this.currentIndex = 0;
        this.repeatMode = 'off'; // 'off', 'one', 'all'
        this.shuffle = false;
        
        // Estado de la aplicación
        this.favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        this.history = JSON.parse(localStorage.getItem('history')) || [];
        this.playlists = JSON.parse(localStorage.getItem('playlists')) || [];
        this.recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];
        
        this.initializeApp();
    }

    initializeApp() {
        this.initializeEventListeners();
        this.initializePlayer();
        this.loadUserData();
        this.showToast('MusicApp cargado correctamente', 'success');
    }

    initializeEventListeners() {
        // Navegación
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(item.dataset.section);
            });
        });

        // Búsqueda
        document.getElementById('search-btn').addEventListener('click', () => this.search());
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.search();
        });

        // Filtros de búsqueda
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // Re-filtrar resultados si existen
                this.filterResults(btn.dataset.filter);
            });
        });

        // Controles del reproductor
        document.getElementById('play-btn').addEventListener('click', () => this.togglePlay());
        document.getElementById('prev-btn').addEventListener('click', () => this.previous());
        document.getElementById('next-btn').addEventListener('click', () => this.next());
        document.getElementById('shuffle-btn').addEventListener('click', () => this.toggleShuffle());
        document.getElementById('repeat-btn').addEventListener('click', () => this.toggleRepeat());
        document.getElementById('like-btn').addEventListener('click', () => this.toggleLike());
        document.getElementById('volume-btn').addEventListener('click', () => this.toggleMute());

        // Barra de progreso
        document.getElementById('progress-bar').addEventListener('input', (e) => {
            this.seek(e.target.value);
        });

        // Control de volumen
        document.getElementById('volume-control').addEventListener('input', (e) => {
            this.setVolume(e.target.value / 100);
        });

        // Eventos del audio
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.onAudioLoaded());
        this.audio.addEventListener('ended', () => this.onAudioEnded());
        this.audio.addEventListener('error', (e) => this.onAudioError(e));

        // Playlists
        document.getElementById('create-playlist-btn').addEventListener('click', () => this.showCreatePlaylistModal());
        document.getElementById('create-new-playlist').addEventListener('click', () => this.showCreatePlaylistModal());
        document.getElementById('confirm-create').addEventListener('click', () => this.createPlaylist());
        document.getElementById('cancel-create').addEventListener('click', () => this.hideCreatePlaylistModal());
        document.getElementById('close-modal').addEventListener('click', () => this.hideCreatePlaylistModal());

        // Tabs de biblioteca
        document.getElementById('show-favorites').addEventListener('click', () => this.showLibraryTab('favorites'));
        document.getElementById('show-history').addEventListener('click', () => this.showLibraryTab('history'));

        // Playlists destacadas
        document.querySelectorAll('.playlist-card').forEach(card => {
            card.addEventListener('click', () => {
                this.searchGenre(card.dataset.genre);
            });
        });

        // Cerrar modal al hacer clic fuera
        document.getElementById('playlist-modal').addEventListener('click', (e) => {
            if (e.target.id === 'playlist-modal') {
                this.hideCreatePlaylistModal();
            }
        });
    }

    initializePlayer() {
        this.audio.volume = this.volume;
        this.updateVolumeIcon();
    }

    // Navegación entre secciones
    showSection(section) {
        // Actualizar navegación
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Mostrar sección
        document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(`${section}-section`).classList.add('active');

        // Cargar datos específicos de la sección
        switch(section) {
            case 'library':
                this.loadLibraryData();
                break;
            case 'playlists':
                this.loadPlaylists();
                break;
            case 'home':
                this.loadHomeData();
                break;
        }
    }

    // Búsqueda
    async search() {
        const query = document.getElementById('search-input').value.trim();
        if (!query) return;

        this.showLoading(true);
        this.addToRecentSearches(query);

        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=20`);
            const data = await response.json();

            if (data.success) {
                this.displaySearchResults(data.results);
            } else {
                throw new Error(data.error || 'Error en la búsqueda');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showToast('Error en la búsqueda. Usando datos de ejemplo.', 'error');
            // Mostrar resultados de ejemplo
            this.displaySearchResults(this.generateMockResults(query));
        } finally {
            this.showLoading(false);
        }
    }

    displaySearchResults(results) {
        const container = document.getElementById('search-results');
        
        if (!results || results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎵</div>
                    <h3>No se encontraron resultados</h3>
                    <p>Intenta con otros términos de búsqueda</p>
                </div>
            `;
            return;
        }

        container.innerHTML = results.map(track => `
            <div class="track-item" data-id="${track.id}">
                <div class="track-image">
                    ${track.thumbnail ? 
                        `<img src="${track.thumbnail}" alt="${track.title}" onerror="this.style.display='none'">` : 
                        '🎵'
                    }
                </div>
                <div class="track-info">
                    <div class="track-title">${this.escapeHtml(track.title)}</div>
                    <div class="track-artist">${this.escapeHtml(track.artist)}</div>
                </div>
                <div class="track-duration">${track.duration || '0:00'}</div>
                <div class="track-actions">
                    <button class="action-btn" onclick="musicApp.playTrack(${JSON.stringify(track).replace(/"/g, '&quot;')})" title="Reproducir">
                        ▶
                    </button>
                    <button class="action-btn" onclick="musicApp.addToQueue(${JSON.stringify(track).replace(/"/g, '&quot;')})" title="Añadir a cola">
                        +
                    </button>
                    <button class="action-btn" onclick="musicApp.toggleFavorite(${JSON.stringify(track).replace(/"/g, '&quot;')})" title="Añadir a favoritos">
                        🤍
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Reproductor
    async playTrack(track, addToHistory = true) {
        try {
            this.currentTrack = track;
            this.isPlaying = false;

            // Actualizar UI
