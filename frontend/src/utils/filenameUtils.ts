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
  if (!needsEncoding(originalFilename)) {
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
    
    return `${ENCODED_PREFIX}${urlSafe}${extension}`;
  } catch (error) {
    console.error('Failed to encode filename:', error);
    // 인코딩 실패 시 안전한 대체 파일명 생성
    return `${ENCODED_PREFIX}${Date.now()}_file${getFileExtension(originalFilename)}`;
  }
};

/**
 * 인코딩된 파일명을 원본으로 디코딩
 */
export const decodeFilename = (encodedFilename: string): string => {
  // enc_ 접두사가 있는지 확인 (타임스탬프가 앞에 있을 수 있음)
  const encIndex = encodedFilename.indexOf(`_${ENCODED_PREFIX}`);
  const directEncIndex = encodedFilename.indexOf(ENCODED_PREFIX);
  
  let prefixStart = -1;
  
  if (encIndex !== -1) {
    // _enc_ 패턴을 찾은 경우 (타임스탬프_enc_...)
    prefixStart = encIndex + 1; // '_' 다음부터
  } else if (directEncIndex === 0) {
    // enc_로 직접 시작하는 경우
    prefixStart = 0;
  } else {
    return encodedFilename;
  }

  try {
    // 접두사 제거 (enc_ 부분부터)
    const afterPrefix = encodedFilename.substring(prefixStart);
    const withoutPrefix = afterPrefix.substring(ENCODED_PREFIX.length);
    
    // 확장자 분리
    const lastDotIndex = withoutPrefix.lastIndexOf('.');
    let encoded: string;
    
    if (lastDotIndex !== -1) {
      encoded = withoutPrefix.substring(0, lastDotIndex);
    } else {
      encoded = withoutPrefix;
    }

    // URL-safe Base64를 일반 Base64로 복원
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // 패딩 추가
    const padding = '='.repeat((4 - (padded.length % 4)) % 4);
    const base64 = padded + padding;
    
    // Base64 디코딩 후 URI 디코딩
    const decoded = decodeURIComponent(atob(base64));
    
    // 타임스탬프 접두사가 있었다면 디코딩된 파일명에 추가하지 않고 원본 파일명만 반환
    return decoded;
  } catch (error) {
    console.error('Failed to decode filename:', error);
    // 디코딩 실패 시 원본 반환
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
  return filename.includes(`_${ENCODED_PREFIX}`) || filename.startsWith(ENCODED_PREFIX);
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
  return decodeFilename(serverFilename);
}; 