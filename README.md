# KONITIF ecosystem registry

A versioned directory of KONITIF components and their independent distributions.

The registry connects stable component identities to repositories, exact versions,
source revisions and artifact references. It is a collection of references, not
a bundle of package code.

## Explore

- [Component registry](ecosystem/registry.json)
- [Registry format](ecosystem/README.md)
- [Reference manifests](ecosystem/releases/README.md)

The current registry is a Core-only draft. No official ecosystem release is
available yet.

## Validate locally

Requires Node.js 22 or newer. No package installation is needed.

```sh
node scripts/validate-registry.mjs ecosystem/registry.json
node scripts/validate-manifests.mjs ecosystem/releases
node --test tests/*.test.mjs
```

Validation checks reference consistency and content digests. It does not grant
licence rights or certify the referenced artifacts.

## Contribute

Changes are reviewed through pull requests. See the [maintainer guide](MAINTAINING.md)
for validation and repository configuration.

## Licence

[PolyForm Noncommercial 1.0.0](LICENSE.md). Source-available, not OSI open source.
Commercial use requires a separate written licence.
