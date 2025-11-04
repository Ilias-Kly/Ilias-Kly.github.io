class MusicApp {
    constructor() {
        this.currentTrack = null;
        this.isPlaying = false;
        this.player = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadYouTubeAPI();
        this.loadRecommendations();
        console.log('🎵 App iniciada correctamente');
    }

    setupEventListeners() {
        // Buscar
        document.getElementById('searchBtn').addEventListener('click', () => this.searchMusic());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchMusic();
        });
    }

    loadYouTubeAPI() {
        if (!window.YT) {
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(script);
        }

        window.onYouTubeIframeAPIReady = () => {
            console.log('✅ YouTube API lista');
            this.createPlayer();
        };
    }

    createPlayer() {
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
                    console.log('🎵 Reproductor listo');
                },
                'onStateChange': (event) => {
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

    showSection(sectionId) {
        // Ocultar todas las secciones
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Mostrar sección seleccionada
        document.getElementById(sectionId).classList.add('active');

        // Actualizar navegación
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Encontrar y activar el botón correspondiente
        const activeNav = Array.from(document.querySelectorAll('.nav-item')).find(item => 
            item.textContent.includes(
                sectionId === 'home' ? 'Inicio' : 
                sectionId === 'search' ? 'Buscar' : 'Biblioteca'
            )
        );
        if (activeNav) activeNav.classList.add('active');
    }

    async searchMusic() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) {
            alert('Escribe algo para buscar');
            return;
        }

        this.showLoading();

        try {
            // Usar API de Invidious
            const response = await fetch(`https://inv.odyssey346.dev/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
            const data = await response.json();
            
            const musicVideos = data
                .filter(video => !video.title.toLowerCase().includes('live') && !video.title.toLowerCase().includes('podcast'))
                .slice(0, 8)
                .map(video => ({
                    id: video.videoId,
                    title: video.title,
                    artist: video.author,
                    thumbnail: video.videoThumbnails?.[3]?.url || video.videoThumbnails?.[0]?.url
                }));

            this.displaySearchResults(musicVideos);
        } catch (error) {
            console.log('Error en búsqueda:', error);
            this.displayFallbackResults();
        }
    }

    displaySearchResults(videos) {
        const container = document.getElementById('searchResults');
        container.innerHTML = '';

        if (videos.length === 0) {
            container.innerHTML = '<div class="loading"><p>No se encontraron resultados</p></div>';
            return;
        }

        videos.forEach(video => {
            const card = this.createMusicCard(video);
            container.appendChild(card);
        });
    }

    createMusicCard(video) {
        const card = document.createElement('div');
        card.className = 'music-card';
        card.innerHTML = `
            <div class="card-cover">
                <img src="${video.thumbnail}" alt="${video.title}">
                <button class="play-btn" onclick="event.stopPropagation(); app.playTrack(${JSON.stringify(video).replace(/"/g, '&quot;')})">
                    <i class="bi bi-play-fill"></i>
                </button>
            </div>
            <div class="card-title">${this.cleanTitle(video.title)}</div>
            <div class="card-artist">${video.artist}</div>
        `;

        card.addEventListener('click', () => {
            this.playTrack(video);
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
        console.log('🎵 Reproduciendo:', track.title);
        this.currentTrack = track;
        
        // Actualizar UI
        document.querySelector('.track-name').textContent = track.title;
        document.querySelector('.track-artist').textContent = track.artist;

        // Reproducir con YouTube
        if (this.player && this.player.loadVideoById) {
            this.player.loadVideoById(track.id);
            this.player.playVideo();
        } else {
            // Fallback: abrir en YouTube
            window.open(`https://www.youtube.com/watch?v=${track.id}`, '_blank');
        }
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

    updatePlayButton() {
        const playBtn = document.querySelector('.play-btn-main i');
        if (this.isPlaying) {
            playBtn.classList.remove('bi-play-fill');
            play