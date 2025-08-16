import React from 'react';
import './HamburgerToggle.css';

interface HamburgerToggleProps {
  isExpanded: boolean;
  onClick: () => void;
  title?: string;
  className?: string;
}

const HamburgerToggle: React.FC<HamburgerToggleProps> = ({ 
  isExpanded, 
  onClick, 
  title,
  className = '' 
}) => {
  return (
    <button
      className={`hamburger-toggle ${isExpanded ? 'expanded' : 'collapsed'} ${className}`}
      onClick={onClick}
      title={title}
      aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        <g className="hamburger-lines">
          {/* Top line - rotates to form top of X */}
          <path
            className="line line-top"
            d="M4 6h16"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          
          {/* Middle line - fades out when expanded */}
          <path
            className="line line-middle"
            d="M4 12h16"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          
          {/* Bottom line - rotates to form bottom of X */}
          <path
            className="line line-bottom"
            d="M4 18h16"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      </svg>
    </button>
  );
};

export default HamburgerToggle;