# npm-ci-once

Restore node_modules only if `package-lock.json` has changed before previous restoration.

## Use with npx

```sh
npx ci-once
```

## Install from npm

```sh
npm install -g npm-ci-once
```

And then use:

```sh
npm-ci-once
```

## Mechanism

See the tiny implementation: [src/main.js](src/main.js).

- **Restoration**: To restore, this script spawns a default shell to execute `npm ci`.
- **Skipping unnecessary restoration**: After restoration, this script writes SHA-256 hash value of `package-lock.json` to a file under `node_modules`. This scripts also checks if the hash value has changed or not.
