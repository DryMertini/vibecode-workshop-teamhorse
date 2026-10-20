# Connect your team

Commands below use a macOS/Linux/WSL shell. Install [Git](https://git-scm.com/downloads), [Node.js 22 or newer](https://nodejs.org/en/download) and optionally [GitHub CLI](https://cli.github.com/manual/installation) on your laptop. The assigned team container supplies its own runtime.

## 1. Obtain your assigned environment

Each team receives an organiser handout (e.g. `team-NN.md`) with:
- A private SSH key file: `team-NN.key`
- Pinned known hosts: `team-NN.known_hosts`
- An SSH port (e.g. `220NN`) and container username `vc-team`
- A public HTTPS URL: `https://team-NN.intra.land`

Before connecting, set secure permissions on the private key:

```sh
chmod 600 team-NN.key
```

Copy and run the exact SSH command from your team handout (`team-NN.md`) from the directory where `team-NN.key` and `team-NN.known_hosts` are stored:

```sh
ssh -i team-NN.key -p <port> -o UserKnownHostsFile=team-NN.known_hosts vc-team@<host>
```

### Adding teammate personal SSH keys (self-service)

The team private key in the handout is the initial shared bootstrap credential provided by the organiser. To follow good credential security (AGENTS.md rule 8), teammates are encouraged to self-service add their individual personal public keys to `~/.ssh/authorized_keys` inside the container rather than copying private keys between laptops:

```sh
echo "ssh-ed25519 AAAAC3... teammate@laptop" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Once added, that teammate can connect directly using their personal key:

```sh
ssh -i ~/.ssh/id_ed25519 -p <port> -o UserKnownHostsFile=team-NN.known_hosts vc-team@<host>
```

Your personal notes may go in `.workshop.local.md`, which is ignored by Git. Never commit private host addresses, usernames, keys or access tokens.

## 2. Fork and share GitHub access

One teammate forks [ikodo0/vibecode-workshop](https://github.com/ikodo0/vibecode-workshop/fork). That teammate invites the others as collaborators on **their fork**. Accept the invitations before building. Open your fork's Actions tab and enable workflows if GitHub asks. Confirm a `Check` run appears after your first push; an absent run is not a passing check.

With the [GitHub CLI](https://cli.github.com/manual/installation), the fork owner can run on their laptop:

```sh
gh auth login
gh repo fork ikodo0/vibecode-workshop --clone --remote
cd vibecode-workshop
gh repo set-default YOUR-OWNER/YOUR-FORK
git remote -v
npm ci
npm run doctor
```

Replace `YOUR-OWNER/YOUR-FORK` with the team's actual fork path. Forking can set the upstream as GitHub CLI's default, so explicitly select your fork. All PRs belong to the team fork. Teammates clone that same fork rather than creating competing forks:

```sh
gh repo clone YOUR-OWNER/YOUR-FORK
cd YOUR-FORK
gh repo set-default YOUR-OWNER/YOUR-FORK
```

Alternatively use GitHub's Fork button and clone the HTTPS URL from your fork's Code button. Follow [GitHub authentication](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-authentication-to-github); an account password is not a Git HTTPS credential. Public clones need no login; pushing needs your own authorised credential.

## 3. Enter the workshop machine

Run the organiser's assigned SSH command **on your laptop** from the folder containing the key and known_hosts files:

```sh
ssh -i team-NN.key -p <port> -o UserKnownHostsFile=team-NN.known_hosts vc-team@<host>
```

The command opens your team's interactive container shell. Run subsequent deployment commands inside that shell.

Inside the shell, confirm:

```sh
whoami
node --version
git --version
pwd
```

`whoami` is `vc-team`. The account has no sudo. The guest already has a placeholder app in `~/workshop` and serves it with the user service `vc-app.service`. Leave that directory as it is. If the account or contract is different, ask the organiser. Do not change the host's SSH, DNS or container settings.

Clone the team's **public** fork inside the container, replacing the URL. Clone into `~/src/team`, not `~/workshop`:

```sh
mkdir -p "$HOME/src"
git clone https://github.com/YOUR-OWNER/YOUR-FORK.git "$HOME/src/team"
cd "$HOME/src/team"
npm ci
npm test
```

You can keep authenticated coding agents and GitHub pushes on your laptops, then fetch the public fork in the container. This avoids requiring an agent login on the team server. A private fork needs a separately authorised Git credential in the container; ask for help rather than copying your laptop's private key or sharing a token.

### Previewing a teammate's dev server

To preview a development server running inside the container (e.g. `PORT=3001 npm start` or `npx next dev -p 3001`), use SSH port forwarding from your laptop:

```sh
ssh -i team-NN.key -p <port> -o UserKnownHostsFile=team-NN.known_hosts -L 3001:127.0.0.1:3001 vc-team@<host>
```

Then open `http://localhost:3001` in your laptop browser.

### Keeping sessions alive across network drops

Use `tmux` inside the container so long-running coding agent sessions or builds remain active if your SSH connection drops:

```sh
tmux new -s vibe
```

If disconnected, simply reconnect SSH and reattach:

```sh
tmux attach -t vibe
```

Continue with [deployment](deploy.md).

## Troubleshooting

| Symptom | Check / action |
|---|---|
| `Permission denied (publickey)` | Did you run `chmod 600 team-NN.key`? Are you in the directory containing `team-NN.key` and `team-NN.known_hosts`? If using a personal key, did a teammate append it to `~/.ssh/authorized_keys`? |
| `Could not resolve hostname` | Copy the exact supplied hostname; ask organiser to verify DNS. |
| GitHub clone works but push fails | Check collaborator invitation and your own GitHub authentication. |
| PR targets the workshop starter | Run `gh repo set-default YOUR-OWNER/YOUR-FORK`; explicitly use `--repo` on PR commands. |
| `EADDRINUSE` on port 3000 | `vc-app` is already serving the placeholder or a release. Inspect it before starting another process; see deployment. |
| Public URL shows the placeholder page | The release drop-in is not active, or the public route is not ready. On the guest, `vc-app status` shows the user service. |
| No assigned SSH command or URL | Hosting is not ready for your team; ask the organiser. A URL in a form is not a health check. |

Sources: [fork CLI](https://cli.github.com/manual/gh_repo_fork), [forking guide](https://docs.github.com/en/pull-requests/how-tos/fork-a-repo), [SSH keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent).
