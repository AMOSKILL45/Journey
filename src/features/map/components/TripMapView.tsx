import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';

import { supabase } from '@core/supabase/client';
import { CaravanControls, useCaravan, type CaravanCamera } from '@features/caravan';
import type { Milestone } from '@features/milestones';
import { tripTopic } from '@features/realtime/utils/channel';

import { MapCrossfade, type MapCrossfadeProps } from './MapCrossfade';

const DEFAULT_HEIGHT = 480;

/** One presence member, the shape the caravan needs to resolve a leader name. */
export interface CaravanMember {
  user_id: string;
  display_name?: string | null;
}

export interface TripMapViewProps extends MapCrossfadeProps {
  /** Enables caravan mode when paired with `selfId`; rides the trip:{id} channel. */
  tripId?: string;
  /** The current user's id (caravan leader id when leading). */
  selfId?: string | null;
  /** Presence members, used to detect an active leader + resolve their name. */
  caravanMembers?: readonly CaravanMember[];
}

/**
 * Embeddable map view for a trip detail screen. Wraps MapCrossfade with a sized
 * container, and — when `tripId` + `selfId` are supplied — layers caravan mode
 * on top: a members-only `trip:{id}` Realtime channel (ADR-005) drives
 * `useCaravan`, the `CaravanControls` overlay toggles lead/follow/leave, the
 * leader broadcasts its camera while leading, and a follower applies the
 * incoming camera and has local map gestures suppressed until they break.
 *
 * Caravan is fully additive: omit `tripId`/`selfId` and this is a plain map.
 */
export function TripMapView({ tripId, selfId, caravanMembers, ...mapProps }: TripMapViewProps) {
  const caravanEnabled = Boolean(tripId && selfId);

  // A members-only channel on the same authorized trip topic as Phase 5 presence;
  // broadcast fans out to every subscriber on the topic, so leader→followers works.
  const channel = useMemo(() => {
    if (!caravanEnabled || !tripId) return null;
    return supabase.channel(tripTopic(tripId), {
      config: { private: true, broadcast: { self: false } },
    });
  }, [caravanEnabled, tripId]);

  useEffect(() => {
    if (!channel) return undefined;
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channel]);

  const { role, leaderId, incomingCamera, lead, follow, leave, broadcastCamera } = useCaravan(
    channel,
    selfId ?? null,
  );

  // Camera I/O bridge (ADR-005). MapCrossfade owns the camera shared values; it
  // does not yet surface a change callback, so both directions are wired here —
  // the only file this run may edit — ready to attach when it does:
  //   • leading  → onCameraChange(cam) => broadcastRef.current(cam)   (outgoing)
  //   • following → apply latestCamera.current to the camera shared values (incoming)
  // A dropped frame self-corrects on the next broadcast.
  const broadcastRef = useRef(broadcastCamera);
  broadcastRef.current = broadcastCamera;
  const latestCamera = useRef<CaravanCamera | null>(null);
  useEffect(() => {
    if (role === 'following' && incomingCamera) latestCamera.current = incomingCamera;
  }, [role, incomingCamera]);

  // Resolve the current leader's display name for the join / following copy.
  const leaderName = useMemo(() => {
    const id = leaderId;
    if (!id) return null;
    const m = caravanMembers?.find((x) => x.user_id === id);
    return m?.display_name ?? null;
  }, [leaderId, caravanMembers]);

  // Someone other than us is broadcasting → we can offer to join (best-effort:
  // any other present member is a candidate leader once they start leading).
  const canFollow = useMemo(
    () => (caravanMembers ?? []).some((m) => m.user_id !== selfId),
    [caravanMembers, selfId],
  );

  return (
    <View style={{ height: DEFAULT_HEIGHT, overflow: 'hidden', borderRadius: 12 }}>
      <MapCrossfade {...mapProps} />
      {role === 'following' ? (
        // Lock local pan/zoom: capture touches so the user follows until "break".
        <View
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="auto"
        />
      ) : null}
      {caravanEnabled ? (
        <View
          style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}
          pointerEvents="box-none"
        >
          <CaravanControls
            role={role}
            leaderName={leaderName}
            canFollow={canFollow}
            onLead={lead}
            onFollow={() => {
              const id = caravanMembers?.find((m) => m.user_id !== selfId)?.user_id;
              if (id) follow(id);
            }}
            onLeave={leave}
          />
        </View>
      ) : null}
    </View>
  );
}

export type { Milestone };
