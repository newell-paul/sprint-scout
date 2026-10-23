#!/bin/bash
# What an over-eager agent would do: open the full intent process for a typo.
printf '%s\n' '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Skill","input":{"skill":"intent"}}]}}' > "$TRANSCRIPT_FILE"
