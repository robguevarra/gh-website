// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
// jest.setup.js
import '@testing-library/jest-dom/extend-expect';

// Mock Next.js router
jest.mock('next/router', () => require('next-router-mock'));

// Mock next/navigation hooks
jest.mock('next/navigation', () => {
  const actual = jest.requireActual('next/navigation');
  return {
    ...actual,
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '',
  };
});

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ data: {}, error: null })),
          maybeSingle: jest.fn(() => ({ data: {}, error: null })),
        })),
        in: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({ data: [], error: null })),
          })),
        })),
      })),
      insert: jest.fn(() => ({ select: jest.fn() })),
      update: jest.fn(() => ({ eq: jest.fn() })),
      delete: jest.fn(() => ({ eq: jest.fn() })),
    })),
  }))
}));

// Mock environment variables
process.env.NETWORK_POSTBACK_URL_TEMPLATE = 'https://example.com/postback/{network_subid}?conversionId={conversion_id}';

// Global beforeEach
beforeEach(() => {
  jest.clearAllMocks();
});
