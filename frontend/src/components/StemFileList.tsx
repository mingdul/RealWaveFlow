import React from 'react';
import { Play } from 'lucide-react';
import { getDisplayFilename } from '../utils/filenameUtils';

// example data
interface StemFile {
    id: string;
    name: string;
    tag: string;
    user: string;
    date: string;
}

// Stem 파일 목록 컴포넌트 - onTrackPlay prop 추가
interface StemFileListProps {
    files: StemFile[];
    onTrackPlay?: (index: number) => void; // 트랙 재생 핸들러 추가
}

// Stem 파일 목록 컴포넌트
const StemFileList: React.FC<StemFileListProps> = ({ files, onTrackPlay }) => {
    return (
        <div className="stem-container">
            <div className="stem-table">
                <div className="table-header">
                    <div className="header-row">
                        <div>Description</div>
                        {/* <div className="col-span-1"></div>
                        <div className="col-span-5">Master</div>
                        <div className="col-span-2">User</div>
                        <div className="col-span-2">Date</div>
                        <div className="col-span-2"></div> */}
                    </div>
                </div>

                <div className="stem-list">
                    {files.map((file, index) => (
                        <div key={file.id} className="stem-row">
                            <div className="stem-index">
                                <span className="text-gray-400 font-medium">{index + 1}</span>
                            </div>

                            <div className="stem-info">
                                <div className="file-name">{(() => {
                                    console.log('[📋 STEMLIST] Processing file.name:', file.name);
                                    const displayName = getDisplayFilename(file.name);
                                    console.log('[📋 STEMLIST] Display name result:', displayName);
                                    return displayName;
                                })()}</div>
                                {file.tag && (
                                    <div className="file-tag">{file.tag}</div>
                                )}
                            </div>

                            <div className="stem-user">
                                <span className="text-gray-300">{file.user}</span>
                            </div>

                            <div className="stem-date">
                                <span className="text-gray-300">{file.date}</span>
                            </div>

                            <div className="stem-actions">
                                <button 
                                    className="play-file-btn"
                                    onClick={() => onTrackPlay?.(index)} // 트랙 재생 핸들러 호출
                                >
                                    <Play size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StemFileList;
