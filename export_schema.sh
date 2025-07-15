#!/bin/bash

# WaveFlow PostgreSQL Schema Export Script
# This script should be run on the EC2 instance that has access to RDS

# Database connection details
DB_HOST="waveflow-db.choksamgu9ms.ap-northeast-2.rds.amazonaws.com"
DB_USER="admin_badger"
DB_PASSWORD="UcxYKCD6x:gmah-YMZ~jLuz.sU9V"
DB_PORT="5432"

# Output file
OUTPUT_FILE="waveflow_schema_$(date +%Y%m%d_%H%M%S).sql"

echo "🎵 WaveFlow Database Schema Export"
echo "=================================="
echo "Host: $DB_HOST"
echo "User: $DB_USER"
echo "Output: $OUTPUT_FILE"
echo ""

# Check if pg_dump is installed
if ! command -v pg_dump &> /dev/null; then
    echo "❌ pg_dump not found. Installing PostgreSQL client..."
    sudo yum update -y
    sudo yum install -y postgresql15
fi

# Export schema only
echo "📤 Exporting schema..."
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -p "$DB_PORT" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --verbose \
    -f "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Schema export completed successfully!"
    echo "📁 File: $OUTPUT_FILE"
    echo "📊 File size: $(du -h $OUTPUT_FILE | cut -f1)"
    echo ""
    echo "📋 Schema summary:"
    echo "=================="
    grep -E "^CREATE (TABLE|INDEX|SEQUENCE|VIEW|FUNCTION)" "$OUTPUT_FILE" | head -20
    echo ""
    echo "💡 To download this file to your local machine:"
    echo "   scp -i your-key.pem ec2-user@13.209.14.85:~/$OUTPUT_FILE ."
else
    echo "❌ Schema export failed!"
    exit 1
fi
