# WaveFlow API 명세서

## 개요
이 문서는 WaveFlow 프론트엔드와 백엔드 간의 API 통신 규격을 정의합니다.

## 공통 규칙

### 응답 형식
모든 API 응답은 다음 형식을 따릅니다:

```typescript
interface ApiResponse<T = any> {
  success: boolean;      // 요청 성공 여부
  message?: string;      // 메시지 (주로 에러 시)
  data?: T;             // 실제 데이터
}
```

### 인증
- JWT 토큰을 HttpOnly 쿠키로 전송
- 보호된 엔드포인트는 `Authorization: Bearer <token>` 또는 쿠키 인증 사용
- 인증 실패 시 HTTP 401 반환

### HTTP 상태 코드
- 200: 성공 (GET, PUT, DELETE)
- 201: 생성 성공 (POST)
- 400: 잘못된 요청
- 401: 인증 실패
- 403: 권한 없음
- 404: 리소스 없음
- 409: 중복 데이터
- 500: 서버 내부 오류

---

## 인증 API

### 1. 로그인
```
POST /auth/login
Content-Type: application/json
```

**요청 본문:**
```typescript
{
  email: string;
  password: string;
}
```

**응답:**
```typescript
{
  success: true,
  message: "로그인 성공",
  data: {
    user: {
      id: number;
      email: string;
      username: string;
    }
  }
}
```

### 2. 구글 로그인
```
GET /auth/google
```
구글 OAuth 로그인 페이지로 리다이렉트

### 3. 구글 로그인 콜백
```
GET /auth/google/callback
```
구글 인증 완료 후 대시보드로 리다이렉트

### 4. 현재 사용자 정보
```
GET /auth/me
Authorization: Bearer <token> (쿠키)
```

**응답:**
```typescript
{
  success: true,
  data: {
    user: {
      id: number;
      email: string;
      username: string;
    }
  }
}
```

### 5. 로그아웃
```
GET /auth/logout
```

**응답:**
```typescript
{
  message: "로그아웃 성공"
}
```

---

## 사용자 API

### 1. 회원가입
```
POST /users/register
Content-Type: application/json
```

**요청 본문:**
```typescript
{
  email: string;
  username: string;
  password: string;
}
```

**응답:**
```typescript
{
  success: true,
  data: {
    id: number;
    email: string;
    username: string;
    created_at: string;
    updated_at: string;
  }
}
```

### 2. 비밀번호 찾기
```
POST /users/forgot-password
Content-Type: application/json
```

**요청 본문:**
```typescript
{
  email: string;
}
```

**응답:**
```typescript
{
  success: true,
  message: "임시 비밀번호가 이메일로 발송되었습니다."
}
```

---

## 트랙 API

### 1. 트랙 생성
```
POST /tracks
Authorization: Bearer <token>
Content-Type: application/json
```

**요청 본문:**
```typescript
{
  name: string;
  description?: string;
  genre?: string;
  bpm?: string;
  key_signature?: string;
}
```

**응답:**
```typescript
{
  success: true,
  data: {
    id: string;
    name: string;
    description?: string;
    genre?: string;
    bpm?: string;
    key_signature?: string;
    created_date: string;
    updated_date: string;
    owner_id: User;
  }
}
```

### 2. 내 트랙 목록 조회
```
GET /tracks
Authorization: Bearer <token>
```

**응답:**
```typescript
{
  success: true,
  data: {
    tracks: Track[];
  }
}
```

### 3. 협업 트랙 목록 조회
```
GET /tracks/collaborator
Authorization: Bearer <token>
```

**응답:**
```typescript
{
  success: true,
  data: {
    tracks: Track[];
  }
}
```

### 4. 트랙 상세 조회
```
GET /tracks/:id
Authorization: Bearer <token>
```

**응답:**
```typescript
{
  success: true,
  data: Track
}
```

