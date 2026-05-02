'use client';
// WHY: 'use client' tells Next.js this component runs in the browser, not on the server.
// React hooks like useState only work in the browser, so this directive is required.

import { useState } from 'react';
// WHY: useState is a React hook that lets a component remember values between re-renders.
// Without it, any variable you set would be forgotten the moment React redraws the screen.

import { CheckCircle2, Printer, Download, ArrowRight } from 'lucide-react';
// WHY: lucide-react is an icon library. We import only the icons we need so the final
// JavaScript bundle stays small (tree-shaking). Each icon is just a tiny SVG component.

import { Elements } from '@stripe/react-stripe-js';
// WHY: Stripe's <Elements> is a "provider" component — it creates a secure Stripe context
// that all child components (like StripeCardForm) can access. Without wrapping with
// <Elements>, Stripe's hooks like useStripe() would have nothing to connect to.

import { Modal } from '@/components/ui/Modal';
// WHY: We reuse a shared Modal component instead of building a new dialog from scratch.
// This keeps UI consistent and saves time — the open/close logic is already handled.

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
// WHY: Reusable UI components (Button, Badge) ensure every button in the app looks and
// behaves the same way — same hover effects, same loading spinner, same styling rules.

import { formatCurrency, formatDateTime } from '@/lib/utils/format';
// WHY: Helper functions like formatCurrency turn a raw number (e.g. 199.9) into a
// properly formatted string (e.g. "₹199.90") everywhere in the app consistently.

import { useCartStore } from '@/store/cartStore';
// WHY: useCartStore is a Zustand global state hook. The cart (items, totals, payment method)
// lives in a central "store" so any component can read it without prop-drilling.
// Prop-drilling means passing data through many parent→child layers, which gets messy.

import { stripePromise } from '@/lib/stripe';
// WHY: stripePromise loads the Stripe.js library asynchronously. It's created once at the
// module level (outside any component) so Stripe isn't re-loaded on every render.

import { StripeCardForm } from './StripeCardForm';
// WHY: We split the card input into its own file because it has its own logic (Stripe hooks,
// error handling). Keeping components small and focused makes them easier to understand.

import type { Order } from '@/types';
// WHY: "import type" imports only the TypeScript type definition, not any runtime code.
// This is a TypeScript feature: we describe what an Order object looks like so the
// compiler can catch mistakes (e.g. accessing a field that doesn't exist).

// WHY: An interface describes the "shape" of the props this component expects to receive.
// Props are values passed into a component from its parent, like arguments to a function.
interface PaymentModalProps {
  open: boolean;          // WHY: Controls whether the modal is visible or hidden
  onClose: () => void;    // WHY: A callback function the parent provides to close the modal
  onConfirm: () => Promise<void>; // WHY: async function that actually submits the order to the backend
  createdOrder?: Order;   // WHY: The "?" means this prop is optional — it only exists after payment succeeds
}

// WHY: A TypeScript "type alias" defines the exact allowed string values for the modal's
// current step. Using a union type ('confirm' | 'processing' | 'success') means TypeScript
// will error if you accidentally set step to any other string — great safety net.
type Step = 'confirm' | 'processing' | 'success';

// WHY: Object literals used as lookup tables (dictionaries) are cleaner than if/else chains.
// PAYMENT_ICONS['cash'] returns '💵' instead of writing the same if-else in multiple places.
const PAYMENT_ICONS = { cash: '💵', card: '💳', upi: '📱' };
const PAYMENT_LABELS = { cash: 'Cash Payment', card: 'Card Payment', upi: 'UPI Payment' };

