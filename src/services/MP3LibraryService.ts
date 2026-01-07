import { MP3MetadataService, MP3Metadata } from './MP3MetadataService';

export interface LocalTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  url: string;
}

export class MP3LibraryService {
  private metadataService: MP3MetadataService;
  private tracks: LocalTrack[] = [];

  constructor() {
    this.metadataService = new MP3MetadataService();
  }

  async loadLibrary(): Promise<LocalTrack[]> {
    // Clean list of MP3 files
    const mp3Files = [
      'Anirudh - Idhazhin Oram.mp3',
      'Cartoon - On and On (feat. Daniel Levi).mp3',
      'D Stackz - Half On A Baby.mp3',
      'Dhibu Ninan Thomas - Othaiyadi Pathayila.mp3',
      'Different Heaven & EHDE - My Heart.mp3',
      'Drake - Waiting Up.mp3',
      'Himesh Reshammiya - Hookah Bar.mp3',
      'PARTYNEXTDOOR - Some Of Your Love.mp3',
      'Sample - Song.mp3',
      'Tobu - Roots.mp3',
      'Travis Scott - Houdini.mp3',
      'Unknown Artist - Depression.mp3',
      'Unknown Artist - Free Uzi.mp3',
      'Unknown Artist - If Only U Were Mine.mp3',
      'Unknown Artist - Something Going On.mp3',
      'Zack Knight & Jasmin Walia - Bom Diggy Diggy.mp3'
    ];

    this.tracks = await Promise.all(
      mp3Files.map(async (fileName) => {
        // URL-encode the filename for proper loading
        const url = '/' + encodeURIComponent(fileName);
        const metadata = await this.metadataService.extractMetadata(url);
        return {
          id: this.generateId(url),
          title: metadata.title,
          artist: metadata.artist,
          duration: metadata.duration,
          url: url
        };
      })
    );

    return this.tracks;
  }

  getTracks(): LocalTrack[] {
    return this.tracks;
  }

  private generateId(url: string): string {
    return btoa(url).substring(0, 16);
  }
}
