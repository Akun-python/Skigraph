# Bundled workflow skills

This directory contains the skill contracts required by the workflows in
`.skill-workflows/`. They are bundled so a fresh clone can load and execute
the workflow graph without cloning an additional repository.

## Provenance and licensing

- `algorithm-research-loop`, `paper-figure-contract`, and
  `stage-skill-memory` are project-local contracts and are licensed under the
  repository's Apache-2.0 license.
- The remaining bundled contracts were derived from
  [K-Dense scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills)
  at upstream revision `a25cf9ec00e2745d03f8704acf6f6919694ccd9a`.
- The upstream bundle is MIT-licensed. The complete license text is retained
  in [`LICENSE.K-Dense.md`](./LICENSE.K-Dense.md). Individual `SKILL.md`
  files retain their upstream attribution and license metadata.

The `.vendor/scientific-agent-skills` directory is optional and remains
ignored; it is only useful when refreshing the bundled copy. If a bundled
skill is changed, start a new workflow run because skill hashes are pinned at
run start.
