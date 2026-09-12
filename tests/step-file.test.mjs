import assert from 'node:assert/strict';
import test from 'node:test';
import { validateStepFile } from '../scripts/lib/step-file.mjs';

const validFixture = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('fixture'),'1');
FILE_NAME('fixture.step','2026-09-05T00:00:00',(''),(''),'test','test','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
#1 = CARTESIAN_POINT('',(0.,0.,0.));
#2 = AXIS2_PLACEMENT_3D('',#1,$,$);
ENDSEC;
END-ISO-10303-21;
`;

test('accepts a minimal structurally complete STEP exchange file', () => {
  assert.deepEqual(validateStepFile(validFixture), []);
});

test('rejects an unresolved entity reference', () => {
  const failures = validateStepFile(validFixture.replace('#1,$,$', '#999,$,$'));
  assert.ok(failures.some((failure) => failure.includes('unresolved entity references')));
});

test('rejects duplicate identifiers and trailing payload', () => {
  const invalid = validFixture
    .replace('#2 =', '#1 =')
    .replace('END-ISO-10303-21;', 'END-ISO-10303-21;\ntrailing payload');
  const failures = validateStepFile(invalid);
  assert.ok(failures.some((failure) => failure.includes('duplicate entity identifiers')));
  assert.ok(failures.some((failure) => failure.includes('trailing data')));
});

test('rejects missing or reordered required sections', () => {
  const failures = validateStepFile(validFixture.replace('DATA;', ''));
  assert.ok(failures.length > 0);
});
