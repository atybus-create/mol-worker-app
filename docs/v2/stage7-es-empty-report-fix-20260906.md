# Stage 7 — ES empty-report diagnosis and fix (2026-09-06)

## Live evidence

- The V2 ES reader uses the same EasyStorage operator-statistics endpoint, payload, and Europe/Warsaw day conversion as the established company workflow `MOL // Statystyki efektywności ES do wydajności obszarów`.
- 2026-09-05 and 2026-09-06 returned valid XLSX files with zero operator rows.
- 2026-09-04 returned 11 operator rows. `dtatarska` was present with PAK=245 and PICK=234.
- 2026-09-03 returned 12 operator rows. `dtatarska` was present with PAK=312 and PICK=415.
- 2026-09-02 returned 12 operator rows. `dtatarska` was present with PAK=245 and PICK=0.
- 2026-09-01 returned 10 operator rows.
- `asorokopud` and `atybus` were not present in the checked 2026-09-01..04 reports. Their configured mappings are not changed without positive evidence for another identifier.

## Defect

An empty report was previously returned as `ok=true, report=[]`. Downstream metrics then labelled every configured employee as `ES_OPERATOR_NOT_FOUND`, which is not supported when the source report itself contains no operators.

## Fix

`Normalize Operators` now returns `ok=false`, `error_code=ES_REPORT_EMPTY`, `operator_count=0` when the XLSX contains no operator rows. This makes the entire source attempt unavailable instead of fabricating per-employee operator-not-found errors.

A regression assertion in `scripts/test-v2-metrics-reproducible.cjs` requires generated `es-report-read.json` to retain `ES_REPORT_EMPTY` handling.
