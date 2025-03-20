'use client';

import { createContext, useContext, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Create Supabase client context
type SupabaseContext = {
  supabase: SupabaseClient<Database>;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

// Provider props
interface SupabaseProviderProps {
  children: React.ReactNode;
}

// Provider component - used in layout to wrap entire app
export default function SupabaseProvider({ children }: SupabaseProviderProps) {
  // Create Supabase client instance
  const [supabase] = useState(() => createBrowserSupabaseClient());

  return (
    <Context.Provider value={{ supabase }}>
      {children}
    </Context.Provider>
  );
}

// Hook to use the Supabase client
export const useSupabase = () => {
  const context = useContext(Context);
  
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  
  return context;
}; 