### 5. 트랙 수정
```
PUT /tracks/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**요청 본문:**
```typescript
{
  name?: string;
  description?: string;
  genre?: string;
  bpm?: string;
  key_signature?: string;
}
```

### 6. 트랙 삭제
```
DELETE /tracks/:id
Authorization: Bearer <token>
```

---

## 업로드 API

### 1. 새 프로젝트 생성과 함께 업로드 초기화
```
POST /uploads/init-upload
Authorization: Bearer <token>
Content-Type: application/json
```

**요청 본문:**
```typescript
{
  projectName?: string;
  projectDescription?: string;
  filename: string;
  contentType: string;
  fileSize: number;
}
```

**응답:**
```typescript
{
  success: true,
  data: {
    uploadId: string;
    key: string;
    chunkSize: number;
    projectId: string;
    projectName?: string;
  }
}
```

### 2. 기존 프로젝트에 파일 추가 업로드
```
POST /uploads/add-upload
Authorization: Bearer <token>
Content-Type: application/json
```

**요청 본문:**
```typescript
{
  projectId: string;
  filename: string;
  contentType: string;
  fileSize: number;
}
```

**응답:**
```typescript
{
  success: true,
  data: {
    uploadId: string;
    key: string;
    chunkSize: number;
    projectId: string;
  }
}
```

### 3. Presigned URL 발급
```
POST /uploads/presigned-urls
Authorization: Bearer <token>
Content-Type: application/json
```

**요청 본문:**
```typescript
{
  uploadId: string;
  key: string;
  projectId: string;
  parts: { partNumber: number }[];
}
```

**응답:**
```typescript
{
  success: true,
  data: {
    urls: {
      partNumber: number;
      url: string;
    }[];
  }
}
```

### 4. 업로드 완료
```
POST /uploads/complete
Authorization: Bearer <token>
Content-Type: application/json
```

**요청 본문:**
```typescript
{
  uploadId: string;
  key: string;
  projectId: string;
  parts: {
    partNumber: number;
    eTag: string;
  }[];
}
```

**응답:**
```typescript
{
  success: true,
  data: {
    location: string;
    key: string;
    fileName: string;
    fileSize: number;
  }
}
```

### 5. 업로드 취소
```
POST /uploads/abort
Authorization: Bearer <token>
Content-Type: application/json
```

**요청 본문:**
```typescript
{
  uploadId: string;
  key: string;
  projectId: string;
}
```

**응답:**
```typescript
{
  success: true,
  message: "업로드가 성공적으로 취소되었습니다."
}
```

---

## 세션 API

### 1. 트랙 초기화
```
POST /session/initialize
Authorization: Bearer <token>
Content-Type: application/json
```

**요청 본문:**
```typescript
{
  trackId: number;
  instruments: string[];
  userId: number;
}
```

**응답:**
```typescript
{
  success: true,
  message: "트랙이 성공적으로 초기화되었습니다.",
  data: {
    masterBranchId: string;
    initialVersionId: string;
    versionNumber: string;
  }
}
```

### 2. 세션 브랜치 생성
```
POST /session/create-branch
Authorization: Bearer <token>
Content-Type: application/json
```

**요청 본문:**
```typescript
{
  trackId: number;
  sessionName: string;
  instruments: string[];
}
```

**응답:**
```typescript
{
  success: true,
  message: "세션 브랜치가 성공적으로 생성되었습니다.",
  data: {
    sessionBranchId: string;
    sessionName: string;
    directories: {
      id: string;
      instrumentName: string;
      directoryPath: string;
    }[];
  }
}
```

### 3. 스템 파일 업로드
```
POST /session/upload-stem
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**요청 본문:**
```
file: File
sessionBranchId: string
instrumentName: string
userId: string
```

### 4. Pull Request 생성
```
POST /session/pull-request
Authorization: Bearer <token>
Content-Type: application/json
```

**요청 본문:**
```typescript
{
  sourceBranchId: string;
  targetBranchId: string;
  title: string;
  description?: string;
  userId: number;
}
```

### 5. Pull Request 병합
```
PUT /session/pull-request/:id/merge
Authorization: Bearer <token>
Content-Type: application/json
```

**요청 본문:**
```typescript
{
  reviewerId: number;
  versionNumber: string;
  commitMessage: string;
}
```

### 6. 브랜치 목록 조회
```
GET /session/track/:trackId/branches
Authorization: Bearer <token>
```

