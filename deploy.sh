#!/bin/bash
# Omada API Tester - 빌드 & 배포 스크립트
# 사용법: bash deploy.sh

SERVER="trizadmin@192.168.1.55"
REMOTE_DIR="/root"
ARCHIVE="omada_api_tester.tar.gz"

echo "=== 1. 압축 ==="
tar -czf "/tmp/$ARCHIVE" -C "$(dirname "$0")" \
  server.js index.html public/ api/ vercel.json README.md
echo "Created: /tmp/$ARCHIVE"

echo ""
echo "=== 2. SCP 전송 ==="
scp "/tmp/$ARCHIVE" "$SERVER:$REMOTE_DIR/"
echo "Sent to $SERVER:$REMOTE_DIR/$ARCHIVE"

echo ""
echo "=== 3. 원격 압축 해제 & 재시작 ==="
ssh "$SERVER" "cd $REMOTE_DIR && tar -xzf $ARCHIVE && echo 'Extracted' && \
  (pkill -f 'node server.js' 2>/dev/null; sleep 1; cd $REMOTE_DIR && nohup node server.js > /tmp/omada-tester.log 2>&1 & echo 'Server started on port 3000')"

echo ""
echo "=== Done! ==="
echo "http://192.168.1.55:3000"
