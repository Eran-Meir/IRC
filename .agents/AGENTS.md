# Workspace Operational Rules

## Strict Cloud Execution Policy
- **No Local Code Execution**: Do NOT run `npm`, `go`, `docker`, or python application scripts locally on the user's laptop.
- **GitOps Pipeline**: All compilation, container builds, and deployments happen strictly in GitHub Actions and Oracle Cloud K3s.
- **Editing Workspace**: The local environment is strictly a source code editing workspace.
