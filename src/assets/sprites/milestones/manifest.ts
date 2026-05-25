// Auto-generated manifest of milestone sprites.
// Replace placeholder PNGs with real Kenney/itch.io assets in v1.1.

export const MILESTONE_SPRITE_CATEGORIES = [
  'hotel',
  'city',
  'activity',
  'transport',
  'food',
  'landmark',
  'boss',
  'custom',
] as const;

export type MilestoneSpriteCategory = (typeof MILESTONE_SPRITE_CATEGORIES)[number];

export const MILESTONE_SPRITES = [
  {
    id: 'milestones/castle_red',
    source: require('./castle_red.png'),
    category: 'hotel',
    label: 'Red Castle',
  },
  {
    id: 'milestones/castle_blue',
    source: require('./castle_blue.png'),
    category: 'hotel',
    label: 'Blue Castle',
  },
  {
    id: 'milestones/flag_red',
    source: require('./flag_red.png'),
    category: 'city',
    label: 'Red Flag',
  },
  {
    id: 'milestones/flag_blue',
    source: require('./flag_blue.png'),
    category: 'city',
    label: 'Blue Flag',
  },
  {
    id: 'milestones/flag_green',
    source: require('./flag_green.png'),
    category: 'city',
    label: 'Green Flag',
  },
  {
    id: 'milestones/star_gold',
    source: require('./star_gold.png'),
    category: 'activity',
    label: 'Gold Star',
  },
  {
    id: 'milestones/star_silver',
    source: require('./star_silver.png'),
    category: 'activity',
    label: 'Silver Star',
  },
  {
    id: 'milestones/airplane',
    source: require('./airplane.png'),
    category: 'transport',
    label: 'Airplane',
  },
  { id: 'milestones/boat', source: require('./boat.png'), category: 'transport', label: 'Boat' },
  { id: 'milestones/car', source: require('./car.png'), category: 'transport', label: 'Car' },
  { id: 'milestones/train', source: require('./train.png'), category: 'transport', label: 'Train' },
  { id: 'milestones/pizza', source: require('./pizza.png'), category: 'food', label: 'Pizza' },
  { id: 'milestones/burger', source: require('./burger.png'), category: 'food', label: 'Burger' },
  { id: 'milestones/ramen', source: require('./ramen.png'), category: 'food', label: 'Ramen' },
  { id: 'milestones/coffee', source: require('./coffee.png'), category: 'food', label: 'Coffee' },
  {
    id: 'milestones/mountain',
    source: require('./mountain.png'),
    category: 'landmark',
    label: 'Mountain',
  },
  { id: 'milestones/beach', source: require('./beach.png'), category: 'landmark', label: 'Beach' },
  {
    id: 'milestones/forest',
    source: require('./forest.png'),
    category: 'landmark',
    label: 'Forest',
  },
  {
    id: 'milestones/desert',
    source: require('./desert.png'),
    category: 'landmark',
    label: 'Desert',
  },
  {
    id: 'milestones/city_night',
    source: require('./city_night.png'),
    category: 'landmark',
    label: 'City',
  },
  {
    id: 'milestones/trophy_gold',
    source: require('./trophy_gold.png'),
    category: 'boss',
    label: 'Gold Trophy',
  },
  {
    id: 'milestones/trophy_silver',
    source: require('./trophy_silver.png'),
    category: 'boss',
    label: 'Silver Trophy',
  },
  { id: 'milestones/crown', source: require('./crown.png'), category: 'boss', label: 'Crown' },
  {
    id: 'milestones/diamond',
    source: require('./diamond.png'),
    category: 'boss',
    label: 'Diamond',
  },
  { id: 'milestones/tent', source: require('./tent.png'), category: 'activity', label: 'Tent' },
  { id: 'milestones/ski', source: require('./ski.png'), category: 'activity', label: 'Ski' },
  { id: 'milestones/surf', source: require('./surf.png'), category: 'activity', label: 'Surf' },
  {
    id: 'milestones/hiking',
    source: require('./hiking.png'),
    category: 'activity',
    label: 'Hiking',
  },
  {
    id: 'milestones/marker_red',
    source: require('./marker_red.png'),
    category: 'custom',
    label: 'Red Marker',
  },
  {
    id: 'milestones/marker_blue',
    source: require('./marker_blue.png'),
    category: 'custom',
    label: 'Blue Marker',
  },
] as const satisfies readonly {
  id: string;
  source: number;
  category: MilestoneSpriteCategory;
  label: string;
}[];

export type MilestoneSpriteId = (typeof MILESTONE_SPRITES)[number]['id'];

export const defaultSpriteForType = (type: string): MilestoneSpriteId => {
  switch (type) {
    case 'hotel':
      return 'milestones/castle_red';
    case 'city':
      return 'milestones/flag_red';
    case 'activity':
      return 'milestones/star_gold';
    case 'transport':
      return 'milestones/airplane';
    case 'food':
      return 'milestones/pizza';
    case 'landmark':
      return 'milestones/mountain';
    default:
      return 'milestones/marker_red';
  }
};

export const findSpriteById = (id: string) => MILESTONE_SPRITES.find((s) => s.id === id);

export const spritesByCategory = (category: MilestoneSpriteCategory) =>
  MILESTONE_SPRITES.filter((s) => s.category === category);
