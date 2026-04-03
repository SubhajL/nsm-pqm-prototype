'use client';

import { useParams } from 'next/navigation';

export function useRouteProjectId() {
  const params = useParams<{ id?: string | string[] }>();
  const id = params?.id;

  return Array.isArray(id) ? id[0] : id;
}
