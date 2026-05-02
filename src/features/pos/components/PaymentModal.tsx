'use client';

import { useState } from 'react';
import { CheckCircle2, Printer, Download, ArrowRight } from 'lucide-react';
import { Elements } from '@stripe/react-stripe-js';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';
import { useCartStore } from '@/store/cartStore';
import { stripePromise } from '@/lib/stripe';
import { StripeCardForm } from './StripeCardForm';
import type { Order } from '@/types';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  createdOrder?: Order;
}

type Step = 'confirm' | 'processing' | 'success';

const PAYMENT_ICONS = { cash: '💵', card: '💳', upi: '📱' };
const PAYMENT_LABELS = { cash: 'Cash Payment', card: 'Card Payment', upi: 'UPI Payment' };

export function PaymentModal({ open, onClose, onConfirm, createdOrder }: PaymentModalProps) {
  const { items, paymentMethod, subtotal, discountAmount, taxAmount, total, taxRate, discount } =
    useCartStore();
  const [step, setStep] = useState<Step>('confirm');
  const [cashInput, setCashInput] = useState('');

  const handleProcess = async () => {
    setStep('processing');
    try {
      await onConfirm();
      setStep('success');
    } catch {
      setStep('confirm');
    }
  };

  const handleClose = () => {
    setStep('confirm');
    setCashInput('');
    onClose();
  };

  const cashGiven = parseFloat(cashInput) || 0;
  const change = cashGiven - total();

  if (step === 'success' && createdOrder) {
    return (
      <Modal open={open} onClose={handleClose} size="md">
        <div className="flex flex-col items-center text-center py-4">
          <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Payment Successful!</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Order <span className="font-mono font-semibold text-indigo-600">{createdOrder.orderNumber}</span> completed
          </p>

          {/* Invoice preview */}
          <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl p-5 text-left mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest">Receipt</p>
                <p className="font-mono text-sm font-bold text-indigo-600">{createdOrder.orderNumber}</p>
              </div>
              <p className="text-xs text-gray-400">{formatDateTime(createdOrder.createdAt)}</p>
            </div>

            <div className="space-y-1.5 mb-4">
              {createdOrder.items.map((item) => (
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
              <Badge variant="primary" className="capitalize">
                {PAYMENT_ICONS[createdOrder.paymentMethod]} {createdOrder.paymentMethod}
              </Badge>
            </div>

            {paymentMethod === 'cash' && cashGiven > 0 && (
              <div className="mt-2 flex justify-between text-sm font-medium">
                <span className="text-gray-500">Change</span>
                <span className="text-emerald-600">{formatCurrency(Math.max(0, change))}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 w-full">
            <Button variant="secondary" size="md" className="flex-1" leftIcon={<Printer className="h-4 w-4" />}>
              Print
            </Button>
            <Button variant="secondary" size="md" className="flex-1" leftIcon={<Download className="h-4 w-4" />}>
              Download
            </Button>
            <Button size="md" className="flex-1" onClick={handleClose} rightIcon={<ArrowRight className="h-4 w-4" />}>
              New Sale
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Confirm Payment"
      description={`${PAYMENT_ICONS[paymentMethod]} ${PAYMENT_LABELS[paymentMethod]}`}
      size="sm"
    >
      {step === 'processing' ? (
        <div className="flex flex-col items-center py-8 gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Processing payment...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Order summary */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
            {items.map((item) => (
              <div key={item.product.id} className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{item.product.name} × {item.quantity}</span>
                <span>{formatCurrency(item.product.price * item.quantity * (1 - item.discount / 100))}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 space-y-1">
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

          {/* Cash change calculator */}
          {paymentMethod === 'cash' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Cash received
              </label>
              <input
                type="number"
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
                placeholder={`Min. ${formatCurrency(total())}`}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-lg font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              {cashGiven > 0 && (
                <div className="flex justify-between text-sm font-medium px-1">
                  <span className="text-gray-500">Change to return</span>
                  <span className={change >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                    {formatCurrency(Math.max(0, change))}
                  </span>
                </div>
              )}
            </div>
          )}

          {paymentMethod === 'card' && (
            <Elements stripe={stripePromise}>
              <StripeCardForm
                amount={total()}
                onSuccess={handleProcess}
                onCancel={handleClose}
              />
            </Elements>
          )}

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

          {paymentMethod !== 'card' && (
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleProcess}
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
