/// <reference path="../pb_data/types.d.ts" />

// Endurecimiento de autenticación (defensa en profundidad, a nivel de base de datos):
// - authRule = "active = true": una cuenta desactivada NO puede obtener token, aunque la
//   contraseña sea correcta. El bloqueo vive en la DB, no solo en el código de la app.
// - authToken.duration: sesión de 1 día (antes 5). Con refresh deslizante en hooks.server.ts,
//   los usuarios activos no lo notan; los inactivos caducan antes.
// - rateLimits.enabled: activa el rate limiting nativo de PocketBase como segunda capa contra
//   fuerza bruta (la app ya tiene su propio limitador en el login).

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.authRule = 'active = true';
    if (users.authToken) {
      users.authToken.duration = 86400; // 1 día
    }
    app.save(users);

    // Los settings pueden variar entre versiones de PB: si algo falla, no abortamos la
    // migración (los cambios de la colección ya quedaron aplicados).
    try {
      const settings = app.settings();
      settings.rateLimits.enabled = true;
      app.save(settings);
    } catch (err) {
      console.log('No se pudo activar rateLimits por migración:', err);
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.authRule = '';
    if (users.authToken) {
      users.authToken.duration = 432000;
    }
    app.save(users);
    try {
      const settings = app.settings();
      settings.rateLimits.enabled = false;
      app.save(settings);
    } catch (_) {
      /* noop */
    }
  }
);
