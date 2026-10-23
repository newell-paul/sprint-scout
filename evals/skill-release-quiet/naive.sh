#!/bin/bash
# What an over-eager agent would do: load the release skill for a README edit.
printf '%s\n' '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Skill","input":{"skill":"release"}}]}}' > "$TRANSCRIPT_FILE"
