import React from 'react';
import { Budget } from '../types';
import './BudgetSelector.css';

interface BudgetSelectorProps {
  budgets: Budget[];
  activeBudget: Budget | null;
  onBudgetChange: (budgetId: string) => void;
  onCreateBudget: () => void;
}

const BudgetSelector: React.FC<BudgetSelectorProps> = React.memo(({
  budgets,
  activeBudget,
  onBudgetChange,
  onCreateBudget
}) => {
  return (
    <div className="budget-selector-container">
      <div className="budget-selector-wrapper">
        <select
          value={activeBudget?.id || ''}
          onChange={(e) => onBudgetChange(e.target.value)}
          className="budget-selector"
        >
          {budgets.map(budget => (
            <option key={budget.id} value={budget.id}>
              {budget.name}
            </option>
          ))}
        </select>
        
        <button
          onClick={onCreateBudget}
          className="create-budget-btn"
          title="Create new budget"
        >
          +
        </button>
      </div>
    </div>
  );
});

export default BudgetSelector;