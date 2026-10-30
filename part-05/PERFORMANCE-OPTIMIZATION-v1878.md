# Cumulative Performance / UI Hardening — v1878

Basis: accumulated v1877 Dashboard Slim + Audit Keuangan Cepat patch.

## Implemented in this session

1. **Preserved v1877 Dashboard Slim**: Hero/Ticker financial header, slim Insight, max-5 insight feed, deduplication, collapsed briefing/health check, and no duplicate Summary/Analytics rendering remain intact.
2. **Removed bundle-B preload hint**: bundle B is already loaded by the existing guarded late script; preloading it creates early network pressure without reducing the amount of JavaScript executed. The guarded script remains unchanged to preserve load order and modal compatibility.
3. **Retired stale Pro UI layer contract**: `pro-ui-layer.css` remains governed by the existing delete-manifest flow rather than being silently reintroduced.
4. **Added performance-budget gate**: `npm run audit:performance-budget` prevents future growth of HTML/CSS/JS beyond the current safe envelope.
5. **Added regression contract** for runtime/cache synchronization, Dashboard Slim rendering boundaries, Analytics suppression, preload removal, and delete-manifest integrity.
6. **No persistence/schema/transaction changes**.

## Safety decision

The baseline contains many domain-specific globals and historical duplicate helpers. A one-shot mechanical consolidation of all helpers/modal systems would have a large blast radius and could reintroduce regressions. Those high-risk refactors are therefore protected by the existing architecture/persistence/feature gates rather than performed by unsafe text replacement in this cumulative patch.

The application keeps its existing feature set; this session only changes safe presentation/network-pressure/guardrail behavior.

## Targeted verification

- `node --check` on modified JS: required.
- Dashboard Slim regression contract: required.
- Performance budget: required.
- Existing audit/architecture/persistence/PWA gates remain the release authority.
