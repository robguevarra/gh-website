'use client';

import { useActionState } from 'react'; // Changed from 'react-dom'
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface SettingsFormState {
  status?: 'success' | 'error';
  message?: string;
  timestamp?: number; // Used to ensure useEffect triggers on new submissions
  formType?: string; // To identify which form's toast this is for, if needed
}

const initialState: SettingsFormState = {};

export function SettingsFormWrapper({
  children,
  action,
  formType,
}: {
  children: React.ReactNode;
  action: (prevState: SettingsFormState, formData: FormData) => Promise<SettingsFormState>;
  formType: string; // To pass the formType to the action's initial state if necessary
}) {
  // Pass an initial state that includes the formType, so the action can know it
  // if it's called without formData (though less common for form actions)
  const [state, formAction] = useActionState(action, { ...initialState, formType }); // Changed to useActionState

  useEffect(() => {
    if (!state?.message) return;

    if (state.status === 'success') {
      toast.success(state.message);
    } else if (state.status === 'error') {
      toast.error(state.message);
    }
  }, [state?.message, state?.status, state?.timestamp]); // Depend on timestamp to re-trigger for same status/message

  return <form action={formAction}>{children}</form>;
}
