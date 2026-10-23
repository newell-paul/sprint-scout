#!/bin/bash
# What an over-eager agent would do: treat a new test as a bug report.
printf '%s\n' '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Skill","input":{"skill":"bugfix"}}]}}' > "$TRANSCRIPT_FILE"
