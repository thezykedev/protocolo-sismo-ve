import type PocketBase from 'pocketbase';
import type { ModerationLog } from '@sismo-ve/schemas';

// Transición de moderación: el mismo movimiento —aplicar un efecto opcional sobre el registro
// destino, fijar el estado de la entrada/cola, y dejar una bitácora de auditoría— que hoy se
// repite a mano en las 7 acciones de admin/{cambios,retiros,pacientes}. Aquí vive una sola vez.
//
// El seam es ModerationStore: en producción habla con PocketBase; en pruebas, con un store en
// memoria (sin mockear el cliente encadenable de PocketBase). Dos adaptadores reales.

export type ModerationAction = ModerationLog['action'];

export interface ModerationLogInput {
  target_collection: string;
  target_record: string;
  action: ModerationAction;
  moderator: string;
  notes?: string;
}

export interface ModerationStore {
  getOne(collection: string, id: string): Promise<Record<string, unknown>>;
  update(collection: string, id: string, fields: Record<string, unknown>): Promise<void>;
  log(entry: ModerationLogInput): Promise<void>;
}

export interface ModerateInput {
  // Efecto opcional sobre el registro destino (aplicar parche, archivar, verificar...).
  // `required: true` => si falla, se aborta sin tocar el estado (el efecto es el objetivo,
  // p. ej. aplicar un cambio sugerido). `required: false` => si falla, se anota y se continúa
  // (la decisión es el objetivo, p. ej. cerrar una solicitud de retiro aunque el destino ya no exista).
  apply?: {
    collection: string;
    id: string;
    fields: Record<string, unknown>;
    required: boolean;
  };
  // Cambio de estado de la entrada que se está moderando (la cola, o el propio registro).
  resolve?: {
    collection: string;
    id: string;
    status: string;
  };
  // Bitácora de la decisión del moderador. Siempre se intenta (best-effort): una decisión
  // moderada queda auditada aunque el efecto sobre el destino no se haya podido aplicar.
  audit: {
    action: ModerationAction;
    moderator: string;
    collection: string;
    record: string;
    notes?: string;
  };
}

export interface ModerateResult {
  ok: boolean;
  error?: string;
  note?: string;
}

function message(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function moderate(store: ModerationStore, input: ModerateInput): Promise<ModerateResult> {
  let note: string | undefined;

  if (input.apply) {
    try {
      await store.update(input.apply.collection, input.apply.id, input.apply.fields);
    } catch (error) {
      if (input.apply.required) {
        return { ok: false, error: message(error, 'No se pudo aplicar el cambio al registro destino.') };
      }
      note = ' (el registro destino ya no existía o no se pudo modificar)';
    }
  }

  if (input.resolve) {
    try {
      await store.update(input.resolve.collection, input.resolve.id, { status: input.resolve.status });
    } catch (error) {
      return { ok: false, error: message(error, 'No se pudo actualizar el estado.') };
    }
  }

  try {
    await store.log({
      target_collection: input.audit.collection,
      target_record: input.audit.record,
      action: input.audit.action,
      moderator: input.audit.moderator,
      notes: note ? `${input.audit.notes ?? ''}${note}`.trim() : input.audit.notes
    });
  } catch {
    // La auditoría es best-effort: una decisión ya aplicada no se revierte si el log falla.
    // La garantía vive aquí, no en cada adaptador.
  }

  return { ok: true, note };
}

// Adaptador de producción: PocketBase es la fuente de verdad. (El carácter best-effort de la
// bitácora lo garantiza moderate(), no este adaptador.)
export function pocketBaseModerationStore(pb: PocketBase): ModerationStore {
  return {
    async getOne(collection, id) {
      return (await pb.collection(collection).getOne(id)) as unknown as Record<string, unknown>;
    },
    async update(collection, id, fields) {
      await pb.collection(collection).update(id, fields);
    },
    async log(entry) {
      await pb.collection('moderation_logs').create(entry);
    }
  };
}
