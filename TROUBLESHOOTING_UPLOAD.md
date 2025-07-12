# WaveFlow 업로드 문제해결 가이드

## 해결된 주요 문제

### 1. "Part X에 대한 URL을 찾을 수 없습니다" 에러

**문제 원인:**
백엔드에서 presigned URL 응답을 반환할 때 각 URL을 불필요하게 `{ success: true, data: {...} }` 형태로 감싸서 반환했습니다.

**문제가 있던 백엔드 응답:**
```json
{
  "success": true,
  "data": {
    "urls": [
      {
        "success": true,
        "data": {
          "partNumber": 1,
          "url": "https://..."
        }
      }
    ]
  }
}
```

**수정된 백엔드 응답:**
```json
{
  "success": true,
  "data": {
    "urls": [
      {
        "partNumber": 1,
        "url": "https://..."
      }
    ]
  }
}
```

**해결 방법:**
`backend/src/upload/upload.service.ts`의 `getPresignedUrls` 메서드에서 불필요한 감싸는 구조를 제거했습니다.

```typescript
// 수정 전
return {
  success : true,
  data : {
    partNumber: part.partNumber,
    url,
  }
};

// 수정 후
return {
  partNumber: part.partNumber,
  url,
};
```

### 2. Axios 모듈 import 에러

**문제 원인:**
프론트엔드에서 axios import 시 TypeScript 에러가 발생했습니다.

**해결 방법:**
S3 직접 업로드에 axios 대신 XMLHttpRequest를 사용하도록 변경했습니다.

**수정된 코드:**
```typescript
// XMLHttpRequest를 사용한 업로드
private async uploadChunk(
  chunk: Blob,
  url: string,
  partNumber: number,
  uploadId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const xhr = new XMLHttpRequest();
  
  return new Promise<string>((resolve, reject) => {
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded * 100) / event.total);
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader('etag');
        if (!etag) {
          reject(new Error(`Part ${partNumber}에 대한 ETag를 받지 못했습니다.`));
          return;
        }
        resolve(etag.replace(/"/g, ''));
      } else {
        reject(new Error(`청크 ${partNumber} 업로드 실패: HTTP ${xhr.status}`));
      }
    };

    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.send(chunk);
  });
}
```

## 업로드 디버깅 방법

### 1. 백엔드 디버깅

**로그 확인:**
```bash
# 백엔드 로그 실시간 확인
cd backend
npm run start:dev
```

**주요 확인 포인트:**
- S3 설정 (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME)
- 프로젝트 접근 권한 검증
- Presigned URL 생성 성공/실패

### 2. 프론트엔드 디버깅

**브라우저 개발자 도구에서 확인:**

1. **네트워크 탭:** API 요청/응답 확인
2. **콘솔 탭:** 디버깅 로그 확인

**추가된 디버깅 로그:**
```typescript
console.log('[DEBUG] Looking for partNumber:', partNumber);
console.log('[DEBUG] Available URLs:', presignedResponse.data!.urls.map(u => ({ 
  partNumber: u.partNumber, 
  hasUrl: !!u.url 
})));
```

### 3. S3 권한 확인

**필요한 S3 권한:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:CreateMultipartUpload",
        "s3:CompleteMultipartUpload",
        "s3:AbortMultipartUpload",
        "s3:UploadPart",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

## 일반적인 업로드 에러와 해결 방법

### 1. 403 Forbidden 에러
- **원인:** S3 권한 부족 또는 프로젝트 접근 권한 없음
- **해결:** AWS IAM 권한 확인, 프로젝트 소유자/협업자 여부 확인

### 2. 404 Not Found 에러
- **원인:** 프로젝트가 존재하지 않음
- **해결:** 올바른 projectId 사용 확인

### 3. Network Error
- **원인:** CORS 설정 문제 또는 네트워크 연결 문제
- **해결:** S3 CORS 설정 확인, 네트워크 연결 확인

### 4. ETag 없음 에러
- **원인:** S3 업로드 응답에 ETag 헤더가 없음
- **해결:** S3 설정 확인, 업로드 요청 헤더 확인

## 테스트 방법

### 1. 백엔드 API 테스트
```bash
# Postman 또는 curl로 테스트
curl -X POST http://localhost:8080/uploads/init-upload \
  -H "Content-Type: application/json" \
  -H "Cookie: jwt=YOUR_JWT_TOKEN" \
  -d '{
    "projectName": "Test Project",
    "filename": "test.wav",
    "contentType": "audio/wav",
    "fileSize": 1000000
  }'
```

### 2. 프론트엔드 테스트
```typescript
// 테스트용 파일 업로드
const testUpload = async () => {
  const file = new File(['test content'], 'test.wav', { type: 'audio/wav' });
  const projectId = 'existing-project-id';
  
  try {
    const result = await s3UploadService.uploadFile(
      file, 
      projectId, 
      (progress) => console.log('Upload progress:', progress)
    );
    console.log('Upload successful:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

## 환경 변수 체크리스트

### 백엔드
- [ ] `AWS_REGION` 설정됨
- [ ] `AWS_ACCESS_KEY_ID` 설정됨
- [ ] `AWS_SECRET_ACCESS_KEY` 설정됨
- [ ] `AWS_S3_BUCKET_NAME` 설정됨

### 프론트엔드
- [ ] `VITE_API_URL` 설정됨 

## 성능 최적화

### 1. 청크 크기 최적화
현재 동적 청크 크기 계산을 사용:
- 100MB 미만: 10MB 청크
- 500MB 미만: 25MB 청크  
- 500MB 이상: 50MB 청크

### 2. 병렬 업로드
여러 청크를 동시에 업로드하여 성능 향상

### 3. 업로드 재시도
네트워크 오류 시 자동 재시도 로직 (추후 구현 예정)

## 추가 도움

문제가 지속되면 다음을 확인하세요:
1. [API 명세서](./API_SPECIFICATION.md)
2. [개발 통합 가이드](./DEVELOPMENT_INTEGRATION_GUIDE.md)
3. 브라우저 개발자 도구 네트워크/콘솔 탭
4. 백엔드 서버 로그 