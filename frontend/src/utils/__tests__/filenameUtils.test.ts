import { 
  encodeFilename, 
  decodeFilename, 
  needsEncoding, 
  isEncodedFilename,
  getDisplayFilename,
  createFileWithNames 
} from '../filenameUtils';

describe('filenameUtils', () => {
  describe('needsEncoding', () => {
    test('returns false for ASCII filenames', () => {
      expect(needsEncoding('test.mp3')).toBe(false);
      expect(needsEncoding('MyFile123.wav')).toBe(false);
      expect(needsEncoding('file-name_2023.flac')).toBe(false);
    });

    test('returns true for Korean filenames', () => {
      expect(needsEncoding('한글파일.mp3')).toBe(true);
      expect(needsEncoding('테스트 음성.wav')).toBe(true);
      expect(needsEncoding('음악_한글.flac')).toBe(true);
    });

    test('returns true for special characters', () => {
      expect(needsEncoding('файл.mp3')).toBe(true); // Russian
      expect(needsEncoding('文件.wav')).toBe(true); // Chinese
      expect(needsEncoding('ファイル.flac')).toBe(true); // Japanese
    });
  });

  describe('encodeFilename and decodeFilename', () => {
    test('preserves ASCII filenames unchanged', () => {
      const filename = 'test_file.mp3';
      const encoded = encodeFilename(filename);
      expect(encoded).toBe(filename);
      expect(decodeFilename(encoded)).toBe(filename);
    });

    test('encodes and decodes Korean filenames correctly', () => {
      const filename = '한글파일.mp3';
      const encoded = encodeFilename(filename);
      expect(encoded).toMatch(/^enc_.*\.mp3$/);
      expect(isEncodedFilename(encoded)).toBe(true);
      expect(decodeFilename(encoded)).toBe(filename);
    });

    test('handles filenames with spaces', () => {
      const filename = '한글 파일 이름.wav';
      const encoded = encodeFilename(filename);
      expect(decodeFilename(encoded)).toBe(filename);
    });

    test('preserves file extensions', () => {
      const filename = '테스트.flac';
      const encoded = encodeFilename(filename);
      expect(encoded).toMatch(/\.flac$/);
    });

    test('handles files without extensions', () => {
      const filename = '한글파일';
      const encoded = encodeFilename(filename);
      const decoded = decodeFilename(encoded);
      expect(decoded).toBe(filename);
    });

    test('handles complex Korean filenames', () => {
      const testCases = [
        '음성 녹음 - 2023년 12월.mp3',
        '믹스다운_최종버전(한글).wav',
        '드럼 루프 - 한글.aiff'
      ];

      testCases.forEach(filename => {
        const encoded = encodeFilename(filename);
        const decoded = decodeFilename(encoded);
        expect(decoded).toBe(filename);
      });
    });
  });

  describe('isEncodedFilename', () => {
    test('correctly identifies encoded filenames', () => {
      const encoded = encodeFilename('한글.mp3');
      expect(isEncodedFilename(encoded)).toBe(true);
    });

    test('correctly identifies non-encoded filenames', () => {
      expect(isEncodedFilename('test.mp3')).toBe(false);
      expect(isEncodedFilename('file_name.wav')).toBe(false);
    });
  });

  describe('getDisplayFilename', () => {
    test('returns original filename for non-encoded names', () => {
      const filename = 'test.mp3';
      expect(getDisplayFilename(filename)).toBe(filename);
    });

    test('returns decoded filename for encoded names', () => {
      const original = '한글파일.mp3';
      const encoded = encodeFilename(original);
      expect(getDisplayFilename(encoded)).toBe(original);
    });
  });

  describe('createFileWithNames', () => {
    test('creates correct FileWithNames object for ASCII filename', () => {
      const file = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      const result = createFileWithNames(file);
      
      expect(result.file).toBe(file);
      expect(result.originalName).toBe('test.mp3');
      expect(result.encodedName).toBe('test.mp3');
      expect(result.displayName).toBe('test.mp3');
    });

    test('creates correct FileWithNames object for Korean filename', () => {
      const file = new File(['content'], '한글파일.mp3', { type: 'audio/mp3' });
      const result = createFileWithNames(file);
      
      expect(result.file).toBe(file);
      expect(result.originalName).toBe('한글파일.mp3');
      expect(result.encodedName).toMatch(/^enc_.*\.mp3$/);
      expect(result.displayName).toBe('한글파일.mp3');
    });
  });

  describe('edge cases', () => {
    test('handles empty strings gracefully', () => {
      expect(encodeFilename('')).toBe('');
      expect(decodeFilename('')).toBe('');
    });

    test('handles very long filenames', () => {
      const longName = '매우긴한글파일명'.repeat(10) + '.mp3';
      const encoded = encodeFilename(longName);
      const decoded = decodeFilename(encoded);
      expect(decoded).toBe(longName);
    });

    test('handles special characters and symbols', () => {
      const filename = '한글@#$%^&*()파일.mp3';
      const encoded = encodeFilename(filename);
      const decoded = decodeFilename(encoded);
      expect(decoded).toBe(filename);
    });
  });
}); 