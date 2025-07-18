/**
 * 한글 파일명 처리를 위한 유틸리티
 * 업로드 시 ASCII-safe 인코딩, 표시 시 디코딩
 */

const ENCODED_PREFIX = 'enc_';

/**
 * 파일명이 한글/특수문자를 포함하는지 확인
 */
export const needsEncoding = (filename: string): boolean => {
  // ASCII 범위를 벗어나는 문자가 있는지 확인
  return /[^\x00-\x7F]/.test(filename);
};

/**
 * 파일명을 안전한 ASCII 형태로 인코딩
 * 한글이나 특수문자가 포함된 경우 Base64로 인코딩하고 접두사 추가
 */
export const encodeFilename = (originalFilename: string): string => {
  console.log('[🔤 ENCODE] Input filename:', originalFilename);
  
  if (!needsEncoding(originalFilename)) {
    console.log('[🔤 ENCODE] No encoding needed, returning original:', originalFilename);
    return originalFilename;
  }

  try {
    // UTF-8 바이트로 변환 후 Base64 인코딩
    const encoded = btoa(encodeURIComponent(originalFilename));
    // URL-safe Base64로 변환 (+ -> -, / -> _, = 제거)
    const urlSafe = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    
    // 파일 확장자 분리
    const lastDotIndex = originalFilename.lastIndexOf('.');
    const extension = lastDotIndex !== -1 ? originalFilename.substring(lastDotIndex) : '';
    
    const result = `${ENCODED_PREFIX}${urlSafe}${extension}`;
    console.log('[🔤 ENCODE] Encoded result:', result);
    return result;
  } catch (error) {
    console.error('[❌ ENCODE] Failed to encode filename:', error);
    // 인코딩 실패 시 안전한 대체 파일명 생성
    const fallback = `${ENCODED_PREFIX}${Date.now()}_file${getFileExtension(originalFilename)}`;
    console.log('[🔤 ENCODE] Using fallback:', fallback);
    return fallback;
  }
};

/**
 * 인코딩된 파일명을 원본으로 디코딩
 */
export const decodeFilename = (encodedFilename: string): string => {
  console.log('[🔓 DECODE] Input filename:', encodedFilename);
  
  if (!encodedFilename.startsWith(ENCODED_PREFIX)) {
    console.log('[🔓 DECODE] Not encoded, returning original:', encodedFilename);
    return encodedFilename;
  }

  try {
    // 접두사 제거
    const withoutPrefix = encodedFilename.substring(ENCODED_PREFIX.length);
    console.log('[🔓 DECODE] Without prefix:', withoutPrefix);
    
    // 확장자 분리
    const lastDotIndex = withoutPrefix.lastIndexOf('.');
    let encoded: string;
    
    if (lastDotIndex !== -1) {
      encoded = withoutPrefix.substring(0, lastDotIndex);
    } else {
      encoded = withoutPrefix;
    }

    console.log('[🔓 DECODE] Base64 part:', encoded);

    // URL-safe Base64를 일반 Base64로 복원
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // 패딩 추가
    const padding = '='.repeat((4 - (padded.length % 4)) % 4);
    const base64 = padded + padding;
    
    console.log('[🔓 DECODE] Restored Base64:', base64);
    
    // Base64 디코딩 후 URI 디코딩
    const decoded = decodeURIComponent(atob(base64));
    console.log('[🔓 DECODE] Decoded result:', decoded);
    return decoded;
  } catch (error) {
    console.error('[❌ DECODE] Failed to decode filename:', error);
    // 디코딩 실패 시 원본 반환
    console.log('[🔓 DECODE] Using original due to error:', encodedFilename);
    return encodedFilename;
  }
};

/**
 * 파일 확장자 추출
 */
export const getFileExtension = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
};

/**
 * 파일명이 인코딩된 것인지 확인
 */
export const isEncodedFilename = (filename: string): boolean => {
  return filename.startsWith(ENCODED_PREFIX);
};

/**
 * 파일 객체와 표시용 파일명을 함께 관리하는 인터페이스
 */
export interface FileWithNames {
  file: File;
  originalName: string;  // 사용자가 선택한 원본 파일명
  encodedName: string;   // 서버에 저장될 인코딩된 파일명
  displayName: string;   // UI에 표시될 파일명 (원본과 동일)
}

/**
 * File 객체로부터 FileWithNames 생성
 */
export const createFileWithNames = (file: File): FileWithNames => {
  const originalName = file.name;
  const encodedName = encodeFilename(originalName);
  
  return {
    file,
    originalName,
    encodedName,
    displayName: originalName, // 표시용은 항상 원본
  };
};

/**
 * 서버에서 받은 파일명을 표시용으로 변환
 */
export const getDisplayFilename = (serverFilename: string): string => {
  console.log('[📺 DISPLAY] Converting filename for display:', serverFilename);
  const result = decodeFilename(serverFilename);
  console.log('[📺 DISPLAY] Display filename result:', result);
  return result;
};

/**
 * 파일명 인코딩/디코딩 테스트 함수 (개발용)
 * 브라우저 콘솔에서 테스트할 때 사용
 */
export const testFilenameEncoding = () => {
  console.log('🧪 [TEST] 파일명 인코딩/디코딩 테스트 시작');
  
  const testCases = [
    'test.mp3',
    '한글파일.wav',
    '음성 녹음 - 2023년 12월.mp3',
    'English_File_123.flac',
    '믹스다운_최종버전(한글).wav',
    'テスト.aiff', // 일본어
    'тест.ogg', // 러시아어
    '测试.m4a' // 중국어
  ];
  
  testCases.forEach((filename, index) => {
    console.log(`\n🧪 [TEST ${index + 1}] 테스트 파일명: "${filename}"`);
    
    const encoded = encodeFilename(filename);
    console.log(`🧪 [TEST ${index + 1}] 인코딩 결과: "${encoded}"`);
    
    const decoded = decodeFilename(encoded);
    console.log(`🧪 [TEST ${index + 1}] 디코딩 결과: "${decoded}"`);
    
    const isCorrect = decoded === filename;
    console.log(`🧪 [TEST ${index + 1}] 테스트 ${isCorrect ? '✅ 성공' : '❌ 실패'}`);
    
    if (!isCorrect) {
      console.error(`🧪 [TEST ${index + 1}] 원본: "${filename}", 결과: "${decoded}"`);
    }
  });
  
  console.log('\n🧪 [TEST] 파일명 인코딩/디코딩 테스트 완료');
};

// 전역 스코프에 테스트 함수 노출 (개발 환경에서만)
if (typeof window !== 'undefined' && import.meta.env.MODE === 'development') {
  (window as any).testFilenameEncoding = testFilenameEncoding;
  console.log('🧪 [DEV] 콘솔에서 testFilenameEncoding() 함수를 실행하여 테스트할 수 있습니다.');
} 