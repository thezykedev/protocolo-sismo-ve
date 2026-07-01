/// <reference path="../pb_data/types.d.ts" />

// Seed mínimo para tener un backend local con contenido real desde el primer arranque.
// Idempotente por naturaleza: las migraciones solo corren una vez. En producción se puede
// dejar este seed o reemplazar el contenido por imports oficiales.

migrate(
  (app) => {
    const add = (collectionName, rows) => {
      const collection = app.findCollectionByNameOrId(collectionName);
      for (const data of rows) {
        const record = new Record(collection);
        for (const key of Object.keys(data)) {
          record.set(key, data[key]);
        }
        app.save(record);
      }
    };

    add('allied_sites', [
      {
        status: 'approved',
        name: 'Terremoto Venezuela',
        category: 'Mapa y reporte ciudadano',
        website: 'https://terremotovenezuela.app',
        notes_public: 'Plataforma abierta para coordinar ayuda y reportes ciudadanos durante la emergencia.'
      },
      {
        status: 'approved',
        name: 'Venezuela Te Busca',
        category: 'Búsqueda y reunificación',
        website: 'https://venezuelatebusca.com',
        notes_public: 'Recurso aliado para búsqueda de personas e información de reunificación.'
      }
    ]);

    add('useful_links', [
      {
        status: 'approved',
        title: 'Bitchat para iPhone',
        category: 'Comunicación sin internet',
        url: 'https://apps.apple.com/us/app/bitchat-mesh/id6748219622',
        description: 'Mensajería por Bluetooth mesh para comunicarse con personas cercanas cuando no hay internet.'
      },
      {
        status: 'approved',
        title: 'Bitchat para Android',
        category: 'Comunicación sin internet',
        url: 'https://play.google.com/store/apps/details?id=com.bitchat.droid',
        description: 'Versión Android de Bitchat para comunicación local por Bluetooth mesh.'
      },
      {
        status: 'approved',
        title: 'Bitchat sitio oficial',
        category: 'Comunicación sin internet',
        url: 'https://bitchat.free',
        description: 'Página oficial con enlaces a tiendas, código fuente y APK releases.'
      },
      {
        status: 'approved',
        title: 'eSIM Venezuela SOS',
        category: 'Conectividad',
        url: 'https://www.esimflag.com/es/configurador/venezuela/esim-venezuela/partners/sos?discount=SOSVEN&days=3',
        description: 'Opción de eSIM para recuperar conectividad móvil durante desplazamientos o fallas de servicio.'
      }
    ]);

    add('hospitals', [
      {
        status: 'approved',
        name: 'Hospital Universitario de Caracas',
        city: 'Caracas',
        state: 'Distrito Capital',
        services: ['Trauma', 'Emergencia', 'Cirugía'],
        capacity_note: 'Reporta capacidad de trauma. Verificar antes de remitir.',
        verification_status: 'unverified',
        source_name: 'Seed inicial'
      },
      {
        status: 'approved',
        name: 'Hospital Central de Maracay',
        city: 'Maracay',
        state: 'Aragua',
        services: ['Emergencia', 'Pediatría'],
        capacity_note: 'Datos comunitarios sujetos a confirmación.',
        verification_status: 'unverified',
        source_name: 'Seed inicial'
      }
    ]);

    add('collection_centers', [
      {
        status: 'approved',
        name: 'Centro de Acopio Plaza Bolívar',
        type: 'acopio',
        city: 'Caracas',
        state: 'Distrito Capital',
        needs: 'Agua potable, alimentos no perecederos',
        schedule: '8:00 - 18:00',
        contact_public: 'Coordinación vecinal',
        verification_status: 'unverified'
      },
      {
        status: 'approved',
        name: 'Refugio Comunitario Los Teques',
        type: 'shelter',
        city: 'Los Teques',
        state: 'Miranda',
        needs: 'Colchones, mantas',
        schedule: '24h',
        verification_status: 'unverified'
      }
    ]);

    add('patients_public', [
      {
        status: 'public_unverified',
        patient_name: 'Registro de ejemplo (seed)',
        cedula_last3: '123',
        hospital: 'Hospital Universitario de Caracas',
        condition_public: 'stable',
        source_type: 'public_reporter',
        verification_status: 'unverified',
        source_name: 'Seed inicial',
        public_notes: 'Registro de demostración. Sustituir por datos reales o eliminar.'
      }
    ]);
  },
  (app) => {
    // Down: borra solo los registros sembrados por nombre/título conocido.
    const purge = (collectionName, field, values) => {
      for (const value of values) {
        try {
          const record = app.findFirstRecordByFilter(collectionName, `${field} = {:v}`, { v: value });
          if (record) app.delete(record);
        } catch (_) {
          // ya ausente
        }
      }
    };

    purge('allied_sites', 'name', ['Terremoto Venezuela', 'Venezuela Te Busca']);
    purge('useful_links', 'title', [
      'Bitchat para iPhone',
      'Bitchat para Android',
      'Bitchat sitio oficial',
      'eSIM Venezuela SOS'
    ]);
    purge('hospitals', 'name', ['Hospital Universitario de Caracas', 'Hospital Central de Maracay']);
    purge('collection_centers', 'name', ['Centro de Acopio Plaza Bolívar', 'Refugio Comunitario Los Teques']);
    purge('patients_public', 'patient_name', ['Registro de ejemplo (seed)']);
  }
);
