# eduMEET development with VS Code

One VS Code window for the whole stack: start everything with **Ctrl+Shift+B**, set breakpoints in any component, and run the tests from tasks. This builds on [DEVELOPMENT.md](DEVELOPMENT.md), which explains the components, configs and common problems.

## 1. Set up the workspace

The workspace is a plain parent folder holding the repos side by side, plus a few shared files copied from [dev-workspace/](dev-workspace/) in this repo:

```
~/src/edumeet/                 ← open this folder in VS Code
├── .nvmrc                     Node version (24) for tasks and debugging
├── bootstrap.sh               one-time setup
├── .vscode/
│   ├── tasks.json             start/stop, tests, lint, database
│   ├── launch.json            debug configurations
│   └── settings.json          ESLint as formatter, fix on save (all repos)
├── dev/
│   ├── with-node.sh           runs a command with the Node version from .nvmrc
│   ├── docker-compose.yml     PostgreSQL
│   └── mgmt-test.sh           management tests against a separate test database
├── edumeet/                   this repo (docs, workspace files)
├── edumeet-client/
├── edumeet-room-server/
├── edumeet-media-node/
├── edumeet-management-server/
└── edumeet-common/
```

```bash
mkdir -p ~/src/edumeet && cd ~/src/edumeet
git clone https://github.com/edumeet/edumeet.git
cp -a edumeet/dev-workspace/. .
./bootstrap.sh                 # Node 24, clone, install, local configs, Postgres, migrations
code .
```

To update the workspace files later (for example new tasks), pull `edumeet` and copy `dev-workspace/` again. The local config files inside the component repos are never overwritten.

Notes:
- **Open the parent folder, not one repo.** The tasks and debug configs refer to all components. VS Code's Source Control view (Ctrl+Shift+G) finds the five git repos inside on its own.
- The parent folder doesn't need to be a git repository.
- Install the **ESLint** extension (`dbaeumer.vscode-eslint`). All repos use ESLint, and the client's Vite dev server runs ESLint as part of the build too (`vite-plugin-eslint`). The included `.vscode/settings.json` (the setup suggested in the components' `CONTRIBUTING.md`) makes ESLint the formatter and fixes changed lines on save. Since it sits in the parent folder, it applies to all repos.

### Why `dev/with-node.sh`?
VS Code runs tasks in a shell that often doesn't load nvm, especially when VS Code was started from the desktop. Every task therefore runs through `dev/with-node.sh`, which loads nvm, switches to the version in `.nvmrc` and enables Corepack (Yarn 4). It doesn't change your nvm default. The debug configs use `"runtimeVersion": "24"`, which makes VS Code's JavaScript debugger pick that version from nvm as well.

## 2. Start, stop and restart

| Action | How |
|---|---|
| **Start the whole stack** | **Ctrl+Shift+B** (task `edumeet: start all`): Postgres → migrations → management-server, media-node, room-server, client, in one split terminal |
| Stop all components | Ctrl+Shift+P → *Tasks: Terminate Task* → *All Running Tasks* |
| Restart one component | Ctrl+Shift+P → *Tasks: Restart Running Task* → pick it |
| Stop or wipe Postgres | tasks `db: down` / `db: reset (DELETES ALL DATA)` |
| Database shell | task `db: psql` |

Run a task: Ctrl+Shift+P → *Tasks: Run Task* → pick the name.

After a code change:

| Component | What to do |
|---|---|
| client | nothing (Vite hot reload) |
| management-server | nothing (nodemon restarts it) |
| room-server, media-node | *Restart Running Task*; they recompile at start |

First time in the browser: open **https://localhost:8443** and accept the certificate, then join at **https://localhost:4443/test**.

### All tasks

| Task | What it does |
|---|---|
| `edumeet: start all` | default build task (Ctrl+Shift+B) |
| `management-server`, `media-node`, `room-server`, `client` | run one component |
| `media-node (LAN IP)` | media node that devices on your network can reach; asks for your LAN IP |
| `management-server: migrate` | apply migrations (runs automatically before `management-server`) |
| `db: up`, `db: down`, `db: reset (DELETES ALL DATA)`, `db: psql` | PostgreSQL |
| `install all`, `pull all`, `lint all` | across all repos |
| `common: build`, `room-server: build`, `media-node: build` | compile |
| `room-server: unit tests`, `media-node: unit tests`, `client: tests`, `management-server: tests` | tests; the management tests use the `edumeet_test` database |

