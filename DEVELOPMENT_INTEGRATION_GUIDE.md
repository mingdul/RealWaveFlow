# WaveFlow 개발 통합 가이드

## 개요
이 문서는 WaveFlow 프론트엔드와 백엔드 개발 시 API 통합을 위한 실용적인 가이드입니다.

## 빠른 시작

### 1. 환경 설정
```bash
# 백엔드 시작
cd backend
npm install
npm run start:dev

# 프론트엔드 시작 (새 터미널)
cd frontend
npm install
npm run dev
```

### 2. API 테스트 준비
- 백엔드: http://localhost:8080
- 프론트엔드: http://localhost:3000
- Swagger 문서: http://localhost:8080/api

## 공통 개발 규칙

### API 응답 형식 통일
**모든 백엔드 API는 반드시 다음 형식을 따라야 합니다:**

```typescript
// 성공 응답
{
  success: true,
  data: T,          // 실제 데이터
  message?: string  // 선택적 메시지
}

// 에러 응답
{
  success: false,
  message: string,  // 에러 메시지
  statusCode: number
}
```

### 프론트엔드 서비스 패턴
```typescript
// 서비스 메서드 예시
async someApiCall(): Promise<ApiResponse<DataType>> {
  try {
    const response = await apiClient.post<ApiResponse<DataType>>(
      '/endpoint',
      requestData
    );
    return response.data; // { success: true, data: ... }
  } catch (error: any) {
    throw new Error(error.response?.data?.message || '기본 에러 메시지');
  }
}
```

## 주요 API 개발 패턴

### 1. 인증이 필요한 API
```typescript
// 백엔드 컨트롤러
@UseGuards(AuthGuard('jwt'))
@Controller('endpoint')
export class ExampleController {
  @Post()
  async create(@Body() dto: CreateDto, @Request() req) {
    const userId = req.user.id; // JWT에서 사용자 ID 추출
    const result = await this.service.create(dto, userId);
    return {
      success: true,
      data: result
    };
  }
}
```

### 2. 파일 업로드 패턴
```typescript
// 멀티파트 업로드 처리
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadFile(
  @UploadedFile() file: Express.Multer.File,
  @Body() dto: UploadDto
) {
  // 파일 처리 로직
  return {
    success: true,
    data: {
      fileId: 'generated-id',
      fileName: file.originalname,
      fileSize: file.size
    }
  };
}
```

### 3. 에러 처리 패턴
```typescript
// 백엔드 서비스
async findById(id: string) {
  const entity = await this.repository.findOne({ where: { id } });
  if (!entity) {
    throw new NotFoundException('리소스를 찾을 수 없습니다.');
  }
  return entity;
}

// 프론트엔드 서비스
async getData(id: string) {
  try {
    const response = await apiClient.get(`/endpoint/${id}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('데이터를 찾을 수 없습니다.');
    }
    throw new Error(error.response?.data?.message || '서버 오류가 발생했습니다.');
  }
}
```

## 개발 시 체크리스트

### 백엔드 개발자
- [ ] 모든 API 응답이 `{ success, data?, message? }` 형식인가?
- [ ] Swagger 어노테이션이 정확한가?
- [ ] 인증이 필요한 엔드포인트에 `@UseGuards(AuthGuard('jwt'))`가 있는가?
- [ ] 에러 시 적절한 HTTP 상태 코드를 반환하는가?
- [ ] 요청 DTO에 유효성 검사가 있는가?

### 프론트엔드 개발자
- [ ] API 클라이언트에서 인증 토큰을 올바르게 전송하는가?
- [ ] 에러 응답을 적절히 처리하는가?
- [ ] TypeScript 타입이 백엔드 응답과 일치하는가?
- [ ] 로딩 상태와 에러 상태를 UI에 표시하는가?

## 디버깅 가이드

### 1. 네트워크 문제 해결
```bash
# CORS 문제 확인
curl -X OPTIONS http://localhost:8080/api/endpoint \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST"

