# Documentation governance

Phase 1 foundation for long-term documentation quality and safe collaboration.

Use these governance docs before adding or editing product, flow, service, or component docs:

| Document | Purpose |
|----------|---------|
| [DOC_CLASSIFICATION.md](DOC_CLASSIFICATION.md) | Canonical vs operational vs historical vs archive categories |
| [DOC_OWNERS.md](DOC_OWNERS.md) | Ownership model and review responsibilities |
| [DOC_TEMPLATE.md](DOC_TEMPLATE.md) | Standard structure for new/updated docs |
| [UPDATE_CHECKLIST.md](UPDATE_CHECKLIST.md) | Required updates when behavior changes, including safe Git upload checks |

## Security baseline for docs work

- Never commit real credentials, private keys, or production URLs with embedded credentials.
- Keep all real secrets in host-managed environment variables (not in Git).
- Use placeholder values (`example`, `...`, or `REDACTED`) in Markdown.
