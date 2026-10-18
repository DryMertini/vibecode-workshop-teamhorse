# Connect your team

## 1. Register and obtain your assigned environment

Open [intra.land/vibecode](https://intra.land/vibecode), register with your linked 42 account, and join or create your team. Use the page's current deadlines; do not rely on a copied schedule in this repo.

Every person needs their own SSH public key. If you do not already have a suitable key, run this on **your laptop**:

```sh
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_workshop -C workshop
cat ~/.ssh/id_ed25519_workshop.pub
```

If that file already exists, reuse it or choose another filename; do not overwrite it. Upload only the `.pub` content in the workshop's SSH-key form. Keep the private file on your laptop. Every teammate uploads their own key through their own account.

Copy the actual SSH command and HTTPS URL provided by the organiser/workshop page. If none is available, ask the organiser to provision the team. There is no address hidden in this starter. Do not invent a hostname from the team name, and do not assume renaming changes connection details.

Your personal notes may go in `.workshop.local.md`, which is ignored by Git. Never commit private host addresses, usernames, keys or access tokens.

## 2. Fork and share GitHub access

One teammate forks [ikodo0/vibecode-workshop](https://github.com/ikodo0/vibecode-workshop/fork). That teammate invites the others as collaborators on **their fork**. Accept the invitations before building.

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
```

Alternatively use GitHub's Fork button and clone the HTTPS URL from your fork's Code button. Follow [GitHub authentication](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-authentication-to-github); an account password is not a Git HTTPS credential. Public clones need no login; pushing needs your own authorised credential.

## 3. Enter the workshop machine

Run the organiser's assigned SSH command **on your laptop**, using `-i ~/.ssh/id_ed25519_workshop` if you created that key. Verify a first-connection fingerprint with the organiser before accepting it. The command opens your team's interactive container shell. Run subsequent deployment commands inside that shell.

Inside the shell, confirm:

```sh
whoami
node --version
git --version
pwd
```

The supplied deployment helper expects `student` on Linux with systemd. If the organiser's environment differs, ask for the correct deployment route. Do not change the host's SSH, DNS or container settings.

Clone the team's **public** fork inside the container, replacing the URL:

```sh
git clone https://github.com/YOUR-OWNER/YOUR-FORK.git workshop
cd workshop
npm ci
npm test
```

You can keep authenticated coding agents and GitHub pushes on your laptops, then fetch the public fork in the container. This avoids requiring an agent login on the team server. A private fork needs a separately authorised Git credential in the container; ask for help rather than copying your laptop's private key or sharing a token.

Do not assume `scp`, remote IDE server installation or `ssh host 'command'` works: the platform entry shell is an interactive container gateway. Use the interactive session and Git unless the organiser has tested another route.

Continue with [deployment](deploy.md).

## Troubleshooting

| Symptom | Check / action |
|---|---|
| `Permission denied (publickey)` | Correct assigned user/host? Correct `-i` private-key path? Matching public key uploaded on your account? Ask organiser to check key sync. |
| `Could not resolve hostname` | Copy the exact supplied hostname; ask organiser to verify DNS. |
| GitHub clone works but push fails | Check collaborator invitation and your own GitHub authentication. |
| PR targets the workshop starter | Run `gh repo set-default YOUR-OWNER/YOUR-FORK`; explicitly use `--repo` on PR commands. |
| `EADDRINUSE` on port 3000 | The platform hello service or another app already owns the port; see deployment. |
| Public URL shows the hello page | Your application has not replaced the hello service, or routing is not ready. |
| No assigned SSH command or URL | Hosting is not ready for your team; ask the organiser. A URL in a form is not a health check. |

Sources: [fork CLI](https://cli.github.com/manual/gh_repo_fork), [forking guide](https://docs.github.com/en/pull-requests/how-tos/fork-a-repo), [SSH keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent).
