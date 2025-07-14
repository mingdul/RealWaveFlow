# 🎵 RealWaveFlow - 완전한 API 및 기능 흐름 분석 문서

## 1. 프로젝트 개요 (Overview)

RealWaveFlow는 **음악 트랙 협업 플랫폼**으로, 음악 프로듀서와 아티스트들이 실시간으로 협업하며 트랙을 제작할 수 있는 Git과 같은 버전 관리 시스템을 제공합니다. Stem 파일(개별 악기 트랙) 업로드, 스트리밍, 협업 초대, 리뷰 시스템, 실시간 통신을 통해 음악 제작의 전 과정을 지원합니다.

## 2. 기술 스택 (Tech Stack)

- **Backend**: NestJS, TypeScript, TypeORM
- **Database**: PostgreSQL
- **Authentication**: JWT, Google OAuth 2.0, Passport
- **Storage**: AWS S3 (Multipart Upload)
- **Communication**: Socket.IO, AWS SQS
- **Validation**: class-validator, class-transformer
- **Email**: Resend API
- **Security**: bcrypt, CORS, Cookie-based JWT
- **Real-time**: WebSocket Gateway

## 3. 아키텍처 요약 (Architecture Summary)

```
Client Request → Controller → Service → Repository → Database
                     ↓
                JWT Auth Guard → Token Validation
                     ↓
                WebSocket ← Real-time Events ← Business Logic
                     ↓
                Response ← Data Processing ← Database Result
```

- **Controller**: API 엔드포인트 및 요청 처리
- **Service**: 비즈니스 로직 및 데이터 변환
- **Repository**: 데이터베이스 CRUD 작업
- **Guard**: JWT 인증 및 권한 검사
- **DTO**: 데이터 유효성 검사 및 변환
- **WebSocket**: 실시간 통신 및 이벤트 브로드캐스트

## 4. 필수 실행 방법 (Quick Start)

```bash
# 1. 환경 변수 설정
cp .env.example .env

# 2. 의존성 설치
cd backend
npm install

# 3. 데이터베이스 설정
# PostgreSQL 설치 후 DATABASE_URL 설정

# 4. 개발 서버 실행
npm run start:dev

# 5. 프론트엔드 실행 (별도 터미널)
cd frontend
npm install
npm run dev
```

---
---

## 5. 주요 기능 흐름 상세 분석 (Detailed Main Feature Flow Analysis)

### 기능 1: 사용자 인증 및 회원가입

**시나리오**: 사용자가 이메일과 비밀번호로 회원가입하고, 로그인하여 JWT 토큰을 쿠키로 발급받는다.

**관련 파일**:
- `auth.controller.ts`, `auth.service.ts`
- `users.controller.ts`, `users.service.ts`
- `register.dto.ts`, `user.entity.ts`

**Mermaid 시퀀스 다이어그램**:
```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant UsersService
    participant AuthService
    participant Database
    participant JWTService

    Note over Client,JWTService: 회원가입 흐름
    Client->>AuthController: POST /users/register
    AuthController->>UsersService: register(registerDto)
    UsersService->>UsersService: bcrypt.hash(password, 10)
    UsersService->>Database: userRepository.save(user)
    Database-->>UsersService: 생성된 사용자
    UsersService-->>AuthController: { success: true, message }
    AuthController-->>Client: 201 Created

    Note over Client,JWTService: 로그인 흐름
    Client->>AuthController: POST /auth/login
    AuthController->>AuthService: validateUser(email, password)
    AuthService->>Database: 이메일로 사용자 조회
    AuthService->>AuthService: bcrypt.compare(password, user.password)
    AuthService-->>AuthController: { id, email, username }
    AuthController->>JWTService: jwtService.sign(payload)
    JWTService-->>AuthController: JWT 토큰
    AuthController->>AuthController: res.cookie('jwt', token)
    AuthController-->>Client: 200 OK + JWT 쿠키
```

**단계별 상세 설명**:

1. **회원가입** (`POST /users/register`):
   - `RegisterDto`로 이메일, 사용자명, 비밀번호 검증
   - 이메일 중복 검사 (`userRepository.findOne`)
   - 비밀번호 해싱 (`bcrypt.hash(password, 10)`)
   - 사용자 엔티티 생성 및 저장

2. **로그인** (`POST /auth/login`):
   - 이메일로 사용자 조회
   - 비밀번호 검증 (`bcrypt.compare`)
   - JWT 페이로드 생성 (`{ sub: user.id, email, username }`)
   - JWT 토큰 생성 및 쿠키 설정 (24시간 유효)

3. **인증 확인** (`GET /auth/me`):
   - 쿠키에서 JWT 토큰 추출
   - 토큰 검증 (`jwtService.verify`)
   - 사용자 정보 반환

### 기능 2: 트랙 생성 및 관리

**시나리오**: 사용자가 새로운 음악 트랙을 생성하고, 협업자를 초대하여 함께 작업한다.

**관련 파일**:
- `track.controller.ts`, `track.service.ts`
- `track.entity.ts`, `createtrackdto.ts`
- `track_collaborator.entity.ts`

**Mermaid 시퀀스 다이어그램**:
```mermaid
sequenceDiagram
    participant Client
    participant TrackController
    participant TrackService
    participant Database
    participant JWTGuard

    Note over Client,JWTGuard: 트랙 생성 흐름
    Client->>TrackController: POST /tracks (JWT 필수)
    TrackController->>JWTGuard: JWT 토큰 검증
    JWTGuard-->>TrackController: 사용자 정보 (req.user)
    TrackController->>TrackService: createTrack(createTrackDto, user.id)
    TrackService->>TrackService: Track 엔티티 생성
    TrackService->>Database: trackRepository.save(track)
    Database-->>TrackService: 생성된 트랙
    TrackService-->>TrackController: { success: true, data: track }
    TrackController-->>Client: 201 Created

    Note over Client,JWTGuard: 내 트랙 조회 흐름
    Client->>TrackController: GET /tracks
    TrackController->>TrackService: findTracksByOwner(user.id)
    TrackService->>Database: 소유자 기준 트랙 조회
    Database-->>TrackService: 트랙 목록
    TrackService-->>TrackController: { success: true, data: { tracks } }
    TrackController-->>Client: 200 OK
```

