# E2E timing report

- Total requests: 864
- Total handler wall-time: 186581.99 ms
- Distinct route templates: 59

## Slowest 10 individual requests

| # | Method | URL | Status | Elapsed (ms) | Scenario |
|---|--------|-----|--------|--------------|----------|
| 1 | POST | /api/v1/model-drafts/0fd5c2f8-a7d9-4017-8e14-f1884200289f/publish | 201 | 2268.82 | Unliking a model removes the like |
| 2 | POST | /api/v1/model-drafts/0975608c-1d70-46b1-8b6b-4507b7818e7e/publish | 201 | 2075.54 | Anonymous viewer sees zero likes |
| 3 | POST | /api/v1/model-drafts/a8240f65-3ede-4553-b15a-7de0a3c94a73/publish | 201 | 2067.14 | Tagging requires write permission |
| 4 | POST | /api/v1/model-drafts/d95ee66f-383c-4b89-983f-8ed532dd62d8/publish | 201 | 2041.59 | Transfer ownership to a contributor |
| 5 | POST | /api/v1/model-drafts/895e3730-870a-43c7-af70-efe3d23c4560/publish | 201 | 2030.11 | Additional-file upload still accepts script-like MIME types |
| 6 | POST | /api/v1/model-drafts/e0c89bb7-2278-435b-a8d4-1e76379d613c/publish | 201 | 2027.54 | List public models |
| 7 | POST | /api/v1/model-drafts/7893b3ac-f4de-4c00-b912-d4244287d9a6/publish | 201 | 2011.15 | Recording a run increments the run count |
| 8 | POST | /api/v1/model-drafts/c43927bd-2651-443a-b796-11ee0850a536/publish | 201 | 2010.69 | Non-author cannot delete an additional file |
| 9 | POST | /api/v1/model-drafts/026e1594-28ed-4ba4-85f2-3fd8736432f1/publish | 201 | 1974.62 | Cannot access a private model without permission |
| 10 | POST | /api/v1/model-drafts/7b2c0598-65e6-4a3e-8047-a05a68a013a4/publish | 201 | 1973.35 | Permissions action map for a non-author authenticated viewer on public model |

## Top 5 slowest route templates by p95

| Method | Template | Count | p95 (ms) | p99 (ms) | Max (ms) |
|--------|----------|-------|----------|----------|----------|
| POST | /api/v1/model-drafts/:id/publish | 95 | 2030.11 | 2268.82 | 2268.82 |
| POST | /api/auth/sign-up/email | 155 | 106.72 | 121.43 | 121.44 |
| POST | /api/auth/sign-in/email | 153 | 75.19 | 78.91 | 123.78 |
| POST | /api/v1/models/:id/additional-files | 11 | 34.28 | 34.28 | 34.28 |
| POST | /api/v1/models/:id/versions | 14 | 26.96 | 26.96 | 26.96 |

## Per-route stats (sorted by total time)

