# 멀티트랙 스트리밍 API 명세서

## 개요
DAW 스타일의 멀티트랙 오디오 스트리밍을 위한 API 명세서입니다.
PresignedURL 방식을 사용하여 MVP 단계에서 빠른 구현과 높은 성능을 제공합니다.

---

## 스트리밍 API

### 1. 트랙의 모든 스템 파일 스트리밍 URL 조회
```
GET /streaming/track/:trackId/stems
Authorization: Bearer <token>
```

**설명**: 특정 트랙의 모든 스템 파일들에 대한 presigned URL을 일괄 조회

**응답:**
```typescript
{
  success: true,
  data: {
    trackId: string;
    trackInfo: {
      name: string;
      description?: string;
      genre?: string;
      bpm?: string;
      key_signature?: string;
    };
    stems: [
      {
        id: string;
        fileName: string;
        category: string;        // 악기 카테고리 (drums, bass, guitar, etc.)
        tag?: string;           // 추가 태그 정보
        key?: string;           // 음악적 키 정보
        description?: string;
        presignedUrl: string;   // S3 presigned URL (1시간 유효)
        metadata: {
          duration?: number;    // 파일 길이 (초)
          fileSize?: number;    // 파일 크기 (bytes)
          sampleRate?: number;  // 샘플레이트
          channels?: number;    // 채널 수
        };
        uploadedBy: {
          id: string;
          username: string;
        };
        uploadedAt: string;
      }
    ];
    totalStems: number;
    urlExpiresAt: string;      // URL 만료 시간
  }
}
```

### 2. 개별 스템 파일 스트리밍 URL 조회
```
GET /streaming/stem/:stemId
Authorization: Bearer <token>
```

**설명**: 특정 스템 파일 하나에 대한 presigned URL 조회

**응답:**
```typescript
{
  success: true,
  data: {
    stemId: string;
    fileName: string;
    category: string;
    presignedUrl: string;
    metadata: {
      duration?: number;
      fileSize?: number;
      sampleRate?: number;
      channels?: number;
    };
    urlExpiresAt: string;
  }
}
```

### 3. 브랜치별 스템 파일 스트리밍 URL 조회
```
GET /streaming/branch/:branchId/stems
Authorization: Bearer <token>
```

**설명**: 특정 브랜치(세션)의 모든 스템 파일들에 대한 presigned URL 조회

**응답:**
```typescript
{
  success: true,
  data: {
    branchId: string;
    branchName: string;
    trackId: string;
    stems: [
      {
        id: string;
        fileName: string;
        category: string;
        directoryPath: string;  // 브랜치 내 디렉토리 경로
        presignedUrl: string;
        metadata: {
          duration?: number;
          fileSize?: number;
          sampleRate?: number;
          channels?: number;
        };
        uploadedBy: {
          id: string;
          username: string;
        };
        uploadedAt: string;
      }
    ];
    totalStems: number;
    urlExpiresAt: string;
  }
}
```

### 4. 버전별 스템 파일 스트리밍 URL 조회
```
GET /streaming/version/:versionId/stems
Authorization: Bearer <token>
```

**설명**: 특정 버전의 모든 스템 파일들에 대한 presigned URL 조회

**응답:**
```typescript
{
  success: true,
  data: {
    versionId: string;
    versionNumber: string;
    commitMessage: string;
    branchId: string;
    trackId: string;
    stems: [
      {
        id: string;
        fileName: string;
        category: string;
        presignedUrl: string;
        metadata: {
          duration?: number;
          fileSize?: number;
          sampleRate?: number;
          channels?: number;
        };
        uploadedBy: {
          id: string;
          username: string;
        };
        uploadedAt: string;
      }
    ];
    totalStems: number;
    urlExpiresAt: string;
  }
}
```

### 5. 스템 파일 메타데이터 일괄 조회
```
POST /streaming/metadata/batch
Authorization: Bearer <token>
Content-Type: application/json
```

**요청 본문:**
```typescript
{
  stemIds: string[];
}
```

**응답:**
```typescript
{
  success: true,
  data: {
    metadata: {
      [stemId: string]: {
        fileName: string;
        category: string;
        duration?: number;
        fileSize?: number;
        sampleRate?: number;
        channels?: number;
        bitRate?: number;
        format?: string;        // mp3, wav, flac, etc.
        peaks?: number[];       // 파형 데이터 (옵션)
      }
    }
  }
}
```

### 6. 사용자별 스트리밍 가능한 트랙 목록
```
GET /streaming/my-tracks
Authorization: Bearer <token>
Query Parameters:
  - page?: number (기본값: 1)
  - limit?: number (기본값: 20)
  - genre?: string
  - hasStems?: boolean (스템 파일이 있는 트랙만)
```

