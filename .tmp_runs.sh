#!/bin/bash
set -e
cd /home/ubuntu/no-limet-9max-audit
gh api "repos/Allan1052/No-limet-9max/actions/runs?per_page=5" | tee /tmp/all_runs_clean.json | jq -r '.workflow_runs[] | [.id, .name, .status, .conclusion, (.head_sha[0:8]), .created_at, .updated_at] | join(" ")'
