console.error("Google Desktop OAuth no longer stores or configures a client secret in MK Receipt Pro.");
console.error("The Windows app uses the public Desktop client ID with PKCE. Do not place OAuth client secrets in resources, source control, or release packages.");
process.exit(1);
