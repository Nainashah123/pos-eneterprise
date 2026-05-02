'use client';

import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/Button';
import { AlertCircle } from 'lucide-react';

interface StripeCardFormProps {
  amount: number; // in rupees
  onSuccess: () => void;
  onCancel: () => void;
}

export function StripeCardForm({ amount, onSuccess, onCancel }: StripeCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) { setProcessing(false); return; }

    // Simulate — in production you'd call your backend for a PaymentIntent clientSecret
    // then: stripe.confirmCardPayment(clientSecret, { payment_method: { card: cardElement } })
    await new Promise((r) => setTimeout(r, 1500));

    // For demo: always succeed (test mode simulation)
    setProcessing(false);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
          Card Details
        </p>
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '14px',
                  color: '#374151',
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                  '::placeholder': { color: '#9ca3af' },
                },
                invalid: { color: '#ef4444' },
              },
              hidePostalCode: true,
            }}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-2">
          🔒 Secured by Stripe · Use test card: 4242 4242 4242 4242
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-xl px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600"
          loading={processing}
          disabled={!stripe}
        >
          {processing ? 'Processing...' : `Pay ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
        </Button>
      </div>
    </form>
  );
}
