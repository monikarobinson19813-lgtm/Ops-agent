# Security

This public repository must contain only generic source code, documentation, and anonymized test data.

Never commit production credentials, authentication material, customer identifiers, real transaction data, chat exports, private channel/group identifiers, production URLs, or authenticated browser/session state.

If a secret is accidentally committed, rotate/revoke it immediately and remove it from the repository history before continuing development.

The workflow engine is intended for read-only operational support. Financial state-changing actions should remain outside this public reference implementation.