**응답:**
```typescript
{
  success: true,
  data: {
    tracks: [
      {
        id: string;
        name: string;
        description?: string;
        genre?: string;
        bpm?: string;
        key_signature?: string;
        stemCount: number;      // 스템 파일 개수
        totalDuration?: number; // 전체 길이
        createdDate: string;
        updatedDate: string;
        owner: {
          id: string;
          username: string;
        };
        isCollaborator: boolean; // 협업자인지 여부
      }
    ];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    }
  }
}
```

### 7. 협업 트랙 스트리밍 목록
```
GET /streaming/collaborative-tracks
Authorization: Bearer <token>
Query Parameters:
  - page?: number (기본값: 1)
  - limit?: number (기본값: 20)
```

**응답:**
```typescript
{
  success: true,
  data: {
    tracks: [
      {
        id: string;
        name: string;
        description?: string;
        genre?: string;
        bpm?: string;
        key_signature?: string;
        stemCount: number;
        totalDuration?: number;
        createdDate: string;
        updatedDate: string;
        owner: {
          id: string;
          username: string;
        };
        myRole: 'collaborator' | 'viewer';
        lastActivity: string;   // 마지막 활동 시간
      }
    ];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    }
  }
}
```

---

## 플레이리스트 API (옵션)

### 8. 플레이리스트 생성
```
POST /streaming/playlists
Authorization: Bearer <token>
Content-Type: application/json
```

**요청 본문:**
```typescript
{
  name: string;
  description?: string;
  trackIds: string[];
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
    trackCount: number;
    createdAt: string;
  }
}
```

### 9. 플레이리스트 목록 조회
```
GET /streaming/playlists
Authorization: Bearer <token>
```

**응답:**
```typescript
{
  success: true,
  data: {
    playlists: [
      {
        id: string;
        name: string;
        description?: string;
        trackCount: number;
        totalDuration?: number;
        createdAt: string;
        updatedAt: string;
      }
    ]
  }
}
```

### 10. 플레이리스트 상세 조회 (스트리밍 URL 포함)
```
GET /streaming/playlists/:playlistId
Authorization: Bearer <token>
```

**응답:**
```typescript
{
  success: true,
  data: {
    id: string;
    name: string;
    description?: string;
    tracks: [
      {
        id: string;
        name: string;
        stemCount: number;
        stems: [
          {
            id: string;
            fileName: string;
            category: string;
            presignedUrl: string;
            metadata: {
              duration?: number;
              fileSize?: number;
            }
          }
        ]
      }
    ];
    totalTracks: number;
    urlExpiresAt: string;
  }
}
```

---

## 실시간 협업 API (WebSocket)

### 11. 스트리밍 세션 생성
```
POST /streaming/session/create
Authorization: Bearer <token>
Content-Type: application/json
```

**요청 본문:**
```typescript
{
  trackId: string;
  sessionName?: string;
}
```

**응답:**
```typescript
{
  success: true,
  data: {
    sessionId: string;
    trackId: string;
    sessionName: string;
    websocketUrl: string;    // WebSocket 연결 URL
    createdAt: string;
  }
}
```

### 12. WebSocket 이벤트 (실시간 동기화)
```
WebSocket: /streaming/session/:sessionId
Authorization: Bearer <token>
```

**클라이언트 → 서버 이벤트:**
```typescript
// 재생 시작
{
  type: 'play',
  data: {
    startTime: number;       // AudioContext.currentTime 기준
    currentPosition: number; // 재생 위치 (초)
  }
}

// 재생 정지
{
  type: 'stop',
  data: {
    currentPosition: number;
  }
}

// 트랙 볼륨 변경
{
  type: 'volume_change',
  data: {
    stemId: string;
    volume: number;          // 0.0 ~ 1.0
  }
}

// 트랙 뮤트/언뮤트
{
  type: 'mute_toggle',
  data: {
    stemId: string;
    muted: boolean;
  }
}

// 재생 위치 변경 (seek)
{
  type: 'seek',
  data: {
    position: number;        // 새로운 재생 위치 (초)
  }
}
```

**서버 → 클라이언트 이벤트:**
```typescript
// 다른 사용자의 재생 상태 동기화
{
  type: 'sync_playback',
  data: {
    isPlaying: boolean;
    currentPosition: number;
    startTime: number;
    userId: string;
    username: string;
  }
}

// 다른 사용자의 볼륨 변경 동기화
{
  type: 'sync_volume',
  data: {
    stemId: string;
    volume: number;
    userId: string;
    username: string;
  }
}

// 세션 참가자 목록 업데이트
{
  type: 'participants_update',
  data: {
    participants: [
      {
        userId: string;
        username: string;
        joinedAt: string;
      }
    ]
  }
}
```