# 쿠키 인증 확인
curl http://localhost:8080/auth/me \
  -H "Cookie: jwt=YOUR_JWT_TOKEN" \
  -v
```

### 2. 인증 문제 해결
```typescript
// 프론트엔드에서 JWT 토큰 확인
const checkAuth = async () => {
  try {
    const user = await authService.getCurrentUser();
    console.log('현재 사용자:', user);
  } catch (error) {
    console.error('인증 실패:', error);
    // 로그인 페이지로 리다이렉트
  }
};
```

### 3. API 응답 디버깅
```typescript
// API 클라이언트에서 로깅 추가
apiClient.interceptors.response.use(
  (response) => {
    console.log('API 응답:', response.config.method, response.config.url);
    console.log('응답 데이터:', response.data);
    return response;
  },
  (error) => {
    console.error('API 에러:', error.response?.status, error.config?.url);
    console.error('에러 데이터:', error.response?.data);
    return Promise.reject(error);
  }
);
```

## 테스트 방법

### 1. API 단위 테스트
```bash
# 백엔드 테스트
cd backend
npm run test

# 특정 컨트롤러 테스트
npm run test -- track.controller.spec.ts
```

### 2. 통합 테스트
```bash
# E2E 테스트
cd backend
npm run test:e2e

# 프론트엔드 테스트
cd frontend
npm run test
```

### 3. Postman으로 API 테스트
1. `backend/WaveFlow-Upload-API.postman_collection.json` 파일을 Postman에 가져오기
2. 환경 변수 설정:
   - `base_url`: http://localhost:8080
   - `jwt_token`: 로그인 후 받은 JWT 토큰

## 성능 최적화

### 1. 파일 업로드 최적화
```typescript
// 청크 크기 동적 조정
const calculateChunkSize = (fileSize: number): number => {
  if (fileSize < 100 * MB) return 10 * MB;   // 10MB
  if (fileSize < 500 * MB) return 25 * MB;   // 25MB
  return 50 * MB;                            // 50MB
};
```

### 2. API 호출 최적화
```typescript
// 요청 병렬 처리
const [tracks, collaborators] = await Promise.all([
  trackService.getUserTracks(),
  trackService.getCollaboratorTracks()
]);

// 요청 캐싱
const cachedData = useMemo(() => {
  return expensiveApiCall();
}, [dependencies]);
```

## 문제 해결 FAQ

### Q: "CORS 에러가 발생합니다"
A: 백엔드 CORS 설정을 확인하세요:
```typescript
// main.ts
app.enableCors({
  origin: ['http://localhost:3000'],
  credentials: true,
});
```

### Q: "JWT 인증이 실패합니다"
A: 쿠키 설정을 확인하세요:
```typescript
// 백엔드
res.cookie('jwt', token, {
  httpOnly: true,
  secure: false,      // 개발 환경
  sameSite: 'lax',
});

// 프론트엔드
apiClient.defaults.withCredentials = true;
```

### Q: "파일 업로드가 실패합니다"
A: 
1. AWS S3 권한 확인
2. 환경 변수 설정 확인
3. 파일 크기 제한 확인

### Q: "API 응답 형식이 일치하지 않습니다"
A: API 명세서를 참조하여 백엔드 응답 형식을 통일하세요:
```typescript
// 올바른 형식
return {
  success: true,
  data: result
};
```

## 추가 리소스

- [API 명세서](./API_SPECIFICATION.md)
- [Swagger 문서](http://localhost:8080/api)
- [프론트엔드 README](./frontend/README.md)
- [백엔드 README](./backend/README.md)

## 기여 가이드

1. 새로운 API 개발 시 이 가이드를 따라주세요
2. API 변경 시 명세서도 함께 업데이트해주세요
3. 테스트 코드를 작성해주세요
4. 문서를 최신 상태로 유지해주세요 