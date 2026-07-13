#!/bin/bash

exit 0


if git status --porcelain | grep -q '\.ts$'; then
  npm run lint
  npm run format
fi
