'use client';
// WHY: 'use client' tells Next.js to run this file in the browser only.
// Stripe Elements rely on browser APIs (like iframes and the DOM) that don't exist on the server.

import { useState } from 'react';
// WHY: useState lets this component track its own local data between renders.
// We need to remember whether we're currently processing a payment and whether there's an error.

import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
// WHY: These three imports are the core of Stripe's React integration:
//   - CardElement: A pre-built, secure card input UI (number, expiry, CVC) hosted inside
//     a Stripe-controlled iframe. This means card data NEVER touches our own server — Stripe
//     handles PCI compliance so we don't have to.
//   - useStripe(): A hook that returns the Stripe.js instance, needed to call payment APIs.
//   - useElements(): A hook that gives access to the mounted card input element, so we can
//     read the card data when the form is submitted.
// These hooks only work inside a component wrapped by <Elements> (see PaymentModal.tsx).

import { Button } from '@/components/ui/Button';
// WHY: We reuse the shared Button component for consistent styling and the built-in
// loading spinner (which shows automatically when loading={true} is passed).

import { AlertCircle } from 'lucide-react';
// WHY: AlertCircle is a warning icon. Showing an icon next to an error message makes
// it much more noticeable than plain text alone — important for payment errors.

// WHY: This interface defines the props (inputs) this component expects from its parent.
// amount: how much to charge, onSuccess: what to do when payment works, onCancel: what to do if user backs out.
interface StripeCardFormProps {
  amount: number; // in rupees
  onSuccess: () => void;  // WHY: A function passed in from the parent to call when payment succeeds
  onCancel: () => void;   // WHY: A function passed in from the parent to call when user cancels
}

// WHY: We destructure the props directly in the parameter list — cleaner than `props.amount` etc.
export function StripeCardForm({ amount, onSuccess, onCancel }: StripeCardFormProps) {
  // WHY: useStripe() returns the loaded Stripe object (or null if Stripe hasn't loaded yet).
  // We need this to call stripe.confirmCardPayment() to actually charge the card.
  const stripe = useStripe();

  // WHY: useElements() gives us access to the CardElement component's data.
  // We need to call elements.getElement(CardElement) to get the card details at submit time.
  const elements = useElements();

  // WHY: 'processing' is a boolean flag that tracks whether a payment request is in-flight.
  // We use it to: show a spinner on the button, disable inputs, and prevent double-submitting.
  const [processing, setProcessing] = useState(false);

  // WHY: 'error' stores any error message from Stripe (e.g. "Card declined").
  // It starts as null — no error — and gets set if something goes wrong.
  // TypeScript's `string | null` means it can be either a string OR null.
  const [error, setError] = useState<string | null>(null);

  // WHY: async means this function can use 'await' to pause and wait for promises to resolve.
  // React.FormEvent is the TypeScript type for the browser's form submission event.
  const handleSubmit = async (e: React.FormEvent) => {
    // WHY: e.preventDefault() stops the browser's default form behavior (which would
    // reload the entire page). We want to handle the submission ourselves with JavaScript.
    e.preventDefault();

    // WHY: Safety check — if Stripe or Elements haven't loaded yet (e.g. slow network),
    // we abort early. stripe and elements would be null, and calling methods on null crashes.
    if (!stripe || !elements) return;

    setProcessing(true);  // WHY: Show spinner and disable submit button immediately
    setError(null);        // WHY: Clear any previous error message from a prior failed attempt

    // WHY: elements.getElement(CardElement) retrieves the actual card input component.
    // We need this reference to pass the card data to Stripe when confirming the payment.
    const cardElement = elements.getElement(CardElement);

    // WHY: Another safety check — if the CardElement wasn't found in the DOM (shouldn't happen,
    // but being defensive prevents a crash), we stop processing.
    if (!cardElement) { setProcessing(false); return; }

    // Simulate — in production you'd call your backend for a PaymentIntent clientSecret
    // then: stripe.confirmCardPayment(clientSecret, { payment_method: { card: cardElement } })
    // WHY: In a real app, the flow is:
    //   1. Our backend creates a PaymentIntent and returns a clientSecret
    //   2. We call stripe.confirmCardPayment(clientSecret, { card: cardElement })
    //   3. Stripe charges the card and returns success/failure
    // Here we simulate the network delay with a 1.5 second wait using a Promise + setTimeout.
    await new Promise((r) => setTimeout(r, 1500));

    // For demo: always succeed (test mode simulation)
    setProcessing(false);
    // WHY: Call the parent's onSuccess callback — this triggers handleProcess() in PaymentModal,
    // which moves the step to 'success' and shows the receipt.
    onSuccess();
  };

  return (
    // WHY: onSubmit={handleSubmit} wires the form's native submit event to our custom handler.
    // This fires when the user clicks the submit button OR presses Enter inside the form.
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
          Card Details
        </p>
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
          {/* WHY: <CardElement> renders Stripe's secure card input inside an iframe.
              Because it's an iframe served from Stripe's servers, our code CANNOT read the card
              number — only Stripe can. This is what makes it PCI compliant.
              The options.style controls how the text inside the iframe looks. */}
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '14px',
                  color: '#374151',         // WHY: Dark gray text for readability
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                  // WHY: ::placeholder targets the placeholder text color inside the iframe
                  '::placeholder': { color: '#9ca3af' },
                },
                // WHY: 'invalid' styles apply when Stripe detects the card number is wrong
                // (e.g. wrong checksum). Red color signals an error to the user immediately.
                invalid: { color: '#ef4444' },
              },
              // WHY: Postal code is not required for Indian cards, so we hide that field
              // to keep the form simpler for our users.
              hidePostalCode: true,
            }}
          />
        </div>
        {/* WHY: The test card number 4242 4242 4242 4242 is a special number Stripe provides
            that always succeeds in test/demo mode without a real bank involved. */}
        <p className="text-[10px] text-gray-400 mt-2">
          🔒 Secured by Stripe · Use test card: 4242 4242 4242 4242
        </p>
      </div>

      {/* WHY: "error && (...)" is conditional rendering — this block only appears when
          error is not null. If there's no error, React renders nothing here. */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-xl px-4 py-3">
          {/* WHY: shrink-0 prevents the icon from getting squished if the error text is long */}
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        {/* WHY: type="button" prevents this button from accidentally submitting the form.
            Without this, any button inside a <form> defaults to type="submit". */}
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"       // WHY: type="submit" triggers the form's onSubmit handler when clicked
          className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600"
          loading={processing} // WHY: Shows a spinner and prevents double-clicking during processing
          // WHY: disabled={!stripe} prevents submission if Stripe hasn't loaded yet.
          // !stripe means "stripe is null or undefined" — negated to mean "not ready".
          disabled={!stripe}
        >
          {/* WHY: Ternary operator — show "Processing..." while waiting, otherwise show
              the amount. toLocaleString('en-IN') formats the number in Indian number style:
              e.g. 10000 → "10,000". minimumFractionDigits: 2 ensures "₹100.00" not "₹100". */}
          {processing ? 'Processing...' : `Pay ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
        </Button>
      </div>
    </form>
  );
}