**단계별 상세 설명**:

1. **트랙 생성** (`POST /tracks`):
   - JWT 가드를 통한 사용자 인증
   - `CreateTrackDto` 유효성 검사 (제목, 장르, BPM, 키 시그니처 등)
   - 트랙 엔티티 생성 (`owner_id = user.id`)
   - 데이터베이스 저장

2. **트랙 조회** (`GET /tracks`):
   - 소유자 기준 트랙 조회 (`owner_id = user.id`)
   - 관련 엔티티 조회 (`relations: ['owner_id', 'collaborators']`)
   - 최신 업데이트 순 정렬

3. **협업 트랙 조회** (`GET /tracks/collaborator`):
   - 협업자 기준 트랙 조회 (`track_collaborator` 테이블 JOIN)
   - 사용자가 협업자로 포함된 트랙 반환

### 기능 3: 파일 업로드 (S3 Multipart Upload)

**시나리오**: 사용자가 대용량 Stem 파일을 청크 단위로 S3에 업로드한다.

**관련 파일**:
- `upload.controller.ts`, `upload.service.ts`
- `add-upload.dto.ts`, `presigned-urls.dto.ts`
- `complete-upload.dto.ts`

**Mermaid 시퀀스 다이어그램**:
```mermaid
sequenceDiagram
    participant Client
    participant UploadController
    participant UploadService
    participant S3Service
    participant Database

    Note over Client,Database: S3 멀티파트 업로드 흐름
    Client->>UploadController: POST /uploads/add-upload
    UploadController->>UploadService: addUpload(dto, userId)
    UploadService->>UploadService: 프로젝트 권한 검사
    UploadService->>S3Service: createMultipartUpload()
    S3Service-->>UploadService: { uploadId, key }
    UploadService-->>UploadController: { uploadId, key, chunkSize }
    UploadController-->>Client: 201 Created

    Note over Client,Database: Presigned URL 발급
    Client->>UploadController: POST /uploads/presigned-urls
    UploadController->>UploadService: getPresignedUrls(dto, userId)
    UploadService->>S3Service: getUploadPartUrl(uploadId, partNumber)
    S3Service-->>UploadService: presigned URLs
    UploadService-->>UploadController: { urls: [{ partNumber, url }] }
    UploadController-->>Client: 200 OK

    Note over Client,Database: 청크 업로드 (클라이언트 측)
    Client->>S3Service: PUT presigned URL (파일 청크)
    S3Service-->>Client: ETag 응답

    Note over Client,Database: 업로드 완료
    Client->>UploadController: POST /uploads/complete
    UploadController->>UploadService: completeUpload(dto, userId)
    UploadService->>S3Service: completeMultipartUpload(uploadId, parts)
    S3Service-->>UploadService: { Location, key }
    UploadService->>Database: 파일 메타데이터 저장
    Database-->>UploadService: 저장 완료
    UploadService-->>UploadController: { location, key, fileName }
    UploadController-->>Client: 201 Created
```

**단계별 상세 설명**:

1. **업로드 세션 시작** (`POST /uploads/add-upload`):
   - 프로젝트 권한 검사 (소유자 또는 협업자)
   - S3 멀티파트 업로드 세션 생성
   - 청크 크기 설정 (기본 10MB)
   - 업로드 ID 및 S3 키 반환

2. **Presigned URL 발급** (`POST /uploads/presigned-urls`):
   - 각 청크(part)별 업로드 URL 생성
   - 시간 제한 (15분) 설정
   - 보안 검증 (프로젝트 권한)

3. **업로드 완료** (`POST /uploads/complete`):
   - 모든 청크의 ETag 검증
   - S3 멀티파트 업로드 완료 요청
   - 파일 메타데이터 데이터베이스 저장

### 기능 4: 협업 초대 시스템

**시나리오**: 트랙 소유자가 협업자에게 이메일 초대를 보내고, 초대받은 사용자가 수락하여 협업자로 등록된다.

**관련 파일**:
- `invite.controller.ts`, `invite.service.ts`
- `send-invite.dto.ts`, `accept-invite.dto.ts`
- `invite.entity.ts`, `invite-target.entity.ts`

**Mermaid 시퀀스 다이어그램**:
```mermaid
sequenceDiagram
    participant Owner
    participant InviteController
    participant InviteService
    participant EmailService
    participant Database
    participant Invitee

    Note over Owner,Invitee: 초대 발송 흐름
    Owner->>InviteController: POST /invite/send
    InviteController->>InviteService: sendInvites(dto, inviterId)
    InviteService->>InviteService: 트랙 소유자 권한 검사
    InviteService->>InviteService: 이메일 중복 검사
    InviteService->>Database: 초대 배치 생성
    InviteService->>Database: 초대 타겟 생성 (각 이메일)
    InviteService->>EmailService: 초대 이메일 발송
    EmailService-->>InviteService: 발송 결과
    InviteService-->>InviteController: { success, sent_count, failed_emails }
    InviteController-->>Owner: 200 OK

    Note over Owner,Invitee: 초대 수락 흐름
    Invitee->>InviteController: GET /invite/accept-page/:token
    InviteController->>InviteService: getInviteByTargetToken(token)
    InviteService->>Database: 초대 정보 조회
    Database-->>InviteService: 초대 상세 정보
    InviteService-->>InviteController: 초대 페이지 데이터
    InviteController-->>Invitee: 초대 정보 표시

    Invitee->>InviteController: POST /invite/accept
    InviteController->>InviteService: acceptInvite(dto)
    InviteService->>InviteService: 초대 유효성 검증
    InviteService->>Database: 사용자 존재 여부 확인
    
    alt 기존 사용자인 경우
        InviteService->>Database: 협업자 등록
        InviteService->>Database: 초대 상태 'accepted'로 변경
        InviteService-->>InviteController: { user_status: 'existing', redirect_url }
    else 신규 사용자인 경우
        InviteService->>Database: 초대 상태 'pending_signup'으로 변경
        InviteService-->>InviteController: { user_status: 'new' }
    end
    
    InviteController-->>Invitee: 수락 결과
```

