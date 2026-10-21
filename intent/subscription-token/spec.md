# Spec: paid CI steps on the owner's subscription

From [intent.md](intent.md).

## Behaviour

- `claude-code-action` steps pass `claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}` in place of `anthropic_api_key`.
- `claude -p` steps (triage, evals) get `CLAUDE_CODE_OAUTH_TOKEN` in their environment in place of `ANTHROPIC_API_KEY`. The API key is removed rather than kept as a fallback, because the CLI prefers it when both are set.
- The switches `REVIEW_ENABLED`, `TRIAGE_ENABLED` and `EVALS_ENABLED` work as before.

## Data and privacy

The token is a repository secret, readable only by workflows on this repository's own branches.

## Calculations

None. Cost figures in eval and review output become subscription estimates rather than billed amounts.

## Tests

The review on this pull request is the proof: it must post its sticky comment.

## Docs

`docs/sdlc.md` names the token; `docs/design.md` gains "Paid CI steps on the subscription".