// WHY: We destructure props directly in the function signature — this is shorthand for
// writing `const { open, onClose, onConfirm, createdOrder } = props;` inside the function.
export function PaymentModal({ open, onClose, onConfirm, createdOrder }: PaymentModalProps) {
  // WHY: useCartStore() connects this component to the global cart state. Any time the
  // cart changes (item added, payment method changed), this component re-renders automatically.
  const { items, paymentMethod, subtotal, discountAmount, taxAmount, total, taxRate, discount } =
    useCartStore();

  // WHY: useState<Step>('confirm') creates a state variable 'step' initialized to 'confirm'.
  // 'setStep' is the setter function. When setStep is called, React re-renders this component.
  // The <Step> type annotation means only 'confirm', 'processing', or 'success' are valid.
  const [step, setStep] = useState<Step>('confirm');

  // WHY: cashInput stores what the cashier types into the "Cash received" field.
  // It starts empty — the customer hasn't handed over money yet.
  const [cashInput, setCashInput] = useState('');

  // WHY: async functions can "await" slow operations (like network calls) without freezing
  // the browser. The function pauses at each 'await' until that operation completes.
  const handleProcess = async () => {
    setStep('processing'); // WHY: Show the spinner immediately so the user knows something is happening
    try {
      await onConfirm(); // WHY: Call the parent's function to send the order to the backend API
      setStep('success'); // WHY: Only set success if no error was thrown
    } catch {
      // WHY: If the API call throws an error, go back to 'confirm' so the user can retry
      setStep('confirm');
    }
  };

  // WHY: When the modal closes we reset all local state. Otherwise, the next time the modal
  // opens it would still show the old cash amount and the wrong step.
  const handleClose = () => {
    setStep('confirm');
    setCashInput('');
    onClose(); // WHY: Tell the parent component to hide the modal
  };

  // WHY: parseFloat converts the string from the text input to a decimal number.
  // The "|| 0" fallback means: if the input is empty or not a number, use 0 instead of NaN.
  const cashGiven = parseFloat(cashInput) || 0;

  // WHY: Change = money given minus the order total. This tells us how much to return.
  const change = cashGiven - total();

  // WHY: This is "conditional rendering" — we return a completely different JSX tree
  // when the payment is done. React will only render ONE of these returns.
  // The && in JSX means "render this only if the left side is truthy".
  if (step === 'success' && createdOrder) {
    return (
      <Modal open={open} onClose={handleClose} size="md">
        <div className="flex flex-col items-center text-center py-4">
          {/* WHY: A green circle icon gives instant visual feedback that payment worked.
              Users shouldn't have to read text to know if something succeeded or failed. */}
          <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Payment Successful!</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            {/* WHY: We display the order number so the cashier can reference it on a physical receipt.
                font-mono uses a monospace font — every character is the same width, making codes easier to read. */}
            Order <span className="font-mono font-semibold text-indigo-600">{createdOrder.orderNumber}</span> completed
          </p>

          {/* Invoice preview */}
          <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl p-5 text-left mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest">Receipt</p>
                <p className="font-mono text-sm font-bold text-indigo-600">{createdOrder.orderNumber}</p>
              </div>
              {/* WHY: We show when the order happened. formatDateTime converts an ISO date
                  string like "2024-01-15T10:30:00Z" into something readable like "Jan 15, 10:30 AM" */}
              <p className="text-xs text-gray-400">{formatDateTime(createdOrder.createdAt)}</p>
            </div>

            {/* WHY: .map() loops through an array and returns JSX for each element.
                This is how React renders lists — it transforms data into UI. */}
            <div className="space-y-1.5 mb-4">
              {createdOrder.items.map((item) => (
                // WHY: 'key' is required when rendering lists. React uses it to track which
                // item is which when the list updates, avoiding unnecessary re-renders.
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="font-medium text-gray-800 dark:text-white">
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>{formatCurrency(createdOrder.subtotal)}</span>
              </div>
              {/* WHY: createdOrder.discount > 0 && (...) is conditional rendering using &&.
                  The discount row only appears when there actually IS a discount.
                  Showing "Discount: ₹0" when there's no discount would confuse users. */}
              {createdOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span><span>-{formatCurrency(createdOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>Tax</span><span>{formatCurrency(createdOrder.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2 mt-1">
                <span>Total</span><span>{formatCurrency(createdOrder.total)}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-gray-500">Paid via</span>
              {/* WHY: 'capitalize' makes the first letter uppercase via CSS, so "cash" displays as "Cash" */}
              <Badge variant="primary" className="capitalize">
                {PAYMENT_ICONS[createdOrder.paymentMethod]} {createdOrder.paymentMethod}
              </Badge>
            </div>

            {/* WHY: We only show the change row for cash payments where the cashier entered an amount.
                Card/UPI have no concept of "change to give back". */}
            {paymentMethod === 'cash' && cashGiven > 0 && (
              <div className="mt-2 flex justify-between text-sm font-medium">
                <span className="text-gray-500">Change</span>
                {/* WHY: Math.max(0, change) prevents showing negative change if cashGiven < total.
                    This shouldn't happen (button is disabled for that case), but it's a safety net. */}
                <span className="text-emerald-600">{formatCurrency(Math.max(0, change))}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 w-full">
            {/* WHY: Print/Download are placeholder actions for future receipt features.
                They're shown here so the UI feels complete even before the feature is built. */}
            <Button variant="secondary" size="md" className="flex-1" leftIcon={<Printer className="h-4 w-4" />}>
              Print
            </Button>
            <Button variant="secondary" size="md" className="flex-1" leftIcon={<Download className="h-4 w-4" />}>
              Download
            </Button>
            {/* WHY: "New Sale" closes this modal and resets state so the cashier
                can immediately start the next transaction. */}
            <Button size="md" className="flex-1" onClick={handleClose} rightIcon={<ArrowRight className="h-4 w-4" />}>
              New Sale
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // WHY: If not in 'success' state, we render the confirmation/processing view instead.
  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Confirm Payment"
      // WHY: Template literals (backtick strings) let us embed expressions with ${} inside a string.
      // This builds the description like "💵 Cash Payment" dynamically from the paymentMethod.
      description={`${PAYMENT_ICONS[paymentMethod]} ${PAYMENT_LABELS[paymentMethod]}`}
      size="sm"
    >
      {/* WHY: Ternary operator — condition ? valueIfTrue : valueIfFalse.
          This is conditional rendering: show the spinner WHILE processing, else show the form. */}
      {step === 'processing' ? (
        <div className="flex flex-col items-center py-8 gap-4">
          {/* WHY: A spinning circle (loading indicator) reassures users the app hasn't frozen.
              animate-spin is a Tailwind CSS class that rotates the element continuously.
              border-t-transparent creates the "gap" in the circle to make it look like a spinner. */}
          <div className="h-12 w-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Processing payment...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Order summary — shows what is being purchased before the user confirms */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
            {items.map((item) => (
              <div key={item.product.id} className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{item.product.name} × {item.quantity}</span>
                {/* WHY: Price calculation: price × quantity, then multiplied by (1 - discount/100).
                    Example: ₹100 item, 10% discount → 100 × 1 × (1 - 10/100) = ₹90 */}
                <span>{formatCurrency(item.product.price * item.quantity * (1 - item.discount / 100))}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 space-y-1">
              {/* WHY: discountAmount() is a function from Zustand store that computes the total discount.
                  We only show this row when there's actually a discount greater than zero. */}
              {discountAmount() > 0 && (
                <div className="flex justify-between text-emerald-600 text-xs">
                  <span>Discount ({discount}%)</span>
                  <span>-{formatCurrency(discountAmount())}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500 text-xs">
                <span>Tax ({taxRate}%)</span>
                <span>{formatCurrency(taxAmount())}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-gray-900 dark:text-white">
                <span>Total</span>
                <span className="text-indigo-600">{formatCurrency(total())}</span>
              </div>
            </div>
          </div>

          {/* Cash change calculator — only shown when payment method is cash */}
          {/* WHY: paymentMethod === 'cash' && (...) means "only render this block for cash payments".
              Card and UPI payments don't need a cash amount input. */}
          {paymentMethod === 'cash' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Cash received
              </label>
              <input
                type="number"
                value={cashInput}
                // WHY: onChange fires every time the user types a character. We update cashInput
                // state with e.target.value (the current text in the input field).
                // This is called a "controlled input" — React owns the value, not the browser.
                onChange={(e) => setCashInput(e.target.value)}
                placeholder={`Min. ${formatCurrency(total())}`}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-lg font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              {/* WHY: We only show the change amount once the cashier has typed something.
                  cashGiven > 0 ensures we don't show "Change: ₹0.00" before they type. */}
              {cashGiven > 0 && (
                <div className="flex justify-between text-sm font-medium px-1">
                  <span className="text-gray-500">Change to return</span>
                  {/* WHY: Ternary for dynamic color — green if they gave enough, red if not enough.
                      This gives instant visual feedback without a separate error message. */}
                  <span className={change >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                    {formatCurrency(Math.max(0, change))}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* WHY: For card payments, we wrap StripeCardForm inside Stripe's <Elements> provider.
              Elements sets up the secure Stripe context (iframe, encryption keys) that
              StripeCardForm needs to safely capture card data without it ever touching our server. */}
          {paymentMethod === 'card' && (
            <Elements stripe={stripePromise}>
              <StripeCardForm
                amount={total()}
                onSuccess={handleProcess} // WHY: When Stripe says payment OK, proceed with the order
                onCancel={handleClose}    // WHY: If user cancels, close the whole modal
              />
            </Elements>
          )}

          {/* WHY: UPI section shows a QR code placeholder. In production this would contain
              a real payment QR. For now it's a UI stub showing what the feature will look like. */}
          {paymentMethod === 'upi' && (
            <div className="bg-violet-50 dark:bg-violet-950/30 rounded-xl p-4 text-center space-y-2">
              <div className="text-4xl">📱</div>
              <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                Scan QR to pay {formatCurrency(total())}
              </p>
              <div className="h-28 w-28 mx-auto bg-white dark:bg-gray-800 rounded-xl border-2 border-violet-200 dark:border-violet-800 flex items-center justify-center text-gray-400 text-xs">
                QR Code Placeholder
              </div>
            </div>
          )}

          {/* WHY: Card payments have their own submit button inside StripeCardForm,
              so we hide this button row for card. For cash and UPI we show Cancel + Confirm. */}
          {paymentMethod !== 'card' && (
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleProcess}
                // WHY: For cash payments, disable the button until the cashier has given
                // enough money. cashGiven < total() returns true when not enough cash is entered,
                // making disabled={true}, which greys out the button and prevents clicking.
                disabled={paymentMethod === 'cash' && cashGiven < total()}
              >
                Confirm Payment
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
