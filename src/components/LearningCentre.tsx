// Learning Centre — interactive explanations of statistical concepts

import { useState, useMemo } from 'react';
import { SectionHeader, Panel } from '@/components/ui';
import { InteractiveScatter, Histogram } from '@/components/charts';
import { pearsonCorrelation, fmt, mean, sampleSD } from '@/lib/stats';
import { BookOpen, Lightbulb, AlertTriangle, Target, ArrowRight } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  concept: string;
  explanation: string;
  example: string;
  misconception: string;
  challenge: string;
  interactive?: React.ReactNode;
}

const lessons: Lesson[] = [
  {
    id: 'descriptive',
    title: 'Descriptive Statistics',
    concept: 'Mean, median, standard deviation, and quartiles summarize a dataset.',
    explanation: 'Descriptive statistics reduce a collection of numbers to a few interpretable values. The mean is the arithmetic average. The median is the middle value — robust to outliers. Standard deviation measures how spread out the values are around the mean.',
    example: 'For the values [2, 4, 4, 4, 5, 5, 7, 9]: the mean is 5, the median is 4.5, and the standard deviation is about 2.27.',
    misconception: 'A common misconception is that the mean always represents a "typical" observation. In skewed distributions or with outliers, the median is often more representative.',
    challenge: 'Take a dataset of [1, 2, 3, 4, 100]. What is the mean? What is the median? Which better represents the "typical" value?',
  },
  {
    id: 'correlation',
    title: 'Correlation',
    concept: 'Correlation measures how two variables move together — from -1 to +1.',
    explanation: 'The Pearson correlation coefficient (r) measures the strength and direction of a linear relationship between two variables. +1 means perfect positive linear association, -1 means perfect negative, and 0 means no linear relationship. Spearman correlation uses ranks and captures monotonic (not just linear) relationships.',
    example: 'If taller people tend to weigh more, height and weight are positively correlated. But the correlation does not tell us that being tall causes higher weight.',
    misconception: '"Correlation does not imply causation" — the most important rule in statistics. A high correlation can be caused by a third variable (confounder), coincidence, or reverse causation.',
    challenge: 'Drag the highlighted point in the interactive plot below. Move it far from the other points. How does the correlation change? What does this tell you about the sensitivity of r to outliers?',
    interactive: 'CorrelationInteractive',
  },
  {
    id: 'regression',
    title: 'Linear Regression',
    concept: 'Linear regression fits a straight line that best predicts Y from X.',
    explanation: 'Simple linear regression finds the line ŷ = α + βx that minimizes the sum of squared residuals (differences between actual and predicted values). The slope β tells you how much Y changes per unit of X. R² measures the proportion of variance in Y explained by the model.',
    example: 'If regining score on study hours gives slope = 3.2, we estimate that each additional hour of study is associated with 3.2 more points on average.',
    misconception: 'Regression describes association, not causation. The slope tells you how Y changes with X in the observed data — not that changing X will cause Y to change.',
    challenge: 'What happens to the regression line if you add an extreme outlier? Does R² always increase with more variables?',
  },
  {
    id: 'outliers',
    title: 'Outliers and Influential Observations',
    concept: 'A single observation can dramatically change statistical results.',
    explanation: 'An outlier is an observation that is far from the rest of the data. An influential observation is one whose removal would substantially change the analysis result. Not all outliers are influential, and not all influential points look like outliers.',
    example: 'In a dataset of 25 points with a positive trend, one point at (22, 5) can flatten the regression slope or even reverse the correlation direction.',
    misconception: 'Outliers should not be removed just because they are inconvenient. Removal requires a documented reason (measurement error, data entry mistake, etc.).',
    challenge: 'In the Outlier Effect dataset, compute the correlation with and without point P25. How much does it change?',
  },
  {
    id: 'confounding',
    title: 'Confounding',
    concept: 'A confounder is a third variable that creates a spurious association between two others.',
    explanation: 'When two variables are both affected by a third variable, they may appear correlated even though they have no direct relationship. The confounder creates an association that disappears when you control for it.',
    example: 'Ice cream sales and sunburn cases are correlated — both increase in hot weather. Temperature is the confounder. Controlling for temperature, the "relationship" vanishes.',
    misconception: 'Finding that a correlation disappears after controlling for a third variable does not prove the third variable is a confounder — it could be a mediator or a collider.',
    challenge: 'In the "Correlation Without a Simple Explanation" dataset, what happens to the ice cream–sunburn correlation when you examine it within similar temperature ranges?',
  },
  {
    id: 'simpson',
    title: "Simpson's Paradox",
    concept: 'An aggregate trend can reverse when data is split into subgroups.',
    explanation: "Simpson's paradox occurs when a relationship between two variables is positive in the aggregate but negative within every subgroup (or vice versa). This happens when subgroup composition differs — groups with different baselines are combined, distorting the overall pattern.",
    example: 'A treatment may appear to work better overall, but within each severity group, the alternative treatment does better — because the "better" treatment was given to milder cases.',
    misconception: 'The aggregate result is not "wrong" and the subgroup result is not "right" — which one matters depends on what question you are asking and what the grouping variable represents.',
    challenge: 'Use the Hidden Group Effect dataset in the Counterexample Studio. Compute the overall correlation and the within-group correlations. Do the directions reverse?',
  },
  {
    id: 'missing',
    title: 'Missing Data',
    concept: 'How you handle missing values changes your results.',
    explanation: 'Missing data can be MCAR (missing completely at random), MAR (missing at random — depends on observed variables), or MNAR (missing not at random — depends on the missing value itself). Complete-case analysis (dropping rows with missing values) is simple but can introduce bias and reduce sample size.',
    example: 'If high-income individuals are less likely to report income, complete-case analysis will under-represent high earners, biasing income estimates downward.',
    misconception: 'Simply dropping missing values is not always safe. If missingness is related to the variable itself, the remaining data is no longer representative.',
    challenge: 'In the Missing Data Problem dataset, compare the mean income using all valid responses vs. only complete cases. Are they different? Why?',
  },
  {
    id: 'pvalue',
    title: 'p-values and Hypothesis Testing',
    concept: 'A p-value measures evidence against a null hypothesis — not the probability that it is true.',
    explanation: 'The p-value is the probability of observing data as extreme as what you saw, assuming the null hypothesis is true. A small p-value (typically < 0.05) suggests the data is inconsistent with the null hypothesis. It does NOT tell you the probability that the hypothesis is true or false.',
    example: 'A p-value of 0.03 means: if there were truly no effect, you would see a result this extreme about 3% of the time. It does not mean there is a 97% chance the effect is real.',
    misconception: 'A p-value is NOT the probability that the null hypothesis is true. A non-significant result does NOT prove the absence of an effect — it may mean the sample was too small to detect it.',
    challenge: 'If you run 20 independent tests at α=0.05, how many would you expect to be "significant" by chance alone, even if no real effects exist?',
  },
  {
    id: 'ci',
    title: 'Confidence Intervals',
    concept: 'A confidence interval gives a range of plausible values for a parameter.',
    explanation: 'A 95% confidence interval means that if you repeated the experiment many times, 95% of the intervals would contain the true parameter. It does NOT mean there is a 95% probability that the true value is in this specific interval.',
    example: 'A 95% CI for a mean of [42.1, 48.3] means the procedure that generated this interval would capture the true mean 95% of the time.',
    misconception: 'A 95% CI does not mean "95% of the data falls in this range" — that is a different concept (a tolerance interval). Nor does it mean there is a 95% chance the true value is in this particular interval.',
    challenge: 'What happens to the width of a confidence interval as the sample size increases? Why?',
  },
  {
    id: 'significance',
    title: 'Statistical Significance vs Practical Importance',
    concept: 'A result can be statistically significant but practically meaningless.',
    explanation: 'With a large enough sample, even tiny differences become statistically significant. Statistical significance means "detectable above chance" — not "important." Practical importance depends on the context and the magnitude of the effect.',
    example: 'A new drug might lower blood pressure by 0.5 mmHg with p < 0.001 (statistically significant). But a 0.5 mmHg change is clinically negligible — it is not practically important.',
    misconception: 'A small p-value does not mean a large or important effect. Always look at the effect size and confidence interval, not just the p-value.',
    challenge: 'In the Noisy Experiment dataset, is the estimated slope statistically significant? Is the difference from the true slope (2.0) practically important?',
  },
  {
    id: 'causation',
    title: 'Association vs Causation',
    concept: 'Two variables can be associated without one causing the other.',
    explanation: 'Causation requires more than correlation: it requires a mechanism, temporal ordering (cause before effect), and ruling out alternative explanations. Randomized experiments are the gold standard for causal inference; observational data can only suggest associations.',
    example: 'People who carry lighters are more likely to get lung cancer — not because lighters cause cancer, but because lighters correlate with smoking, which does cause cancer.',
    misconception: '"Correlation does not imply causation" does not mean correlation is useless. Correlation is evidence of an association; it just is not sufficient evidence of causation.',
    challenge: 'Name three possible explanations for a correlation between exercise and happiness. Which one is causal?',
  },
  {
    id: 'reproducibility',
    title: 'Reproducibility',
    concept: 'An analysis is reproducible if the same inputs and methods produce the same results.',
    explanation: 'Reproducibility requires recording the dataset, analytical method, parameters, random seeds, and software version. Without these, results cannot be verified or extended. Reproducibility is the foundation of trustworthy research.',
    example: 'A bootstrap analysis with seed=42 and 1000 resamples will produce the identical confidence interval every time it is run.',
    misconception: 'Reproducibility is not the same as replicability. Reproducible means "same data + same code = same result." Replicable means "new data + similar method = similar conclusion."',
    challenge: 'In the Evidence Laboratory, run a bootstrap analysis twice with the same seed. Are the results identical? Now change the seed. What happens?',
  },
  {
    id: 'sensitivity',
    title: 'Sensitivity Analysis',
    concept: 'A conclusion is stronger if it survives reasonable changes to the analysis.',
    explanation: 'Sensitivity analysis tests whether results change when you vary analytical choices: including/excluding observations, using Pearson vs Spearman, different group boundaries, different seeds. If the conclusion is stable, it is more trustworthy.',
    example: 'If a correlation is 0.6 with Pearson and 0.58 with Spearman, and becomes 0.55 after removing outliers, the conclusion of a "moderate positive association" is robust.',
    misconception: 'Sensitivity analysis is not about finding the result you want — it is about honestly reporting how much the result depends on your choices.',
    challenge: 'In the Counterexample Studio, run a sensitivity analysis on any dataset. Does the conclusion change under different analytical choices?',
  },
];

