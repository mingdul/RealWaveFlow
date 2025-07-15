/**
 * 기본 이미지 파일명 목록
 */
export const DEFAULT_IMAGES = [
  '1.png',
  '2.png', 
  '3.png',
  '4.png',
  '5.png',
  '6.png',
  '7.png',
  '8.png',
  '9.png'
];

/**
 * 기본 이미지 중 하나를 랜덤 선택하여 image_url 형태로 반환
 * @returns "default/imageX.png" 형태의 문자열
 */
export const getRandomDefaultImageUrl = (): string => {
  const randomIndex = Math.floor(Math.random() * DEFAULT_IMAGES.length);
  const selectedImage = DEFAULT_IMAGES[randomIndex];
  return `default/${selectedImage}`;
};

/**
 * 이미지 URL이 기본 이미지인지 확인
 * @param imageUrl - 확인할 이미지 URL
 * @returns 기본 이미지인 경우 true
 */
export const isDefaultImage = (imageUrl?: string): boolean => {
  return imageUrl?.startsWith('default/') || false;
};

/**
 * 기본 이미지 URL을 실제 public 경로로 변환
 * @param imageUrl - "default/imageX.png" 형태의 URL
 * @returns "/trackimage/imageX.png" 형태의 경로
 */
export const getDefaultImagePath = (imageUrl: string): string => {
  if (!isDefaultImage(imageUrl)) {
    return imageUrl;
  }
  
  const fileName = imageUrl.replace('default/', '');
  return `/trackimage/${fileName}`;
}; 