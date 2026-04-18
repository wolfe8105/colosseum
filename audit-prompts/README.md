# Audit Prompts

Each file here is a ready-to-paste CC prompt for one batch.

## One-time setup (do this once on your machine)

Create a file called `.github-token` in `C:\Users\wolfe\colosseum\` with just the token on one line:

```
YOUR_TOKEN_HERE
```

That file is gitignored — it never gets pushed.

## How to run a batch

In PowerShell:

```powershell
$env:CLAUDE_CODE_GIT_BASH_PATH="C:\Program Files\Git\bin\bash.exe"
cd C:\Users\wolfe\colosseum
claude --dangerously-skip-permissions
```

Then paste this into CC (replace NN with the batch number):

```
Run the setup script first, then run the audit:
bash audit-prompts/run-batch.sh NN
```

CC will read the token from `.github-token`, inject it, clone the repo, and run the full audit automatically. No manual token swapping needed.