### How the tasks work
- The four components are **background tasks** with problem matchers. VS Code knows when each is ready from its log line (`Feathers app listening`, `httpsServer.listen()`, `Config live reload`, `ready in`). TypeScript errors from `tsc` show up in the Problems panel (Ctrl+Shift+M).
- They share the presentation group `edumeet`, which puts their terminals side by side in one panel.
- The log level for room-server and media-node is `LOG_LEVEL` under `options.env` in `tasks.json` (default `info`). `DEBUG=edumeet:*` no longer does anything.

## 3. Debugging

Open the Run and Debug view (**Ctrl+Shift+D**), pick a configuration, press **F5**.

| Configuration | What it does |
|---|---|
| `room-server` | builds (`room-server: build`), runs `dist/server.js` with source maps; breakpoints in `src/*.ts` work |
| `media-node` | same for the media node (`--ip 127.0.0.1 --secret devsecret --numberOfWorkers 2`) |
| `management-server` | runs `src/index.ts` through `ts-node/register`; runs migrations first |
| `client (Chrome)` | starts the Vite task if needed and opens a separate Chrome with a debug profile that accepts the dev certificates |
| `client: 2nd peer (fake media)` | a second Chrome with its own profile and a fake camera and mic, so you can be two participants |
| `Attach to running Node process` | attach to a component started by a task (pick it from the list), no restart |
| `room-server: unit tests (current file)`, `media-node: unit tests (current file)` | jest under the debugger for the open test file |
| **Debug: full stack** | the three servers and the client; stopping one stops all |
| **Debug: servers only** | the three servers |

Things to know:
- **A debug config and the matching task use the same port.** Stop the task first, or you'll get `EADDRINUSE`. To debug one component, stop only its task and keep the others running.
- `edumeet-common` reaches the servers as a compiled package. Set breakpoints in `node_modules/edumeet-common/lib/*.js` of the server you're debugging, or link your local checkout (DEVELOPMENT.md, "Changing edumeet-common").
- The `client (Chrome)` profile starts with `--ignore-certificate-errors`, so you don't need to accept certificates there. Only use that profile for development.
- WebRTC internals: open `chrome://webrtc-internals` in the debug Chrome.

## 4. Keyboard shortcuts

Linux and Windows defaults; on macOS use Cmd instead of Ctrl.

| Shortcut | Action |
|---|---|
| **Ctrl+Shift+B** | start the stack |
| **Ctrl+Shift+P** | Command Palette (*Tasks: Run / Terminate / Restart Task*) |
| Ctrl+` | show or hide the terminal panel (task output) |
| Ctrl+Shift+` | new terminal |
| **Ctrl+Shift+D** | Run and Debug view |
| **F5** | start debugging / continue |
| **Shift+F5** | stop debugging |
| **Ctrl+Shift+F5** | restart debugging |
| F9 | toggle breakpoint |
| F10 / F11 / Shift+F11 | step over / into / out |
| Ctrl+Shift+M | Problems panel |
| Ctrl+Shift+G | Source Control (all repos) |
| Ctrl+P | open a file by name |
| Ctrl+Shift+F | search in all repos |

Optional key bindings for tasks: Ctrl+Shift+P → *Preferences: Open Keyboard Shortcuts (JSON)*:
```json
[
	{ "key": "ctrl+alt+x", "command": "workbench.action.tasks.terminate", "args": "terminateAll" },
	{ "key": "ctrl+alt+r", "command": "workbench.action.tasks.restartTask" },
	{ "key": "ctrl+alt+t", "command": "workbench.action.tasks.runTask" }
]
```

## 5. Troubleshooting (VS Code specific)

| Problem | Fix |
|---|---|
| Task fails: `nvm: command not found` / wrong Node | Check that `~/.nvm/nvm.sh` exists (set `NVM_DIR` if nvm lives elsewhere) and that the Node version in `.nvmrc` is installed (`nvm install`) |
| Debug config: "Can't find Node.js binary" or a version error | `runtimeVersion: "24"` needs Node 24 installed through nvm |
| `edumeet: start all` stays "running", nothing happens | Each component signals "ready" through its log line. Look at the terminal of the component that is still starting |
| `EADDRINUSE` when starting a debug config | Stop the matching task, or run `fuser -k 3000/tcp 3030/tcp 4443/tcp 8443/tcp` |
| Breakpoints in room-server or media-node stay grey | Started from a task rather than the debug config: use *Attach to running Node process*, or stop the task and launch the debug config, which builds with source maps |
| Client loads, join does nothing | Accept https://localhost:8443 in the browser you're using (not needed in the `client (Chrome)` debug profile) |
| Something is stuck | Terminate all tasks → `db: down` → `fuser -k …` (above) → Ctrl+Shift+B |
