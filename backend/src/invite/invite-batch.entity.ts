import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Track } from '../track/track.entity';
import { User } from '../users/user.entity';
import { InviteTarget } from './invite-target.entity';

/**
 * InviteBatch 엔티티
 * 
 * 한 번의 초대 요청으로 생성되는 초대 배치를 관리하는 엔티티
 * 여러 명에게 동시에 초대를 보낼 때, 하나의 배치로 묶어서 관리
 * 
 * 주요 기능:
 * - 일괄 초대 관리 (한 번에 여러 명 초대)
 * - 초대 배치별 만료 시간 통합 관리
 * - 초대 진행 상황 추적 (전체 배치 상태)
 * - 초대자 및 트랙 정보 중앙 관리
 * 
 * 비즈니스 로직:
 * - 하나의 배치는 하나의 트랙에 대한 초대만 포함
 * - 모든 초대 대상자는 동일한 만료 시간을 가짐
 * - 배치 상태는 개별 초대 상태를 종합하여 결정
 * 
 * 관계:
 * - Track (N:1): 어떤 트랙에 대한 초대인지
 * - User (N:1): 누가 초대를 보냈는지 (초대자)
 * - InviteTarget (1:N): 이 배치에 포함된 개별 초대들
 */
@Entity('invite_batch')
export class InviteBatch {
  /**
   * 초대 배치의 고유 식별자
   * 
   * UUID 형태로 생성되어 예측 불가능한 ID를 보장
   * 
   * 용도:
   * - 배치별 초대 관리
   * - InviteTarget과의 관계 설정
   * - 초대 이력 추적
   * - API 응답에서 배치 ID 반환
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 초대 대상 트랙
   * 
   * 이 배치의 모든 초대가 대상으로 하는 트랙
   * eager: true로 설정하여 배치 조회 시 트랙 정보도 함께 로드
   * 
   * 용도:
   * - 이메일 템플릿에서 트랙 이름 표시
   * - 초대 수락 시 해당 트랙의 협업자로 등록
   * - 권한 검증 (트랙 소유자/협업자만 초대 가능)
   * - 중복 초대 방지 (같은 트랙에 같은 이메일 중복 불가)
   * 
   * 제약사항:
   * - 하나의 배치는 반드시 하나의 트랙에만 연결
   * - 트랙이 삭제되면 관련 초대 배치도 처리 필요
   */
  @ManyToOne(() => Track, { eager: true })
  @JoinColumn({ name: 'track_id' })
  track: Track;

