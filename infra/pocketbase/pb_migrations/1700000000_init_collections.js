/// <reference path="../pb_data/types.d.ts" />

// Esquema base de la plataforma de ayuda (ver docs/crowdsourced-platform-pocketbase.md).
// Estas migraciones corren igual en local y en el servidor: para migrar al hosting basta
// apuntar PUBLIC_POCKETBASE_URL al nuevo dominio; el schema viaja en este archivo.
//
// Notas de diseño deliberadas:
// - patients_public.hospital es TEXTO (no relación) para aceptar el nombre libre que envía
//   el formulario público actual. cedula_full NO existe en el schema: la privacidad se
//   aplica desde la estructura, no solo desde el código.
// - related_mainshock (auto-relación de seismic_events) se omite por ahora; es opcional.

migrate(
  (app) => {
    const MOD = '@request.auth.role = "admin" || @request.auth.role = "moderator"';
    const PUBLIC_CREATE = '';

    const timestamps = () => [
      { type: 'autodate', name: 'created_at', onCreate: true, onUpdate: false },
      { type: 'autodate', name: 'updated_at', onCreate: true, onUpdate: true }
    ];

    const text = (name, extra = {}) => ({ type: 'text', name, ...extra });
    const num = (name) => ({ type: 'number', name });
    const bool = (name) => ({ type: 'bool', name });
    const date = (name) => ({ type: 'date', name });
    const url = (name) => ({ type: 'url', name });
    const json = (name) => ({ type: 'json', name, maxSize: 2000000 });
    const select = (name, values, required = false) => ({
      type: 'select',
      name,
      required,
      maxSelect: 1,
      values
    });

    const STATUS_4 = ['pending', 'approved', 'rejected', 'archived'];
    const SOURCE_TYPE = ['family', 'hospital_staff', 'volunteer', 'public_reporter', 'moderator'];
    const VERIFICATION = ['unverified', 'source_confirmed', 'hospital_confirmed', 'moderator_confirmed'];

    const sourceFields = () => [
      select('source_type', SOURCE_TYPE),
      select('verification_status', VERIFICATION),
      text('source_name'),
      url('source_url'),
      text('source_record_id'),
      date('source_updated_at'),
      date('imported_at')
    ];

    const save = (def) => {
      const collection = new Collection(def);
      app.save(collection);
      return app.findCollectionByNameOrId(def.name);
    };

    // 1) Colección de usuarios para moderación (auth). Las reglas con @request.auth.role
    //    requieren que este campo exista en una colección auth, así que va primero.
    let users;
    try {
      users = app.findCollectionByNameOrId('users');
    } catch (_) {
      users = null;
    }
    if (!users) {
      users = new Collection({
        type: 'auth',
        name: 'users',
        listRule: MOD,
        viewRule: MOD,
        createRule: null,
        updateRule: MOD,
        deleteRule: null,
        fields: [
          select('role', ['admin', 'moderator', 'hospital_staff', 'volunteer']),
          text('display_name'),
          text('organization'),
          text('phone'),
          bool('active')
        ]
      });
      app.save(users);
    } else {
      // La colección users ya existe: añadimos los campos de moderación si faltan.
      const existing = users.fields.map((f) => f.name);
      const extra = [
        select('role', ['admin', 'moderator', 'hospital_staff', 'volunteer']),
        text('display_name'),
        text('organization'),
        text('phone'),
        bool('active')
      ].filter((f) => !existing.includes(f.name));
      if (extra.length) {
        extra.forEach((f) => users.fields.add(new Field(f)));
        app.save(users);
      }
    }

    // 2) Registros visibles públicamente cuando están aprobados.
    save({
      type: 'base',
      name: 'hospitals',
      listRule: 'status = "approved"',
      viewRule: 'status = "approved"',
      createRule: PUBLIC_CREATE,
      updateRule: MOD,
      deleteRule: MOD,
      fields: [
        select('status', STATUS_4, true),
        text('name', { required: true }),
        text('city'),
        text('state'),
        text('address'),
        num('coords_lat'),
        num('coords_lng'),
        json('phones'),
        json('services'),
        text('capacity_note'),
        ...sourceFields(),
        ...timestamps()
      ]
    });

    save({
      type: 'base',
      name: 'collection_centers',
      listRule: 'status = "approved"',
      viewRule: 'status = "approved"',
      createRule: PUBLIC_CREATE,
      updateRule: MOD,
      deleteRule: MOD,
      fields: [
        select('status', STATUS_4, true),
        text('name', { required: true }),
        select('type', ['acopio', 'shelter', 'logistics', 'medical_support', 'water', 'food', 'other'], true),
        text('city'),
        text('state'),
        text('address'),
        num('coords_lat'),
        num('coords_lng'),
        text('needs'),
        text('schedule'),
        text('contact_public'),
        select('source_type', SOURCE_TYPE),
        select('verification_status', VERIFICATION),
        ...timestamps()
      ]
    });

    save({
      type: 'base',
      name: 'allied_sites',
      listRule: 'status = "approved"',
      viewRule: 'status = "approved"',
      createRule: PUBLIC_CREATE,
      updateRule: MOD,
      deleteRule: MOD,
      fields: [
        select('status', STATUS_4, true),
        text('name', { required: true }),
        text('category'),
        text('city'),
        text('state'),
        url('website'),
        text('contact_public'),
        text('notes_public'),
        select('verification_status', VERIFICATION),
        ...timestamps()
      ]
    });

    save({
      type: 'base',
      name: 'useful_links',
      listRule: 'status = "approved"',
      viewRule: 'status = "approved"',
      createRule: PUBLIC_CREATE,
      updateRule: MOD,
      deleteRule: MOD,
      fields: [
        select('status', STATUS_4, true),
        text('title', { required: true }),
        text('category'),
        url('url'),
        text('description'),
        ...timestamps()
      ]
    });

    // 3) Registro público de personas. cedula_last3 exige exactamente 3 dígitos.
    save({
      type: 'base',
      name: 'patients_public',
      listRule: 'status = "public_unverified" || status = "verified"',
      viewRule: 'status = "public_unverified" || status = "verified"',
      createRule: PUBLIC_CREATE,
      updateRule: MOD,
      deleteRule: MOD,
      fields: [
        select('status', ['pending', 'public_unverified', 'verified', 'archived', 'rejected'], true),
        text('patient_name', { required: true }),
        num('age'),
        bool('age_is_estimated'),
        select('sex', ['female', 'male', 'unknown', 'other']),
        text('cedula_last3', { required: true, pattern: '^[0-9]{3}$' }),
        text('hospital'),
        text('location_note'),
        select('condition_public', [
          'stable',
          'observation',
          'hospitalized',
          'discharged',
          'unknown',
          'deceased_unconfirmed',
          'deceased_verified'
        ]),
        date('last_seen_at'),
        ...sourceFields(),
        text('public_notes'),
        ...timestamps()
      ]
    });

    const patientsPublic = app.findCollectionByNameOrId('patients_public');

    // 4) Datos privados de moderación: nunca expuestos en load functions públicas.
    save({
      type: 'base',
      name: 'patient_private_notes',
      listRule: MOD,
      viewRule: MOD,
      createRule: PUBLIC_CREATE,
      updateRule: MOD,
      deleteRule: MOD,
      fields: [
        { type: 'relation', name: 'patient', required: false, maxSelect: 1, collectionId: patientsPublic.id, cascadeDelete: true },
        text('cedula_hash'),
        text('contact_name'),
        text('contact_phone'),
        text('reporter_relationship'),
        text('internal_notes'),
        { type: 'file', name: 'source_evidence_files', maxSelect: 10, protected: true },
        select('moderation_status', STATUS_4),
        text('created_by'),
        ...timestamps()
      ]
    });

    // 5) Colas de moderación públicas para enviar (no editar) registros.
    save({
      type: 'base',
      name: 'updates_queue',
      listRule: MOD,
      viewRule: MOD,
      createRule: PUBLIC_CREATE,
      updateRule: MOD,
      deleteRule: MOD,
      fields: [
        text('target_collection', { required: true }),
        text('target_record'),
        text('payload_json', { max: 0 }),
        text('submitted_by_name'),
        text('submitted_by_contact'),
        select('status', ['pending', 'accepted', 'rejected'], true),
        text('moderator_notes'),
        ...timestamps()
      ]
    });

    save({
      type: 'base',
      name: 'removal_requests',
      listRule: MOD,
      viewRule: MOD,
      createRule: PUBLIC_CREATE,
      updateRule: MOD,
      deleteRule: MOD,
      fields: [
        text('target_collection', { required: true }),
        text('target_record', { required: true }),
        text('requester_name', { required: true }),
        text('requester_contact'),
        text('relationship'),
        text('reason', { required: true }),
        select('status', ['pending', 'accepted', 'rejected'], true),
        ...timestamps()
      ]
    });

    // 6) Auditoría de moderación (solo lectura/escritura para staff).
    save({
      type: 'base',
      name: 'moderation_logs',
      listRule: MOD,
      viewRule: MOD,
      createRule: MOD,
      updateRule: null,
      deleteRule: null,
      fields: [
        text('target_collection'),
        text('target_record'),
        select('action', ['create', 'approve', 'reject', 'update', 'archive', 'restore', 'remove_public_field']),
        text('moderator'),
        text('notes'),
        { type: 'autodate', name: 'created_at', onCreate: true, onUpdate: false }
      ]
    });

    // 7) Donaciones: público solo ve las confirmadas (transparencia).
    save({
      type: 'base',
      name: 'donations',
      listRule: 'status = "confirmed"',
      viewRule: 'status = "confirmed"',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        select('provider', ['paypal', 'crypto', 'manual'], true),
        num('amount'),
        text('currency'),
        text('transaction_id'),
        text('wallet_network'),
        text('public_name'),
        select('status', ['pending', 'confirmed', 'failed', 'refunded'], true),
        { type: 'autodate', name: 'created_at', onCreate: true, onUpdate: false }
      ]
    });

    // 8) Eventos sísmicos normalizados: público solo ve los activos. No hay create público.
    save({
      type: 'base',
      name: 'seismic_events',
      listRule: 'status = "active"',
      viewRule: 'status = "active"',
      createRule: null,
      updateRule: MOD,
      deleteRule: MOD,
      fields: [
        select('status', ['active', 'superseded', 'hidden'], true),
        select('source', ['funvisis', 'usgs', 'emsc', 'geofon', 'gdacs', 'manual', 'sgc']),
        text('source_event_id'),
        url('source_url'),
        text('title'),
        text('place'),
        text('state_region'),
        date('event_time'),
        date('updated_at_source'),
        num('magnitude'),
        text('magnitude_type'),
        num('depth_km'),
        num('coords_lat'),
        num('coords_lng'),
        num('felt_reports_count'),
        select('alert_level', ['none', 'green', 'yellow', 'orange', 'red', 'unknown']),
        select('event_class', ['micro', 'minor', 'light', 'moderate', 'strong', 'major', 'unknown']),
        bool('mainshock_candidate'),
        select('review_status', ['automatic', 'reviewed', 'manual']),
        ...timestamps()
      ]
    });

    // 9) Auditoría de imports y syncs externos.
    save({
      type: 'base',
      name: 'source_sync_runs',
      listRule: MOD,
      viewRule: MOD,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        text('source_name'),
        url('source_url'),
        select('source_type', ['patients', 'hospitals', 'seismic']),
        select('status', ['success', 'partial', 'failed']),
        date('started_at'),
        date('finished_at'),
        num('records_seen'),
        num('records_created'),
        num('records_updated'),
        num('records_skipped'),
        text('error_message'),
        { type: 'autodate', name: 'created_at', onCreate: true, onUpdate: false }
      ]
    });
  },
  (app) => {
    const names = [
      'source_sync_runs',
      'seismic_events',
      'donations',
      'moderation_logs',
      'removal_requests',
      'updates_queue',
      'patient_private_notes',
      'patients_public',
      'useful_links',
      'allied_sites',
      'collection_centers',
      'hospitals'
    ];
    for (const name of names) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {
        // colección ya ausente
      }
    }
  }
);
