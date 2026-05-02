'use client';
// WHY: 'use client' marks this as a browser component. Form state (what the user typed)
// only exists in the browser — there's no server-side form interaction here.

import { useState } from 'react';
// WHY: useState lets us track the form's current values. Every time a user types in a
// field, we update state, and React re-renders the input to show the new value.
// This pattern is called a "controlled component" — React controls the input, not the browser.

import { Upload } from 'lucide-react';
// WHY: Upload is an icon used for the image upload button. Even though it's imported,
// it's available if you add an upload button later — not currently rendered but ready to use.

import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
// WHY: These are reusable UI components from our shared component library.
// Using shared components means every input/select/button looks identical across the whole app
// and any styling change in one place automatically applies everywhere.

import type { Product, ProductFormData, ProductCategory } from '@/types';
// WHY: "import type" imports only TypeScript type definitions — no JavaScript code is included.
// Product: describes an existing product from the database (has an id, createdAt, etc.)
// ProductFormData: describes only the fields needed to CREATE or EDIT a product
// ProductCategory: a union type of allowed category strings (e.g. 'beverages' | 'food' | ...)
// Using separate types for "what exists in DB" vs "what the form needs" is good practice.

// WHY: An array of all allowed category values. We loop over this to build the
// dropdown options, so if a new category is added here, it automatically appears in the form.
const CATEGORIES: ProductCategory[] = [
  'beverages', 'food', 'electronics', 'clothing',
  'accessories', 'beauty', 'home', 'sports', 'other',
];

// WHY: This interface defines the "contract" for what props this component accepts.
// Props are how a parent component passes data and functions into a child component.
interface ProductFormProps {
  initial?: Product;    // WHY: "?" means optional. When editing, the parent passes the existing product.
                        //      When creating, this is undefined, so fields start empty.
  onSave: (data: ProductFormData) => Promise<void>; // WHY: The parent provides the save logic.
                        //      This form doesn't know if it's calling a "create" or "update" API —
                        //      the parent decides. This makes the form reusable for both cases.
  onCancel: () => void; // WHY: A function to call when the user clicks Cancel. The parent
                        //      decides what "cancel" means (e.g. close a modal, navigate away).
  loading?: boolean;    // WHY: Optional flag from the parent to show a spinner on the Save button
                        //      while the API request is in-flight.
}

