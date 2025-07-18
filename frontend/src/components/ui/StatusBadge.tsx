import React from 'react';

type StatusType = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusMap = {
  pending: { color: 'bg-orange-600', label: '대기중', textColor: 'text-white' },
  approved: { color: 'bg-green-600', label: '승인됨', textColor: 'text-white' },
  rejected: { color: 'bg-red-600', label: '거절됨', textColor: 'text-white' },
  in_progress: { color: 'bg-blue-600', label: '진행중', textColor: 'text-white' },
  completed: { color: 'bg-emerald-600', label: '완료됨', textColor: 'text-white' },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const config = statusMap[status] || statusMap.pending;
  
  return (
    <span 
      className={`badge inline-flex items-center rounded px-2 py-1 text-xs font-medium ${config.color} ${config.textColor} ${className}`}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;