# Community setup submissions

Files in this directory are review artifacts created from public GitHub example-proposal issues. They preserve the normalized OpticalSetup scene, contributor attribution, source issue, submission time, and a scene checksum.

Merging a proposal file does not automatically publish it. Every file lands with `"status": "proposed"`. A maintainer must review the setup, then deliberately flip that field to `"approved"` and run `node tools/build-community.mjs` to publish it — that flip is the moderation gate. Approved entries get their own page under `community/<slug>/` (title, author, abstract, optional reference, and a locked embed of the actual scene) plus an entry in the "From the community" dropdown in the app. Unlike `Examples/`, these setups are not vetted for pedagogical accuracy — they show real usage, not curated teaching material.

The proposal workflow treats all issue text and scene data as untrusted input. It bounds payload size and object counts, parses with the current component registry, traces the scene, checks finite SVG output, and runs the full repository test suite before opening a draft pull request.

Repository setup: the workflow requests `contents: write`, `issues: write`, and `pull-requests: write`. The repository owner must also allow GitHub Actions to create pull requests under **Settings → Actions → General → Workflow permissions**. If that repository-level switch is off, validation can pass but GitHub will refuse the draft-PR creation step.
