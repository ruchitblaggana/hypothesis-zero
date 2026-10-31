// Seeded PRNG (Mulberry32) for reproducible synthetic datasets
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng: () => number, mu = 0, sigma = 1): number {
  // Box-Muller
  const u1 = Math.max(rng(), 1e-10);
  const u2 = rng();
  return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

type Row = Record<string, string | number | null>;

// ── Dataset 01: Study Patterns ────────────────────────────────────────────
function genStudyPatterns(seed: number): { rows: Row[]; columns: any[] } {
  const rng = mulberry32(seed);
  const rows: Row[] = [];
  const n = 80;
  for (let i = 0; i < n; i++) {
    const studyHours = Math.round(gauss(rng, 3.5, 1.8) * 10) / 10;
    const sleep = Math.round(gauss(rng, 7, 1.2) * 10) / 10;
    const practice = Math.round(gauss(rng, 4, 2));
    const attendance = Math.round(gauss(rng, 85, 12));
    // Score depends on study, practice, attendance, sleep — but not linearly/deterministically
    const base = 35 + studyHours * 3.2 + practice * 2.1 + (attendance - 85) * 0.4 + (7 - Math.abs(sleep - 7)) * 2.5;
    const noise = gauss(rng, 0, 9);
    const score = Math.max(0, Math.min(100, Math.round(base + noise)));
    rows.push({
      student_id: `S${String(i + 1).padStart(3, '0')}`,
      study_hours: Math.max(0, studyHours),
      sleep_hours: Math.max(0, sleep),
      practice_sessions: Math.max(0, practice),
      attendance_pct: Math.max(0, Math.min(100, attendance)),
      assessment_score: score,
    });
  }
  return {
    rows,
    columns: [
      { name: 'student_id', type: 'categorical', description: 'Anonymous student identifier' },
      { name: 'study_hours', type: 'numeric', unit: 'hours/week', description: 'Self-reported weekly study hours' },
      { name: 'sleep_hours', type: 'numeric', unit: 'hours/night', description: 'Average nightly sleep duration' },
      { name: 'practice_sessions', type: 'numeric', unit: 'count/week', description: 'Number of practice sessions per week' },
      { name: 'attendance_pct', type: 'numeric', unit: '%', description: 'Class attendance percentage' },
      { name: 'assessment_score', type: 'numeric', unit: 'points', description: 'Final assessment score (0–100)' },
    ],
  };
}

// ── Dataset 02: Hidden Group Effect (Simpson's Paradox) ───────────────────
function genSimpson(seed: number): { rows: Row[]; columns: any[] } {
  const rng = mulberry32(seed);
  const rows: Row[] = [];
  const groups = ['Group A', 'Group B', 'Group C'];
  // Each group has a NEGATIVE slope within group, but group means increase with x-center
  // Group A: low x-center, high y-center
  // Group B: medium x-center, medium y-center
  // Group C: high x-center, low y-center
  // Within each group: as x increases, y decreases slightly
  const groupParams = [
    { name: 'Group A', xCenter: 2, yCenter: 85, slope: -2.5, n: 25 },
    { name: 'Group B', xCenter: 5, yCenter: 65, slope: -2.5, n: 25 },
    { name: 'Group C', xCenter: 8, yCenter: 45, slope: -2.5, n: 25 },
  ];
  let id = 1;
  for (const g of groupParams) {
    for (let i = 0; i < g.n; i++) {
      const x = g.xCenter + gauss(rng, 0, 1.2);
      const y = g.yCenter + g.slope * (x - g.xCenter) + gauss(rng, 0, 4);
      rows.push({
        observation_id: `O${String(id++).padStart(3, '0')}`,
        treatment_level: x.toFixed(2),
        response_score: Math.round(Math.max(0, Math.min(100, y)) * 100) / 100,
        group: g.name,
      });
    }
  }
  return {
    rows,
    columns: [
      { name: 'observation_id', type: 'categorical', description: 'Observation identifier' },
      { name: 'treatment_level', type: 'numeric', unit: 'level', description: 'Continuous treatment dosage level' },
      { name: 'response_score', type: 'numeric', unit: 'points', description: 'Measured response score' },
      { name: 'group', type: 'categorical', description: 'Experimental group (A, B, or C)' },
    ],
  };
}

// ── Dataset 03: The Outlier Effect ────────────────────────────────────────
function genOutlier(seed: number): { rows: Row[]; columns: any[] } {
  const rng = mulberry32(seed);
  const rows: Row[] = [];
  const n = 24;
  // Moderate positive relationship
  for (let i = 0; i < n; i++) {
    const x = 1 + i * 0.5 + gauss(rng, 0, 0.3);
    const y = 20 + 3.5 * x + gauss(rng, 0, 4);
    rows.push({
      obs_id: `P${String(i + 1).padStart(2, '0')}`,
      variable_x: Math.round(x * 100) / 100,
      variable_y: Math.round(y * 100) / 100,
    });
  }
  // Add one extreme outlier
  rows.push({
    obs_id: 'P25',
    variable_x: 22,
    variable_y: 5,
  });
  return {
    rows,
    columns: [
      { name: 'obs_id', type: 'categorical', description: 'Observation identifier' },
      { name: 'variable_x', type: 'numeric', unit: 'units', description: 'Predictor variable X' },
      { name: 'variable_y', type: 'numeric', unit: 'units', description: 'Response variable Y' },
    ],
  };
}

// ── Dataset 04: Correlation Without Simple Explanation ────────────────────
function genSpurious(seed: number): { rows: Row[]; columns: any[] } {
  const rng = mulberry32(seed);
  const rows: Row[] = [];
  const n = 60;
  // Ice cream sales and sunburn incidents both driven by temperature (confounder)
  for (let i = 0; i < n; i++) {
    const temperature = Math.round(gauss(rng, 25, 8) * 10) / 10;
    const iceCreamSales = Math.round(50 + temperature * 8 + gauss(rng, 0, 15));
    const sunburnCases = Math.round(5 + temperature * 1.2 + gauss(rng, 0, 4));
    const dayNumber = i + 1;
    rows.push({
      day: `Day ${dayNumber}`,
      temperature_c: temperature,
      ice_cream_sales: Math.max(0, iceCreamSales),
      sunburn_cases: Math.max(0, sunburnCases),
    });
  }
  return {
    rows,
    columns: [
      { name: 'day', type: 'categorical', description: 'Day label' },
      { name: 'temperature_c', type: 'numeric', unit: '°C', description: 'Daily average temperature' },
      { name: 'ice_cream_sales', type: 'numeric', unit: 'units', description: 'Daily ice cream sales' },
      { name: 'sunburn_cases', type: 'numeric', unit: 'count', description: 'Reported sunburn cases' },
    ],
  };
}

// ── Dataset 05: Missing Data Problem ──────────────────────────────────────
function genMissing(seed: number): { rows: Row[]; columns: any[] } {
  const rng = mulberry32(seed);
  const rows: Row[] = [];
  const n = 70;
  // Generate full data, then introduce missingness (MAR: higher income → more likely to skip reporting)
  for (let i = 0; i < n; i++) {
    const age = Math.round(gauss(rng, 35, 12));
    const income = Math.round(gauss(rng, 50000, 20000));
    const educationYears = Math.round(gauss(rng, 12, 3));
    const satisfaction = Math.round(gauss(rng, 6, 2));

    let incomeReported: number | null = income;
    // MAR: probability of missing income increases with income
    const missProb = Math.min(0.6, (income - 30000) / 100000);
    if (rng() < missProb) incomeReported = null;

    // MCAR: ~10% missing for satisfaction
    let satisfactionReported: number | null = satisfaction;
    if (rng() < 0.1) satisfactionReported = null;

    rows.push({
      respondent_id: `R${String(i + 1).padStart(3, '0')}`,
      age: Math.max(18, age),
      annual_income: incomeReported,
      education_years: Math.max(0, educationYears),
      satisfaction_score: satisfactionReported !== null ? Math.max(0, Math.min(10, satisfactionReported)) : null,
    });
  }
  return {
    rows,
    columns: [
      { name: 'respondent_id', type: 'categorical', description: 'Respondent identifier' },
      { name: 'age', type: 'numeric', unit: 'years', description: 'Age of respondent' },
      { name: 'annual_income', type: 'numeric', unit: 'currency', description: 'Self-reported annual income (some missing)' },
      { name: 'education_years', type: 'numeric', unit: 'years', description: 'Years of formal education' },
      { name: 'satisfaction_score', type: 'numeric', unit: '0–10', description: 'Life satisfaction score (some missing)' },
    ],
  };
}

// ── Dataset 06: The Noisy Experiment ──────────────────────────────────────
function genNoisy(seed: number): { rows: Row[]; columns: any[] } {
  const rng = mulberry32(seed);
  const rows: Row[] = [];
  const n = 40;
  // True relationship: y = 5 + 2x, with substantial noise
  for (let i = 0; i < n; i++) {
    const x = Math.round((i * 0.5 + gauss(rng, 0, 0.2)) * 100) / 100;
    const y = Math.round((5 + 2 * x + gauss(rng, 0, 8)) * 100) / 100;
    rows.push({
      trial_id: `T${String(i + 1).padStart(3, '0')}`,
      dose: x,
      measured_response: y,
    });
  }
  return {
    rows,
    columns: [
      { name: 'trial_id', type: 'categorical', description: 'Trial identifier' },
      { name: 'dose', type: 'numeric', unit: 'mg', description: 'Administered dose level' },
      { name: 'measured_response', type: 'numeric', unit: 'response units', description: 'Measured biological response (noisy)' },
    ],
  };
}

// ── Export all built-in datasets ──────────────────────────────────────────
import type { DatasetRecord } from './types';

export function buildBuiltinDatasets(): DatasetRecord[] {
  const now = Date.now();
  const datasets: DatasetRecord[] = [
    {
      id: 'builtin-study-patterns',
      name: 'Study Patterns',
      description: 'Synthetic data on study habits and assessment scores for 80 students. Variables include study hours, sleep, practice sessions, attendance, and final scores.',
      source: 'Synthetic — generated with a documented seed',
      ...genStudyPatterns(42),
      dictionary: {
        student_id: 'Anonymous identifier for each student',
        study_hours: 'Self-reported hours spent studying per week',
        sleep_hours: 'Average hours of sleep per night',
        practice_sessions: 'Number of self-directed practice sessions per week',
        attendance_pct: 'Percentage of classes attended',
        assessment_score: 'Final assessment score on a 0–100 scale',
      },
      generationMethod: 'Generated using a seeded PRNG (Mulberry32, seed=42). Scores derived from study hours, practice, attendance, and sleep via a linear model with Gaussian noise (σ=9). No claim of representing real students.',
      limitations: [
        'Synthetic data — does not represent real students',
        'Relationships are artificially constructed',
        'Cross-sectional — no causal claims possible',
        'Self-report variables would be subject to bias in real data',
      ],
      suggestedInvestigations: [
        'Correlation between study hours and assessment score',
        'Does sleep moderate the study–score relationship?',
        'Regression analysis: predicting score from multiple variables',
        'Identify outliers in the study–score relationship',
      ],
      researchQuestion: 'Is there an association between study time and examination performance in this sample?',
      reproducibility: { seed: 42, params: 'n=80, gauss noise σ=9' },
      createdAt: now,
      builtIn: true,
      version: 1,
    },
    {
      id: 'builtin-simpson',
      name: 'The Hidden Group Effect',
      description: 'A dataset constructed so that the overall relationship between treatment level and response is positive, while the relationship within each group is negative — a documented demonstration of Simpson\u2019s paradox.',
      source: 'Synthetic — generated with a documented seed',
      ...genSimpson(7),
      dictionary: {
        observation_id: 'Unique observation identifier',
        treatment_level: 'Continuous treatment dosage level',
        response_score: 'Measured response to treatment',
        group: 'Experimental group assignment (A, B, or C)',
      },
      generationMethod: 'Generated using Mulberry32 (seed=7). Three groups with different (x-center, y-center) pairs: Group A (2, 85), Group B (5, 65), Group C (8, 45). Within each group, the slope is -2.5 (negative). The aggregate slope is positive because groups with higher x-centers have lower y-centers.',
      limitations: [
        'Synthetic data designed specifically to demonstrate the paradox',
        'The reversal is intentional, not discovered',
        'No causal interpretation — group assignment is not randomized',
      ],
      suggestedInvestigations: [
        'Compute the overall correlation between treatment and response',
        'Split by group and compute within-group correlations',
        'Observe that the aggregate direction reverses when disaggregated',
        'Discuss what confounding variable the group represents',
      ],
      researchQuestion: 'Does a higher treatment level correspond to a higher response score?',
      reproducibility: { seed: 7, params: '3 groups × 25 obs, within-group slope = -2.5' },
      createdAt: now,
      builtIn: true,
      version: 1,
    },
    {
      id: 'builtin-outlier',
      name: 'The Outlier Effect',
      description: 'A dataset where 24 observations follow a moderate positive linear pattern, and one extreme observation (P25) dramatically changes the correlation and regression results.',
      source: 'Synthetic — generated with a documented seed',
      ...genOutlier(99),
      dictionary: {
        obs_id: 'Observation identifier (P01–P25)',
        variable_x: 'Predictor variable',
        variable_y: 'Response variable',
      },
      generationMethod: 'Generated using Mulberry32 (seed=99). 24 observations follow y = 20 + 3.5x + noise(σ=4). Observation P25 is an extreme point at (22, 5), designed to be a high-leverage outlier.',
      limitations: [
        'The outlier is deliberately placed',
        'Synthetic — no real-world interpretation',
        'Only one outlier — real datasets may have multiple influential points',
      ],
      suggestedInvestigations: [
        'Compute correlation with and without P25',
        'Run regression with and without P25 — compare slopes',
        'Examine leverage and influence of P25',
        'Discuss whether exclusion is justified',
      ],
      researchQuestion: 'How much can a single observation change a statistical conclusion?',
      reproducibility: { seed: 99, params: 'n=25, outlier at (22, 5)' },
      createdAt: now,
      builtIn: true,
      version: 1,
    },
    {
      id: 'builtin-spurious',
      name: 'Correlation Without a Simple Explanation',
      description: 'Ice cream sales and sunburn cases are strongly correlated, but both are driven by temperature. A classic example of a confounding variable.',
      source: 'Synthetic — generated with a documented seed',
      ...genSpurious(13),
      dictionary: {
        day: 'Day label (Day 1 through Day 60)',
        temperature_c: 'Daily average temperature in Celsius',
        ice_cream_sales: 'Number of ice cream units sold',
        sunburn_cases: 'Number of reported sunburn cases',
      },
      generationMethod: 'Generated using Mulberry32 (seed=13). Temperature ~ N(25, 8). Ice cream sales and sunburn cases are both linear functions of temperature plus independent Gaussian noise. The correlation between sales and sunburn is high, but the relationship is confounded by temperature.',
      limitations: [
        'Synthetic — real-world variables are used as labels but data is simulated',
        'No causal claims: the confounding structure is designed, not discovered',
        'Only one confounder modeled — reality may have more',
      ],
      suggestedInvestigations: [
        'Correlation between ice cream sales and sunburn cases',
        'Correlation between temperature and each variable',
        'Does the sales–sunburn correlation survive controlling for temperature?',
        'Discuss association vs causation',
      ],
      researchQuestion: 'Does a strong correlation between two variables imply that one causes the other?',
      reproducibility: { seed: 13, params: 'n=60, temperature ~ N(25, 8)' },
      createdAt: now,
      builtIn: true,
      version: 1,
    },
    {
      id: 'builtin-missing',
      name: 'The Missing Data Problem',
      description: 'A survey dataset where annual income is missing not at random (higher earners are less likely to report), and satisfaction is missing completely at random. Explore how missing-data handling affects results.',
      source: 'Synthetic — generated with a documented seed',
      ...genMissing(55),
      dictionary: {
        respondent_id: 'Respondent identifier',
        age: 'Age in years',
        annual_income: 'Self-reported annual income (missing for some respondents)',
        education_years: 'Years of formal education',
        satisfaction_score: 'Life satisfaction score 0–10 (missing for some)',
      },
      generationMethod: 'Generated using Mulberry32 (seed=55). Income missingness is MAR (Missing At Random): probability of missing increases with income. Satisfaction missingness is MCAR (10% probability). n=70 respondents.',
      limitations: [
        'The missingness mechanism is documented but artificial',
        'Only simple missing-data strategies (complete-case) are demonstrated',
        'Real missing data mechanisms are often unknown',
      ],
      suggestedInvestigations: [
        'Compare complete-case analysis vs full data (if missingness were absent)',
        'How does sample size change with different missing-data thresholds?',
        'Does the income–satisfaction relationship change with complete-case analysis?',
        'Discuss selection bias from MAR missingness',
      ],
      researchQuestion: 'How do missing observations affect statistical conclusions?',
      reproducibility: { seed: 55, params: 'n=70, income MAR, satisfaction MCAR 10%' },
      createdAt: now,
      builtIn: true,
      version: 1,
    },
    {
      id: 'builtin-noisy',
      name: 'The Noisy Experiment',
      description: 'Data from a controlled simulation where the true relationship is y = 5 + 2x, with substantial noise (σ=8). With only 40 observations, confidence intervals are wide and results may appear misleadingly confident or uncertain.',
      source: 'Synthetic — generated with a documented seed',
      ...genNoisy(2024),
      dictionary: {
        trial_id: 'Trial identifier',
        dose: 'Administered dose in mg',
        measured_response: 'Measured biological response',
      },
      generationMethod: 'Generated using Mulberry32 (seed=2024). True model: y = 5 + 2x. Noise ~ N(0, 8). n=40 trials. The underlying relationship is known, allowing comparison of estimated vs true parameters.',
      limitations: [
        'The true model is known only because the data is synthetic',
        'With real data, the true model is never known',
        'Substantial noise means individual predictions are unreliable',
      ],
      suggestedInvestigations: [
        'Estimate the regression slope and compare to the true value of 2',
        'Examine the confidence interval for the slope — does it contain 2?',
        'Bootstrap the slope to see sampling variability',
        'Discuss statistical significance vs practical importance',
      ],
      researchQuestion: 'Can a noisy dataset produce a misleadingly confident or uncertain conclusion?',
      reproducibility: { seed: 2024, params: 'n=40, true: y=5+2x, noise σ=8' },
      createdAt: now,
      builtIn: true,
      version: 1,
    },
  ];
  return datasets;
}

// ── Guided investigations ─────────────────────────────────────────────────
import type { InvestigationRecord } from './types';

export function buildGuidedInvestigations(): InvestigationRecord[] {
  const now = Date.now();
  const base = {
    hypothesis: {},
    analyses: [],
    notebook: [],
    challengeNotes: '',
    conclusion: {
      evidenceSuggests: '', doesNotEstablish: '', hypothesisSupported: 'notAssessed' as const,
      limitations: [], alternativeExplanations: [], nextSteps: '',
    },
    status: 'draft' as const,
    lastActivity: now,
    createdAt: now,
    updatedAt: now,
  };

  return [
    {
      ...base,
      id: 'guided-study-time',
      number: 1,
      title: 'The Study-Time Assumption',
      researchQuestion: 'Does additional study time always correspond to better performance?',
      background: 'A common assumption is that more study time always leads to higher scores. This investigation tests that assumption using a synthetic dataset of study habits and assessment scores.',
      reason: 'To examine whether the relationship between study time and performance is linear, consistent, or subject to individual variation and outliers.',
      relevantVariables: ['study_hours', 'assessment_score'],
      expectedRelationship: 'Positive — more study hours should correspond to higher scores on average.',
      datasetId: 'builtin-study-patterns',
    },
    {
      ...base,
      id: 'guided-reversal',
      number: 2,
      title: 'The Reversal',
      researchQuestion: 'Why can an overall relationship differ from subgroup relationships?',
      background: 'When data from different groups is combined, the aggregate relationship can reverse compared to within-group patterns. This is known as Simpson\u2019s paradox.',
      reason: 'To understand how aggregation and group composition can produce misleading conclusions.',
      relevantVariables: ['treatment_level', 'response_score', 'group'],
      expectedRelationship: 'The overall correlation appears positive, but within-group correlations are negative.',
      datasetId: 'builtin-simpson',
    },
    {
      ...base,
      id: 'guided-outlier',
      number: 3,
      title: 'One Point Changed Everything',
      researchQuestion: 'How much can a single observation change a statistical conclusion?',
      background: 'In small datasets, a single extreme observation can dramatically alter correlation and regression results. This investigation explores the influence of one outlier.',
      reason: 'To understand leverage, influence, and the responsible treatment of outliers.',
      relevantVariables: ['variable_x', 'variable_y'],
      expectedRelationship: 'Without the outlier, a positive relationship exists. With the outlier, the relationship may weaken or reverse.',
      datasetId: 'builtin-outlier',
    },
    {
      ...base,
      id: 'guided-missing',
      number: 4,
      title: 'The Missing Information',
      researchQuestion: 'What happens when some observations are missing?',
      background: 'Missing data is common in real research. Different approaches to handling it can produce different conclusions.',
      reason: 'To explore how missing-data patterns and handling strategies affect sample size and estimated relationships.',
      relevantVariables: ['annual_income', 'satisfaction_score', 'age'],
      expectedRelationship: 'Complete-case analysis may produce biased estimates when missingness is related to the variable itself.',
      datasetId: 'builtin-missing',
    },
    {
      ...base,
      id: 'guided-false-confidence',
      number: 5,
      title: 'The False Confidence',
      researchQuestion: 'Can a small dataset create a misleadingly confident interpretation?',
      background: 'Small samples produce wide confidence intervals and high variability in estimates. A single sample may suggest a strong effect that does not reflect the underlying process.',
      reason: 'To understand sampling variability, confidence intervals, and the difference between statistical significance and practical importance.',
      relevantVariables: ['dose', 'measured_response'],
      expectedRelationship: 'The estimated slope should be near 2 (the true value), but with substantial uncertainty.',
      datasetId: 'builtin-noisy',
    },
  ];
}
