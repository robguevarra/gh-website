import React from 'react';

export const metadata = {
  title: 'Courses | Graceful Homeschooling',
  description: 'Browse our selection of homeschooling courses',
};

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background">
      {children}
    </main>
  );
} 