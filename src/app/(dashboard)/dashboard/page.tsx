'use client';

import { useMemo, useState } from 'react';
import { Typography } from 'antd';

import { useProjects } from '@/hooks/useProjects';
import { useAuthStore } from '@/stores/useAuthStore';
import { canCreateProject as canCreateProjectForRole } from '@/lib/auth';
import { buildPortfolioFreshness } from '@/lib/dashboard-kpi-context';

import { CreateProjectFAB } from './_components/CreateProjectFAB';
import { DashboardCharts } from './_components/DashboardCharts';
import { DashboardError } from './_components/DashboardError';
import { DashboardKPIRow } from './_components/DashboardKPIRow';
import { DashboardLoading } from './_components/DashboardLoading';
import { ProjectsTable } from './_components/ProjectsTable';
import {
  TYPE_LABEL_MAP,
  getProjectDisplayStatus,
  type DashboardStatusFilter,
  type ProjectDisplayStatus,
} from './_components/helpers';

const { Title } = Typography;

export default function PortfolioDashboardPage() {
  const { data: projects, isLoading, isError, error, refetch } = useProjects();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [tableStatusFilter, setTableStatusFilter] = useState<ProjectDisplayStatus | undefined>(
    undefined,
  );
  const [statusFilter, setStatusFilter] = useState<DashboardStatusFilter>('all');
  const canCreateProject = canCreateProjectForRole(currentUser?.role);

  const {
    totalProjects,
    inProgressCount,
    completedCount,
    planningCount,
  } = useMemo(() => {
    if (!projects) {
      return {
        totalProjects: 0,
        inProgressCount: 0,
        completedCount: 0,
        planningCount: 0,
      };
    }

    const inProgressProjects = projects.filter((project) => project.status === 'in_progress');

    return {
      totalProjects: projects.length,
      inProgressCount: inProgressProjects.length,
      completedCount: projects.filter((project) => project.status === 'completed').length,
      planningCount: projects.filter((project) => project.status === 'planning').length,
    };
  }, [projects]);

  const scopedProjects = useMemo(() => {
    if (!projects) return [];
    if (statusFilter === 'all') return projects;
    return projects.filter((project) => project.status === statusFilter);
  }, [projects, statusFilter]);

  // Donut chart data: count by project class
  const donutData = useMemo(() => {
    if (!scopedProjects.length) return [];
    const classCounts: Record<string, number> = {};
    scopedProjects.forEach((p) => {
      classCounts[p.projectClass] = (classCounts[p.projectClass] || 0) + 1;
    });
    return Object.entries(classCounts).map(([projectClass, count]) => ({
      name: TYPE_LABEL_MAP[projectClass] ?? projectClass,
      value: count,
    }));
  }, [scopedProjects]);

  const departmentStatusData = useMemo(() => {
    if (!scopedProjects.length) return [];

    const departmentMap = new Map<
      string,
      {
        department: string;
        onSchedule: number;
        watch: number;
        delayed: number;
        planning: number;
        completed: number;
      }
    >();

    scopedProjects.forEach((project) => {
      const current =
        departmentMap.get(project.departmentId) ?? {
          department: project.departmentName,
          onSchedule: 0,
          watch: 0,
          delayed: 0,
          planning: 0,
          completed: 0,
        };

      const displayStatus = getProjectDisplayStatus(project);

      if (displayStatus === 'on_schedule') {
        current.onSchedule += 1;
      } else if (displayStatus === 'watch') {
        current.watch += 1;
      } else if (displayStatus === 'delayed') {
        current.delayed += 1;
      } else if (displayStatus === 'planning') {
        current.planning += 1;
      } else if (displayStatus === 'completed') {
        current.completed += 1;
      }

      departmentMap.set(project.departmentId, current);
    });

    return Array.from(departmentMap.values()).sort(
      (a, b) =>
        b.onSchedule +
          b.watch +
          b.delayed +
          b.planning +
          b.completed -
        (a.onSchedule + a.watch + a.delayed + a.planning + a.completed),
    );
  }, [scopedProjects]);

  // Filtered table data
  const filteredProjects = useMemo(() => {
    if (!scopedProjects.length) return [];
    return scopedProjects.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase());
      const matchType = !typeFilter || p.projectClass === typeFilter;
      const matchStatus =
        !tableStatusFilter || getProjectDisplayStatus(p) === tableStatusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [scopedProjects, search, tableStatusFilter, typeFilter]);

  if (isLoading) {
    return <DashboardLoading />;
  }

  if (isError) {
    return <DashboardError error={error} onRetry={() => void refetch()} />;
  }

  const inProgressPct =
    totalProjects > 0
      ? ((inProgressCount / totalProjects) * 100).toFixed(1)
      : '0';
  const completedPct =
    totalProjects > 0
      ? ((completedCount / totalProjects) * 100).toFixed(1)
      : '0';
  const planningPct =
    totalProjects > 0
      ? ((planningCount / totalProjects) * 100).toFixed(1)
      : '0';

  return (
    <div style={{ position: 'relative' }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        แดชบอร์ดภาพรวมโครงการ (Portfolio Dashboard)
      </Title>

      <DashboardKPIRow
        totalProjects={totalProjects}
        inProgressCount={inProgressCount}
        planningCount={planningCount}
        completedCount={completedCount}
        inProgressPct={inProgressPct}
        planningPct={planningPct}
        completedPct={completedPct}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        freshness={buildPortfolioFreshness(projects ?? [], new Date()).label}
      />

      <DashboardCharts
        departmentStatusData={departmentStatusData}
        donutData={donutData}
      />

      <ProjectsTable
        filteredProjects={filteredProjects}
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        tableStatusFilter={tableStatusFilter}
        onTableStatusFilterChange={setTableStatusFilter}
      />

      {canCreateProject && <CreateProjectFAB />}
    </div>
  );
}
