# Development workspace template

Files for a local eduMEET development workspace: one folder holding all repos
side by side. Follow the [quick start](../DEVELOPMENT.md#3-quick-start-recommended)
to create a new workspace and run the bootstrap script.

Copying the template into an existing workspace can overwrite its files.
Bootstrap uses a fixed local database container and resets the super-admin
password to the workspace value when rerun; review the setup guide first.

| File | Purpose |
|---|---|
| `bootstrap.sh` | Node 24 (nvm) and Yarn 4 (Corepack), clone the component repos, `yarn install`, make the workspace's token key pair and super-admin password in `.dev-secrets/`, write the local gitignored config files, start PostgreSQL, run migrations, set the super-admin password |
| `.nvmrc` | Node version used by the scripts, tasks and debug configs |
| `dev/with-node.sh` | runs a command with the Node version from `.nvmrc` |
| `dev/docker-compose.yml` | PostgreSQL for the management server |
| `dev/mgmt-test.sh` | management-server tests; check that `config/test.json` and overrides target a separate database |
| `.vscode/tasks.json` | VS Code: start the stack (Ctrl+Shift+B), tests, lint, database |
| `.vscode/launch.json` | VS Code: debug configurations for every component |
| `.vscode/settings.json` | VS Code: ESLint as formatter for all repos |

Guides: [DEVELOPMENT.md](../DEVELOPMENT.md) (any editor) and [DEVELOPMENT-VSCODE.md](../DEVELOPMENT-VSCODE.md).

`cp -a edumeet/dev-workspace/. .` also copies this README into the workspace
folder; its relative guide links work in the repository, not in that copy.
