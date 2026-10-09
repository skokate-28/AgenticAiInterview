const CONSTANTS = {
  BETA: 0.75,   // Learning rate decay
  GAMMA: 0.5,   // Bounded error sensitivity
  KE: 0.4,      // Extremeness weight
  KC: 0.825,    // Consistency weight
  ETA: 0.25     // Width decay constant
};

/**
 * Calculates the next state of the interview metrics based on the current answer score.
 * strictly follows the provided religious formulas for Cumulative Score (Ct) and Width (Wt).
 * * @param {Object} currentState - The current state (ct, wt, nt, avgScore)
 * @param {number} St - The score of the current answer (s(t))
 */
export const calculateNextState = (currentState, St) => {
  const Ct = Number.isFinite(currentState?.ct) ? currentState.ct : 0.5;
  const Wt = Number.isFinite(currentState?.wt) ? currentState.wt : 1.0;
  const nt = Number.isFinite(currentState?.nt) ? currentState.nt : 0;
  const avgScore = Number.isFinite(currentState?.avgScore) ? currentState.avgScore : 0;
  const { BETA, GAMMA, KE, KC, ETA } = CONSTANTS;
  const score = Math.min(Math.max(St, 0), 1);

  // n(t) = number of questions till now.
  // Increment nt first so the first question is n=1.
  const nextNt = nt + 1;
  const n = nextNt; 
  
  // Update the average score including the current answer
  const nextAvgScore = (avgScore * nt + score) / n;

  // --- CUMULATIVE SCORE (C.S.) CALCULATION ---
  
  // 1. Learning rate: 1 / (1 + β * n)
  const learningRate = 1 / (1 + BETA * n);
  
  // 2. Bounded error term: tanh( γ * ( s(t) - C(t) ) )
  const errorTerm = Math.tanh(GAMMA * (score - Ct));
  
  // 3. Extremeness factor: ( 1 + k_e * |2*s(t) - 1| )
  const extremenessFactor = 1 + KE * Math.abs(2 * score - 1);
  
  // 4. Consistency factor: ( 1 + k_c * ( avg(t) - 0.5 ) * ( n / ( n + 1 ) ) )
  const consistencyFactor = 1 + KC * (nextAvgScore - 0.5) * (n / (n + 1));

  const delta = learningRate * errorTerm * extremenessFactor * consistencyFactor;
  
  // C(t+1) = C(t) + Δ(t)
  const nextCt = Math.min(Math.max(Ct + delta, 0), 1);

  // --- WIDTH (UNCERTAINTY) CALCULATION ---

  // f(n) = ( n / ( n + 1 ) ) ^ 0.7
  const fn = Math.pow(n / (n + 1), 0.7);
  
  // Agreement term: (1 - |s(t) - C(t)|)
  const agreementTerm = 1 - Math.abs(score - nextCt);
  
  // W(t+1) = W(t) * exp( - η * f(n) * agreementTerm )
  const exponent = -ETA * fn * agreementTerm;
  const nextWt = Math.max(Wt * Math.exp(exponent), 0);

  return {
    nextCt,
    nextWt,
    nextNt,
    nextAvgScore
  };
};