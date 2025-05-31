'use client';

import { useEffect } from 'react';
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';

/**
 * UserContextFetcher is a client component responsible for triggering the fetch
 * of user context data. It does not render any UI itself.
 * It fetches data if it's missing or stale (older than 5 minutes).
 */
export function UserContextFetcher() {
  const fetchUserContext = useStudentDashboardStore((state) => state.fetchUserContext);
  const userContext = useStudentDashboardStore((state) => state.userContext);
  const lastUserContextLoadTime = useStudentDashboardStore((state) => state.lastUserContextLoadTime);

  useEffect(() => {
    if (!fetchUserContext) {
      // This might happen if the store/actions are not yet fully initialized
      // or if there's a misconfiguration.
      console.warn('UserContextFetcher: fetchUserContext action is not available on the store.');
      return;
    }

    const fiveMinutesInMs = 5 * 60 * 1000;
    const currentTime = Date.now();

    const isDataStale = !lastUserContextLoadTime || (currentTime - lastUserContextLoadTime > fiveMinutesInMs);

    if (!userContext || isDataStale) {
      // console.log('UserContextFetcher: Triggering fetchUserContext.'); // Uncomment for debugging
      fetchUserContext();
    }
  }, [fetchUserContext, userContext, lastUserContextLoadTime]);

  return null; // This component does not render any visible UI
}
