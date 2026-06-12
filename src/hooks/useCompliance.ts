'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost } from '@/lib/api-client';
import type { EnvironmentalAssessment } from '@/types/environmental-assessment';
import type { CreateEnvironmentalAssessmentRequest } from '@/types/environmental-assessment.schema';
import type { LandAcquisitionRecord } from '@/types/land-acquisition';
import type { CreateLandAcquisitionRequest } from '@/types/land-acquisition.schema';
import type { Permit } from '@/types/permit';
import type { CreatePermitRequest } from '@/types/permit.schema';
import type { PublicHearing } from '@/types/public-hearing';
import type { CreatePublicHearingRequest } from '@/types/public-hearing.schema';

/* ── Permits (ใบอนุญาต) ──────────────────────────────────────────────── */

export function usePermits(projectId: string | undefined) {
  return useQuery<Permit[]>({
    queryKey: ['permits', projectId],
    queryFn: () => apiGet<Permit[]>(`/permits/${projectId}`),
    enabled: !!projectId,
  });
}

export function useCreatePermit(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<Permit, Error, CreatePermitRequest>({
    mutationFn: (payload) => apiPost<Permit>(`/permits/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['permits', projectId] });
    },
  });
}

/* ── Public hearings (ประชาพิจารณ์) ──────────────────────────────────── */

export function usePublicHearings(projectId: string | undefined) {
  return useQuery<PublicHearing[]>({
    queryKey: ['publicHearings', projectId],
    queryFn: () => apiGet<PublicHearing[]>(`/public-hearings/${projectId}`),
    enabled: !!projectId,
  });
}

export function useCreatePublicHearing(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<PublicHearing, Error, CreatePublicHearingRequest>({
    mutationFn: (payload) =>
      apiPost<PublicHearing>(`/public-hearings/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['publicHearings', projectId] });
    },
  });
}

/* ── Land acquisition (การจัดหาที่ดิน) ───────────────────────────────── */

export function useLandAcquisition(projectId: string | undefined) {
  return useQuery<LandAcquisitionRecord[]>({
    queryKey: ['landAcquisition', projectId],
    queryFn: () =>
      apiGet<LandAcquisitionRecord[]>(`/land-acquisition/${projectId}`),
    enabled: !!projectId,
  });
}

export function useCreateLandAcquisition(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<LandAcquisitionRecord, Error, CreateLandAcquisitionRequest>({
    mutationFn: (payload) =>
      apiPost<LandAcquisitionRecord>(`/land-acquisition/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['landAcquisition', projectId] });
    },
  });
}

/* ── Environmental assessments (EIA / IEE) ───────────────────────────── */

export function useEnvironmentalAssessments(projectId: string | undefined) {
  return useQuery<EnvironmentalAssessment[]>({
    queryKey: ['environmentalAssessments', projectId],
    queryFn: () =>
      apiGet<EnvironmentalAssessment[]>(`/environmental-assessments/${projectId}`),
    enabled: !!projectId,
  });
}

export function useCreateEnvironmentalAssessment(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    EnvironmentalAssessment,
    Error,
    CreateEnvironmentalAssessmentRequest
  >({
    mutationFn: (payload) =>
      apiPost<EnvironmentalAssessment>(
        `/environmental-assessments/${projectId}`,
        payload,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['environmentalAssessments', projectId],
      });
    },
  });
}
