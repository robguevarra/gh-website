'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

// Sample success stories - in a real implementation, these would come from an API
const successStories = [
  {
    id: 1,
    name: 'Sarah Johnson',
    business: 'Elegant Planners Co.',
    testimonial: 'These commercial designs helped me launch my planner business in just 3 weeks! My customers love the professional quality.',
    imageUrl: 'https://images.unsplash.com/photo-1633177317976-3f9bc45e1d1d?q=80&w=1287&auto=format&fit=crop',
    productType: 'planners',
  },
  {
    id: 2,
    name: 'Michael Thomas',
    business: 'Daily Journal Press',
    testimonial: 'I started with just one design and now offer a full range of journals. These licenses were the perfect foundation for my paper business.',
    imageUrl: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?q=80&w=1287&auto=format&fit=crop',
    productType: 'journals',
  },
  {
    id: 3,
    name: 'Emily Zhang',
    business: 'Organized Life Stickers',
    testimonial: 'My sticker business has grown 300% since implementing these designs. The commercial license gave me peace of mind to scale.',
    imageUrl: 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?q=80&w=1287&auto=format&fit=crop',
    productType: 'stickers',
  },
  {
    id: 4,
    name: 'James Wilson',
    business: 'Calendar Creations',
    testimonial: 'These designs gave me a professional edge in the market. My calendars now stand out from the competition with minimal effort.',
    imageUrl: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?q=80&w=1287&auto=format&fit=crop',
    productType: 'calendars',
  },
];

const SuccessShowcase = () => {
  return (
    <div className="py-10">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-serif font-bold text-primary mb-2">Success Stories</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          See how "Papers to Profits" members have transformed these designs into thriving businesses
        </p>
      </div>

      {/* Mobile Carousel */}
      <div className="lg:hidden">
        <Carousel className="w-full max-w-md mx-auto">
          <CarouselContent>
            {successStories.map((story) => (
              <CarouselItem key={story.id}>
                <SuccessCard story={story} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex justify-center mt-4">
            <CarouselPrevious className="relative mr-2" />
            <CarouselNext className="relative" />
          </div>
        </Carousel>
      </div>

      {/* Desktop Grid */}
      <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 px-4">
        {successStories.map((story) => (
          <SuccessCard key={story.id} story={story} />
        ))}
      </div>

      <div className="text-center mt-10">
        <Button 
          variant="outline" 
          className="border-primary text-primary hover:bg-primary/10"
        >
          Create Your Success Story
        </Button>
      </div>
    </div>
  );
};

// Helper component for each success story card
interface SuccessCardProps {
  story: {
    id: number;
    name: string;
    business: string;
    testimonial: string;
    imageUrl: string;
    productType: string;
  };
}

const SuccessCard: React.FC<SuccessCardProps> = ({ story }) => (
  <Card className="overflow-hidden h-full flex flex-col">
    <div className="relative h-48 w-full">
      <Image 
        src={story.imageUrl} 
        alt={`${story.business} product example`} 
        fill 
        style={{ objectFit: 'cover' }} 
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        className="bg-muted/30"
      />
    </div>
    <CardContent className="p-5 flex-grow flex flex-col">
      <h3 className="font-semibold text-primary text-lg">{story.business}</h3>
      <p className="text-sm text-muted-foreground mb-1">by {story.name}</p>
      <p className="text-sm mt-2 flex-grow">{story.testimonial}</p>
      <div className="mt-3">
        <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          {story.productType}
        </span>
      </div>
    </CardContent>
  </Card>
);

export default SuccessShowcase; 