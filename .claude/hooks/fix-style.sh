#!/bin/bash
if git status --porcelain | grep -q '\.ts$'; then
  npm run lint
fi
