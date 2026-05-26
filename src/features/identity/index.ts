export { IdentityGate } from './components/IdentityGate';
export type { IdentityGateProps } from './components/IdentityGate';
export { useIdentityVerification } from './hooks/useIdentityVerification';
export {
  createIdentitySession,
  isAlreadyVerified,
  type CreateIdentitySessionResponse,
  type AlreadyVerifiedResponse,
  type IdentitySessionResult,
} from './api/identity';