**단계별 상세 설명**:

1. **초대 발송** (`POST /invite/send`):
   - 트랙 소유자 권한 검사
   - 이메일 중복 검사 (이미 협업자인지, 이미 초대되었는지)
   - 초대 배치 생성 (`invite_batch` 테이블)
   - 각 이메일별 초대 타겟 생성 (`invite_target` 테이블)
   - 고유 토큰 생성 및 이메일 발송

2. **초대 수락** (`POST /invite/accept`):
   - 토큰으로 초대 정보 조회
   - 초대 만료 검사
   - 사용자 존재 여부 확인
   - 기존 사용자: 즉시 협업자 등록 (`track_collaborator` 테이블)
   - 신규 사용자: 회원가입 후 협업자 등록 대기

3. **이메일 중복 검사** (`GET /invite/check-email/:trackId`):
   - 실시간 이메일 유효성 검사
   - 트랙 소유자 이메일 검사
   - 기존 협업자 검사
   - 보류 중인 초대 검사

### 기능 5: 스트리밍 시스템

**시나리오**: 사용자가 업로드된 Stem 파일을 실시간으로 스트리밍하여 재생한다.

**관련 파일**:
- `streaming.controller.ts`, `streaming.service.ts`
- `streaming.dto.ts`, `s3.service.ts`

**Mermaid 시퀀스 다이어그램**:
```mermaid
sequenceDiagram
    participant Client
    participant StreamingController
    participant StreamingService
    participant S3Service
    participant Database

    Note over Client,Database: 개별 스템 스트리밍
    Client->>StreamingController: GET /streaming/stem/:stemId
    StreamingController->>StreamingService: getStemStreamingUrl(stemId, userId)
    StreamingService->>Database: 스템 정보 조회
    StreamingService->>StreamingService: 권한 검사 (소유자/협업자)
    StreamingService->>S3Service: getPresignedUrl(key)
    S3Service-->>StreamingService: presigned 스트리밍 URL
    StreamingService-->>StreamingController: { url, metadata }
    StreamingController-->>Client: 200 OK

    Note over Client,Database: 배치 스트리밍
    Client->>StreamingController: POST /streaming/batch
    StreamingController->>StreamingService: getBatchStreamingUrls(stemIds, userId)
    StreamingService->>Database: 다중 스템 정보 조회
    StreamingService->>StreamingService: 권한 검사
    StreamingService->>S3Service: 배치 presigned URL 생성
    S3Service-->>StreamingService: 다중 스트리밍 URL
    StreamingService-->>StreamingController: { urls: [{ stemId, url, metadata }] }
    StreamingController-->>Client: 200 OK
```

**단계별 상세 설명**:

1. **개별 스템 스트리밍** (`GET /streaming/stem/:stemId`):
   - 스템 정보 데이터베이스 조회
   - 트랙 권한 검사 (소유자 또는 협업자)
   - S3 Presigned URL 생성 (1시간 유효)
   - 메타데이터와 함께 반환

2. **배치 스트리밍** (`POST /streaming/batch`):
   - 다중 스템 ID 처리
   - 각 스템별 권한 검사
   - 배치 S3 URL 생성
   - 실패한 스템 ID 별도 처리

3. **트랙 스템 조회** (`GET /streaming/track/:trackId/stems`):
   - 트랙의 모든 스템 조회
   - 버전별 스템 필터링
   - 스트리밍 URL 배치 생성

### 기능 6: 스테이지 관리 및 작업 흐름

**시나리오**: 음악 제작 과정을 스테이지별로 관리하고, 각 스테이지의 진행 상황을 추적한다.

**관련 파일**:
- `stage.controller.ts`, `stage.service.ts`
- `stage.entity.ts`, `createStage.dto.ts`

**Mermaid 시퀀스 다이어그램**:
```mermaid
sequenceDiagram
    participant Client
    participant StageController
    participant StageService
    participant Database
    participant WebhookService

    Note over Client,WebhookService: 스테이지 생성 흐름
    Client->>StageController: POST /stage/create
    StageController->>StageService: createStage(createStageDto)
    StageService->>Database: 스테이지 정보 저장
    Database-->>StageService: 생성된 스테이지
    StageService-->>StageController: 스테이지 정보
    StageController-->>Client: 201 Created

    Note over Client,WebhookService: 트랙별 스테이지 조회
    Client->>StageController: GET /stage/track/:track_id
    StageController->>StageService: getTrackStages(track_id)
    StageService->>Database: 트랙의 모든 스테이지 조회
    Database-->>StageService: 스테이지 목록
    StageService-->>StageController: 스테이지 데이터
    StageController-->>Client: 200 OK
```

**단계별 상세 설명**:

1. **스테이지 생성** (`POST /stage/create`):
   - 트랙의 새로운 작업 단계 생성
   - 스테이지별 가이드 파일 관리
   - 작업 진행 상태 추적

2. **트랙 스테이지 조회** (`GET /stage/track/:track_id`):
   - 특정 트랙의 모든 스테이지 조회
   - 시간순 정렬된 작업 히스토리

### 기능 7: 업스트림 및 리뷰 시스템

**시나리오**: 협업자들이 작업물을 업로드하고, 피드백과 리뷰를 통해 협업한다.

**관련 파일**:
- `upstream.controller.ts`, `upstream-comment.controller.ts`
- `upstream-review.controller.ts`, `upstream.service.ts`

