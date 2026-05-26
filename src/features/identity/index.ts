export { IdentityGate } from './components/IdentityGate';
export type { IdentityGateProps } from './components/IdentityGate';
export { PassportExpiryBanner } from './components/PassportExpiryBanner';
export { useIdentityVerification } from './hooks/useIdentityVerification';
export {
  usePassportExpiry,
  computeExpiryStatus,
  type ExpiryUrgency,
  type PassportExpiryStatus,
} from './hooks/usePassportExpiry';
export {
  createIdentitySession,
  isAlreadyVerified,
  type CreateIdentitySessionResponse,
  type AlreadyVerifiedResponse,
  type IdentitySessionResult,
} from './api/identity';
