import { log } from "../utils/Logger.js";

/**
 * Validate that a render() call's data matches the pug contract
 */
export function validateRenderUsage(localsObject: any, contract: any) {
  log("Validating render data against contract...");

  // TODO: compare render locals vs pug expectations
  // and return validation results

  return {
    valid: true,
    errors: []
  };
}
