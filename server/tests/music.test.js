/**
 * Reading a YouTube playlist id out of whatever somebody pasted.
 *
 * People paste the address bar, and the address bar puts the playlist id in
 * different places depending on whether they happened to be watching a video
 * at the time. Getting this wrong renders a black rectangle where the music
 * should be, with nothing in the console to say why.
 */
const { toPlaylistId, DEFAULTS } = require('../controllers/musicController');

describe('toPlaylistId', () => {
  it('reads the playlist page address', () => {
    expect(toPlaylistId('https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf'))
      .toBe('PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf');
  });

  it('reads it from a watch address, which is what the bar usually shows', () => {
    expect(
      toPlaylistId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOeiKm4sgNOknGv&index=2')
    ).toBe('PLrAXtmErZgOeiKm4sgNOknGv');
  });

  it('reads a mobile address', () => {
    expect(toPlaylistId('https://m.youtube.com/playlist?list=OLAK5uy_kEQmCfLbDlgJ6fpY0vQ0LK1Lg'))
      .toBe('OLAK5uy_kEQmCfLbDlgJ6fpY0vQ0LK1Lg');
  });

  it('accepts a bare id, for somebody who already knows what they are doing', () => {
    expect(toPlaylistId('PLrAXtmErZgOeiKm4sgNOknGv')).toBe('PLrAXtmErZgOeiKm4sgNOknGv');
    // A channel's uploads playlist starts UU, and an album's OLAK5uy_.
    expect(toPlaylistId('UU2g-gkU4Hwc3tGd3hkv5E1Q')).toBe('UU2g-gkU4Hwc3tGd3hkv5E1Q');
  });

  it('ignores surrounding whitespace, because copy and paste adds it', () => {
    expect(toPlaylistId('  https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sg  '))
      .toBe('PLrAXtmErZgOeiKm4sg');
  });

  it('refuses a link with no playlist in it, rather than guessing', () => {
    // This is a single video. Accepting it would embed an empty playlist.
    expect(toPlaylistId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(toPlaylistId('https://youtu.be/dQw4w9WgXcQ')).toBeNull();
    expect(toPlaylistId('https://open.spotify.com/playlist/37i9dQZF1DX')).toBeNull();
  });

  it('is null for nothing at all', () => {
    expect(toPlaylistId('')).toBeNull();
    expect(toPlaylistId(null)).toBeNull();
    expect(toPlaylistId(undefined)).toBeNull();
    expect(toPlaylistId('   ')).toBeNull();
  });
});

describe('the default', () => {
  it('is off until somebody actually pastes a playlist', () => {
    expect(DEFAULTS.enabled).toBe(false);
    expect(DEFAULTS.playlistId).toBeNull();
  });
});