**Mermaid 시퀀스 다이어그램**:
```mermaid
sequenceDiagram
    participant Collaborator
    participant UpstreamController
    participant CommentController
    participant ReviewController
    participant Database
    participant WebSocket

    Note over Collaborator,WebSocket: 업스트림 생성 및 리뷰
    Collaborator->>UpstreamController: POST /upstream/create
    UpstreamController->>Database: 업스트림 저장
    Database-->>UpstreamController: 업스트림 정보
    UpstreamController-->>Collaborator: 201 Created

    Note over Collaborator,WebSocket: 댓글 작성
    Collaborator->>CommentController: POST /upstream-comment/create
    CommentController->>Database: 댓글 저장
    CommentController->>WebSocket: 실시간 알림
    WebSocket-->>Collaborator: 댓글 알림

    Note over Collaborator,WebSocket: 리뷰 제출
    Collaborator->>ReviewController: POST /upstream-review/create
    ReviewController->>Database: 리뷰 저장
    ReviewController->>WebSocket: 실시간 알림
    WebSocket-->>Collaborator: 리뷰 알림
```

**단계별 상세 설명**:

1. **업스트림 생성** (`POST /upstream/create`):
   - 협업자의 작업물 업로드
   - 스테이지별 작업물 분류

2. **댓글 시스템** (`POST /upstream-comment/create`):
   - 실시간 피드백 제공
   - 댓글 수정/삭제 기능

3. **리뷰 시스템** (`POST /upstream-review/create`):
   - 작업물 승인/거절 프로세스
   - 리뷰어 권한 관리

### 기능 8: 파일 다운로드 시스템

**시나리오**: 사용자가 완성된 Stem 파일들을 다운로드한다.

**관련 파일**:
- `download.controller.ts`, `download.service.ts`
- `download.dto.ts`, `s3.service.ts`

**Mermaid 시퀀스 다이어그램**:
```mermaid
sequenceDiagram
    participant Client
    participant DownloadController
    participant DownloadService
    participant S3Service
    participant Database

    Note over Client,Database: 개별 파일 다운로드
    Client->>DownloadController: GET /download/stem/:stemId
    DownloadController->>DownloadService: getStemDownloadUrlById(stemId, userId)
    DownloadService->>Database: 스템 정보 및 권한 확인
    DownloadService->>S3Service: getPresignedDownloadUrl(key)
    S3Service-->>DownloadService: 다운로드 URL
    DownloadService-->>DownloadController: { url, metadata }
    DownloadController-->>Client: 200 OK

    Note over Client,Database: 배치 다운로드
    Client->>DownloadController: POST /download/batch
    DownloadController->>DownloadService: getBatchDownloadUrls(stemIds, userId)
    DownloadService->>Database: 다중 스템 권한 확인
    DownloadService->>S3Service: 배치 다운로드 URL 생성
    S3Service-->>DownloadService: 다운로드 URL 목록
    DownloadService-->>DownloadController: { urls: [...] }
    DownloadController-->>Client: 200 OK
```

**단계별 상세 설명**:

1. **개별 다운로드** (`GET /download/stem/:stemId`):
   - 권한 검증 후 다운로드 URL 제공
   - 다운로드 로그 기록

2. **배치 다운로드** (`POST /download/batch`):
   - 여러 파일 동시 다운로드
   - ZIP 패키징 지원

### 기능 9: 실시간 통신 (WebSocket)

**시나리오**: 실시간 협업을 위한 WebSocket 기반 통신 시스템.

**관련 파일**:
- `websocket.gateway.ts`, `websocket.module.ts`

**Mermaid 시퀀스 다이어그램**:
```mermaid
sequenceDiagram
    participant Client
    participant WebSocketGateway
    participant JWTService
    participant Database

    Note over Client,Database: WebSocket 연결
    Client->>WebSocketGateway: 소켓 연결 요청 (JWT 쿠키)
    WebSocketGateway->>JWTService: JWT 토큰 검증
    JWTService-->>WebSocketGateway: 사용자 정보
    WebSocketGateway->>Database: 사용자 조회
    Database-->>WebSocketGateway: 사용자 확인
    WebSocketGateway-->>Client: 연결 성공

    Note over Client,Database: 실시간 이벤트
    WebSocketGateway->>Client: file-processing-progress
    WebSocketGateway->>Client: file-duplicate
    WebSocketGateway->>Client: processing-approved
    WebSocketGateway->>Client: file-processing-completed
```

**실시간 이벤트 종류**:

1. **파일 처리 진행 상황**:
   - `file-processing-progress`: 업로드/분석 진행률
   - `file-processing-completed`: 처리 완료 알림
   - `file-processing-error`: 처리 오류 알림

2. **협업 알림**:
   - `file-duplicate`: 중복 파일 감지
   - `processing-approved`: 파일 처리 승인
   - `online-users`: 온라인 사용자 수

### 기능 10: 협업자 관리 시스템

**시나리오**: 트랙 협업자의 추가, 수정, 삭제 및 권한 관리.

**관련 파일**:
- `track_collaborator.controller.ts`, `track_collaborator.service.ts`
- `track_collaborator.entity.ts`

**Mermaid 시퀀스 다이어그램**:
```mermaid
sequenceDiagram
    participant Owner
    participant CollaboratorController
    participant CollaboratorService
    participant Database
    participant Collaborator

    Note over Owner,Collaborator: 협업자 추가
    Owner->>CollaboratorController: POST /track-collaborator/create
    CollaboratorController->>CollaboratorService: createCollaborator(dto)
    CollaboratorService->>Database: 협업자 관계 저장
    Database-->>CollaboratorService: 생성된 협업자
    CollaboratorService-->>CollaboratorController: 협업자 정보
    CollaboratorController-->>Owner: 201 Created

    Note over Owner,Collaborator: 협업 수락/거절
    Collaborator->>CollaboratorController: PUT /track-collaborator/:id/accept
    CollaboratorController->>CollaboratorService: acceptCollaboration(id)
    CollaboratorService->>Database: 상태를 'accepted'로 변경
    Database-->>CollaboratorService: 업데이트 완료
    CollaboratorService-->>CollaboratorController: 수락 완료
    CollaboratorController-->>Collaborator: 200 OK
```

