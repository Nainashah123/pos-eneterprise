import { loadStripe } from '@stripe/stripe-js';

// Publishable key — Stripe test key (frontend only, no real charges)
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? 'pk_test_placeholder'
);
