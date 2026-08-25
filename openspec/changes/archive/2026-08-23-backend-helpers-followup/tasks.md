# Tasks — backend-helpers-followup

## 1. Places service fix

- [x] 1.1 Remove `assertOwnership` from the `places-service.helpers` import in
      `places.service.ts` (unused after migration); also removed the now-unused
      `assertOwnership` definition plus its `ForbiddenException`/`AuthContext`
      imports from `places-service.helpers.ts`
- [x] 1.2 Change both call sites to
      `sharedAssertOwnerOrAdmin({ uid: actor.uid, rol: actor.rol }, existing.usuarioId, "...")`
- [x] 1.3 Run `tsc --noEmit` (0 errors) and `make solid-lint-backend` (0 errors);
      places suite 161/161 green

## 2. VO specs

- [x] 2.1 Create `imagenes\.vo\.spec\.ts` (URL validity, gallery limits 3/10, non-string items)
- [x] 2.2 Create `valoracion-google\.vo\.spec\.ts` (rating range, reviewsCount, mapsLink)
- [x] 2.3 Run the backend suite — specs discovered and green

## 3. Barrios unification

- [x] 3.1 `barrios\.service\.ts`: replace 3 not-found throws with
      `assertFound(existing, "Barrio", id)` (unified message)
- [x] 3.2 `barrio-firestore\.adapter\.ts`: same message in its 3 checks
- [x] 3.3 Update barrios service/adapter specs to the new message text

## 4. Verification

- [x] 4.1 `npm test` backend — all green \(58 suites\)
- [x] 4.2 `make solid-lint-backend` — zero errors
- [x] 4.3 Confirm no changes to `docs/api-spec\.yml` / `docs/data-model\.md`

## 5. Commit

- [x] 5.1 One commit on `chore/solid-lint-backend-cleanup` with all pending
      work (CI gate + assertions rollout + fixes) and the openspec archives
- [x] 5.2 Push branch; PR created via web by the user
