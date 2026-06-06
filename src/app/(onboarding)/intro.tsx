import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { markIntroSeen, OnboardingCarousel } from '@features/onboarding';

/**
 * First-run intro route (10A). Renders the skippable carousel; on finish or
 * Skip it persists `onboarding_intro_seen` and continues the flow to sign-in
 * (intro → sign-in → profile onboarding → app).
 */
export default function OnboardingIntroRoute() {
  const router = useRouter();

  const handleComplete = useCallback(() => {
    markIntroSeen();
    router.replace('/(auth)/sign-in');
  }, [router]);

  return <OnboardingCarousel onComplete={handleComplete} />;
}
