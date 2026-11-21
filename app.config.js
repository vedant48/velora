// Dynamic Expo config: app.json stays the base; this injects the signing
// certificate SHA-256 of the current build so the in-app updater can refuse
// to offer releases signed with a different key (e.g. bridge users must not
// be prompted to install the final upload-key build before guided migration).
// CI sets VELORA_CERT_SHA256; local/dev builds leave it unset (gating off).
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    certSha256: process.env.VELORA_CERT_SHA256 || null,
  },
});
