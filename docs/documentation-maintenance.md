# Maintaining the documentation

Use the source and configuration for the version being documented. The
repositories evolve independently; a guide for `main` may not describe an
older image or a local override.

## Where documentation belongs

Keep detailed instructions in the repository that owns the code, configuration
or deployment they describe. Use the `edumeet` README as the project-wide
starting point, linking to those guides rather than copying them.

| Repository | Documentation it owns |
| --- | --- |
| `edumeet` | Project overview and navigation; cross-service guides; development of the complete source workspace; and the minimal deployment, whose Compose file and setup scripts live here. |
| `edumeet-docker` | The full Docker deployment and its operator guides: installation, networking, certificates, authentication, meetings, backups, troubleshooting and Docker-specific development. |
| `edumeet-client` | Client development and build instructions, browser configuration, client-facing APIs and browser automation attributes. |
| `edumeet-common` | Shared-library usage, public interfaces, compatibility, build and tests. |
| `edumeet-management-server` | Management-service configuration and APIs, signing keys, migrations, database setup and tests. |
| `edumeet-media-node` | Media-node configuration, networking, certificates, APIs and node-specific features and operations. |
| `edumeet-room-server` | Room-server configuration and integrations, signaling and service-specific behavior, APIs and tests. |
| `edumeet-sip-gateway` | The SIP room connector: deployment of its central host and gateway hosts, TURN for the room systems, adding institutions, images and updates. The gateway code is in the fork `edumeet-sipmediagw`. |

For a feature spanning repositories, keep the user-facing workflow in the
project guide and put implementation-specific configuration and API details
with the component that owns them. Link between the guides; do not maintain
competing copies of the same instructions. Deployment guides should remain
separate when their defaults or setup steps differ.

## When making a change

1. Update the guide alongside the code, configuration or behavior it
   describes. Include the deployment, version, prerequisites and security
   implications when relevant.
2. Keep setup steps in their task guide and use the README as an index. Avoid
   maintaining a second copy of a port table or command sequence.
3. Check changed links in the rendered Markdown, including local targets,
   headings and links to other repositories. Preserve existing heading anchors
   when moving a section, or leave a link at the old location.
4. From each affected repository, check tracked edits before and after staging:

   ```bash
   git diff --check
   git diff --cached --check
   ```

   The first command does not check untracked files. Stage only the intended
   files before the second command. The documentation workflows in `edumeet`
   and `edumeet-docker` also check changed Markdown whitespace on pull requests
   and pushes to `main`. They do **not** check links or factual accuracy.
5. Say what was verified and what was not. Do not copy production secrets,
   private hostnames, credentials, logs or screenshots into documentation.

## Check configuration-dependent guidance

| Change | Check against |
| --- | --- |
| Minimal Docker ports, certificates or setup | `edumeet`'s `docker-compose.yml`, `proxy/nginx.conf.template`, `room-server/config.json.template` and `run-first.sh` |
| Full Docker ports, addresses or certificates | `edumeet-docker`'s Compose file, `.env`, proxy and server templates, and `utils/` scripts. Keep the port SVG and draw.io source in sync. |
| Development commands or versions | `dev-workspace/`, the component `package.json` files and the current component configuration examples |
| Authentication, meetings or invitations | Management-server and room-server behavior, relevant client UI, and full Docker configuration |
| Bots, automation, encryption or webinars | The relevant component code and tests. Label historical measurements and unverified assumptions. |

Minimal and full Docker are separate setups; verify each separately. In
particular, distinguish public ports from internal listeners, and TCP from
UDP. If an issue is fixed, update or remove its documented workaround only
after checking the affected release.

## Validate safely

Use an isolated test instance for deployment, login, mail or recovery checks.
Do not run database restores, firewall changes or destructive setup commands
against a shared or production service. A local Markdown or whitespace check
cannot prove that a deployment, backup, TURN path or login works.
