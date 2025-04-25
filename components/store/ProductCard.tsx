'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ProductData } from '@/app/dashboard/store/page'; // Import type from page
// Import cart store action
import { useCartStore } from '@/stores/cartStore'; 
// Optional: Import toast for user feedback
// import { useToast } from "@/components/ui/use-toast"; 
// Optional: Import loading icon
// import { Loader2 } from 'lucide-react';
// Font import might be needed if not global
// import { Playfair_Display } from 'next/font/google';
// const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] });

interface ProductCardProps {
  product: ProductData;
}

// Helper to format currency
const formatPrice = (price: number | null): string => {
  if (price === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD', // TODO: Make currency dynamic if needed
  }).format(price);
};

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  // Get addItem action from cart store
  const addItem = useCartStore((state) => state.addItem); 
  // Optional: For showing feedback
  // const { toast } = useToast(); 
  // Optional: For loading state
  // const [isAddingToCart, setIsAddingToCart] = React.useState(false);

  const handleAddToCart = () => {
    // Optional: Set loading state
    // setIsAddingToCart(true);

    // Call the addItem action from the cart store
    addItem({
      productId: product.id,
      // quantity: 1, // Quantity is handled by the store logic (defaults to 1)
      title: product.title || 'Untitled Product', // Provide default title
      price: product.price, // Price is now guaranteed non-null by ProductData type
      imageUrl: product.featured_image_url || '', // Provide default empty string
    });

    console.log('Added to cart:', product.id, product.title); // Keep console log for debugging

    // Optional: Show success feedback
    // toast({
    //   title: "Added to Cart",
    //   description: `${product.title || 'Product'} has been added to your cart.`,
    // });

    // Optional: Reset loading state after a short delay
    // setTimeout(() => setIsAddingToCart(false), 500); 
  };

  return (
    <Card className="flex flex-col overflow-hidden border border-neutral-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Apply subtle border and hover shadow */}
      <CardHeader className="p-0">
        <div className="aspect-video relative w-full">
          {product.featured_image_url ? (
            <Image
              src={product.featured_image_url}
              alt={product.title || 'Product image'}
              fill
              style={{ objectFit: 'cover' }} // Use fill and objectFit
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw" // Basic responsive sizes
            />
          ) : (
            <div className="aspect-video bg-neutral-100 flex items-center justify-center">
              <span className="text-neutral-500 text-sm">No Image</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        {/* Apply Playfair Display font to title if desired, ensure font is loaded globally or imported */}
        <CardTitle 
          // className={`text-lg font-bold mb-1 line-clamp-2 font-serif`} // Example using font-serif assuming Playfair is default serif
          // className={`text-lg font-bold mb-1 line-clamp-2 ${playfair.className}`} // Example using specific import
           className="text-lg font-semibold mb-1 line-clamp-2" // Keeping default sans-serif (Inter) for now unless specified
        >
          {product.title || 'Untitled Product'}
        </CardTitle>
        {/* Add description if available in ProductData later */}
        {/* <CardDescription className="text-sm line-clamp-3">{product.description}</CardDescription> */}
      </CardContent>
      <CardFooter className="p-4 flex justify-between items-center bg-neutral-50 rounded-b-lg">
        {/* Lighter background for footer */}
        <span className="text-lg font-semibold text-neutral-800">{formatPrice(product.price)}</span>
        <Button 
          onClick={handleAddToCart} 
          // Apply primary purple color - Assuming a bg-primary or similar class exists defined with HSL value
          // If using TailwindCSS color mapping in tailwind.config.ts:
          // className="bg-primary text-primary-foreground hover:bg-primary/90"
          // Or using direct HSL (less ideal):
          // style={{ backgroundColor: 'hsl(315 15% 60%)', color: 'white' }} 
        >
          {/* {isAddingToCart ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} */}
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard; 