### 기능 11: 버전 스템 관리

**시나리오**: 완성된 스템의 버전 관리 및 마스터 스템 생성.

**관련 파일**:
- `version-stem.controller.ts`, `version-stem.service.ts`
- `version-stem.entity.ts`

### 기능 12: 웹훅 시스템

**시나리오**: 외부 시스템(파일 처리 서버)과의 통신을 위한 웹훅 처리.

**관련 파일**:
- `webhook.controller.ts`, `webhook.service.ts`

**주요 웹훅 이벤트**:

1. **해시 검사** (`POST /webhook/hash-check`):
   - 파일 해시 중복 검사
   - 중복 파일 처리 또는 승인

2. **처리 완료** (`POST /webhook/completion`):
   - 파일 분석 완료 알림
   - 스템 생성 및 파형 데이터 저장

3. **믹싱 완료** (`POST /webhook/mixing-complete`):
   - 스테이지별 믹싱 완료
   - 가이드 파일 업데이트

---

## 6. API 엔드포인트 상세 명세 (Detailed API Endpoint Specification)

### Auth (인증)

| Method | Endpoint | Controller#Method | 설명 | 인증 |
|--------|----------|-------------------|------|------|
| POST | /auth/login | AuthController#login | 이메일/비밀번호 로그인 | 없음 |
| GET | /auth/google | AuthController#googleAuth | 구글 OAuth 로그인 | 없음 |
| GET | /auth/google/callback | AuthController#googleCallback | 구글 OAuth 콜백 | 없음 |
| GET | /auth/me | AuthController#getCurrentUser | 현재 사용자 정보 | 쿠키 JWT |
| GET | /auth/logout | AuthController#logout | 로그아웃 | 없음 |

#### POST /auth/login
**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "로그인 성공",
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "username": "홍길동"
    }
  }
}
```

### Users (사용자)

| Method | Endpoint | Controller#Method | 설명 | 인증 |
|--------|----------|-------------------|------|------|
| POST | /users/register | UsersController#register | 회원가입 | 없음 |
| POST | /users/forgot-password | UsersController#forgotPassword | 비밀번호 찾기 | 없음 |
| GET | /users/me | UsersController#getMe | 현재 사용자 정보 | JWT |

#### POST /users/register
**Request Body (RegisterDto)**:
```json
{
  "email": "user@example.com",
  "username": "홍길동",
  "password": "password123"
}
```

**Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다."
}
```

### Tracks (트랙)

| Method | Endpoint | Controller#Method | 설명 | 인증 |
|--------|----------|-------------------|------|------|
| POST | /tracks | TrackController#createTrack | 트랙 생성 | JWT |
| GET | /tracks | TrackController#getMyTracks | 내 트랙 조회 | JWT |
| GET | /tracks/collaborator | TrackController#getCollaboratorTracks | 협업 트랙 조회 | JWT |
| GET | /tracks/:id | TrackController#getTrackById | 트랙 상세 조회 | JWT |
| PUT | /tracks/:id | TrackController#updateTrack | 트랙 수정 | JWT |
| DELETE | /tracks/:id | TrackController#deleteTrack | 트랙 삭제 | JWT |
| GET | /tracks/:id/collaborators | TrackController#getTrackCollaborators | 트랙 협업자 조회 | JWT |

### Stage (스테이지)

| Method | Endpoint | Controller#Method | 설명 | 인증 |
|--------|----------|-------------------|------|------|
| POST | /stage/create | StageController#createStage | 스테이지 생성 | JWT |
| GET | /stage/track/:track_id | StageController#getTrackStages | 트랙별 스테이지 조회 | JWT |
| GET | /stage/stage/:stage_id | StageController#getStage | 스테이지 상세 조회 | JWT |

#### POST /stage/create
**Request Body (CreateStageDto)**:
```json
{
  "track_id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Demo Mix",
  "description": "첫 번째 데모 믹스",
  "user_id": "user-123"
}
```

### Upstream (업스트림)

| Method | Endpoint | Controller#Method | 설명 | 인증 |
|--------|----------|-------------------|------|------|
| POST | /upstream/create | UpstreamController#createUpstream | 업스트림 생성 | JWT |

### Upstream Comment (업스트림 댓글)

| Method | Endpoint | Controller#Method | 설명 | 인증 |
|--------|----------|-------------------|------|------|
| POST | /upstream-comment/create | UpstreamCommentController#createUpstreamComment | 댓글 생성 | JWT |
| GET | /upstream-comment/upstream/:upstream_id | UpstreamCommentController#getUpstreamComments | 업스트림별 댓글 조회 | JWT |
| PUT | /upstream-comment/update/:upstream_comment_id | UpstreamCommentController#updateUpstreamComment | 댓글 수정 | JWT |
| DELETE | /upstream-comment/delete/:upstream_comment_id | UpstreamCommentController#deleteUpstreamComment | 댓글 삭제 | JWT |

### Upstream Review (업스트림 리뷰)

| Method | Endpoint | Controller#Method | 설명 | 인증 |
|--------|----------|-------------------|------|------|
| POST | /upstream-review/create | UpstreamReviewController#createUpstreamReview | 리뷰 생성 | JWT |

### Track Collaborator (트랙 협업자)

