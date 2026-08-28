# Change Proposal: eventos-location-model

- **Ticket ID**: CH-04c
- **Original title**: Modelar modalidad de evento (presencial / online / híbrido) y ubicación opcional
- **Tag (source)**: `[backend]` (explicit)
- **Derived change name**: `eventos-location-model`
- **Change folder**: `openspec/changes/eventos-location-model/`

## Summary

Hoy el VO `Ubicacion` exige `direccion` y `coordenadas`; consecuentemente `Evento.ubicacion` es
obligatorio. Eso impide representar correctamente un evento **online** (sin lugar físico) y no
ofrece una forma declarada de decir "este evento ocurre en un `place` del directorio" (vía
coordenadas propias para el mapa).

Este change introduce una dimensión de **modalidad** en el `Evento` y relaja el VO `Ubicacion`
para que un evento online quede bien modelado y los eventos presenciales/híbridos sigan
pintándose en el mapa con sus `coordenadas`.

## Motivation

- Un evento online no debe verse forzado a inventar una dirección.
- El mapa (`GET /api/v1/eventos/map-data`) ya filtra eventos sin `coordenadas` → solo los
  georreferenciados aparecen. La modalidad online naturalmente los excluye.
- Se respeta la decisión de diseño 2026-08-27: **NO se reintroduce `placeId`**. El vínculo con un
  `place` se resuelve por coincidencia de coordenadas/dirección o un futuro change de
  enriquecimiento, no por FK.

## Design decisions (confirmed with user)

1. **`modalidad` es REQUERIDA** en `CreateEventoDto` (sin default en creación).
   - Para documentos legacy en Firestore que no tengan el campo, el adapter los hidrata como
     `'presencial'` (retrocompatibilidad de lectura; no requiere script de migración porque los
     datos de dev son mock y se re-seedean).
2. **online + `ubicacion` → 400** (validación estricta: online nunca lleva ubicación).
3. **presencial / híbrido**: `ubicacion` requerida; dentro del VO `Ubicacion`, **solo
   `coordenadas` es obligatoria**, `direccion` pasa a ser opcional. Las coordenadas pueden
   coincidir con las de un `place` del directorio (resolución por coincidencia, sin FK).

## Scope

Modifica: `Evento` entity, `Ubicacion` VO, `CreateEventoDto`/`UpdateEventoDto`,
`evento-firestore.adapter`, y el spec canónico `openspec/specs/eventos`. No altera endpoints
HTTP existentes (reusa `POST /api/v1/eventos`, `PUT /api/v1/eventos/{id}`,
`GET /api/v1/eventos/map-data`); solo cambia reglas de validación y persistencia.

## Out of scope

- No se agrega `placeId` ni FK a `places`.
- No se cambia el ciclo de vida (`estado`, `estadoVerificacion`, `activo`).
- No se modifica el frontend (corresponde a CH-08).
