# Tasks — dedupe-backend-helpers

## 1. Shared assertions module (TDD)

- [x] 1.1 Write `backend/src/common/utils/assertions.spec.ts` covering
      assertFound (returns value / throws unified NotFound message) and
      assertOwnerOrAdmin (owner OK, admin OK, other → ForbiddenException with
      action text) — RED
- [x] 1.2 Implement `backend/src/common/utils/assertions.ts` — GREEN
- [x] 1.3 `npm --prefix backend test -- src/common/utils/assertions.spec.ts`
      — 6/6 passing

## 2. Eventos call-site migration

- [ ] 2.1 Replace the two inline ownership checks (`update`, `remove`) with
      `assertOwnerOrAdmin({ uid: usuarioId, rol }, existing.usuarioId, "...")`
- [ ] 2.2 Replace the four id-based `NotFoundException` throws with
      `assertFound(doc, "Evento", id)`; keep slug-based messages verbatim
- [ ] 2.3 `npm --prefix backend test -- --testPathPattern modules/eventos` — green

## 3. Places ownership migration

- [ ] 3.1 Switch places ownership call sites from local `assertOwnership` to
      shared `assertOwnerOrAdmin` (keep or remove the local helper; delete it
      from `places-service.helpers.ts` if it becomes unused) — suite stays green

## 4. Barrios unification

- [ ] 4.1 Use `assertFound` in `barrios.service.ts` and unify adapter messages
      to `"Barrio ${id} no encontrado"`
- [ ] 4.2 Update barrios service/adapter specs to the new message text — green

## 5. VO specs

- [ ] 5.1 Write `imagenes.vo.spec.ts` encoding current accept/reject behavior
- [ ] 5.2 Write `valoracion-google.vo.spec.ts` encoding current behavior
- [ ] 5.3 Full VO test run — green, no implementation changes

## 6. Places read/write split

- [ ] 6.1 Write `places-query.service.spec.ts` (red) moving the read-side
      expectations for `search`, `findForMap`, `findBySlug`, `findById`,
      `abiertoAhora`
- [ ] 6.2 Implement `PlacesQueryService`; bind in `places.module.ts`; inject
      into `places.controller.ts` alongside `PlacesService`
- [ ] 6.3 Remove read methods from `PlacesService`; adjust its spec + controller
      spec mocks (second mock provider)
- [ ] 6.4 All places tests green; both files < 300 linted lines

## 7. Verification

- [ ] 7.1 `make solid-lint-backend` — zero errors
- [ ] 7.2 `npm --prefix backend test` — full suite green
- [ ] 7.3 Confirm `docs/api-spec.yml` untouched; barrios message change noted
      in PR description (docs only)
