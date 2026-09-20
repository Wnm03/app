# App-Wide Data Integrity Audit — S1874

This cumulative patch adds a read-only static audit covering vehicle, finance,
shop, shared, and asset domains. It reports source-of-truth signals and
repeated symbol/write candidates without modifying runtime data.

Important: static similarity is not proof of a duplicate record. Runtime
snapshots are required before any merge or deletion. No destructive migration
is included.
