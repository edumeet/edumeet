# Development workspace template

Files for a local eduMEET development workspace: one folder holding all repos side by side. Copy them into that folder and run the bootstrap script:

```bash
mkdir -p ~/src/edumeet && cd ~/src/edumeet
git clone https://github.com/edumeet/edumeet.git
cp -a edumeet/dev-workspace/. .
./bootstrap.sh            # GIT_BASE=git@github.com:edumeet ./bootstrap.sh to clone over SSH
```

| File | Purpose |
|---|---|
| `bootstrap.sh` | Node 24 (nvm) and Yarn 4 (Corepack), clone the component repos, `yarn install`, write the local gitignored config files, start PostgreSQL, run migrations |
| `.nvmrc` | Node version used by the scripts, tasks and debug configs |
| `dev/with-node.sh` | runs a command with the Node version from `.nvmrc` |
| `dev/docker-compose.yml` | PostgreSQL for the management server |
| `dev/mgmt-test.sh` | management-server tests against a separate `edumeet_test` database |
| `.vscode/tasks.json` | VS Code: start the stack (Ctrl+Shift+B), tests, lint, database |
| `.vscode/launch.json` | VS Code: debug configurations for every component |
| `.vscode/settings.json` | VS Code: ESLint as formatter for all repos |

Guides: [DEVELOPMENT.md](../DEVELOPMENT.md) (any editor) and [DEVELOPMENT-VSCODE.md](../DEVELOPMENT-VSCODE.md).

`cp -a edumeet/dev-workspace/. .` also copies this README into the workspace folder; delete it there or keep it as a reminder.
