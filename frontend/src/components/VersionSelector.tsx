import React from 'react';

interface VersionSelectorProps {
  selectedVersion: number;
  onVersionSelect: (version: number) => void;
}

const VersionSelector: React.FC<VersionSelectorProps> = ({
  selectedVersion,
  onVersionSelect,
}) => {
  const versions = [1, 2, 3, 4];
  return (
    <div className='version-selector'>
      <h2 className='version-title'>Master History</h2>
      <div className='flex items-center space-x-2'>
        {versions.map((version, index) => (
          <React.Fragment key={version}>
            <button
              onClick={() => onVersionSelect(version)}
              className={`version-btn ${selectedVersion === version ? 'version-btn-active' : 'version-btn-inactive'}`}
            >
              version {version}
            </button>
            {index < versions.length - 1 && (
              <div className='version-divider'></div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default VersionSelector;
