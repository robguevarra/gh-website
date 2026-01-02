import { PublicCheckoutForm } from '@/components/advent/PublicCheckoutForm';
import { getAdventProductByHandle } from '@/app/actions/store-actions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageProps {
    searchParams: Promise<{ product?: string }>;
}

export default async function AdventCheckoutPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const productHandle = params.product;

    if (!productHandle) {
        redirect('/advent');
    }

    const product = await getAdventProductByHandle(productHandle);

    if (!product) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
                    <h1 className="text-2xl font-serif text-slate-800 mb-2">Product Not Found</h1>
                    <p className="text-slate-500 mb-6">We couldn't find the gift you're looking for. It might have expired or been moved.</p>
                    <Link href="/advent" className="text-brand-purple hover:underline dark:text-brand-pink">
                        Back to Calendar
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Simple Header */}
            <header className="bg-white border-b border-slate-100 py-4 px-6 fixed top-0 w-full z-50">
                <div className="max-w-6xl mx-auto flex items-center">
                    <Link href="/advent" className="flex items-center text-slate-500 hover:text-brand-purple transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">Back to Calendar</span>
                    </Link>
                    <div className="flex-1 text-center pr-24 hidden md:block">
                        {/* Logo Placeholder or Brand Name */}
                        <span className="font-serif text-xl text-brand-purple">Graceful Homeschooling</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 pt-24 pb-12 px-4 flex items-center justify-center">
                <PublicCheckoutForm product={product} />
            </main>
        </div>
    );
}
