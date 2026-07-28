# rename-to-places

Reemplazar la entidad 'empresas' por 'places' (generica: empresas, instituciones, lugares) con schema extendido: descripcionCorta+descripcion, horarios tipados, servicios/metodosPago enums, imagenes agrupadas, valoracionGoogle+vistasTotales+idiomas como post-MVP opcional. Reemplazo limpio sin migracion. Incluye rename transversal (solicitudes.empresaId->placeId, usuarios.empresaId->placeId, app.module) y endpoint GET /places/{id}/abierto-ahora.
