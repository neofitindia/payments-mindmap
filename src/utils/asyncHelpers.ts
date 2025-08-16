export interface AsyncOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AsyncOperationOptions {
  errorMessage?: string;
  onSuccess?: () => Promise<void>;
  onError?: (error: string) => void;
}

export const executeAsyncOperation = async <T>(
  operation: () => Promise<{ success: boolean; error?: string } | T>,
  options: AsyncOperationOptions = {}
): Promise<AsyncOperationResult<T>> => {
  try {
    const result = await operation();
    
    // Handle service result format
    if (typeof result === 'object' && result !== null && 'success' in result) {
      const serviceResult = result as { success: boolean; error?: string };
      if (serviceResult.success && options.onSuccess) {
        await options.onSuccess();
      }
      return {
        success: serviceResult.success,
        error: serviceResult.success ? undefined : serviceResult.error
      };
    }
    
    // Handle direct result
    if (options.onSuccess) {
      await options.onSuccess();
    }
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = options.errorMessage || 'Operation failed';
    if (options.onError) {
      options.onError(errorMessage);
    }
    return { success: false, error: errorMessage };
  }
};

export interface StateManager<T> {
  state: T;
  setState: (newState: T | ((prev: T) => T)) => void;
  resetState: () => void;
}

export const createStateManager = <T>(initialState: T): StateManager<T> => {
  let state = initialState;
  const setState = (newState: T | ((prev: T) => T)) => {
    state = typeof newState === 'function' ? (newState as (prev: T) => T)(state) : newState;
  };
  
  return {
    get state() { return state; },
    setState,
    resetState: () => setState(initialState)
  };
};