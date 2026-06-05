// The fixed, curated pixel-emoji reaction set. Mirrors the DB CHECK on
// `reactions.emoji` (see 20260605_7a_photos_reactions.sql). No free emoji keyboard.
export const REACTION_IDS = ['heart', 'fire', 'laugh', 'wow', 'clap', 'star'] as const;
export type ReactionId = (typeof REACTION_IDS)[number];

// Glyph fallback shown until pixel-art sprites land (asset task). Always available so the
// ReactionBar renders meaningfully on the current OTA build.
export const REACTION_GLYPH: Record<ReactionId, string> = {
  heart: '❤️',
  fire: '🔥',
  laugh: '😂',
  wow: '😮',
  clap: '👏',
  star: '⭐',
};

// require() entries are added here once real pixel-art reaction sprites ship in
// src/assets/sprites/reactions/. Empty until then so Metro never bundles a missing asset
// (same pattern as 6C `soundManifest`); components fall back to REACTION_GLYPH.
export const reactionAssets: Partial<Record<ReactionId, number>> = {};
