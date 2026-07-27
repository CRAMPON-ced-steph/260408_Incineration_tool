import { useEffect } from 'react';

// Event name dispatched by handleCalculateAll in Main_FLOW when a node is recalculated.
export const BATCH_CALC_RESULT_EVENT = 'batchCalcNodeResult';

/**
 * Subscribe the open Parameter_Tab to batch-calc updates.
 * When Calc. All recalculates this node, the new result is pushed directly
 * into the component's local calculationResult state without needing a remount.
 *
 * @param {string} nodeId  — the node's unique id
 * @param {Function} setter — the React state setter (e.g. setCalculationResult_SCRUBBER)
 */
const useBatchCalcResult = (nodeId, setter) => {
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.nodeId === nodeId) {
        setter(e.detail.result);
      }
    };
    window.addEventListener(BATCH_CALC_RESULT_EVENT, handler);
    return () => window.removeEventListener(BATCH_CALC_RESULT_EVENT, handler);
  }, [nodeId, setter]);
};

export default useBatchCalcResult;
