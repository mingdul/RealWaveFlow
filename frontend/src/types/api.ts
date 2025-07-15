// 사용자 관련 타입
export interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
  updated_at: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

// 트랙 관련 타입
export interface Track {
  id: string;
  title: string;
  description?: string;
  genre?: string;
  bpm?: string;
  key_signature?: string;
  image_url?: string;
  created_date: string;
  updated_date: string;
  owner_id: User;
  collaborators?: TrackCollaborator[];
}

export interface CreateTrackDto {
  name: string;
  description?: string;
  genre?: string;
  bpm?: string;
  key_signature?: string;
  image_url?: string;
  owner_id?: string;
}

export interface TrackCollaborator {
  id: string;
  track_id: string;
  user_id: User;
  role: 'owner' | 'collaborator' | 'viewer';
  permissions: string;
  status: string;
}

// 브랜치 관련 타입
export interface Branch {
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

export interface CreateSessionBranchDto {
  trackId: number;
  sessionName: string;
  instruments: string[];
  userId: string;
}

// 버전 관련 타입
export interface Version {
  id: string;
  version_number: string;
  commit_message: string;
  branch_id: string;
  created_by: number;
  created_at: string;
  created_by_user?: User;
  branch?: Branch;
}

// 세션 디렉토리 타입
export interface SessionDirectory {
  id: string;
  branch_id: string;
  instrument_name: string;
  directory_path: string;
  created_at: string;
}

// Pull Request 관련 타입
export interface PullRequest {
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

export interface CreatePullRequestDto {
  sourceBranchId: string;
  targetBranchId: string;
  title: string;
  description?: string;
  userId: string;
}

export interface MergePullRequestDto {
  reviewerId: number;
  versionNumber: string;
  commitMessage: string;
}

// 세션 상태 타입
export interface TrackStatus {
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

// 세션 초기화 타입
export interface InitializeTrackDto {
  trackId: number;
  instruments: string[];
  userId: string;
}

// 브랜치 페이지용 트랙 타입 (UI 전용)
export interface BranchTrack {
  id: string;
  name: string;
  user: string;
  tag: string;
  description: string;
  date: string;
}

// AWS S3 멀티파트 업로드 관련 타입

export interface AddUploadDto {
  projectId: string;
  filename: string;
  contentType: string;
  fileSize: number;
}

export interface UploadResponse {
  uploadId: string;
  key: string;
  chunkSize: number;
  projectId: string;
  projectName?: string;
}

export interface PresignedUrlsDto {
  uploadId: string;
  key: string;
  projectId: string;
  parts: { partNumber: number }[];
}

export interface PresignedUrl {
  partNumber: number;
  url: string;
}

export interface PresignedImageUrl {
  uploadUrl: string;
  key: string;
}

export interface PresignedUrlsResponse {
  urls: PresignedUrl[];
}

export interface UploadedPart {
  partNumber: number;
  eTag: string;
}

export interface CompleteUploadDto {
  uploadId: string;
  key: string;
  projectId: string;
  parts: UploadedPart[];
}

export interface CompleteUploadResponse {
  location: string;
  key: string;
  fileName: string;
  fileSize: number;
}

export interface AbortUploadDto {
  uploadId: string;
  key: string;
  projectId: string;
}

// 업로드 진행 상태 타입
export interface UploadProgress {
  uploadId: string;
  fileName: string;
  totalSize: number;
  uploadedBytes: number;
  progress: number; // 0-100
  chunks: ChunkProgress[];
  status: 'preparing' | 'uploading' | 'completing' | 'completed' | 'error' | 'cancelled';
  error?: string;
  result?: CompleteUploadResponse;
  projectId: string;
  key: string;
  // 확장된 속성들 (업로드 속도 계산용)
  uploadSpeed?: number; // bytes per second
  estimatedTimeRemaining?: number; // seconds
}

export interface ChunkProgress {
  partNumber: number;
  size: number;
  uploadedBytes: number;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  ETag?: string;
} 

// 스템 파일
export interface StemFile{
  id: string;
  file_name: string;
  file_path: string;
  key: string;
  tag: string;
  description: string;
  category: Category;
  session_id: string | null;
  track_id: string;
  uploaded_by: User;
  uploaded_at: string;
}

export interface CreateInitStemFileDto {
  stem_hash: string;
  file_name: string;
  key?: string;
  tag?: string;
  description?: string;
  file_path: string;
  category_id: string;
  session_id: string | null;
  track_id: string;
}


export interface CreateStemFileDto {
  file_name: string;
  key?: string;
  tag?: string;
  description?: string;
  file_path: string;
  category_id: string;
  session_id: string | null;
  track_id: string;
}
export interface UploadStemDto {
  sessionBranchId: string;
  instrumentName: string;
  userId: string;
}


// category 
export interface Category {
  id: string;
  name: string;
  track: Track;
  category_stem_file: StemFile[];
}

export interface CreateCategoryDto {  
  name: string;
  track_id: string;
}



// master take 
export interface MasterTake {
  id: string;
  take: number;
  track: Track;
  request_user: User;
  masterStems: MasterStem[];
  created_date: Date;
}

export interface CreateMasterTakeDto {
  track_id: string;
}

// masterStem
export interface MasterStem {
  id: string;
  file_name: string;
  file_path: string;
  tag?: string;
  key?: string;
  description?: string;
  track_id: string;
  category_id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMasterStemDto {
  file_path: string;
  file_name: string;
  key?: string;
  tag?: string;
  description?: string;
  track_id: string;
  category_id: string;
  masterTake_id: string;
  uploaded_by: string;
  take: number;
}

// session
export interface Session {
  id: string;
  name: string;
  created_date: Date;
  track: Track;
}

export interface CreateSessionDto {
  name: string;
  track_id: string;
}

// sessionBest
export interface SessionBest {
  id: string;
  session: Session;
  category: Category;
  bestStem: StemFile;
}

export interface CreateSessionBestDto {
  session_id: string;
  category_id: string;
  stem_id: string;
}


// invite
export interface InviteLink {
  id: string;
  token: string;
  uses: number;
  track: Track;
}

// drop
export interface Drop {
  id: string;
  status: string;
  description: string;
  user: User;
  track: Track;
  created_at: Date;
}

export interface CreateDropDto {
  description: string;
  trackId: string;
}

// dropComment
export interface DropComment {
  id: string;
  comment: string;
  drop_selection: DropSelection;
  drop: Drop;
  user: User;
  created_at: Date;
}

export interface CreateDropCommentDto {
  drop_id: string;
  user_id: string;
  comment: string;
}

// drop-reviewer
export interface DropReviewer {
  id: string;
  drop: Drop;
  user: User;
  status: string;
}

export interface CreateDropReviewerDto {
  drop_id: string;
  user_id: string;
}

// drop-selection
export interface DropSelection {
  id: string;
  drop: Drop;
  stem_file: StemFile;
}

export interface CreateDropSelectionDto {
  drop_id: string;
  stem_id: string;
}

// 스테이지 관련 타입
export interface Stage {
  id: string;
  title: string;
  description: string;
  version: number;
  status: string;
  guide_path?: string;
  track: Track;
  user: User;
  created_at: Date;
  stage_reviewers?: StageReviewer[];
  version_stems?: VersionStem[];
  upstreams?: Upstream[];
}

export interface CreateStageDto {
  title: string;
  description: string;
  track_id: string;
  user_id: string;
  status: string;
}

export interface CreateStageReviewerDto {
  stage_id: string;
  user_id: string;
}

export interface StageReviewer {
  id: string;
  stage: Stage;
  user: User;
  upstream_reviews?: any[];
}

export interface Upstream {
  id: string;
  title: string;
  description: string;
  status: string;
  guide_path?: string;
  created_at: Date;
  stage: Stage;
  user: User;
  stems?: Stem[];
  upstream_comments?: any[];
  upstream_reviews?: any[];
}

export interface CreateUpstreamDto {
  title: string;
  description?: string;
  stage_id: string;
  user_id: string;
  category_id: string;
}

// version-stem
export interface VersionStem {
  id: string;
  version: number;
  file_name: string;
  stem_hash: string;
  file_path: string;
  key: string;
  bpm: string;
  audio_wave_path: string;
  category: Category;
  stage: Stage;
  user: User;
  track: Track;
  guides: Guide[];
  uploaded_at: string;
}

// guide
export interface Guide {
  id: string;
  mixed_file_path: string;
  waveform_data_path: string;
  created_at: string;
  stage: Stage;
  track: Track;
  stems: Stem[];
  version_stems: VersionStem[];
}


//stem
export interface Stem {
  id: string;
  file_name: string;
  stem_hash: string;
  file_path: string;
  key: string;
  bpm: string;
  audio_wave_path: string;
  category: Category;
  upstream: Upstream;
  user: User;
  guides: Guide[];
  uploaded_at: string;
}

