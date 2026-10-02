# S2282 — Lazy Loader Stale Invocation / Cancellation Boundary

## Scope
Audit the eager `data-action` dispatcher continuation used by lazy feature loading.
The loader promise itself remains shared/non-cancellable; the safety boundary is the
consumer continuation that runs after the loader resolves.

## Finding
Before S2282, the lazy retry continuation could resume after the originating UI
boundary changed and still invoke the old `data-action`. This is a real stale-invocation
race: the module may load successfully, but the click target may have been detached or
its action changed while the load was pending.

## Fix
The continuation now captures:
- a per-element `lazyActionToken`;
- the original `data-action` name;
- the element connectivity state.

After the loader resolves, it invokes the action only when all three still describe the
same live UI action. A stale continuation never clears a newer pending marker.

## Verification
S2282 matrix: **8/8 PASS**.

This is a deterministic source/behavior contract test, not browser/device E2E. It does
not claim cancellation of the underlying network/script request; it prevents stale UI
invocation after that request resolves.
