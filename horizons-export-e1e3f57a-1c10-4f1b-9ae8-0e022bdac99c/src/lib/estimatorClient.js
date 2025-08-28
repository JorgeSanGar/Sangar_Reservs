/**
 * @param {import('./types/estimator').EstimatePayload} payload
 * @returns {Promise<import('./types/estimator').EstimateResult>}
 */
export async function estimateDuration(payload) {
  console.log("Estimating duration with payload:", payload);
  // Stub: Simulating an API call
  await new Promise(resolve => setTimeout(resolve, 300));
  
  let minutes = 45; // Base
  if(payload.options.pinchazo) {
      minutes = 30;
  } else {
      minutes += payload.wheels * 5;
      if (payload.options.equilibradoCount) {
          minutes += payload.options.equilibradoCount * 5;
      }
      if (payload.options.alineado) {
          minutes += 20;
      }
  }

  return { minutes: Math.ceil(minutes), notes: [] };
}