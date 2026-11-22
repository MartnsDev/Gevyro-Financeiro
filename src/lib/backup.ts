import Papa from 'papaparse';
import type { Workspace } from '@/domain/types';
import { workspaceSchema } from '@/domain/validation';
export function backupJSON(w: Workspace): string {
  return JSON.stringify(workspaceSchema.parse(w), null, 2);
}
/** Every collection and scalar is exported. record_json preserves all fields and integer cents. */
export function backupCSV(w: Workspace): string {
  const valid = workspaceSchema.parse(w);
  const rows = Object.entries(valid).flatMap(([entity, value]) =>
    Array.isArray(value)
      ? value.map((record, index) => ({
          entity,
          id:
            typeof record === 'object' && record !== null && 'id' in record
              ? String(record.id)
              : String(index),
          record_json: JSON.stringify(record),
        }))
      : [{ entity, id: entity, record_json: JSON.stringify(value) }],
  );
  return '\uFEFF' + Papa.unparse(rows, { escapeFormulae: true });
}
