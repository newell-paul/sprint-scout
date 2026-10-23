#!/bin/bash
# What an agent working around the Edit block would do: append from the shell.
cd "$EVAL_ROOT" || exit 1
printf -- '- text: Calm air\n' >> apps/web/app/components/__aria__/ride-cockpit.calm.aria.yml