// WHY: We destructure props in the function signature for cleaner code.
export function ProductForm({ initial, onSave, onCancel, loading }: ProductFormProps) {
  // WHY: useState initializes 'form' with all the fields needed to create/edit a product.
  // The initial values come from the 'initial' prop if editing, or sensible defaults if creating.
  // The "??" operator is the "nullish coalescing" operator — it means "use the right side if
  // the left side is null or undefined". So initial?.name ?? '' means:
  //   "use initial.name if it exists, otherwise use an empty string"
  // initial?.name — the "?" after initial is "optional chaining": safely access .name even
  //   if initial is undefined (otherwise you'd get a crash: "Cannot read property 'name' of undefined")
  const [form, setForm] = useState<ProductFormData>({
    name: initial?.name ?? '',
    sku: initial?.sku ?? '',
    category: initial?.category ?? 'other',
    price: initial?.price ?? 0,
    cost: initial?.cost ?? 0,
    stock: initial?.stock ?? 0,
    minStock: initial?.minStock ?? 5,   // WHY: Default alert threshold — warn when stock falls below 5
    image: initial?.image ?? '',
    description: initial?.description ?? '',
    taxable: initial?.taxable ?? true,  // WHY: Default to taxable since most products are taxed
    active: initial?.active ?? true,    // WHY: New products are active by default — ready for sale
  });

  // WHY: This helper function updates a single field in the form state without overwriting the others.
  // keyof ProductFormData is a TypeScript feature — it means 'key' can only be one of the
  // field names that exist in ProductFormData (like 'name', 'price', etc.), not any random string.
  // (f) => ({ ...f, [key]: value }) is a "spread" update:
  //   ...f copies all existing fields, then [key]: value overwrites just the one we're changing.
  // This is necessary because useState replaces the whole object — you can't partially update it.
  const set = (key: keyof ProductFormData, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  // WHY: async so we can await the onSave API call. The parent's onSave might be slow (network call).
  const handleSubmit = async (e: React.FormEvent) => {
    // WHY: Prevent the browser's default form submit behavior (page reload).
    // We handle submission ourselves using JavaScript.
    e.preventDefault();
    // WHY: Pass the entire form object to the parent's onSave function.
    // The parent decides whether to call the "create product" or "update product" API.
    await onSave(form);
  };

  return (
    // WHY: onSubmit={handleSubmit} connects the HTML form element's submit event to our handler.
    // space-y-5 adds vertical spacing between form sections using Tailwind CSS.
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* WHY: grid with cols-2 on larger screens arranges inputs side by side to save vertical space.
          On small screens (mobile), it falls back to a single column. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Product Name"
          value={form.name}             // WHY: Controlled input — value comes from React state
          onChange={(e) => set('name', e.target.value)} // WHY: On every keystroke, update state
          placeholder="Espresso Shot"   // WHY: Placeholder text shows an example to guide the user
          required                      // WHY: HTML5 validation — browser prevents submit if empty
        />
        <Input
          label="SKU"
          value={form.sku}
          onChange={(e) => set('sku', e.target.value)}
          placeholder="BEV-001"         // WHY: Shows the expected format (category prefix + number)
          required
        />
        <Select
          label="Category"
          value={form.category}
          // WHY: "as ProductCategory" is a TypeScript type assertion — we tell TypeScript
          // "trust me, e.target.value will always be a valid ProductCategory string here".
          // The browser guarantees this because the options are built from CATEGORIES array.
          onChange={(e) => set('category', e.target.value as ProductCategory)}
        >
          {/* WHY: .map() transforms the CATEGORIES array into an array of <option> elements.
              key={c} is required for React to efficiently update the list if it changes.
              'capitalize' CSS class makes 'beverages' display as 'Beverages'. */}
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="capitalize">{c}</option>
          ))}
        </Select>
        <Input
          label="Price (₹)"
          type="number"
          min={0}                        // WHY: HTML5 form validation — prevents negative prices
          step={0.01}                    // WHY: Allows decimal values like 99.99, not just whole numbers
          value={form.price}
          // WHY: parseFloat converts the string from the input to a number.
          // Inputs always return strings — even type="number". parseFloat("99.99") → 99.99
          // "|| 0" means "use 0 if parseFloat returns NaN (Not a Number) for empty input"
          onChange={(e) => set('price', parseFloat(e.target.value) || 0)}
          required
        />
        <Input
          label="Cost (₹)"
          type="number"
          min={0}
          step={0.01}
          value={form.cost}
          onChange={(e) => set('cost', parseFloat(e.target.value) || 0)}
          // WHY: Cost is not required because it's internal (used for profit margin calculation),
          // not shown to customers. Some stores may not track cost.
        />
        <Input
          label="Stock Quantity"
          type="number"
          min={0}
          value={form.stock}
          // WHY: parseInt for whole numbers — you can't have 1.5 units of a physical product.
          onChange={(e) => set('stock', parseInt(e.target.value) || 0)}
          required
        />
        <Input
          label="Min Stock Alert"
          type="number"
          min={0}
          value={form.minStock}
          // WHY: When stock falls below this number, the system flags it as "low stock".
          // parseInt because this is also a whole number quantity.
          onChange={(e) => set('minStock', parseInt(e.target.value) || 0)}
        />
        <Input
          label="Image URL"
          value={form.image}
          onChange={(e) => set('image', e.target.value)}
          placeholder="https://..."     // WHY: Hint that we expect a full web URL, not a file path
        />
      </div>

      <div>
        {/* WHY: We use a plain HTML <label> here because our shared Input component doesn't
            support the multiline textarea variant. The label is manually styled to match. */}
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
          Description
        </label>
        {/* WHY: <textarea> instead of <input> because descriptions can be multi-line.
            rows={3} sets the initial visible height. resize-none prevents users from
            dragging to resize it, which would break the layout. */}
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Product description..."
          rows={3}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
        />
      </div>

      {/* Image preview — only shows when a URL has been entered */}
      {/* WHY: form.image && (...) is conditional rendering — if form.image is an empty string
          (falsy), React renders nothing. Once the user types a URL, the preview appears.
          This gives instant visual feedback: "does this URL actually point to an image?" */}
      {form.image && (
        <div className="rounded-xl overflow-hidden h-32 bg-gray-100 dark:bg-gray-800">
          {/* WHY: object-cover fills the container while maintaining aspect ratio,
              cropping the image if needed. Without it, images would stretch or squish. */}
          <img src={form.image} alt="preview" className="w-full h-full object-cover" />
        </div>
      )}

      {/* WHY: Checkboxes use 'checked' instead of 'value' for controlled inputs.
          e.target.checked returns true/false (boolean) instead of a string. */}
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          {/* WHY: cursor-pointer on the label makes the whole label area clickable (not just the checkbox),
              which is a UX improvement — easier to click on touch devices. */}
          <input
            type="checkbox"
            checked={form.taxable}
            onChange={(e) => set('taxable', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Taxable</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => set('active', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          {/* WHY: "Active" means this product appears in search results and can be sold.
              Inactive products are hidden from the POS without being deleted from the database. */}
          <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
        </label>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        {/* WHY: type="button" prevents this button from triggering form submission.
            Without it, React would treat it as a submit button by default. */}
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>
          {/* WHY: Ternary to show different button labels for edit vs create.
              'initial' exists when editing an existing product, undefined when creating a new one. */}
          {initial ? 'Save Changes' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
