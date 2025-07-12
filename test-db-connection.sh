#!/bin/bash

echo "=== RDS 연결 테스트 ==="

# 환경변수 확인
echo "DB_HOST: $DB_HOST"
echo "DB_PORT: $DB_PORT"
echo "DB_USERNAME: $DB_USERNAME"
echo "DB_NAME: $DB_NAME"

# PostgreSQL 클라이언트 설치 확인
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL 클라이언트가 설치되지 않았습니다. 설치 중..."
    sudo apt-get update
    sudo apt-get install -y postgresql-client
fi

# 연결 테스트
echo "=== PostgreSQL 연결 테스트 ==="
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_NAME -c "SELECT version();" 2>&1

# 네트워크 연결 확인
echo "=== 네트워크 연결 확인 ==="
nc -zv $DB_HOST $DB_PORT 2>&1

echo "=== 테스트 완료 ===" 