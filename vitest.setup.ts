// Global Vitest setup
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { randomUUID } from 'crypto';

// Extend Vitest's expect with Testing Library matchers
expect.extend(matchers);

// Mock UUID generation for consistent testing
vi.mock('uuid', () => ({
  v4: () => '00000000-0000-0000-0000-000000000000'
}));

// Clean up after each test
afterEach(() => {
  cleanup();
});
