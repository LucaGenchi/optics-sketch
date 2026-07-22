import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import test from 'node:test';
import {
  extractProposalIssue,
  materializeProposal,
  sceneFromShareURL,
} from '../scripts/materialize-example-proposal.mjs';

const scene = {
  app: 'optics2d',
  version: 1,
  elements: [
    {
      id: 'e-source', type: 'laser', x: 80, y: 120, rot: 0, label: 'proposal source', showLabel: true,
      params: { wavelength: 532 },
    },
    {
      id: 'e-lens', type: 'lens', x: 260, y: 120, rot: 0, label: 'focusing lens', showLabel: true,
      params: { f: 100, dia: 25.4 },
    },
  ],
  beams: [],
};

function shareURL(value = scene, host = 'opticalsetup.com', encoding = 'g') {
  const json = JSON.stringify(value);
  const bytes = encoding === 'g' ? gzipSync(json) : Buffer.from(json);
  return `https://${host}/sketch/#sketch=${encoding}.${bytes.toString('base64url')}`;
}

function issueBody({ link = shareURL(), checked = true, checkmark = 'x', description = 'Shows a simple focusing path with a labelled source and lens.' } = {}) {
  return `### Setup name

Green focusing path

### What does this setup demonstrate?

${description}

### OpticalSetup share link

${link}

### Contribution acknowledgement

- [${checked ? checkmark : ' '}] I created or have permission to share this setup.
`;
}

test('proposal issue fields survive a heading-like string in the description', () => {
  const fields = extractProposalIssue(issueBody({
    description: 'Explains the layout.\n\n### OpticalSetup share link\n\nThis sentence is not the actual link.',
  }));
  assert.equal(fields.name, 'Green focusing path');
  assert.match(fields.description, /not the actual link/);
  assert.equal(fields.shareURL, shareURL());
});

test('proposal materialization normalizes, traces, exports, and records provenance', () => {
  const result = materializeProposal({
    issueNumber: '42',
    issueBody: issueBody(),
    userLogin: 'example-contributor',
    createdAt: '2026-07-22T10:30:00Z',
  });
  assert.equal(result.proposalFile, 'example-proposals/issue-42.json');
  assert.equal(result.branchName, 'example-proposal/issue-42');
  assert.equal(result.proposal.name, 'Green focusing path');
  assert.equal(result.proposal.author.github, 'example-contributor');
  assert.equal(result.proposal.source.issue, 'https://github.com/LucaGenchi/optics-sketch/issues/42');
  assert.equal(result.proposal.scene.elements.length, 2);
  assert.match(result.proposal.sceneSha256, /^[0-9a-f]{64}$/);
  assert.match(result.prBody, /parsed and normalized/);
});

test('proposal materialization accepts GitHub issue forms uppercase checkbox output', () => {
  const result = materializeProposal({
    issueNumber: '43',
    issueBody: issueBody({ checkmark: 'X' }),
    userLogin: 'example-contributor',
    createdAt: '2026-07-22T10:30:00Z',
  });
  assert.equal(result.proposalFile, 'example-proposals/issue-43.json');
});

test('proposal materialization requires acknowledgement and official share links', () => {
  assert.throws(() => materializeProposal({
    issueNumber: 42,
    issueBody: issueBody({ checked: false }),
    userLogin: 'example-contributor',
    createdAt: '2026-07-22T10:30:00Z',
  }), /acknowledgement/i);
  assert.throws(() => sceneFromShareURL(shareURL(scene, 'example.com')), /official/i);
});

test('proposal materialization rejects duplicate IDs and unsupported encodings', () => {
  const duplicate = structuredClone(scene);
  duplicate.elements[1].id = duplicate.elements[0].id;
  assert.throws(() => materializeProposal({
    issueNumber: 42,
    issueBody: issueBody({ link: shareURL(duplicate) }),
    userLogin: 'example-contributor',
    createdAt: '2026-07-22T10:30:00Z',
  }), /unique ID/i);
  assert.throws(() => sceneFromShareURL(shareURL(scene, 'opticalsetup.com', 'x')), /unsupported encoding/i);
});
