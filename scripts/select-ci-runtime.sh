#!/usr/bin/env bash
set -euo pipefail

# Reuse the runtime already used by Core's successful CI; never download a fallback.
: "${RUNNER_TOOL_CACHE:?GitHub runner tool cache required}"
: "${GITHUB_PATH:?GitHub PATH output file required}"
registry_node_version=24.20.0
registry_node_bin="${RUNNER_TOOL_CACHE}/node/${registry_node_version}/x64/bin"
test -x "${registry_node_bin}/node"
test "$("${registry_node_bin}/node" --version)" = "v${registry_node_version}"
printf '%s\n' "${registry_node_bin}" >> "${GITHUB_PATH}"