| Method | Endpoint | Controller#Method | 설명 | 인증 |
|--------|----------|-------------------|------|------|
| POST | /track-collaborator/create | TrackCollaboratorController#createCollaborator | 협업자 추가 | JWT |
| GET | /track-collaborator/track/:trackId | TrackCollaboratorController#getCollaboratorsByTrack | 트랙별 협업자 조회 | JWT |
| GET | /track-collaborator/user/:userId | TrackCollaboratorController#getCollaboratorsByUser | 사용자별 협업 관계 조회 | JWT |
| GET | /track-collaborator/my-collaborations | TrackCollaboratorController#getMyCollaborations | 내 협업 관계 조회 | JWT |
| PUT | /track-collaborator/:id | TrackCollaboratorController#updateCollaborator | 협업자 상태 수정 | JWT |
| PUT | /track-collaborator/:id/accept | TrackCollaboratorController#acceptCollaboration | 협업 수락 | JWT |
| PUT | /track-collaborator/:id/reject | TrackCollaboratorController#rejectCollaboration | 협업 거절 | JWT |
| DELETE | /track-collaborator/:id | TrackCollaboratorController#deleteCollaborator | 협업자 제거 | JWT |

### Upload (파일 업로드)

| Method | Endpoint | Controller#Method | 설명 | 인증 |
|--------|----------|-------------------|------|------|
| POST | /uploads/add-upload | UploadController#addUpload | 업로드 세션 생성 | JWT |
| POST | /uploads/presigned-urls | UploadController#getPresignedUrls | Presigned URL 발급 | JWT |
| POST | /uploads/complete | UploadController#completeUpload | 업로드 완료 | JWT |
| POST | /uploads/abort | UploadController#abortUpload | 업로드 취소 | JWT |

### Streaming (스트리밍)

| Method | Endpoint | Controller#Method | 설명 | 인증 |
|--------|----------|-------------------|------|------|
| GET | /streaming/stem/:stemId | StreamingController#getStemStreamingUrl | 개별 스템 스트리밍 | JWT |
| POST | /streaming/batch | StreamingController#getBatchStreamingUrls | 배치 스트리밍 | JWT |
| GET | /streaming/track/:trackId/stems | StreamingController#getTrackStemsStreamingUrls | 트랙 스템 스트리밍 | JWT |
| POST | /streaming/stem/presigned | StreamingController#getStemPresignedUrl | 스템 Presigned URL | JWT |
| GET | /streaming/version-stem/:stemId | StreamingController#getVersionStemStreamingUrl | 버전 스템 스트리밍 | JWT |
| GET | /streaming/track/:trackId/version/:version/master-stems | StreamingController#getMasterStemStreamingUrls | 마스터 스템 스트리밍 | JWT |
| GET | /streaming/upstream/:upstreamId/stems | StreamingController#getUpstreamStemsStreamingUrls | 업스트림 스템 스트리밍 | JWT |

### Download (다운로드)

| Method | Endpoint | Controller#Method | 설명 | 인증 |
|--------|----------|-------------------|------|------|
| GET | /download/stem/:stemId | DownloadController#getStemDownloadUrlById | 개별 스템 다운로드 | JWT |
| POST | /download/batch | DownloadController#getBatchDownloadUrls | 배치 다운로드 | JWT |
| GET | /download/track/:trackId/stems | DownloadController#getTrackStemsDownloadUrls | 트랙 스템 다운로드 | JWT |
| POST | /download/stem/presigned | DownloadController#getStemDownloadUrl | 스템 다운로드 URL | JWT |
| GET | /download/version-stem/:stemId | DownloadController#getVersionStemDownloadUrl | 버전 스템 다운로드 | JWT |
| GET | /download/track/:trackId/version/:version/master-stems | DownloadController#getMasterStemDownloadUrls | 마스터 스템 다운로드 | JWT |
| GET | /download/upstream/:upstreamId/stems | DownloadController#getUpstreamStemsDownloadUrls | 업스트림 스템 다운로드 | JWT |

### Invite (초대)

| Method | Endpoint | Controller#Method | 설명 | 인증 |
|--------|----------|-------------------|------|------|
| GET | /invite/check-email/:trackId | InviteController#checkEmail | 이메일 중복 검사 | 없음 |
| POST | /invite/send | InviteController#sendInvites | 다중 이메일 초대 | JWT |
| GET | /invite/accept-page/:token | InviteController#getInviteAcceptPage | 초대 페이지 데이터 | 없음 |
| POST | /invite/accept | InviteController#acceptInvite | 초대 수락 | 선택적 |
| POST | /invite/decline | InviteController#declineInvite | 초대 거절 | 없음 |
| POST | /invite/complete-signup | InviteController#completeInviteAfterSignup | 회원가입 완료 후 협업자 등록 | JWT |
| POST | /invite/test-email | InviteController#testEmail | 이메일 서비스 테스트 | 없음 |

### Stem (스템)

| Method | Endpoint | Controller#Method | 설명 | 인증 |
|--------|----------|-------------------|------|------|
| POST | /stem/create | StemController#createStem | 스템 생성 | JWT |
| GET | /stem/upstream/:upstream_id/track/:track_id | StemController#getUpstreamStems | 업스트림별 스템 조회 | JWT |

### Version Stem (버전 스템)

| Method | Endpoint | Controller#Method | 설명 | 인증 |
|--------|----------|-------------------|------|------|
| POST | /version-stem/create | VersionStemController#createVersionStem | 버전 스템 생성 | JWT |
| GET | /version-stem/track/:track_id/version-stem/:version | VersionStemController#getLatestStemsPerCategoryByTrack | 버전별 최신 스템 조회 | JWT |

### Category (카테고리)

| Method | Endpoint | Controller#Method | 설명 | 인증 |
|--------|----------|-------------------|------|------|
| POST | /category | CategoryController#create | 카테고리 생성 | JWT |
| GET | /category/match/:id | CategoryController#getMatchCategory | 트랙별 카테고리 조회 | JWT |
| GET | /category/:id | CategoryController#findOne | 카테고리 히스토리 조회 | JWT |
| PATCH | /category/:id | CategoryController#update | 카테고리 수정 | JWT |
| DELETE | /category/:id | CategoryController#remove | 카테고리 삭제 | JWT |

### Webhook (웹훅)

