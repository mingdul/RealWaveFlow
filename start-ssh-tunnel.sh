#!/bin/bash

echo "Starting SSH tunnel to RDS..."
echo "Local port: 25432"
echo "Remote RDS: waveflow-db.choksamgu9ms.ap-northeast-2.rds.amazonaws.com:5432"
echo "EC2 Server: ubuntu@waveflow.pro"
echo ""
echo "Press Ctrl+C to stop the tunnel"
echo ""

ssh -i /c/Workspace/KEYPAIR/devWaveFlow.pem -L 25432:waveflow-db.choksamgu9ms.ap-northeast-2.rds.amazonaws.com:5432 -N ubuntu@waveflow.pro
