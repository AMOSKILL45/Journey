import { SOUND_CATEGORY, SOUND_IDS, soundAssets } from '../soundManifest';

describe('soundManifest', () => {
  it('every id has a category', () => {
    SOUND_IDS.forEach((id) => expect(['ui', 'event']).toContain(SOUND_CATEGORY[id]));
  });
  it('soundAssets only references declared ids', () => {
    Object.keys(soundAssets).forEach((id) => expect(SOUND_IDS).toContain(id as never));
  });
});
