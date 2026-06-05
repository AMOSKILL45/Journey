// EncounterProvider abstraction (ADR-006): the random_encounter edge fn queries a provider for
// nearby POIs. OverpassProvider (free OSM) is the active default; GooglePlacesProvider is a future
// drop-in (needs a paid key) — add it here without touching the edge fn or the client.

export interface Encounter {
  name: string;
  category: string;
  lat: number;
  lng: number;
  distance_m: number;
  tags: Record<string, string>;
}

export interface EncounterProvider {
  findNearby(lat: number, lng: number, radiusM: number): Promise<Encounter[]>;
}
