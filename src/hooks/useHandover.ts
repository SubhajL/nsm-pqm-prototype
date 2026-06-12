'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost } from '@/lib/api-client';
import type { AsBuiltDrawing } from '@/types/as-built-drawing';
import type { CreateAsBuiltDrawingRequest } from '@/types/as-built-drawing.schema';
import type { AssetRegistration } from '@/types/asset-registration';
import type { CreateAssetRegistrationRequest } from '@/types/asset-registration.schema';
import type { HandoverPacket, HandoverState } from '@/types/handover-packet';
import type { CreateHandoverPacketRequest } from '@/types/handover-packet.schema';
import type { OmManualEntry } from '@/types/om-manual';
import type { CreateOmManualEntryRequest } from '@/types/om-manual.schema';

/* ── Handover packets (ชุดส่งมอบ-รับมอบ) ─────────────────────────────── */

export function useHandoverPackets(projectId: string | undefined) {
  return useQuery<HandoverPacket[]>({
    queryKey: ['handoverPackets', projectId],
    queryFn: () =>
      apiGet<HandoverPacket[]>(`/handover-packets/by-project/${projectId}`),
    enabled: !!projectId,
  });
}

export function useCreateHandoverPacket(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<HandoverPacket, Error, CreateHandoverPacketRequest>({
    mutationFn: (payload) =>
      apiPost<HandoverPacket>(`/handover-packets/by-project/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['handoverPackets', projectId] });
    },
  });
}

export function useTransitionHandoverPacket(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    HandoverPacket,
    Error,
    { packetId: string; targetState: HandoverState }
  >({
    mutationFn: ({ packetId, targetState }) =>
      apiPost<HandoverPacket>(`/handover-packets/${packetId}/transition`, {
        targetState,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['handoverPackets', projectId] });
    },
  });
}

/* ── As-built drawings (แบบก่อสร้างจริง) ─────────────────────────────── */

export function useAsBuiltDrawings(packetId: string | undefined) {
  return useQuery<AsBuiltDrawing[]>({
    queryKey: ['asBuiltDrawings', packetId],
    queryFn: () => apiGet<AsBuiltDrawing[]>(`/as-built-drawings/${packetId}`),
    enabled: !!packetId,
  });
}

export function useCreateAsBuiltDrawing(packetId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<AsBuiltDrawing, Error, CreateAsBuiltDrawingRequest>({
    mutationFn: (payload) =>
      apiPost<AsBuiltDrawing>(`/as-built-drawings/${packetId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['asBuiltDrawings', packetId] });
    },
  });
}

/* ── O&M manual entries (คู่มือใช้งานและบำรุงรักษา) ──────────────────── */

export function useOmManualEntries(packetId: string | undefined) {
  return useQuery<OmManualEntry[]>({
    queryKey: ['omManualEntries', packetId],
    queryFn: () => apiGet<OmManualEntry[]>(`/om-manual-entries/${packetId}`),
    enabled: !!packetId,
  });
}

export function useCreateOmManualEntry(packetId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<OmManualEntry, Error, CreateOmManualEntryRequest>({
    mutationFn: (payload) =>
      apiPost<OmManualEntry>(`/om-manual-entries/${packetId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['omManualEntries', packetId] });
    },
  });
}

/* ── Asset registrations (ทะเบียนทรัพย์สิน) ──────────────────────────── */

export function useAssetRegistrations(packetId: string | undefined) {
  return useQuery<AssetRegistration[]>({
    queryKey: ['assetRegistrations', packetId],
    queryFn: () => apiGet<AssetRegistration[]>(`/asset-registrations/${packetId}`),
    enabled: !!packetId,
  });
}

export function useCreateAssetRegistration(packetId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<AssetRegistration, Error, CreateAssetRegistrationRequest>({
    mutationFn: (payload) =>
      apiPost<AssetRegistration>(`/asset-registrations/${packetId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['assetRegistrations', packetId],
      });
    },
  });
}