| Method | Endpoint | Controller#Method | 설명 | 인증 |
|--------|----------|-------------------|------|------|
| POST | /webhook/hash-check | WebhookController#handleHashCheck | 해시 검사 웹훅 | 없음 |
| POST | /webhook/completion | WebhookController#handleCompletion | 처리 완료 웹훅 | 없음 |
| POST | /webhook/mixing-complete | WebhookController#handleMixingComplete | 믹싱 완료 웹훅 | 없음 |

#### POST /webhook/hash-check
**Request Body**:
```json
{
  "stemId": "stem-123",
  "userId": "user-456",
  "trackId": "track-789",
  "filepath": "s3://bucket/path/file.wav",
  "stageId": "stage-101",
  "audio_hash": "abc123def456",
  "timestamp": "2025-01-15T10:00:00Z",
  "original_filename": "kick.wav"
}
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "신규 파일 처리 승인",
  "isDuplicate": false,
  "stemId": "stem-123",
  "audio_hash": "abc123def456"
}
```

---

## 7. WebSocket 이벤트 명세 (WebSocket Events Specification)

### 연결 및 인증

#### 연결 설정
```javascript
// 클라이언트 측 연결
const socket = io('ws://localhost:3001', {
  withCredentials: true, // JWT 쿠키 포함
  transports: ['websocket', 'polling']
});
```

#### 연결 성공 이벤트
```javascript
socket.on('connected', (data) => {
  console.log('연결 성공:', data);
  // {
  //   message: 'Successfully connected to WebSocket',
  //   userId: 'user-123',
  //   socketId: 'socket-456'
  // }
});
```

### 파일 처리 이벤트

#### 파일 처리 진행 상황
```javascript
socket.on('file-processing-progress', (data) => {
  console.log('파일 처리 진행:', data);
  // {
  //   trackId: 'track-123',
  //   fileName: 'kick.wav',
  //   stage: 'analysis_started',
  //   progress: 50,
  //   message: '파형 분석 중...'
  // }
});
```

#### 중복 파일 감지
```javascript
socket.on('file-duplicate', (data) => {
  console.log('중복 파일 감지:', data);
  // {
  //   trackId: 'track-123',
  //   fileName: 'kick.wav',
  //   stageId: 'stage-456',
  //   originalFilePath: 's3://bucket/path/file.wav',
  //   duplicateHash: 'abc123def456'
  // }
});
```

#### 파일 처리 승인
```javascript
socket.on('processing-approved', (data) => {
  console.log('처리 승인:', data);
  // {
  //   trackId: 'track-123',
  //   fileName: 'kick.wav',
  //   stageId: 'stage-456',
  //   stemHash: 'abc123def456',
  //   originalFilePath: 's3://bucket/path/file.wav'
  // }
});
```

#### 파일 처리 완료
```javascript
socket.on('file-processing-completed', (data) => {
  console.log('처리 완료:', data);
  // {
  //   trackId: 'track-123',
  //   fileName: 'kick.wav',
  //   result: { /* 분석 결과 */ },
  //   processingTime: 15000
  // }
});
```

#### 파일 처리 오류
```javascript
socket.on('file-processing-error', (data) => {
  console.log('처리 오류:', data);
  // {
  //   trackId: 'track-123',
  //   fileName: 'kick.wav',
  //   error: '파일 형식이 지원되지 않습니다.',
  //   stage: 'analysis'
  // }
});
```

### 협업 이벤트

#### 온라인 사용자 수
```javascript
socket.on('onlineUsers', (data) => {
  console.log('온라인 사용자:', data);
  // {
  //   count: 5
  // }
});
```

#### 메시지 전송/수신
```javascript
// 메시지 전송
socket.emit('message', {
  message: 'Hello, collaborators!'
});

// 메시지 수신
socket.on('message', (data) => {
  console.log('새 메시지:', data);
  // {
  //   userId: 'user-123',
  //   username: '홍길동',
  //   message: 'Hello, collaborators!',
  //   timestamp: '2025-01-15T10:00:00Z'
  // }
});
```

#### Ping/Pong (연결 상태 확인)
```javascript
// Ping 전송
socket.emit('ping');

// Pong 수신
socket.on('pong', (response) => {
  console.log('Pong 수신:', response); // 'pong'
});
```

---

## 8. 데이터베이스 스키마 (Database Schema)

### 주요 테이블 구조

#### users 테이블
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR UNIQUE NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR,
  provider VARCHAR DEFAULT NULL,
  provider_id VARCHAR DEFAULT NULL,
  created_date DATE DEFAULT CURRENT_DATE
);
```

#### tracks 테이블
```sql
CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  image_url VARCHAR,
  status VARCHAR DEFAULT 'producing',
  description TEXT,
  genre VARCHAR,
  bpm VARCHAR,
  key_signature VARCHAR,
  create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### track_collaborators 테이블
```sql
CREATE TABLE track_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR DEFAULT 'collaborator',
  status VARCHAR DEFAULT 'pending',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### stages 테이블
```sql
CREATE TABLE stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  guide_path VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### stems 테이블
```sql
CREATE TABLE stems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR NOT NULL,
  stem_hash VARCHAR,
  file_path VARCHAR,
  key VARCHAR,
  bpm VARCHAR,
  audio_wave_path VARCHAR,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  upstream_id UUID REFERENCES upstreams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### version_stems 테이블
```sql
CREATE TABLE version_stems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR NOT NULL,
  file_path VARCHAR,
  audio_wave_path VARCHAR,
  version INTEGER NOT NULL,
  stem_hash VARCHAR,
  key VARCHAR,
  bpm VARCHAR,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### categories 테이블
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  instrument VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### upstreams 테이블
```sql
CREATE TABLE upstreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID REFERENCES stages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### upstream_comments 테이블
```sql
CREATE TABLE upstream_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upstream_id UUID REFERENCES upstreams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### upstream_reviews 테이블
```sql
CREATE TABLE upstream_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upstream_id UUID REFERENCES upstreams(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR NOT NULL, -- 'approved', 'rejected', 'pending'
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### invite_batches 테이블
```sql
CREATE TABLE invite_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  inviter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### invite_targets 테이블
```sql
CREATE TABLE invite_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_batch_id UUID REFERENCES invite_batches(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  token VARCHAR UNIQUE NOT NULL,
  status VARCHAR DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'pending_signup'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP
);
```

