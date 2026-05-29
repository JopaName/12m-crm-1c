#!/bin/bash
cd /root/12m-crm-1c/backend
exec npx ts-node-dev --respawn src/index.ts
