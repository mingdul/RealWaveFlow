#!/bin/bash

echo "=== RDS 연결 종합 확인 ==="

# 1. 환경변수 확인
echo "1. 환경변수 확인:"
echo "DB_HOST: $DB_HOST"
echo "DB_PORT: $DB_PORT"
echo "DB_USERNAME: $DB_USERNAME"
echo "DB_NAME: $DB_NAME"
echo "DB_PASSWORD 길이: ${#DB_PASSWORD}"

# 2. 네트워크 연결 확인
echo ""
echo "2. 네트워크 연결 확인:"
nc -zv $DB_HOST $DB_PORT 2>&1

# 3. PostgreSQL 클라이언트 설치
echo ""
echo "3. PostgreSQL 클라이언트 설치 확인:"
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL 클라이언트 설치 중..."
    sudo apt-get update
    sudo apt-get install -y postgresql-client
else
    echo "PostgreSQL 클라이언트 이미 설치됨"
fi

# 4. 직접 연결 테스트
echo ""
echo "4. PostgreSQL 직접 연결 테스트:"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -c "SELECT version();" 2>&1

# 5. 연결 문자열 확인
echo ""
echo "5. 연결 문자열 확인 (비밀번호 제외):"
echo "psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_NAME"

# 6. AWS RDS 엔드포인트 확인
echo ""
echo "6. AWS RDS 엔드포인트 확인:"
nslookup $DB_HOST 2>&1

echo "=== 확인 완료 ===" 