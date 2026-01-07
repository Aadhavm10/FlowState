export interface MP3Metadata {
  title: string;
  artist: string;
  duration: number;
  fileName: string;
  url: string;
}

export class MP3MetadataService {
  async extractMetadata(url: string): Promise<MP3Metadata> {
    const audio = new Audio(url);

    // Wait for metadata to load
    await new Promise((resolve, reject) => {
      audio.addEventListener('loadedmetadata', resolve);
      audio.addEventListener('error', reject);
      audio.load();
    });

    const duration = audio.duration;
    const encodedFileName = url.split('/').pop() || 'Unknown';
    // Decode the URL-encoded filename
    const fileName = decodeURIComponent(encodedFileName);
    const { title, artist } = this.parseFileName(fileName);

    return { title, artist, duration, fileName, url };
  }

  private parseFileName(fileName: string): { title: string; artist: string } {
    // Remove .mp3 extension
    const nameWithoutExt = fileName.replace(/\.mp3$/i, '');

    // Pattern 1: "Artist - Title"
    if (nameWithoutExt.includes(' - ')) {
      const parts = nameWithoutExt.split(' - ');
      return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
    }

    // Pattern 2: "Title_KLICKAUD" or similar suffix
    const cleanTitle = nameWithoutExt.replace(/_KLICKAUD.*$/i, '').replace(/_/g, ' ');
    return { artist: 'Unknown Artist', title: cleanTitle };
  }
}
