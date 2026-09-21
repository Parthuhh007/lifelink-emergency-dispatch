const { isValidLicenseId, verificationFromLicense, LICENSE_REJECTION_MESSAGE } = require('./license');

const valid = ['ABC.service', 'ABC.services', 'ABC.SERVICE', 'ABC.Services', '  ABC.service'];
const invalid = ['ABC', 'ABC.com', 'ABC.service123', 'ABC.service.xyz'];

let failed = 0;
for (const value of valid) {
  if (!isValidLicenseId(value) || !verificationFromLicense(value).valid) {
    console.error('expected valid:', value);
    failed += 1;
  }
}
for (const value of invalid) {
  const result = verificationFromLicense(value);
  if (result.valid || result.message !== LICENSE_REJECTION_MESSAGE) {
    console.error('expected invalid:', value, result);
    failed += 1;
  }
}

if (failed) {
  console.error(`FAILED ${failed}`);
  process.exit(1);
}
console.log('license verification tests passed');
