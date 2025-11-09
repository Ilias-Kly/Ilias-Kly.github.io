import fetch from 'node-fetch';

export async function searchVideos(query, limit = 20) {
  try {
    // Method 1: Try YouTube InnerTube API (public endpoint)
    const results = await searchWithInnerTube(query, limit);
    if (results.length > 0) return results;

    // Method 2: Fallback to HTML scraping
    return await searchWithScraping(query, limit);
    
  } catch (error) {
    console.error('YouTube search failed:', error);
    return [];
  }
}

async function searchWithInnerTube(query, limit) {
  try {
    const response = await fetch('https://www.youtube.com/youtubei/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.0'
          }
        },
        query: query,
        params: 'EgWKAQIIAWoKEAkQAxAEEAUQCg%3D%3D' // Filter for videos
      })
    });

    const data = await response.json();
    
    if (!data.contents) return [];

    const videos = [];
    const items = data.contents.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents[0]?.itemSectionRenderer?.contents || [];

    for (const item of items) {
      if (videos.length >= limit) break;
      
      const videoRenderer = item.videoRenderer;
      if (videoRenderer) {
        videos.push({
          id: videoRenderer.videoId,
          title: videoRenderer.title.runs[0].text,
          channel: {
            name: videoRenderer.ownerText.runs[0].text,
            id: videoRenderer.ownerText.runs[0].navigationEndpoint.browseEndpoint.browseId
          },
          thumbnail: videoRenderer.thumbnail.thumbnails[0].url,
          viewCount: videoRenderer.viewCountText?.simpleText || '0',
          uploadDate: videoRenderer.publishedTimeText?.simpleText || ''
        });
      }
    }

    return videos;
  } catch (error) {
    console.error('InnerTube search failed:', error);
    return [];
  }
}

async function searchWithScraping(query, limit) {
  try {
    const response = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`
    );
    
    const html = await response.text();
    
    // Extract video IDs from initial data
    const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
    const matches = [...html.matchAll(regex)];
    const videoIds = [...new Set(matches.map(match => match[1]))].slice(0, limit);

    // Get basic info for each video
    const videos = [];
    for (const videoId of videoIds) {
      videos.push({
        id: videoId,
        title: `Video ${videoId}`,
        channel: { name: 'Unknown Channel' },
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      });
    }

    return videos;
  } catch (error) {
    console.error('Scraping search failed:', error);
    return [];
  }
}

export async function getVideoDetails(videoIds) {
  const details = [];
  
  for (const videoId of videoIds) {
    try {
      // Try to get details from oEmbed
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      
      if (response.ok) {
        const data = await response.json();
        details.push({
          id: videoId,
          title: data.title,
          author: data.author_name,
          thumbnail: data.thumbnail_url,
          duration: null // oEmbed doesn't provide duration
        });
      }
    } catch (error) {
      console.error(`Failed to get details for ${videoId}:`, error);
    }
  }
  
  return details;
}

export async function getAudioStream(videoId) {
  try {
    // Method 1: Try yt-dlp compatible services
    const ytdlpUrl = await getAudioFromService(videoId);
    if (ytdlpUrl) {
      return {
        url: ytdlpUrl,
        mimeType: 'audio/mpeg',
        isDirect: true
      };
    }

    // Method 2: Fallback to embedded player
    return {
      url: `https://www.youtube.com/embed/${videoId}?autoplay=1`,
      mimeType: 'text/html',
      isDirect: false,
      note: 'Embedded player fallback'
    };

  } catch (error) {
    console.error('Audio stream error:', error);
    throw new Error('Could not retrieve audio stream');
  }
}

async function getAudioFromService(videoId) {
  // This would integrate with a service like yt-dlp
  // For now, return null to use fallback
  return null;
}