export function LearningCentre({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = lessons.find(l => l.id === selectedId);

  if (selected) {
    return <LessonView lesson={selected} onBack={() => setSelectedId(null)} onNavigate={onNavigate} />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      <SectionHeader number="15" title="Learning Centre" subtitle="Interactive explanations of the statistical concepts used throughout Hypothesis Zero. Each lesson includes an example, a common misconception, and a challenge." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {lessons.map((lesson, i) => (
          <button
            key={lesson.id}
            onClick={() => setSelectedId(lesson.id)}
            className="text-left border-b border-divider py-6 px-4 -mx-4 hover:bg-highlight/5 transition-colors group"
          >
            <div className="flex items-start gap-4">
              <span className="font-mono text-xs text-burgundy uppercase tracking-[0.2em] mt-1">{String(i + 1).padStart(2, '0')}</span>
              <div className="flex-1">
                <h3 className="editorial-title text-lg text-ink group-hover:text-burgundy transition-colors">{lesson.title}</h3>
                <p className="text-sm text-ink-secondary mt-1">{lesson.concept}</p>
                {lesson.interactive && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-research-blue font-mono">
                    <Lightbulb size={12} /> Interactive demo
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function LessonView({ lesson, onBack, onNavigate }: { lesson: Lesson; onBack: () => void; onNavigate?: (page: string) => void }) {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
      <button onClick={onBack} className="btn-ghost mb-6">← All Lessons</button>

      <div className="mb-6">
        <div className="font-mono text-xs text-burgundy uppercase tracking-[0.25em] mb-2">Lesson</div>
        <h1 className="editorial-title text-3xl text-ink">{lesson.title}</h1>
        <p className="text-ink-secondary mt-2 font-serif text-lg">{lesson.concept}</p>
      </div>

      <div className="space-y-6">
        <Panel className="p-6">
          <div className="section-label mb-3">Explanation</div>
          <p className="text-sm text-ink leading-relaxed">{lesson.explanation}</p>
        </Panel>

        <Panel className="p-6">
          <div className="section-label mb-3">Example</div>
          <p className="text-sm text-ink leading-relaxed font-serif">{lesson.example}</p>
        </Panel>

        {lesson.interactive === 'CorrelationInteractive' && <CorrelationInteractive />}

        <Panel className="p-6 border-l-2 border-burgundy">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-burgundy" />
            <div className="section-label text-burgundy">Common Misconception</div>
          </div>
          <p className="text-sm text-ink leading-relaxed">{lesson.misconception}</p>
        </Panel>

        <Panel className="p-6 border-l-2 border-research-blue">
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-research-blue" />
            <div className="section-label text-research-blue">Challenge</div>
          </div>
          <p className="text-sm text-ink leading-relaxed">{lesson.challenge}</p>
        </Panel>

        {onNavigate && (
          <div className="flex items-center justify-center gap-2 text-sm text-ink-secondary">
            <BookOpen size={14} />
            <span>Explore this concept in the</span>
            <button onClick={() => onNavigate('lab')} className="text-burgundy underline hover:text-ink transition-colors">Evidence Laboratory</button>
            <span>or</span>
            <button onClick={() => onNavigate('counterexample')} className="text-burgundy underline hover:text-ink transition-colors">Counterexample Studio</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Interactive: Correlation with draggable point ─────────────────────────
function CorrelationInteractive() {
  const [points, setPoints] = useState<Array<[number, number]>>([
    [1, 2], [2, 3.5], [3, 3], [4, 5], [5, 4.5], [6, 6], [7, 5.5], [8, 7],
  ]);

  const r = useMemo(() => pearsonCorrelation(points.map((p, i) => ({ x: p[0], y: p[1], idx: i })), 'x', 'y'), [points]);
  const rValue = isNaN(r.coefficient) ? '—' : fmt(r.coefficient, 4);

  return (
    <Panel className="p-6">
      <div className="section-label mb-3">Interactive: Drag the Burgundy Point</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <InteractiveScatter
          points={points}
          draggableIndex={7}
          onChange={setPoints}
          xLabel="X"
          yLabel="Y"
        />
        <div>
          <div className="bg-archive border border-divider p-4 mb-3">
            <div className="text-xs font-mono text-ink-secondary uppercase tracking-wider mb-1">Current Pearson r</div>
            <div className="font-mono text-3xl text-burgundy font-semibold">{rValue}</div>
          </div>
          <p className="text-sm text-ink-secondary">
            Drag the highlighted point to different positions. Watch how the correlation coefficient changes.
            Move it far from the cluster — the correlation drops. Move it along the trend line — the correlation increases.
            This demonstrates how sensitive r is to a single influential observation.
          </p>
        </div>
      </div>
    </Panel>
  );
}
