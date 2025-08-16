import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { PaymentMindmapData } from '../types';
import { formatTransactionAmount } from '../utils/currency';
import './MindmapCanvas.css';

interface MindmapCanvasProps {
  data: PaymentMindmapData;
  recipientPositions: Record<string, { x: number; y: number }>;
  panOffset: { x: number; y: number };
  zoomLevel?: number;
  showZeroBalanceRecipients?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onRecipientMouseDown: (e: React.MouseEvent, recipientId: string) => void;
  onCanvasContextMenu?: (e: React.MouseEvent) => void;
  onRecipientContextMenu?: (e: React.MouseEvent, recipientId: string) => void;
}

const MindmapCanvas: React.FC<MindmapCanvasProps> = React.memo(({
  data,
  recipientPositions,
  panOffset,
  zoomLevel = 1.2,
  showZeroBalanceRecipients = true,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onRecipientMouseDown,
  onCanvasContextMenu,
  onRecipientContextMenu
}) => {
  // Track viewport dimensions for infinite canvas
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  useEffect(() => {
    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  // Use dynamic center based on SVG viewbox dimensions
  const centerX = 400; // Half of 800px SVG width
  const centerY = 300; // Half of 600px SVG height

  const calculateCentralBoxDimensions = useCallback(() => {
    const amountText = formatTransactionAmount(data.totalDistributed);
    const minWidth = 120;
    const minHeight = 60;
    const maxWidth = 200;
    
    const textWidth = amountText.length * 12 + 40;
    const dynamicWidth = Math.max(minWidth, Math.min(maxWidth, textWidth));
    const dynamicHeight = minHeight;
    
    return { width: dynamicWidth, height: dynamicHeight };
  }, [data.totalDistributed]);

  const generateRoughRect = (x: number, y: number, width: number, height: number, rounded: boolean = false) => {
    const roughness = 2;
    const cornerRadius = rounded ? 12 : 0;
    
    if (!rounded) {
      const x1 = x + (Math.random() - 0.5) * roughness;
      const y1 = y + (Math.random() - 0.5) * roughness;
      const x2 = x + width + (Math.random() - 0.5) * roughness;
      const y2 = y + (Math.random() - 0.5) * roughness;
      const x3 = x + width + (Math.random() - 0.5) * roughness;
      const y3 = y + height + (Math.random() - 0.5) * roughness;
      const x4 = x + (Math.random() - 0.5) * roughness;
      const y4 = y + height + (Math.random() - 0.5) * roughness;
      
      return `M ${x1},${y1} L ${x2},${y2} L ${x3},${y3} L ${x4},${y4} Z`;
    }
    
    // Rounded corners with slight roughness
    const x1 = x + cornerRadius + (Math.random() - 0.5) * roughness;
    const y1 = y + (Math.random() - 0.5) * roughness;
    const x2 = x + width - cornerRadius + (Math.random() - 0.5) * roughness;
    const y2 = y + (Math.random() - 0.5) * roughness;
    const x3 = x + width + (Math.random() - 0.5) * roughness;
    const y3 = y + cornerRadius + (Math.random() - 0.5) * roughness;
    const x4 = x + width + (Math.random() - 0.5) * roughness;
    const y4 = y + height - cornerRadius + (Math.random() - 0.5) * roughness;
    const x5 = x + width - cornerRadius + (Math.random() - 0.5) * roughness;
    const y5 = y + height + (Math.random() - 0.5) * roughness;
    const x6 = x + cornerRadius + (Math.random() - 0.5) * roughness;
    const y6 = y + height + (Math.random() - 0.5) * roughness;
    const x7 = x + (Math.random() - 0.5) * roughness;
    const y7 = y + height - cornerRadius + (Math.random() - 0.5) * roughness;
    const x8 = x + (Math.random() - 0.5) * roughness;
    const y8 = y + cornerRadius + (Math.random() - 0.5) * roughness;
    
    return `M ${x1},${y1} L ${x2},${y2} Q ${x + width},${y} ${x3},${y3} L ${x4},${y4} Q ${x + width},${y + height} ${x5},${y5} L ${x6},${y6} Q ${x},${y + height} ${x7},${y7} L ${x8},${y8} Q ${x},${y} ${x1},${y1} Z`;
  };

  // Dynamic box sizing - calculates recipient box dimensions based on content
  // Boxes automatically resize when transactions are added/removed or text changes
  const calculateBoxDimensions = useCallback((recipient: { name: string; transactions: Array<{ amount: number; description: string; id: string }> }) => {
    const minWidth = 140;
    const minHeight = 60;
    const maxWidth = 320;
    const padding = 24;
    
    // Calculate name width (bold font, 16px - Architects Daughter)
    const nameWidth = recipient.name.length * 9.5 + 16; // Wider character estimate for bold handwritten text
    
    // Calculate transaction text widths (regular font, 11px) 
    let maxTransactionWidth = 0;
    recipient.transactions.forEach((tx) => {
      const amountText = formatTransactionAmount(tx.amount);
      const descText = tx.description;
      // Amount is wider (bold), description is regular, plus separator " - "
      const txWidth = (amountText.length * 7) + (descText.length * 6.5) + 20; // Account for spacing and separator
      maxTransactionWidth = Math.max(maxTransactionWidth, txWidth);
    });
    
    // Take the widest text element
    const contentWidth = Math.max(nameWidth, maxTransactionWidth);
    const dynamicWidth = Math.max(minWidth, Math.min(maxWidth, contentWidth + padding));
    
    // Calculate height based on content
    const titleHeight = 24; // Name text height
    const transactionHeight = recipient.transactions.length * 18; // Each transaction line with spacing
    const verticalPadding = 28; // Top and bottom padding
    const dynamicHeight = Math.max(minHeight, titleHeight + transactionHeight + verticalPadding);

    return { width: dynamicWidth, height: dynamicHeight };
  }, []);

  const calculateAutoPosition = useCallback((recipient: { name: string; transactions: Array<{ amount: number; description: string; id: string }> }, index: number, totalRecipients: number, boxDimensions: { width: number; height: number }, centerX: number, centerY: number, svgWidth: number, svgHeight: number) => {
    const angle = (index * 2 * Math.PI) / totalRecipients;
    const maxBoxDimension = Math.max(boxDimensions.width, boxDimensions.height);
    const centralBoxDimensions = calculateCentralBoxDimensions();
    const centralBoxMaxDimension = Math.max(centralBoxDimensions.width, centralBoxDimensions.height);
    
    // Dynamic radius calculation based on content
    const transactionCount = recipient.transactions.length;
    const contentComplexity = Math.max(1, transactionCount / 3);
    const boxSizeMultiplier = maxBoxDimension / 160; // Base box width is 160
    
    const baseRadius = 180;
    const contentSpacing = 40 * contentComplexity; // More space for complex recipients
    const boxClearance = maxBoxDimension * 0.6; // Ensure boxes don't overlap
    const centralClearance = (centralBoxMaxDimension / 2) + 80; // Distance from central box
    const labelClearance = 30; // Space for connector labels
    
    const minRadius = Math.max(
      baseRadius,
      centralClearance + boxClearance + labelClearance,
      200 * boxSizeMultiplier
    );
    
    let radius = minRadius + contentSpacing + (totalRecipients > 6 ? 20 : 0);

    let recipientX = centerX + Math.cos(angle) * radius;
    let recipientY = centerY + Math.sin(angle) * radius;

    const halfWidth = boxDimensions.width / 2;
    const halfHeight = boxDimensions.height / 2;
    const margin = 20;

    if (recipientX - halfWidth < margin) {
      recipientX = margin + halfWidth;
    } else if (recipientX + halfWidth > svgWidth - margin) {
      recipientX = svgWidth - margin - halfWidth;
    }

    if (recipientY - halfHeight < margin) {
      recipientY = margin + halfHeight;
    } else if (recipientY + halfHeight > svgHeight - margin) {
      recipientY = svgHeight - margin - halfHeight;
    }

    return {
      x: recipientX,
      y: recipientY,
      width: boxDimensions.width,
      height: boxDimensions.height,
      angle: 0
    };
  }, [calculateCentralBoxDimensions]);

  const calculateRecipientPositions = useCallback((recipients: Array<{ id: string; name: string; transactions: Array<{ amount: number; description: string; id: string }> }>) => {
    // Use dynamic viewport-based dimensions for infinite canvas
    const svgWidth = viewport.width;
    const svgHeight = viewport.height;

    return recipients.map((recipient, index) => {
      const boxDimensions = calculateBoxDimensions(recipient);

      const position = recipientPositions[recipient.id];
      if (position) {
        return {
          x: position.x,
          y: position.y,
          width: boxDimensions.width,
          height: boxDimensions.height,
          angle: 0
        };
      }

      return calculateAutoPosition(recipient, index, recipients.length, boxDimensions, centerX, centerY, svgWidth, svgHeight);
    });
  }, [recipientPositions, centerX, centerY, calculateAutoPosition, calculateBoxDimensions, viewport]);

  const calculateBorderPoint = (centerX: number, centerY: number, targetX: number, targetY: number, width: number, height: number) => {
    const dx = targetX - centerX;
    const dy = targetY - centerY;

    const halfWidth = width / 2;
    const halfHeight = height / 2;

    if (Math.abs(dx / halfWidth) > Math.abs(dy / halfHeight)) {
      const x = centerX + (dx > 0 ? halfWidth : -halfWidth);
      const y = centerY + (dy / dx) * (dx > 0 ? halfWidth : -halfWidth);
      return { x, y };
    } else {
      const x = centerX + (dx / dy) * (dy > 0 ? halfHeight : -halfHeight);
      const y = centerY + (dy > 0 ? halfHeight : -halfHeight);
      return { x, y };
    }
  };

  const generateStablePath = (x1: number, y1: number, x2: number, y2: number, recipientId: string) => {
    const seed = recipientId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pseudoRandom = (seed * 9301 + 49297) % 233280;
    const normalizedRandom = pseudoRandom / 233280;
    
    const roughness = 3;
    const offsetX = (normalizedRandom - 0.5) * roughness;
    const offsetY = (normalizedRandom - 0.5) * roughness;
    
    return `M ${x1 + offsetX},${y1 + offsetY} L ${x2 - offsetX},${y2 - offsetY}`;
  };

  // Filter recipients based on zero balance toggle
  const filteredRecipients = useMemo(() => 
    showZeroBalanceRecipients 
      ? data.recipients 
      : data.recipients.filter(recipient => recipient.totalAmount !== 0),
    [data.recipients, showZeroBalanceRecipients]
  );

  const positions = useMemo(() => 
    calculateRecipientPositions(filteredRecipients), 
    [filteredRecipients, calculateRecipientPositions]
  );

  // Use the callback directly instead of memo
  const centralBoxDimensions = calculateCentralBoxDimensions();
  const centralBoxWidth = centralBoxDimensions.width;
  const centralBoxHeight = centralBoxDimensions.height;

  return (
    <svg
      className="mindmap-canvas"
      width="100%"
      height="100%"
      viewBox={`${-panOffset.x - viewport.width * 0.1} ${-panOffset.y - viewport.height * 0.1} ${viewport.width / zoomLevel} ${viewport.height / zoomLevel}`}
      preserveAspectRatio="none"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onContextMenu={onCanvasContextMenu}
    >
      <defs>
        <pattern id="roughGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="white" />
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" strokeWidth="0.5" />
        </pattern>
        <pattern id="infiniteGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="#fafafa" />
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" strokeWidth="0.5" />
        </pattern>
      </defs>
      {/* Infinite background grid that extends beyond viewport */}
      <rect 
        x={-panOffset.x - viewport.width * 0.2} 
        y={-panOffset.y - viewport.height * 0.2} 
        width={viewport.width / zoomLevel * 1.4} 
        height={viewport.height / zoomLevel * 1.4} 
        fill="url(#infiniteGrid)" 
      />

      <g transform={`translate(${panOffset.x}, ${panOffset.y})`}>
        <path
          d={generateRoughRect(centerX - centralBoxWidth / 2, centerY - centralBoxHeight / 2, centralBoxWidth, centralBoxHeight)}
          fill="#fff3e0"
          stroke="#000000"
          strokeWidth="2"
          className="rough-element"
        />

        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="20"
          fontFamily="var(--font-ui)"
          fill="#000"
          fontWeight="bold"
          className="rough-text"
        >
          {formatTransactionAmount(data.totalDistributed)}
        </text>

        {filteredRecipients.map((recipient, index) => {
          const position = positions[index];
          if (!position) return null;
          
          const recipientX = position.x;
          const recipientY = position.y;
          const boxWidth = position.width;
          const boxHeight = position.height;

          const centralBorder = calculateBorderPoint(centerX, centerY, recipientX, recipientY, centralBoxWidth, centralBoxHeight);
          const recipientBorder = calculateBorderPoint(recipientX, recipientY, centerX, centerY, boxWidth, boxHeight);

          return (
            <g key={recipient.id}>
              <path
                d={generateStablePath(centralBorder.x, centralBorder.y, recipientBorder.x, recipientBorder.y, recipient.id)}
                stroke="#000000"
                strokeWidth="2"
                fill="none"
                className="rough-line"
              />

              <text
                x={(centralBorder.x + recipientBorder.x) / 2}
                y={(centralBorder.y + recipientBorder.y) / 2 - 8}
                textAnchor="middle"
                fontSize="14"
                fontFamily="var(--font-ui)"
                fill="#2e7d32"
                fontWeight="bold"
                className="amount-label"
              >
                {formatTransactionAmount(recipient.totalAmount)}
              </text>

              <g
                onMouseDown={(e) => onRecipientMouseDown(e, recipient.id)}
                onContextMenu={(e) => onRecipientContextMenu?.(e, recipient.id)}
                style={{ cursor: 'grab' }}
                transform={`translate(${recipientX}, ${recipientY})`}
              >
                <path
                  d={generateRoughRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, true)}
                  fill="#e8f5e8"
                  stroke="#000000"
                  strokeWidth="2"
                  className="rough-element recipient-box"
                />

                <text
                  x="0"
                  y={-(boxHeight / 2) + 20}
                  textAnchor="middle"
                  fontSize="16"
                  fill="#000"
                  fontWeight="bold"
                  className="recipient-name-text"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {recipient.name}
                </text>

                {recipient.transactions.map((transaction, txIndex: number) => (
                  <text
                    key={transaction.id}
                    x={-(boxWidth / 2) + 15}
                    y={-(boxHeight / 2) + 45 + (txIndex * 16)}
                    textAnchor="start"
                    fontSize="12"
                    fontFamily="var(--font-ui)"
                    fill={transaction.amount < 0 ? "#d32f2f" : "#333"}
                    className="rough-text transaction-text"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {formatTransactionAmount(transaction.amount)} - {transaction.description}
                  </text>
                ))}
              </g>
            </g>
          );
        })}
      </g>
    </svg>
  );
});

export default MindmapCanvas;