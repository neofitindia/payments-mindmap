import React, { useRef, memo } from 'react';
import { PaymentMindmapData } from '../types';

interface ImportExportSectionProps {
  mindmapData: PaymentMindmapData;
  budgets: Array<{ id: string; name: string; }>;
  activeBudgetId: string | undefined;
  onRestoreData: (data: PaymentMindmapData) => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

const ImportExportSection: React.FC<ImportExportSectionProps> = ({
  mindmapData,
  budgets,
  activeBudgetId,
  onRestoreData,
  onShowNotification
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportData = () => {
    const dataToExport = {
      ...mindmapData,
      exportDate: new Date().toISOString(),
      budgetName: budgets.find(b => b.id === activeBudgetId)?.name || 'Unknown Budget'
    };
    
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `payment-mindmap-${dataToExport.budgetName}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    onShowNotification('Budget data exported successfully', 'success');
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        
        // Validate the imported data structure
        if (!importedData.recipients || !Array.isArray(importedData.recipients)) {
          throw new Error('Invalid data format');
        }
        
        // Clean up the data (remove export metadata)
        const cleanData: PaymentMindmapData = {
          recipients: importedData.recipients,
          totalDistributed: importedData.totalDistributed,
          initialPaymentAmount: importedData.initialPaymentAmount,
          budgetId: importedData.budgetId
        };
        
        onRestoreData(cleanData);
        onShowNotification('Budget data imported successfully', 'success');
      } catch (error) {
        onShowNotification('Failed to import data. Please check the file format.', 'error');
      }
    };
    
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="manage-section">
      <div className="section-header">
        <h3>Import & Export</h3>
      </div>
      <div className="section-content">
        <div className="import-export-section">
          <div className="export-section">
            <p>Export your current budget data as a JSON file</p>
            <button
              onClick={handleExportData}
              className="btn-update-handdrawn"
            >
              Export Budget Data
            </button>
          </div>
          
          <div className="import-section">
            <p>Import budget data from a previously exported JSON file</p>
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-update-handdrawn"
            >
              Import Budget Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ImportExportSection);