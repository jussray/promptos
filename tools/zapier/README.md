# Zapier SDK tooling

This package gives PromptOS a server-side Zapier SDK development boundary without turning the prompt library into an application runtime or exposing provider credentials in prompt assets.

## Local setup

Requirements: Node.js 20+ and a Zapier account with at least one connected app.

```bash
cd tools/zapier
npm install
npx skills add zapier/sdk -y
npm run login
npm run connections
npm run start
```

`npm run start` performs a read-only authentication check with `getProfile()`. It does not run an app action or modify prompt content.

## Explore connected apps

```bash
npm run apps
npm run connections
npx zapier-sdk list-actions github
npx zapier-sdk list-actions hubspot
```

Generate TypeScript types only for integrations selected for a reviewed workflow:

```bash
npx zapier-sdk add github hubspot --types-output ./src/generated
```

## Production credentials

Browser login is for local development. For server-side execution, create approved client credentials locally:

```bash
npx zapier-sdk create-client-credentials "promptos-tooling"
```

Store the returned values in the server or deployment secret manager as:

- `ZAPIER_CREDENTIALS_CLIENT_ID`
- `ZAPIER_CREDENTIALS_CLIENT_SECRET`

The bootstrap also supports an approved `ZAPIER_CREDENTIALS` direct token, but client credentials are preferred for server-side use.

Never commit credentials, generated connection output, private prompts, proprietary prompt transformations, user data, or app payloads. Live writes, publication, deployment, and credential lifecycle changes remain separate approval gates.

Official quickstart: https://docs.zapier.com/sdk/quickstart
