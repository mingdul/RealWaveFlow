#!/bin/bash

echo "=== 비밀번호 디버깅 ==="

# 환경변수에서 비밀번호 길이와 문자 확인
echo "DB_PASSWORD 길이: ${#DB_PASSWORD}"
echo "DB_PASSWORD 첫 3글자: ${DB_PASSWORD:0:3}"
echo "DB_PASSWORD 마지막 3글자: ${DB_PASSWORD: -3}"

# 특수문자 확인
echo "비밀번호에 특수문자가 포함되어 있는지 확인:"
echo "$DB_PASSWORD" | grep -o '[^a-zA-Z0-9]' | sort | uniq -c

# 이스케이프 문자 확인
echo "이스케이프 문자 확인:"
echo "$DB_PASSWORD" | od -c

echo "=== 디버깅 완료 ===" 