---

## 에러 처리

### 공통 에러 응답
```typescript
{
  success: false,
  message: string;
  statusCode: number;
  error?: string;
}
```

### 스트리밍 관련 에러 코드
- `STREAM_001`: 트랙을 찾을 수 없음
- `STREAM_002`: 스템 파일을 찾을 수 없음
- `STREAM_003`: 트랙 접근 권한 없음
- `STREAM_004`: PresignedURL 생성 실패
- `STREAM_005`: 파일이 스트리밍 불가능한 형식
- `STREAM_006`: 세션을 찾을 수 없음
- `STREAM_007`: 세션 참가 권한 없음
- `STREAM_008`: 동시 세션 한도 초과

---

## 데이터 타입 정의

### StemStreamingInfo
```typescript
interface StemStreamingInfo {
  id: string;
  fileName: string;
  category: string;
  tag?: string;
  key?: string;
  description?: string;
  presignedUrl: string;
  metadata: AudioMetadata;
  uploadedBy: {
    id: string;
    username: string;
  };
  uploadedAt: string;
}
```

### AudioMetadata
```typescript
interface AudioMetadata {
  duration?: number;        // 파일 길이 (초)
  fileSize?: number;        // 파일 크기 (bytes)
  sampleRate?: number;      // 샘플레이트 (Hz)
  channels?: number;        // 채널 수
  bitRate?: number;         // 비트레이트 (kbps)
  format?: string;          // 파일 형식 (mp3, wav, flac)
  peaks?: number[];         // 파형 데이터 (시각화용)
}
```

### StreamingSession
```typescript
interface StreamingSession {
  id: string;
  trackId: string;
  sessionName: string;
  participants: SessionParticipant[];
  playbackState: {
    isPlaying: boolean;
    currentPosition: number;
    startTime?: number;
  };
  createdAt: string;
  expiresAt: string;
}
```

### SessionParticipant
```typescript
interface SessionParticipant {
  userId: string;
  username: string;
  role: 'owner' | 'collaborator' | 'viewer';
  joinedAt: string;
  lastActivity: string;
}
```

---

## 구현 우선순위

### Phase 1: 기본 스트리밍 (MVP)
1. 트랙별 스템 파일 URL 조회 (`GET /streaming/track/:trackId/stems`)
2. 개별 스템 파일 URL 조회 (`GET /streaming/stem/:stemId`)
3. 사용자 트랙 목록 (`GET /streaming/my-tracks`)

### Phase 2: 협업 기능
1. 브랜치별 스템 조회 (`GET /streaming/branch/:branchId/stems`)
2. 버전별 스템 조회 (`GET /streaming/version/:versionId/stems`)
3. 협업 트랙 목록 (`GET /streaming/collaborative-tracks`)

### Phase 3: 실시간 기능
1. 스트리밍 세션 생성 (`POST /streaming/session/create`)
2. WebSocket 실시간 동기화
3. 플레이리스트 기능

### Phase 4: 고급 기능
1. 메타데이터 일괄 조회 (`POST /streaming/metadata/batch`)
2. 파형 데이터 지원
3. 오디오 분석 결과 연동

---

## 보안 고려사항 (MVP 단계)

1. **PresignedURL 만료 시간**: 1시간으로 제한
2. **권한 검증**: 모든 API에서 트랙 접근 권한 확인
3. **Rate Limiting**: 사용자당 시간당 요청 수 제한
4. **CORS 설정**: 허용된 도메인에서만 접근 가능
5. **로깅**: 모든 스트리밍 요청 로그 기록

---

## 성능 최적화

1. **캐싱**: 메타데이터 Redis 캐싱
2. **배치 처리**: 여러 파일 URL 한 번에 생성
3. **CDN**: CloudFront를 통한 글로벌 배포
4. **압축**: 응답 데이터 gzip 압축
5. **페이지네이션**: 대용량 목록 페이징 처리

---

## 모니터링 및 분석

1. **사용량 추적**: 트랙별, 사용자별 재생 통계
2. **성능 모니터링**: API 응답 시간, 에러율
3. **사용자 행동 분석**: 재생 패턴, 인기 트랙
4. **비용 모니터링**: S3 요청 수, 데이터 전송량

이 API 명세서를 기반으로 멀티트랙 스트리밍 기능을 단계적으로 구현할 수 있습니다.