  /**
   * 초대를 보낸 사용자 (초대자)
   * 
   * 이 배치의 모든 초대를 보낸 사용자
   * eager: true로 설정하여 초대자 정보도 함께 로드
   * 
   * 용도:
   * - 이메일 템플릿에서 초대자 이름 표시
   * - 초대 권한 검증 (트랙 소유자 또는 협업자만 가능)
   * - 초대 이력 및 통계 관리
   * - 알림 및 로그에서 초대자 정보 표시
   * 
   * 비즈니스 규칙:
   * - 트랙 소유자는 항상 초대 가능
   * - 협업자는 트랙 설정에 따라 초대 가능 여부 결정
   * - 초대자 정보는 이메일에 필수로 포함
   */
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'inviter_id' })
  inviter: User;

  /**
   * 초대 배치 만료 시간
   * 
   * 이 배치에 포함된 모든 초대의 공통 만료 시간
   * 기본적으로 생성 시점부터 24시간 후로 설정
   * 
   * 용도:
   * - 보안 강화 (오래된 초대 링크 무효화)
   * - 이메일 템플릿에서 만료 시간 안내
   * - 자동 만료 처리 (배치 작업으로 expired 상태 변경)
   * - 초대 유효성 검증
   * 
   * 만료 후 동작:
   * - 배치 상태가 'expired'로 변경
   * - 포함된 모든 InviteTarget도 만료 처리
   * - 링크 접근 시 "만료된 초대" 메시지 표시
   * 
   * 비즈니스 규칙:
   * - 모든 개별 초대는 배치의 만료 시간을 따름
   * - 만료 시간은 생성 후 변경 불가
   * - 시스템 배치 작업으로 주기적 만료 처리
   */
  @Column({ type: 'timestamp' })
  expires_at: Date;

  /**
   * 초대 배치 상태
   *
   * 배치 전체의 진행 상황을 나타냄냄
   * 개별 초대들의 상태를 종합하여 결정
   * 
   * 상태별 의미:
   * - active: 활성 상태, 초대 진행 중 (기본값)
   * - expired: 만료됨, 시간 초과로 무효화
   * - completed: 완료됨, 모든 초대가 수락/거절됨
   * 
   * 상태 전환 로직:
   * - active → expired: 만료 시간 도달 시
   * - active → completed: 모든 개별 초대가 완료 시
   * - expired/completed는 최종 상태 (변경 불가)
   * 
   * 용도:
   * - 배치 진행 상황 모니터링
   * - 통계 및 리포트 생성
   * - 자동 정리 작업 (완료된 배치 아카이브)
   * - API 응답에서 배치 상태 제공
   */
  @Column({ default: 'active' })
  status: 'active' | 'expired' | 'completed';

  /**
   * 초대 배치 생성 시간
   *
   * 배치가 언제 생성되었는지를 기록
   * TypeORM이 자동으로 현재 시간을 설정
   * 
   * 용도:
   * - 초대 이력 추적 및 분석
   * - 만료 시간 계산 기준점
   * - 통계 데이터 (일별/월별 초대 현황)
   * - 성능 모니터링 (초대 처리 시간)
   * - 디버깅 및 로그 분석
   * 
   * 활용 예시:
   * - "3일 전에 보낸 초대" 같은 상대적 시간 표시
   * - 초대 응답률 분석 (시간대별, 요일별)
   * - 시스템 사용 패턴 분석
   */
  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  /**
   * 이 배치에 포함된 개별 초대 대상들
   * 
   * 하나의 배치는 여러 개의 InviteTarget을 가질 수 있음
   * cascade: true로 설정하여 배치 삭제 시 관련 타겟들도 함께 삭제
   * 
   * 관계 특징:
   * - 1:N 관계 (하나의 배치 : 여러 개의 타겟)
   * - 양방향 관계 (InviteTarget에서도 배치 참조)
   * - 지연 로딩 (필요할 때만 로드)
   * 
   * 용도:
   * - 배치별 초대 대상자 목록 조회
   * - 배치 진행 상황 계산 (완료율, 응답률)
   * - 개별 초대 상태 업데이트
   * - 배치 통계 생성
   * 
   * 비즈니스 로직:
   * - 배치 생성 시 함께 생성됨
   * - 개별 타겟의 상태 변화가 배치 상태에 영향
   * - 모든 타겟이 완료되면 배치도 완료 상태로 변경
   */
  @OneToMany(() => InviteTarget, target => target.invite_batch, { cascade: true })
  targets: InviteTarget[];

  /**
   * 헬퍼 메서드: 만료 여부 체크
   * 
   * 현재 시간과 만료 시간을 비교하여 배치가 만료되었는지 확인
   * 
   * @returns {boolean} 만료되었으면 true, 아니면 false
   * 
   * 사용 예시:
   * - 초대 링크 접근 시 유효성 검증
   * - 배치 상태 업데이트 로직
   * - 자동 만료 처리 배치 작업
   * 
   * 주의사항:
   * - 이 메서드는 단순 계산만 수행 (DB 업데이트 안함)
   * - 실제 상태 변경은 별도 서비스 로직에서 처리
   */
  isExpired(): boolean {
    return new Date() > this.expires_at;
  }

  /**
   * 헬퍼 메서드: 모든 초대가 완료되었는지 체크
   * 
   * 배치에 포함된 모든 InviteTarget이 완료 상태인지 확인
   * 완료 상태는 'accepted' 또는 'declined'를 의미
   * 
   * @returns {boolean} 모든 초대가 완료되었으면 true, 아니면 false
   * 
   * 완료 조건:
   * - 모든 타겟이 'accepted' 또는 'declined' 상태
   * - 'pending' 상태인 타겟이 하나라도 있으면 미완료
   * 
   * 사용 예시:
   * - 배치 상태를 'completed'로 변경할 시점 판단
   * - 초대 완료율 계산
   * - 알림 발송 조건 (모든 초대 완료 시)
   * 
   * 주의사항:
   * - targets 배열이 로드되어 있어야 정확한 결과 반환
   * - 만료된 초대는 완료로 간주하지 않음 (별도 처리 필요)
   */
  isCompleted(): boolean {
    return this.targets.every(target => 
      target.status === 'accepted' || target.status === 'declined'
    );
  }
}
