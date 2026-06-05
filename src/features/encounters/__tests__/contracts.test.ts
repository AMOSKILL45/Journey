import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';
import { RANDOM_ENCOUNTER_FN } from '@features/encounters/api';
import { SOUND_IDS } from '@features/feedback/soundManifest';

describe('encounters runtime contracts', () => {
  it('encounters i18n keys exist in both locales', () => {
    for (const loc of [en, fr]) {
      expect(loc.encounters?.title).toBeTruthy(); // "Random Encounter!"
      expect(loc.encounters?.surprise).toBeTruthy(); // "Surprise me"
      expect(loc.encounters?.add).toBeTruthy();
      expect(loc.encounters?.dismiss).toBeTruthy();
    }
  });

  it('targets the deployed edge function name', () => {
    expect(RANDOM_ENCOUNTER_FN).toBe('random_encounter');
  });

  it('the encounter sound id is registered', () => {
    expect(SOUND_IDS).toContain('encounter');
  });
});
