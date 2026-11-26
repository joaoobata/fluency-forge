export const SONG_GENRES = [
  { id: 'all', label: 'Todas' },
  { id: 'easy', label: 'Acústico & Fácil (A2)' },
  { id: 'pop', label: 'Pop Hits' },
  { id: 'rock', label: 'Rock & Indie' },
  { id: 'rnb', label: 'R&B & Soul' },
  { id: 'rap', label: 'Hip-Hop & Rápido' }
];

export const CURATED_SONGS = [
  // ==================== ACÚSTICO & FÁCIL (A2 — 10) ====================
  { query: 'Coldplay Yellow', title: 'Yellow', artist: 'Coldplay', level: 'Fácil • A2', genre: 'easy' },
  { query: 'Ed Sheeran Perfect', title: 'Perfect', artist: 'Ed Sheeran', level: 'Fácil • A2', genre: 'easy' },
  { query: 'Bruno Mars Count on Me', title: 'Count on Me', artist: 'Bruno Mars', level: 'Fácil • A2', genre: 'easy' },
  { query: 'John Lennon Imagine', title: 'Imagine', artist: 'John Lennon', level: 'Fácil • A2', genre: 'easy' },
  { query: 'Jason Mraz Im Yours', title: "I'm Yours", artist: 'Jason Mraz', level: 'Fácil • A2', genre: 'easy' },
  { query: 'Ben E King Stand By Me', title: 'Stand By Me', artist: 'Ben E. King', level: 'Fácil • A2', genre: 'easy' },
  { query: 'The Beatles Let It Be', title: 'Let It Be', artist: 'The Beatles', level: 'Fácil • A2', genre: 'easy' },
  { query: 'The Beatles Yesterday', title: 'Yesterday', artist: 'The Beatles', level: 'Fácil • A2', genre: 'easy' },
  { query: 'Elvis Presley Cant Help Falling in Love', title: "Can't Help Falling in Love", artist: 'Elvis Presley', level: 'Fácil • A2', genre: 'easy' },
  { query: 'Oasis Wonderwall', title: 'Wonderwall', artist: 'Oasis', level: 'Fácil • A2/B1', genre: 'easy' },

  // ==================== POP HITS (14) ====================
  { query: 'Adele Someone Like You', title: 'Someone Like You', artist: 'Adele', level: 'Médio • B1', genre: 'pop' },
  { query: 'Adele Hello', title: 'Hello', artist: 'Adele', level: 'Médio • B1', genre: 'pop' },
  { query: 'Adele Rolling in the Deep', title: 'Rolling in the Deep', artist: 'Adele', level: 'Médio • B1', genre: 'pop' },
  { query: 'Ed Sheeran Thinking Out Loud', title: 'Thinking Out Loud', artist: 'Ed Sheeran', level: 'Médio • B1', genre: 'pop' },
  { query: 'Ed Sheeran Shape of You', title: 'Shape of You', artist: 'Ed Sheeran', level: 'Médio • B1', genre: 'pop' },
  { query: 'Ed Sheeran Photograph', title: 'Photograph', artist: 'Ed Sheeran', level: 'Fácil • A2/B1', genre: 'pop' },
  { query: 'Billie Eilish Birds of a Feather', title: 'Birds of a Feather', artist: 'Billie Eilish', level: 'Médio • B1', genre: 'pop' },
  { query: 'Billie Eilish Khalid lovely', title: 'lovely', artist: 'Billie Eilish & Khalid', level: 'Fácil • A2/B1', genre: 'pop' },
  { query: 'Maroon 5 Sugar', title: 'Sugar', artist: 'Maroon 5', level: 'Médio • B1', genre: 'pop' },
  { query: 'Maroon 5 Memories', title: 'Memories', artist: 'Maroon 5', level: 'Fácil • A2/B1', genre: 'pop' },
  { query: 'Taylor Swift Love Story', title: 'Love Story', artist: 'Taylor Swift', level: 'Médio • B1', genre: 'pop' },
  { query: 'Taylor Swift Blank Space', title: 'Blank Space', artist: 'Taylor Swift', level: 'Médio • B1', genre: 'pop' },
  { query: 'Dua Lipa Levitating', title: 'Levitating', artist: 'Dua Lipa', level: 'Difícil • B2', genre: 'pop' },
  { query: 'Shawn Mendes Treat You Better', title: 'Treat You Better', artist: 'Shawn Mendes', level: 'Médio • B1', genre: 'pop' },

  // ==================== ROCK & INDIE (14) ====================
  { query: 'Linkin Park Numb', title: 'Numb', artist: 'Linkin Park', level: 'Médio • B1', genre: 'rock' },
  { query: 'Linkin Park In the End', title: 'In the End', artist: 'Linkin Park', level: 'Difícil • B2', genre: 'rock' },
  { query: 'Coldplay Viva La Vida', title: 'Viva La Vida', artist: 'Coldplay', level: 'Difícil • B2', genre: 'rock' },
  { query: 'Coldplay Fix You', title: 'Fix You', artist: 'Coldplay', level: 'Fácil • A2/B1', genre: 'rock' },
  { query: 'Coldplay The Scientist', title: 'The Scientist', artist: 'Coldplay', level: 'Fácil • A2/B1', genre: 'rock' },
  { query: 'Imagine Dragons Believer', title: 'Believer', artist: 'Imagine Dragons', level: 'Difícil • B2', genre: 'rock' },
  { query: 'Imagine Dragons Demons', title: 'Demons', artist: 'Imagine Dragons', level: 'Médio • B1', genre: 'rock' },
  { query: 'Arctic Monkeys Do I Wanna Know', title: 'Do I Wanna Know?', artist: 'Arctic Monkeys', level: 'Difícil • B2', genre: 'rock' },
  { query: 'Arctic Monkeys 505', title: '505', artist: 'Arctic Monkeys', level: 'Médio • B1', genre: 'rock' },
  { query: 'Queen Bohemian Rhapsody', title: 'Bohemian Rhapsody', artist: 'Queen', level: 'Difícil • B2', genre: 'rock' },
  { query: 'Queen Dont Stop Me Now', title: "Don't Stop Me Now", artist: 'Queen', level: 'Difícil • B2', genre: 'rock' },
  { query: 'Nirvana Smells Like Teen Spirit', title: 'Smells Like Teen Spirit', artist: 'Nirvana', level: 'Difícil • B2', genre: 'rock' },
  { query: 'Radiohead Creep', title: 'Creep', artist: 'Radiohead', level: 'Fácil • A2/B1', genre: 'rock' },
  { query: 'Red Hot Chili Peppers Californication', title: 'Californication', artist: 'Red Hot Chili Peppers', level: 'Difícil • B2', genre: 'rock' },

  // ==================== R&B, SOUL & SYNTHPOP (12) ====================
  { query: 'The Weeknd Blinding Lights', title: 'Blinding Lights', artist: 'The Weeknd', level: 'Médio • B1', genre: 'rnb' },
  { query: 'The Weeknd Save Your Tears', title: 'Save Your Tears', artist: 'The Weeknd', level: 'Médio • B1', genre: 'rnb' },
  { query: 'The Weeknd Starboy', title: 'Starboy', artist: 'The Weeknd', level: 'Difícil • B2', genre: 'rnb' },
  { query: 'Bruno Mars When I Was Your Man', title: 'When I Was Your Man', artist: 'Bruno Mars', level: 'Médio • B1', genre: 'rnb' },
  { query: 'Bruno Mars Just the Way You Are', title: 'Just the Way You Are', artist: 'Bruno Mars', level: 'Fácil • A2/B1', genre: 'rnb' },
  { query: 'Bruno Mars Locked Out of Heaven', title: 'Locked Out of Heaven', artist: 'Bruno Mars', level: 'Médio • B1', genre: 'rnb' },
  { query: 'John Legend All of Me', title: 'All of Me', artist: 'John Legend', level: 'Fácil • A2/B1', genre: 'rnb' },
  { query: 'Sam Smith Stay With Me', title: 'Stay With Me', artist: 'Sam Smith', level: 'Fácil • A2/B1', genre: 'rnb' },
  { query: 'Alicia Keys If I Aint Got You', title: "If I Ain't Got You", artist: 'Alicia Keys', level: 'Médio • B1', genre: 'rnb' },
  { query: 'Frank Ocean Pink White', title: 'Pink + White', artist: 'Frank Ocean', level: 'Médio • B1', genre: 'rnb' },
  { query: 'SZA Kill Bill', title: 'Kill Bill', artist: 'SZA', level: 'Médio • B1', genre: 'rnb' },
  { query: 'Rihanna Diamonds', title: 'Diamonds', artist: 'Rihanna', level: 'Médio • B1', genre: 'rnb' },

  // ==================== HIP-HOP & RITMO RÁPIDO (10) ====================
  { query: 'Post Malone Sunflower', title: 'Sunflower', artist: 'Post Malone & Swae Lee', level: 'Médio • B1', genre: 'rap' },
  { query: 'Post Malone Circles', title: 'Circles', artist: 'Post Malone', level: 'Médio • B1', genre: 'rap' },
  { query: 'Eminem Mockingbird', title: 'Mockingbird', artist: 'Eminem', level: 'Difícil • B2/C1', genre: 'rap' },
  { query: 'Eminem Lose Yourself', title: 'Lose Yourself', artist: 'Eminem', level: 'Difícil • C1', genre: 'rap' },
  { query: 'Twenty One Pilots Stressed Out', title: 'Stressed Out', artist: 'Twenty One Pilots', level: 'Médio • B1', genre: 'rap' },
  { query: 'Gorillaz Feel Good Inc', title: 'Feel Good Inc.', artist: 'Gorillaz', level: 'Difícil • B2', genre: 'rap' },
  { query: 'Daft Punk Get Lucky', title: 'Get Lucky', artist: 'Daft Punk', level: 'Fácil • A2/B1', genre: 'rap' },
  { query: 'Drake Gods Plan', title: "God's Plan", artist: 'Drake', level: 'Difícil • B2', genre: 'rap' },
  { query: 'Kendrick Lamar HUMBLE', title: 'HUMBLE.', artist: 'Kendrick Lamar', level: 'Difícil • C1', genre: 'rap' },
  { query: 'Wiz Khalifa See You Again', title: 'See You Again', artist: 'Wiz Khalifa & Charlie Puth', level: 'Médio • B1', genre: 'rap' }
];