### 7. 스템 파일 목록 조회
```
GET /session/branch/:branchId/stems
Authorization: Bearer <token>
```

### 8. 버전 히스토리 조회
```
GET /session/track/:trackId/versions
Authorization: Bearer <token>
```

### 9. 트랙 상태 조회
```
GET /session/track/:trackId/status
Authorization: Bearer <token>
```

**응답:**
```typescript
{
  success: true,
  data: {
    trackId: number;
    masterBranch?: {
      id: string;
      name: string;
      versionsCount: number;
    };
    latestVersion?: {
      id: string;
      versionNumber: string;
      commitMessage: string;
      createdAt: string;
    };
    sessionBranches?: {
      id: string;
      name: string;
      created_at: string;
    }[];
    openPullRequests?: {
      id: string;
      title: string;
      created_at: string;
    }[];
  }
}
```

---

## 데이터 타입 정의

### User
```typescript
interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
  updated_at: string;
}
```

### Track
```typescript
interface Track {
  id: string;
  name: string;
  description?: string;
  genre?: string;
  bpm?: string;
  key_signature?: string;
  created_date: string;
  updated_date: string;
  owner_id: User;
  collaborators?: TrackCollaborator[];
}
```

### Branch
```typescript
interface Branch {
  id: string;
  name: string;
  type: 'master' | 'session';
  track_id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  versions?: Version[];
  directories?: SessionDirectory[];
}
```

### Version
```typescript
interface Version {
  id: string;
  version_number: string;
  commit_message: string;
  branch_id: string;
  created_by: number;
  created_at: string;
  created_by_user?: User;
  branch?: Branch;
}
```

### StemFile
```typescript
interface StemFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  directory_id: string;
  uploaded_by: number;
  uploaded_at: string;
  is_merged_to_master: boolean;
  uploaded_by_user?: User;
  directory?: SessionDirectory;
}
```

### PullRequest
```typescript
interface PullRequest {
  id: string;
  title: string;
  description: string;
  source_branch_id: string;
  target_branch_id: string;
  created_by: number;
  status: 'open' | 'merged' | 'closed';
  created_at: string;
  merged_at?: string;
  created_by_user?: User;
  source_branch?: Branch;
  target_branch?: Branch;
}
```

---

## 에러 처리

### 일반적인 에러 응답
```typescript
{
  success: false,
  message: "에러 메시지",
  statusCode: number,
  error?: string
}
```

### 주요 에러 코드
- `AUTH_001`: 유효하지 않은 토큰
- `AUTH_002`: 토큰 만료
- `USER_001`: 사용자를 찾을 수 없음
- `TRACK_001`: 트랙을 찾을 수 없음
- `TRACK_002`: 트랙 접근 권한 없음
- `UPLOAD_001`: 업로드 세션을 찾을 수 없음
- `UPLOAD_002`: 파일 크기 제한 초과

---

## 환경 변수

### 프론트엔드
- `VITE_API_URL`: 백엔드 API 기본 URL (기본값: http://localhost:8080)

### 백엔드
- `AWS_REGION`: AWS S3 리전
- `AWS_ACCESS_KEY_ID`: AWS 액세스 키
- `AWS_SECRET_ACCESS_KEY`: AWS 시크릿 키
- `AWS_S3_BUCKET_NAME`: S3 버킷 이름
- `JWT_SECRET`: JWT 서명 키
- `GOOGLE_CLIENT_ID`: 구글 OAuth 클라이언트 ID
- `GOOGLE_CLIENT_SECRET`: 구글 OAuth 클라이언트 시크릿

---

## 변경 내역

### v1.0.0 (현재)
- 초기 API 명세서 작성
- 업로드 API 응답 형식 통일
- Swagger 문서 업데이트

## 주의사항

1. **응답 형식 일관성**: 모든 API는 `{ success, message?, data? }` 형식을 따라야 합니다.
2. **인증 토큰**: 모든 보호된 엔드포인트는 JWT 토큰 검증이 필요합니다.
3. **파일 업로드**: 큰 파일은 S3 멀티파트 업로드를 사용합니다.
4. **에러 처리**: 클라이언트는 모든 HTTP 상태 코드에 대한 처리가 필요합니다. 