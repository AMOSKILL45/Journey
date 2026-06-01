import { cityRound, haversineMeters, shouldBroadcast } from '../utils/geo';

describe('geo', () => {
  it('cityRound rounds to ~0.1 degrees', () => {
    expect(cityRound(48.8566)).toBe(48.9);
    expect(cityRound(2.3522)).toBe(2.4);
  });
  it('haversineMeters ~111m per 0.001 lat degree', () => {
    expect(Math.round(haversineMeters({ lat: 0, lng: 0 }, { lat: 0.001, lng: 0 }))).toBe(111);
  });
  it('shouldBroadcast: first fix always sends', () => {
    expect(shouldBroadcast(null, { lat: 0, lng: 0 }, 1000)).toBe(true);
  });
  it('shouldBroadcast: >=5s elapsed sends', () => {
    expect(shouldBroadcast({ lat: 0, lng: 0, ts: 0 }, { lat: 0, lng: 0 }, 5000)).toBe(true);
  });
  it('shouldBroadcast: >=50m moved sends', () => {
    expect(shouldBroadcast({ lat: 0, lng: 0, ts: 0 }, { lat: 0.0006, lng: 0 }, 1000)).toBe(true);
  });
  it('shouldBroadcast: still + recent does not send', () => {
    expect(shouldBroadcast({ lat: 0, lng: 0, ts: 0 }, { lat: 0, lng: 0 }, 2000)).toBe(false);
  });
});
