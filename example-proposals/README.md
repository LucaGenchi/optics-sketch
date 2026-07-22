# Community example proposals

Files in this directory are review artifacts created from public GitHub example-proposal issues. They preserve the normalized OpticalSetup scene, contributor attribution, source issue, submission time, and a scene checksum.

Merging a proposal file does not automatically add it to the app. A maintainer must still review the optical explanation, confirm the stated qualitative limitations, and deliberately promote an accepted scene into `sketch/js/examples.js` with the normal regression coverage.

The proposal workflow treats all issue text and scene data as untrusted input. It bounds payload size and object counts, parses with the current component registry, traces the scene, checks finite SVG output, and runs the full repository test suite before opening a draft pull request.

Repository setup: the workflow requests `contents: write`, `issues: write`, and `pull-requests: write`. The repository owner must also allow GitHub Actions to create pull requests under **Settings → Actions → General → Workflow permissions**. If that repository-level switch is off, validation can pass but GitHub will refuse the draft-PR creation step.
