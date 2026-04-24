import { useEffect, useRef, useState } from 'react';
import { Exponea } from '../../ExponeaImpl';
import { debugLog } from './debug';
import { isFormResponse, type FormResponse } from './types';

export function useFormFetch(
  placeholderId: string,
  onFetchError?: (error: unknown) => void
): { data: FormResponse | null; loading: boolean } {
  const [data, setData] = useState<FormResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const init = async () => {
      try {
        const jsonData = await Exponea.fetchForm(placeholderId);
        isFormResponse(jsonData);
        debugLog('[FormWrapper] Fetched form data:', jsonData);
        if (isMounted.current) setData(jsonData);
      } catch (error) {
        if (isMounted.current) onFetchError?.(error);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    init();

    return () => {
      isMounted.current = false;
    };
  }, [placeholderId]);

  return { data, loading };
}
