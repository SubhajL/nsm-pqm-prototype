# Gantt Chart — dhtmlxGantt Integration

**Technology**: dhtmlxGantt 8.x (evaluation/GPL version)
**Parent Context**: [../../CLAUDE.md](../../../CLAUDE.md)

## Critical Rules

- **MUST** wrap the Gantt component with `dynamic(() => import(...), { ssr: false })` — dhtmlxGantt requires DOM
- **MUST** initialize gantt in `useEffect` with `useRef` — never in render body
- **MUST** call `gantt.clearAll()` in the useEffect cleanup to prevent memory leaks
- **MUST NOT** re-initialize gantt on every render — check ref before calling `gantt.init()`
- **MUST** import CSS: `import 'dhtmlx-gantt/codebase/dhtmlxgantt.css'`

## Initialization Pattern

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { gantt } from 'dhtmlx-gantt';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';

interface GanttChartProps {
  tasks: GanttTask[];
  links: GanttLink[];
}

export function GanttChart({ tasks, links }: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;

    // Configure BEFORE init
    gantt.config.date_format = '%Y-%m-%d';
    gantt.config.scale_unit = 'month';
    gantt.config.highlight_critical_path = true;
    gantt.config.show_progress = true;
    gantt.config.readonly = false;

    // Thai locale
    gantt.locale.labels.section_description = 'รายละเอียด';
    gantt.locale.labels.section_time = 'ระยะเวลา';

    // Columns
    gantt.config.columns = [
      { name: 'text', label: 'กิจกรรม', width: 200, tree: true },
      { name: 'owner', label: 'ผู้รับผิดชอบ', width: 100 },
      { name: 'progress', label: '%', width: 50, template: (task) => Math.round(task.progress * 100) + '%' },
      { name: 'add', width: 44 },
    ];

    gantt.init(containerRef.current);
    gantt.parse({ data: tasks, links });
    initializedRef.current = true;

    return () => {
      gantt.clearAll();
      initializedRef.current = false;
    };
  }, [tasks, links]);

  return <div ref={containerRef} style={{ width: '100%', height: '500px' }} />;
}
```

## Dependency Types

| Type | Code | Description | Thai | Example |
|---|---|---|---|---|
| FS | 0 | Finish-to-Start | ทำ A เสร็จ → เริ่ม B | Pour concrete → Remove formwork |
| SS | 1 | Start-to-Start | เริ่ม A → เริ่ม B | Excavation → Soil removal |
| FF | 2 | Finish-to-Finish | เสร็จ A → เสร็จ B | Paint → Clean up |
| SF | 3 | Start-to-Finish | เริ่ม A → เสร็จ B | New system on → Old system off |

## Critical Path Styling

```javascript
gantt.templates.task_class = function(start, end, task) {
  if (task.$critical) return 'critical-task';
  if (task.progress === 1) return 'completed-task';
  return '';
};
```

Custom CSS for critical path:
```css
.critical-task .gantt_task_progress { background: #E74C3C; }
.critical-task .gantt_task_line { border-color: #E74C3C; }
.completed-task .gantt_task_progress { background: #27AE60; }
```

## Milestone Markers

Tasks with `type: 'milestone'` render as diamond shapes automatically in dhtmlxGantt. Set `duration: 0` for milestones.

## View Modes (Toolbar)

Implement zoom controls that call:
```typescript
const setView = (unit: 'day' | 'week' | 'month') => {
  gantt.config.scale_unit = unit;
  gantt.render();
};
```
