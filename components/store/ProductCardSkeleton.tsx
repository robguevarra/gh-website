'use client';

import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

const ProductCardSkeleton = () => {
  return (
    <Card className="flex flex-col overflow-hidden border border-neutral-200 rounded-lg shadow-sm">
      <CardHeader className="p-0">
        <Skeleton className="aspect-video w-full" />
      </CardHeader>
      <CardContent className="p-4 flex-grow space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
      <CardFooter className="p-4 flex justify-between items-center bg-neutral-50 rounded-b-lg">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-9 w-28" />
      </CardFooter>
    </Card>
  );
};

export default ProductCardSkeleton; 