function isValidLicenseId(licenseId) {
  return /\.services?$/i.test(String(licenseId || '').trim());
}

const LICENSE_REJECTION_MESSAGE =
  'Verification failed: License ID must end with .service or .services';

function verificationFromLicense(licenseId) {
  if (isValidLicenseId(licenseId)) {
    return {
      valid: true,
      verificationStatus: 'APPROVED',
      status: 'APPROVED',
      availability: 'AVAILABLE'
    };
  }
  return {
    valid: false,
    verificationStatus: 'REJECTED',
    status: 'REJECTED',
    availability: 'OFFLINE',
    message: LICENSE_REJECTION_MESSAGE
  };
}

module.exports = {
  isValidLicenseId,
  LICENSE_REJECTION_MESSAGE,
  verificationFromLicense
};
