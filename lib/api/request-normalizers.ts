export function normalizeObjectiveCreateBody(body: {
  level?: string;
  departmentId?: string;
  department_id?: string;
  ownerId?: string;
  owner_id?: string;
  title?: string;
  parentKeyResultIds?: string[];
  parent_key_result_ids?: string[];
}) {
  return {
    level: body.level,
    departmentId: body.departmentId ?? body.department_id,
    ownerId: body.ownerId ?? body.owner_id,
    title: body.title,
    parentKeyResultIds: body.parentKeyResultIds ?? body.parent_key_result_ids ?? []
  };
}

export function normalizeKeyResultCreateBody(body: {
  description?: string;
  startValue?: number | string;
  start_value?: number | string;
  targetValue?: number | string;
  target_value?: number | string;
  currentValue?: number | string;
  current_value?: number | string;
  unit?: string;
  ownerId?: string;
  owner_id?: string;
  dueDate?: string;
  due_date?: string;
}) {
  return {
    description: body.description,
    startValue: body.startValue ?? body.start_value,
    targetValue: body.targetValue ?? body.target_value,
    currentValue: body.currentValue ?? body.current_value,
    unit: body.unit,
    ownerId: body.ownerId ?? body.owner_id,
    dueDate: body.dueDate ?? body.due_date
  };
}
