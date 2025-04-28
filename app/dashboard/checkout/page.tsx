import CheckoutForm from '@/components/checkout/CheckoutForm';

export default function CheckoutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>
      {/* Render the client component responsible for showing cart and handling payment */}
      <CheckoutForm />
    </div>
  );
} 