| Method | Template | Count | Total (ms) | Mean | Min | p50 | p95 | p99 | Max | Status codes |
|--------|----------|-------|------------|------|-----|-----|-----|-----|-----|--------------|
| POST | /api/v1/model-drafts/:id/publish | 95 | 159722.91 | 1681.29 | 2.98 | 1635.38 | 2030.11 | 2268.82 | 2268.82 | {"201":94,"409":1} |
| POST | /api/auth/sign-up/email | 155 | 12550.06 | 80.97 | 2.81 | 77.64 | 106.72 | 121.43 | 121.44 | {"200":154,"400":1} |
| POST | /api/auth/sign-in/email | 153 | 10825.97 | 70.76 | 60.41 | 70.08 | 75.19 | 78.91 | 123.78 | {"200":152,"401":1} |
| POST | /api/v1/model-drafts/:id/files | 92 | 953.38 | 10.36 | 7.95 | 9.38 | 15.54 | 22.55 | 22.55 | {"201":92} |
| POST | /api/v1/model-drafts | 104 | 586.97 | 5.64 | 0.51 | 5.07 | 6.68 | 23.98 | 24.28 | {"201":101,"401":3} |
| PATCH | /api/v1/model-drafts/:id | 97 | 359.51 | 3.71 | 2.77 | 3.62 | 4.63 | 6.00 | 6.00 | {"204":97} |
| POST | /api/v1/models/:id/versions | 14 | 252.93 | 18.07 | 5.89 | 17.18 | 26.96 | 26.96 | 26.96 | {"201":13,"403":1} |
| POST | /api/v1/models/:id/additional-files | 11 | 235.80 | 21.44 | 0.99 | 22.58 | 34.28 | 34.28 | 34.28 | {"201":9,"401":1,"403":1} |
| POST | /api/v1/models/:id/permissions | 12 | 145.80 | 12.15 | 5.23 | 11.60 | 25.54 | 25.54 | 25.54 | {"201":10,"403":1,"409":1} |
| POST | /api/v1/models/:id/tags | 9 | 108.66 | 12.07 | 6.08 | 12.11 | 20.06 | 20.06 | 20.06 | {"201":7,"403":1,"409":1} |
| POST | /api/v1/models/:id/authors | 8 | 81.28 | 10.16 | 5.62 | 10.70 | 15.87 | 15.87 | 15.87 | {"201":6,"403":1,"409":1} |
| POST | /api/v1/models/:id/like | 7 | 69.51 | 9.93 | 0.98 | 10.98 | 17.75 | 17.75 | 17.75 | {"204":5,"401":1,"403":1} |
| GET | /api/v1/models | 9 | 64.26 | 7.14 | 3.86 | 7.02 | 10.57 | 10.57 | 10.57 | {"200":9} |
| GET | /api/v1/models/:id/likes | 4 | 43.80 | 10.95 | 3.91 | 9.27 | 26.25 | 26.25 | 26.25 | {"200":4} |
| PATCH | /api/v1/users/:id | 7 | 38.36 | 5.48 | 0.52 | 6.07 | 8.52 | 8.52 | 8.52 | {"204":4,"401":1,"403":2} |
| GET | /api/v1/models/:id/additional-files | 4 | 36.23 | 9.06 | 5.58 | 10.59 | 11.11 | 11.11 | 11.11 | {"200":3,"403":1} |
| PATCH | /api/v1/models/:id/versions/current | 3 | 34.58 | 11.53 | 5.58 | 7.46 | 21.54 | 21.54 | 21.54 | {"204":2,"403":1} |
| GET | /api/v1/admin/events | 5 | 34.46 | 6.89 | 0.63 | 6.27 | 17.62 | 17.62 | 17.62 | {"200":3,"401":1,"403":1} |
| GET | /api/v1/models/:id/interactions | 3 | 33.26 | 11.09 | 9.63 | 11.52 | 12.12 | 12.12 | 12.12 | {"200":3} |
| GET | /api/v1/models/:id | 4 | 26.96 | 6.74 | 3.19 | 7.84 | 8.66 | 8.66 | 8.66 | {"200":2,"403":2} |
| PATCH | /api/v1/models/:id | 3 | 25.87 | 8.62 | 6.80 | 7.36 | 11.72 | 11.72 | 11.72 | {"204":2,"403":1} |
| GET | /api/v1/models/:id/versions | 3 | 24.54 | 8.18 | 5.56 | 7.45 | 11.53 | 11.53 | 11.53 | {"200":2,"403":1} |
| GET | /api/v1/users/:id | 5 | 20.70 | 4.14 | 2.51 | 3.79 | 6.47 | 6.47 | 6.47 | {"200":5} |
| DELETE | /api/v1/models/:id/additional-files/:id | 4 | 20.53 | 5.13 | 0.42 | 5.97 | 8.33 | 8.33 | 8.33 | {"204":1,"401":1,"403":1,"404":1} |
| POST | /api/v1/models/:id/views | 2 | 17.52 | 8.76 | 7.76 | 9.76 | 9.76 | 9.76 | 9.76 | {"204":1,"403":1} |
| GET | /api/v1/models/:id/me/permissions | 3 | 16.72 | 5.57 | 1.40 | 6.28 | 9.04 | 9.04 | 9.04 | {"200":3} |
| POST | /api/v1/uploads/avatar | 4 | 15.92 | 3.98 | 0.51 | 3.61 | 8.67 | 8.67 | 8.67 | {"201":1,"400":2,"401":1} |
| DELETE | /api/v1/users/:id | 2 | 15.71 | 7.86 | 6.84 | 8.87 | 8.87 | 8.87 | 8.87 | {"204":2} |
| POST | /api/v1/models/:id/authors/transfer | 2 | 15.41 | 7.71 | 7.50 | 7.92 | 7.92 | 7.92 | 7.92 | {"204":1,"404":1} |
| DELETE | /api/v1/models/:id/authors/:id | 2 | 14.55 | 7.28 | 7.04 | 7.51 | 7.51 | 7.51 | 7.51 | {"204":1,"403":1} |
| DELETE | /api/v1/models/:id/permissions/:id | 2 | 13.40 | 6.70 | 6.43 | 6.96 | 6.96 | 6.96 | 6.96 | {"204":2} |
| POST | /api/v1/models/:id/runs | 1 | 13.34 | 13.34 | 13.34 | 13.34 | 13.34 | 13.34 | 13.34 | {"204":1} |
| GET | /api/v1/models/:id/authors | 2 | 12.96 | 6.48 | 5.06 | 7.90 | 7.90 | 7.90 | 7.90 | {"200":2} |
| GET | /api/v1/model-drafts/:id | 2 | 12.40 | 6.20 | 5.08 | 7.31 | 7.31 | 7.31 | 7.31 | {"200":1,"403":1} |
| DELETE | /api/v1/models/:id | 1 | 11.51 | 11.51 | 11.51 | 11.51 | 11.51 | 11.51 | 11.51 | {"204":1} |
| GET | /admin | 1 | 11.47 | 11.47 | 11.47 | 11.47 | 11.47 | 11.47 | 11.47 | {"200":1} |
| POST | /api/v1/models/:id/downloads | 1 | 11.09 | 11.09 | 11.09 | 11.09 | 11.09 | 11.09 | 11.09 | {"204":1} |
| DELETE | /api/v1/models/:id/like | 1 | 9.82 | 9.82 | 9.82 | 9.82 | 9.82 | 9.82 | 9.82 | {"204":1} |
| GET | /api/v1/netlogo-versions | 4 | 9.55 | 2.39 | 1.07 | 2.73 | 3.72 | 3.72 | 3.72 | {"200":3,"400":1} |
| GET | /api/v1/model-drafts | 1 | 9.33 | 9.33 | 9.33 | 9.33 | 9.33 | 9.33 | 9.33 | {"200":1} |
| GET | /api/v1/models/:id/versions/:id | 1 | 9.03 | 9.03 | 9.03 | 9.03 | 9.03 | 9.03 | 9.03 | {"200":1} |
| GET | /api/v1/tags | 3 | 8.80 | 2.93 | 1.40 | 2.70 | 4.70 | 4.70 | 4.70 | {"200":3} |
| DELETE | /api/v1/model-drafts/:id | 1 | 6.18 | 6.18 | 6.18 | 6.18 | 6.18 | 6.18 | 6.18 | {"204":1} |
| GET | /api/v1/models/:id/permissions | 1 | 6.06 | 6.06 | 6.06 | 6.06 | 6.06 | 6.06 | 6.06 | {"200":1} |
| DELETE | /api/v1/models/:id/tags/:id | 1 | 6.04 | 6.04 | 6.04 | 6.04 | 6.04 | 6.04 | 6.04 | {"204":1} |
| GET | /api/v1/models/random | 1 | 5.45 | 5.45 | 5.45 | 5.45 | 5.45 | 5.45 | 5.45 | {"200":1} |
| GET | /api/v1/users | 1 | 5.36 | 5.36 | 5.36 | 5.36 | 5.36 | 5.36 | 5.36 | {"200":1} |
| GET | /api/v1/models/:id/versions/:id/tags | 1 | 4.49 | 4.49 | 4.49 | 4.49 | 4.49 | 4.49 | 4.49 | {"200":1} |
| GET | /api/v1/tags/popular | 1 | 4.47 | 4.47 | 4.47 | 4.47 | 4.47 | 4.47 | 4.47 | {"200":1} |
| GET | /api/v1/legacy/models/:id/resolve | 2 | 3.78 | 1.89 | 0.44 | 3.34 | 3.34 | 3.34 | 3.34 | {"400":1,"404":1} |
| GET | /api/v1/users/:id/models | 1 | 3.42 | 3.42 | 3.42 | 3.42 | 3.42 | 3.42 | 3.42 | {"200":1} |
| GET | /api-docs/auth/openapi.json | 1 | 2.98 | 2.98 | 2.98 | 2.98 | 2.98 | 2.98 | 2.98 | {"200":1} |
| GET | /admin/resources/User | 1 | 2.86 | 2.86 | 2.86 | 2.86 | 2.86 | 2.86 | 2.86 | {"200":1} |
| GET | /api/v1/tags/nonexistent-tag-xyz | 1 | 2.19 | 2.19 | 2.19 | 2.19 | 2.19 | 2.19 | 2.19 | {"404":1} |
| GET | /api/v1/users/whoami | 1 | 1.29 | 1.29 | 1.29 | 1.29 | 1.29 | 1.29 | 1.29 | {"401":1} |
| GET | /api/v1/tags/physics | 1 | 1.05 | 1.05 | 1.05 | 1.05 | 1.05 | 1.05 | 1.05 | {"200":1} |
| GET | /api/v1/dev/fill-in | 1 | 0.57 | 0.57 | 0.57 | 0.57 | 0.57 | 0.57 | 0.57 | {"404":1} |
| GET | /api/v1/test | 1 | 0.48 | 0.48 | 0.48 | 0.48 | 0.48 | 0.48 | 0.48 | {"200":1} |
| POST | /api/v1/dev/fill-in | 1 | 0.44 | 0.44 | 0.44 | 0.44 | 0.44 | 0.44 | 0.44 | {"404":1} |
