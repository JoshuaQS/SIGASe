# AccessLog Result Codes

## eLibro-related failures

- `FAILED_ELIBRO_CONFIG`
  - Meaning: backend could not safely call eLibro because local configuration is missing, inactive or incomplete.
  - Typical causes:
    - no active `ElibroConfig`
    - missing `authEndpoint`
    - missing encrypted credentials
  - HTTP response:
    - `503 Service Unavailable` (`SERVICE_UNAVAILABLE`)

- `FAILED_ELIBRO_API`
  - Meaning: backend attempted to call eLibro SSO API, but the remote call failed.
  - Typical causes:
    - timeout
    - non-2xx response
    - invalid response payload (no `url`)
  - HTTP response:
    - `502 Bad Gateway` (`PROVIDER_ERROR`)

## next validation failure

- `FAILED_NEXT_URL_VALIDATION`
  - Meaning: `next` URL failed strict validation policy.
