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
            document.getElementById('track-title').textContent = track.title;
            document.getElementById('track-artist').textContent = track.artist;
            document.getElementById('track-image').innerHTML = track.thumbnail ? 
                `<img src="${track.thumbnail}" alt="${track.title}" style="width:100%;height:100%;border-radius:4px;">` : 
                '🎵';

            document.getElementById('play-btn').textContent = '⏸';
            
            // Resaltar track actual
            document.querySelectorAll('.track-item').forEach(item => {
                item.classList.remove('playing');
                if (item.dataset.id === track.id) {
                    item.classList.add('playing');
                }
            });

            // Obtener URL de audio
            const audioUrl = track.audioUrl || `/api/stream?id=${track.id}`;
            this.audio.src = audioUrl;
            
            await this.audio.play();
            this.isPlaying = true;

            if (addToHistory) {
                this.addToHistory(track);
            }

            this.showToast(`Reproduciendo: ${track.title}`, 'success');

        } catch (error) {
            console.error('Play error:', error);
            this.showToast('Error al reproducir la canción', 'error');
        }
    }

    togglePlay() {
        if (!this.currentTrack) {
            if (this.queue.length > 0) {
                this.playTrack(this.queue[0]);
            }
            return;
        }

        if (this.isPlaying) {
            this.audio.pause();
            document.getElementById('play-btn').textContent = '▶';
        } else {
            this.audio.play();
            document.getElementById('play-btn').textContent = '⏸';
        }
        this.isPlaying = !this.isPlaying;
    }

    previous() {
        if (this.queue.length > 1 && this.currentIndex > 0) {
            this.currentIndex--;
            this.playTrack(this.queue[this.currentIndex], false);
        }
    }

    next() {
        if (this.queue.length > 1 && this.currentIndex < this.queue.length - 1) {
            this.currentIndex++;
            this.playTrack(this.queue[this.currentIndex], false);
        } else if (this.repeatMode === 'all' && this.queue.length > 0) {
            this.currentIndex = 0;
            this.playTrack(this.queue[0], false);
        }
    }

    seek(percentage) {
        if (this.audio.duration) {
            this.audio.currentTime = (percentage / 100) * this.audio.duration;
        }
    }

    setVolume(volume) {
        this.volume = volume;
        this.audio.volume = volume;
        this.updateVolumeIcon();
    }

    toggleMute() {
        this.audio.muted = !this.audio.muted;
        this.updateVolumeIcon();
    }

    updateVolumeIcon() {
        const btn = document.getElementById('volume-btn');
        if (this.audio.muted || this.volume === 0) {
            btn.textContent = '🔇';
        } else if (this.volume < 0.5) {
            btn.textContent = '🔈';
        } else {
            btn.textContent = '🔊';
        }
    }

    toggleShuffle() {
        this.shuffle = !this.shuffle;
        const btn = document.getElementById('shuffle-btn');
        btn.style.color = this.shuffle ? 'var(--primary-color)' : 'var(--text-secondary)';
        
        if (this.shuffle && this.queue.length > 0) {
            this.shuffleQueue();
        }
    }

    toggleRepeat() {
        const modes = ['off', 'one', 'all'];
        const currentIndex = modes.indexOf(this.repeatMode);
        this.repeatMode = modes[(currentIndex + 1) % modes.length];
        
        const btn = document.getElementById('repeat-btn');
        btn.style.color = this.repeatMode !== 'off' ? 'var(--primary-color)' : 'var(--text-secondary)';
        btn.textContent = this.repeatMode === 'one' ? '🔂' : '🔁';
    }

    toggleLike() {
        if (!this.currentTrack) return;

        const isFavorite = this.favorites.some(fav => fav.id === this.currentTrack.id);
        const btn = document.getElementById('like-btn');

        if (isFavorite) {
            this.favorites = this.favorites.filter(fav => fav.id !== this.currentTrack.id);
            btn.textContent = '🤍';
            this.showToast('Eliminado de favoritos', 'info');
        } else {
            this.favorites.push({
                ...this.currentTrack,
                likedAt: new Date().toISOString()
            });
            btn.textContent = '❤️';
            this.showToast('Añadido a favoritos', 'success');
        }

        this.saveUserData();
        this.updateLikeButton();
    }

    updateLikeButton() {
        if (!this.currentTrack) return;
        
        const isFavorite = this.favorites.some(fav => fav.id === this.currentTrack.id);
        document.getElementById('like-btn').textContent = isFavorite ? '❤️' : '🤍';
    }

    // Gestión de datos del usuario
    addToHistory(track) {
        // Evitar duplicados
        this.history = this.history.filter(item => item.id !== track.id);
        
        // Añadir al inicio
        this.history.unshift({
            ...track,
            playedAt: new Date().toISOString()
        });

        // Mantener solo los últimos 50
        this.history = this.history.slice(0, 50);

        this.saveUserData();
    }

    addToRecentSearches(query) {
        this.recentSearches = this.recentSearches.filter(q => q !== query);
        this.recentSearches.unshift(query);
        this.recentSearches = this.recentSearches.slice(0, 10);
        this.saveUserData();
        this.displayRecentSearches();
    }

    toggleFavorite(track) {
        const isFavorite = this.favorites.some(fav => fav.id === track.id);
        
        if (isFavorite) {
            this.favorites = this.favorites.filter(fav => fav.id !== track.id);
            this.showToast('Eliminado de favoritos', 'info');
        } else {
            this.favorites.push({
                ...track,
                likedAt: new Date().toISOString()
            });
            this.showToast('Añadido a favoritos', 'success');
        }

        this.saveUserData();
        
        // Actualizar UI si estamos en la sección de favoritos
        if (document.getElementById('favorites-content').classList.contains('active')) {
            this.loadFavorites();
        }
    }

    addToQueue(track) {
        this.queue.push(track);
        this.showToast('Añadido a la cola', 'success');
    }

    // Playlists
    showCreatePlaylistModal() {
        document.getElementById('playlist-modal').classList.remove('hidden');
        document.getElementById('playlist-name').value = '';
        document.getElementById('playlist-name').focus();
    }

    hideCreatePlaylistModal() {
        document.getElementById('playlist-modal').classList.add('hidden');
    }

    createPlaylist() {
        const name = document.getElementById('playlist-name').value.trim();
        if (!name) {
            this.showToast('El nombre de la playlist es requerido', 'error');
            return;
        }

        const playlist = {
            id: Date.now().toString(),
            name: name,
            tracks: [],
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };

        this.playlists.push(playlist);
        this.saveUserData();
        this.loadPlaylists();
        this.hideCreatePlaylistModal();
        this.showToast(`Playlist "${name}" creada`, 'success');
    }

    // Carga de datos
    loadUserData() {
        this.loadRecentSearches();
        this.loadPlaylists();
    }

    loadHomeData() {
        this.loadRecentSearches();
    }

    loadLibraryData() {
        this.loadFavorites();
        this.loadHistory();
    }

    loadRecentSearches() {
        const container = document.getElementById('recent-searches-list');
        if (!container) return;

        container.innerHTML = this.recentSearches.map(search => `
            <div class="tag" onclick="musicApp.performQuickSearch('${this.escapeHtml(search)}')">
                ${this.escapeHtml(search)}
            </div>
        `).join('');
    }

    loadFavorites() {
        const container = document.getElementById('favorites-list');
        if (!container) return;

        if (this.favorites.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🤍</div>
                    <h3>No hay favoritos</h3>
                    <p>Tus canciones favoritas aparecerán aquí</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.favorites.map(track => `
            <div class="track-item" data-id="${track.id}">
                <div class="track-image">🎵</div>
                <div class="track-info">
                    <div class="track-title">${this.escapeHtml(track.title)}</div>
                    <div class="track-artist">${this.escapeHtml(track.artist)}</div>
                </div>
                <div class="track-actions">
                    <button class="action-btn" onclick="musicApp.playTrack(${JSON.stringify(track).replace(/"/g, '&quot;')})">
                        ▶
                    </button>
                    <button class="action-btn" onclick="musicApp.toggleFavorite(${JSON.stringify(track).replace(/"/g, '&quot;')})">
                        ❤️
                    </button>
                </div>
            </div>
        `).join('');
    }

    loadHistory() {
        const container = document.getElementById('history-list');
        if (!container) return;

        if (this.history.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🕒</div>
                    <h3>No hay historial</h3>
                    <p>Tu historial de reproducción aparecerá aquí</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.history.map(track => `
            <div class="track-item" data-id="${track.id}">
                <div class="track-image">🎵</div>
                <div class="track-info">
                    <div class="track-title">${this.escapeHtml(track.title)}</div>
                    <div class="track-artist">${this.escapeHtml(track.artist)}</div>
                </div>
                <div class="track-duration">${new Date(track.playedAt).toLocaleDateString()}</div>
                <div class="track-actions">
                    <button class="action-btn" onclick="musicApp.playTrack(${JSON.stringify(track).replace(/"/g, '&quot;')})">
                        ▶
                    </button>
                </div>
            </div>
        `).join('');
    }

    loadPlaylists() {
        const sidebarList = document.getElementById('playlists-list');
        const mainList = document.getElementById('user-playlists');

        if (sidebarList) {
            sidebarList.innerHTML = this.playlists.map(playlist => `
                <div class="playlist-item" onclick="musicApp.showPlaylist('${playlist.id}')">
                    ${playlist.name}
                </div>
            `).join('');
        }

        if (mainList) {
            if (this.playlists.length === 0) {
                mainList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🎵</div>
                        <h3>No hay playlists</h3>
                        <p>Crea tu primera playlist para organizar tu música</p>
                    </div>
                `;
                return;
            }

            mainList.innerHTML = this.playlists.map(playlist => `
                <div class="playlist-card" onclick="musicApp.showPlaylist('${playlist.id}')">
                    <div class="playlist-image">📁</div>
                    <h3>${this.escapeHtml(playlist.name)}</h3>
                    <p>${playlist.tracks.length} canciones</p>
                </div>
            `).join('');
        }
    }

    // Utilidades
    showLoading(show) {
        const loader = document.getElementById('loading-indicator');
        if (show) {
            loader.classList.remove('hidden');
        } else {
            loader.classList.add('hidden');
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    saveUserData() {
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        localStorage.setItem('history', JSON.stringify(this.history));
        localStorage.setItem('playlists', JSON.stringify(this.playlists));
        localStorage.setItem('recentSearches', JSON.stringify(this.recentSearches));
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    performQuickSearch(query) {
        document.getElementById('search-input').value = query;
        this.search();
        this.showSection('search');
    }

    searchGenre(genre) {
        const queries = {
            pop: 'pop music 2024',
            rock: 'rock classics',
            electronic: 'electronic music',
            chill: 'chill lofi'
        };
        
        document.getElementById('search-input').value = queries[genre] || genre;
        this.search();
        this.showSection('search');
    }

    // Event handlers del audio
    onAudioLoaded() {
        document.getElementById('duration').textContent = this.formatTime(this.audio.duration);
        this.updateLikeButton();
    }

    onAudioEnded() {
        if (this.repeatMode === 'one') {
            this.audio.currentTime = 0;
            this.audio.play();
        } else {
            this.next();
        }
    }

    onAudioError(error) {
        console.error('Audio error:', error);
        this.showToast('Error al cargar el audio', 'error');
    }

    updateProgress() {
        if (this.audio.duration) {
            const percentage = (this.audio.currentTime / this.audio.duration) * 100;
            document.getElementById('progress-bar').value = percentage;
            document.getElementById('current-time').textContent = this.formatTime(this.audio.currentTime);
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    shuffleQueue() {
        for (let i = this.queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
        }
    }

    showLibraryTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.getElementById(`show-${tab}`).classList.add('active');
        document.getElementById(`${tab}-content`).classList.add('active');
    }

    showPlaylist(playlistId) {
        // Implementar vista de playlist específica
        this.showToast(`Abriendo playlist...`, 'info');
    }

    filterResults(filter) {
        // Implementar filtrado de resultados
        console.log('Filtering by:', filter);
    }

    generateMockResults(query) {
        const genres = ['Pop', 'Rock', 'Hip Hop', 'Electronic', 'R&B', 'Jazz'];
        const artists = ['Artist One', 'Artist Two', 'Artist Three', 'Artist Four'];
        
        return Array.from({ length: 10 }, (_, i) => ({
            id: `mock${i + 1}`,
            title: `${query} - ${genres[i % genres.length]} Version ${i + 1}`,
            artist: artists[i % artists.length],
            duration: `${3 + (i % 3)}:${(i * 17 % 60).toString().padStart(2, '0')}`,
            thumbnail: '',
            audioUrl: `/api/stream?id=mock${i + 1}`
        }));
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.musicApp = new MusicApp();
});
