export const AVATAR_SPRITES = [
  { id: 'avatars/adventurer_1', source: require('./adventurer_1.png'), label: 'Adventurer Red' },
  { id: 'avatars/adventurer_2', source: require('./adventurer_2.png'), label: 'Adventurer Blue' },
  { id: 'avatars/adventurer_3', source: require('./adventurer_3.png'), label: 'Adventurer Green' },
  { id: 'avatars/adventurer_4', source: require('./adventurer_4.png'), label: 'Adventurer Yellow' },
  { id: 'avatars/adventurer_5', source: require('./adventurer_5.png'), label: 'Adventurer Purple' },
  { id: 'avatars/adventurer_6', source: require('./adventurer_6.png'), label: 'Adventurer Pink' },
  { id: 'avatars/adventurer_7', source: require('./adventurer_7.png'), label: 'Adventurer Orange' },
  { id: 'avatars/adventurer_8', source: require('./adventurer_8.png'), label: 'Adventurer Cyan' },
  { id: 'avatars/adventurer_9', source: require('./adventurer_9.png'), label: 'Adventurer Black' },
  {
    id: 'avatars/adventurer_10',
    source: require('./adventurer_10.png'),
    label: 'Adventurer Cream',
  },
  { id: 'avatars/adventurer_11', source: require('./adventurer_11.png'), label: 'Adventurer Gold' },
  {
    id: 'avatars/adventurer_12',
    source: require('./adventurer_12.png'),
    label: 'Adventurer Silver',
  },
] as const;

export type AvatarSpriteId = (typeof AVATAR_SPRITES)[number]['id'];
