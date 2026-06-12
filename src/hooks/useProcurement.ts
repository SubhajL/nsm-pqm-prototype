'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost } from '@/lib/api-client';
import type { AwardedContract } from '@/types/awarded-contract';
import type { CreateAwardedContractRequest } from '@/types/awarded-contract.schema';
import type { ContractAmendment } from '@/types/contract-amendment';
import type { CreateContractAmendmentRequest } from '@/types/contract-amendment.schema';
import type { ContractorPrequalification } from '@/types/contractor-prequalification';
import type { CreateContractorPrequalificationRequest } from '@/types/contractor-prequalification.schema';
import type { EngineeringEstimate } from '@/types/engineering-estimate';
import type { CreateEngineeringEstimateRequest } from '@/types/engineering-estimate.schema';
import type {
  ProcurementPackage,
  ProcurementState,
} from '@/types/procurement-package';
import type { CreateProcurementPackageRequest } from '@/types/procurement-package.schema';
import type { TorDocument } from '@/types/tor-document';
import type { CreateTorDocumentRequest } from '@/types/tor-document.schema';

/* ── Procurement packages (ชุดจัดซื้อจัดจ้าง) ─────────────────────────── */

export function useProcurementPackages(projectId: string | undefined) {
  return useQuery<ProcurementPackage[]>({
    queryKey: ['procurementPackages', projectId],
    queryFn: () =>
      apiGet<ProcurementPackage[]>(`/procurement-packages/by-project/${projectId}`),
    enabled: !!projectId,
  });
}

export function useCreateProcurementPackage(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<ProcurementPackage, Error, CreateProcurementPackageRequest>({
    mutationFn: (payload) =>
      apiPost<ProcurementPackage>(
        `/procurement-packages/by-project/${projectId}`,
        payload,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['procurementPackages', projectId],
      });
    },
  });
}

export function useTransitionProcurementPackage(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    ProcurementPackage,
    Error,
    { packageId: string; targetState: ProcurementState }
  >({
    mutationFn: ({ packageId, targetState }) =>
      apiPost<ProcurementPackage>(`/procurement-packages/${packageId}/transition`, {
        targetState,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['procurementPackages', projectId],
      });
    },
  });
}

/* ── TOR documents (เอกสาร TOR) ───────────────────────────────────────── */

export function useTorDocuments(packageId: string | undefined) {
  return useQuery<TorDocument[]>({
    queryKey: ['torDocuments', packageId],
    queryFn: () => apiGet<TorDocument[]>(`/tor-documents/${packageId}`),
    enabled: !!packageId,
  });
}

export function useCreateTorDocument(packageId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<TorDocument, Error, CreateTorDocumentRequest>({
    mutationFn: (payload) =>
      apiPost<TorDocument>(`/tor-documents/${packageId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['torDocuments', packageId] });
    },
  });
}

/* ── Engineering estimates (ราคากลาง) ─────────────────────────────────── */

export function useEngineeringEstimates(packageId: string | undefined) {
  return useQuery<EngineeringEstimate[]>({
    queryKey: ['engineeringEstimates', packageId],
    queryFn: () =>
      apiGet<EngineeringEstimate[]>(`/engineering-estimates/${packageId}`),
    enabled: !!packageId,
  });
}

export function useCreateEngineeringEstimate(packageId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<EngineeringEstimate, Error, CreateEngineeringEstimateRequest>({
    mutationFn: (payload) =>
      apiPost<EngineeringEstimate>(`/engineering-estimates/${packageId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['engineeringEstimates', packageId],
      });
    },
  });
}

/* ── Awarded contracts (สัญญา) ────────────────────────────────────────── */

export function useAwardedContracts(projectId: string | undefined) {
  return useQuery<AwardedContract[]>({
    queryKey: ['awardedContracts', projectId],
    queryFn: () => apiGet<AwardedContract[]>(`/awarded-contracts/${projectId}`),
    enabled: !!projectId,
  });
}

export function useCreateAwardedContract(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<AwardedContract, Error, CreateAwardedContractRequest>({
    mutationFn: (payload) =>
      apiPost<AwardedContract>(`/awarded-contracts/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['awardedContracts', projectId],
      });
    },
  });
}

/* ── Contract amendments (สัญญาแก้ไขเพิ่มเติม) ────────────────────────── */

export function useContractAmendments(contractId: string | undefined) {
  return useQuery<ContractAmendment[]>({
    queryKey: ['contractAmendments', contractId],
    queryFn: () => apiGet<ContractAmendment[]>(`/contract-amendments/${contractId}`),
    enabled: !!contractId,
  });
}

export function useCreateContractAmendment(contractId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<ContractAmendment, Error, CreateContractAmendmentRequest>({
    mutationFn: (payload) =>
      apiPost<ContractAmendment>(`/contract-amendments/${contractId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['contractAmendments', contractId],
      });
    },
  });
}

/* ── Contractor prequalifications (PQ) ────────────────────────────────── */

export function useContractorPrequalifications(projectId: string | undefined) {
  return useQuery<ContractorPrequalification[]>({
    queryKey: ['contractorPrequalifications', projectId],
    queryFn: () =>
      apiGet<ContractorPrequalification[]>(
        `/contractor-prequalifications/${projectId}`,
      ),
    enabled: !!projectId,
  });
}

export function useCreateContractorPrequalification(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    ContractorPrequalification,
    Error,
    CreateContractorPrequalificationRequest
  >({
    mutationFn: (payload) =>
      apiPost<ContractorPrequalification>(
        `/contractor-prequalifications/${projectId}`,
        payload,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['contractorPrequalifications', projectId],
      });
    },
  });
}
