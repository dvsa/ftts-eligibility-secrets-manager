# FTTS-ELIGIBILITY-SECRETS-MANAGER

...

## Local Config

```bash
npm run copy-config
```

Fill in the required configuration in local.settings.json

## Build

```bash
npm install
npm run build
```

## Test

```bash
npm run test
```

## Start

```bash
npm run start
```

## Healthcheck HTTP endpoint

eligibility-secrets-manager healthcheck function is a troubleshooting/support function to check connectivity with specific components used by application

GET <eligibility-secrets-manager-url>/api/<version>/healthcheck - e.g. /api/v1/healthcheck

Responses:

- HTTP 200 (connections OK)

- HTTP 503 with response body containing specific errors details:

```json
{
  "status": "Service unavailable",
  "errors": [
    {
      "component": "<COMPONENT_NAME>",
      "message": "<ERROR_MESSAGE>",
    }
  ]
}
```

- HTTP 500 with response body containing error message

Documentation - https://wiki.dvsacloud.uk/pages/viewpage.action?spaceKey=FB&title=Health+Checks