---

## 9. 에러 처리 및 상태 코드 (Error Handling)

### 공통 에러 응답 형식
```json
{
  "statusCode": 400,
  "message": "에러 메시지",
  "error": "Bad Request",
  "details": ["추가 상세 정보"] // 선택적
}
```

### 주요 HTTP 상태 코드
- **200 OK**: 성공적인 요청
- **201 Created**: 리소스 생성 성공
- **400 Bad Request**: 잘못된 요청 데이터
- **401 Unauthorized**: 인증 실패
- **403 Forbidden**: 권한 부족
- **404 Not Found**: 리소스를 찾을 수 없음
- **409 Conflict**: 중복된 리소스
- **500 Internal Server Error**: 서버 내부 오류

### 특별한 에러 상황

#### WebSocket 연결 오류
```json
{
  "event": "error",
  "message": "Unauthorized - Invalid token"
}
```

#### 파일 업로드 오류
```json
{
  "statusCode": 413,
  "message": "파일 크기가 너무 큽니다. (최대 100MB)",
  "error": "Payload Too Large"
}
```

#### 중복 파일 오류
```json
{
  "statusCode": 409,
  "message": "동일한 파일이 이미 존재합니다.",
  "error": "Conflict",
  "details": {
    "duplicateHash": "abc123def456",
    "existingFile": "kick.wav"
  }
}
```

---

## 10. 개발 환경 설정 (Development Environment)

### 필수 환경 변수 (.env)
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/waveflow

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-northeast-2
S3_BUCKET_NAME=waveflow-bucket

# AWS SQS
SQS_QUEUE_URL=https://sqs.ap-northeast-2.amazonaws.com/account/queue-name

# Email (Resend)
RESEND_API_KEY=your-resend-api-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Application
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# WebSocket
WEBSOCKET_CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 개발 서버 실행
```bash
# 백엔드 서버
cd backend
npm install
npm run start:dev

# 프론트엔드 서버
cd frontend
npm install
npm run dev

# Docker로 실행 (개발 환경)
docker-compose -f docker-compose.local.yml up -d
```

---

## 11. 테스트 가이드 (Testing Guide)

### API 테스트 예시 (using curl)

#### 1. 회원가입
```bash
curl -X POST http://localhost:3001/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "테스트사용자",
    "password": "password123"
  }'
```

#### 2. 로그인
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' \
  -c cookies.txt
```

#### 3. 트랙 생성
```bash
curl -X POST http://localhost:3001/tracks \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Test Track",
    "description": "테스트용 트랙입니다.",
    "genre": "Hip-Hop",
    "bpm": "120"
  }'
```

#### 4. 협업자 초대 이메일 전송
```bash
curl -X POST http://localhost:3001/invite/send \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "trackId": "track-id-here",
    "emails": ["collaborator@example.com"],
    "expiresInDays": 7
  }'
```

#### 5. 스테이지 생성
```bash
curl -X POST http://localhost:3001/stage/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "track_id": "track-id-here",
    "title": "Demo Mix",
    "description": "첫 번째 데모 믹스",
    "user_id": "user-id-here"
  }'
```

### WebSocket 테스트 예시 (using JavaScript)

```javascript
// WebSocket 연결 테스트
const io = require('socket.io-client');

const socket = io('ws://localhost:3001', {
  withCredentials: true,
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('Connected to WebSocket');
  
  // Ping 테스트
  socket.emit('ping');
});

socket.on('connected', (data) => {
  console.log('Authentication successful:', data);
});

socket.on('file-processing-progress', (data) => {
  console.log('File processing progress:', data);
});

socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

---

## 12. 배포 및 운영 (Deployment & Operations)

### Docker 환경

#### 개발 환경
```bash
docker-compose -f docker-compose.local.yml up -d
```

#### 프로덕션 환경
```bash
docker-compose -f docker-compose.yml up -d
```

### GitHub Actions CI/CD

프로젝트는 GitHub Actions를 통한 자동 배포를 지원합니다:

- **Development**: 개발 브랜치 푸시 시 자동 배포
- **Staging**: staging 브랜치 푸시 시 스테이징 환경 배포
- **Production**: main 브랜치 푸시 시 프로덕션 배포

### 모니터링 및 로깅

1. **애플리케이션 로그**: NestJS Logger 사용
2. **WebSocket 연결 로그**: 실시간 연결 상태 모니터링
3. **파일 처리 로그**: 업로드/분석 과정 추적
4. **에러 로그**: 시스템 오류 상세 기록

---

## 13. 보안 고려사항 (Security Considerations)

### 인증 및 권한
- **JWT 토큰**: HttpOnly 쿠키로 안전한 저장
- **비밀번호 해싱**: bcrypt 사용 (salt rounds: 10)
- **OAuth 2.0**: Google 소셜 로그인 지원

### API 보안
- **CORS 설정**: 허용된 도메인만 접근 가능
- **Rate Limiting**: API 호출 빈도 제한
- **입력 검증**: class-validator를 통한 강력한 유효성 검사

### 파일 보안
- **S3 Presigned URLs**: 시간 제한된 안전한 파일 접근
- **파일 해시 검증**: 무결성 확인
- **권한 기반 접근**: 소유자/협업자만 파일 접근 가능

### WebSocket 보안
- **JWT 기반 인증**: 연결 시 토큰 검증
- **CORS 설정**: 허용된 원본에서만 연결 가능
- **연결 제한**: 사용자당 단일 연결 정책

---

이 문서는 RealWaveFlow 프로젝트의 **모든 백엔드 기능과 API 명세**를 완전히 포함하고 있습니다. 개발자가 프로젝트의 전체 아키텍처를 이해하고, 각 API를 효과적으로 활용할 수 있도록 상세하게 구성되었습니다. 🎵 