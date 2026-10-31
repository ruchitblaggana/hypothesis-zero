// Developer / About section — Ruchit Blaggana

import { SectionHeader, Panel } from '@/components/ui';
import { GraduationCap, Cpu, Award, Users, Heart, FileText, Lightbulb } from 'lucide-react';

export function DeveloperSection() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
      <SectionHeader number="G" title="Developer / About" subtitle="The student behind Hypothesis Zero." />

      {/* About */}
      <Panel className="p-8 mb-8">
        <div className="flex items-start gap-6 mb-6">
          <div className="w-16 h-16 bg-burgundy/10 border border-burgundy/30 flex items-center justify-center shrink-0">
            <span className="font-serif text-2xl text-burgundy font-semibold">RB</span>
          </div>
          <div>
            <h2 className="editorial-title text-2xl text-ink">Ruchit Blaggana</h2>
            <p className="text-sm text-ink-secondary mt-1">Computer Science · Delhi Public School, Vasant Kunj, New Delhi</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 archive-divider pt-6">
          <div>
            <div className="section-label mb-2">Academic Level</div>
            <div className="text-sm text-ink">Grade 12, pursuing</div>
          </div>
          <div>
            <div className="section-label mb-2">Intended Major</div>
            <div className="text-sm text-ink">Computer Science</div>
          </div>
          <div>
            <div className="section-label mb-2">Study Destinations</div>
            <div className="text-sm text-ink">USA, Canada, Australia</div>
          </div>
          <div>
            <div className="section-label mb-2">School</div>
            <div className="text-sm text-ink">Delhi Public School, Vasant Kunj</div>
          </div>
        </div>

        <div className="archive-divider pt-6 mt-6">
          <div className="section-label mb-3">Academic Record</div>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-divider/40"><td className="py-2 text-ink-secondary">Grade 9</td><td className="text-right font-mono text-ink">93.2%</td></tr>
              <tr className="border-b border-divider/40"><td className="py-2 text-ink-secondary">Grade 10</td><td className="text-right font-mono text-ink">94.4%</td></tr>
              <tr className="border-b border-divider/40"><td className="py-2 text-ink-secondary">Grade 11</td><td className="text-right font-mono text-ink">80.4%</td></tr>
              <tr><td className="py-2 text-ink-secondary">Grade 12</td><td className="text-right font-mono text-ink-secondary italic">Pursuing</td></tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Engineering & Technical Experience */}
      <SectionBlock icon={<Cpu size={18} />} title="Engineering and Technical Experience">
        <div className="space-y-4">
          <div className="border-l-2 border-research-blue pl-4">
            <div className="font-mono text-xs text-research-blue uppercase tracking-wider mb-1">IIT Delhi · Rancho Labs</div>
            <h4 className="text-sm font-medium text-ink">Summer Program: AI, Machine Learning & Robotics</h4>
            <p className="text-sm text-ink-secondary mt-1">
              Completed a summer program in Artificial Intelligence, Machine Learning, and Robotics at IIT Delhi through Rancho Labs.
            </p>
          </div>
          <div className="border-l-2 border-research-blue pl-4">
            <div className="font-mono text-xs text-research-blue uppercase tracking-wider mb-1">Featured Technical Project</div>
            <h4 className="text-sm font-medium text-ink">Smart Hat for Visually Impaired Individuals</h4>
            <p className="text-sm text-ink-secondary mt-1">
              Designed and developed a smart hat using an Arduino Uno and ultrasonic sensor technology. The device detects overhead obstacles and provides alerts to the wearer.
            </p>
            <p className="text-xs text-ink-secondary mt-2">
              Demonstrates hardware programming, sensor integration, rapid prototyping, and human-centered problem-solving.
            </p>
          </div>
        </div>
      </SectionBlock>

      {/* Research & Innovation */}
      <SectionBlock icon={<Lightbulb size={18} />} title="Research and Innovation">
        <ul className="space-y-3">
          <li className="text-sm text-ink flex gap-2">
            <span className="text-burgundy">—</span>
            <span>Co-development of an innovative instrument for which a <strong>patent application has been filed</strong> and is pending review.</span>
          </li>
          <li className="text-sm text-ink flex gap-2">
            <span className="text-burgundy">—</span>
            <span>Data compilation and research assistance for a <strong>dentistry-related article</strong> under publication.</span>
          </li>
        </ul>
      </SectionBlock>

      {/* Academic Achievements */}
      <SectionBlock icon={<Award size={18} />} title="Academic Achievements">
        <ul className="space-y-2">
          {[
            'Scholar Badge of Excellence — received consistently throughout school',
            'Gold Medal for Academic Excellence in Grade 11',
            'Regional Rank 3 and School Rank 1 in Vigyan Vidyarthi Manthan',
            'Second prize in a national-level photography competition',
            'Certificate of Recognition in a World Environment Day global quiz',
            'Certificate of Distinction in the CMS Environmental Quiz Competition',
            'Contribution to the winning team at the Inter-School Luminaire Competition — Rolling Trophy',
            'Bronze medal in the Inter-School Swimming Competition, 2024',
          ].map((a, i) => (
            <li key={i} className="text-sm text-ink flex gap-3 items-start">
              <Award size={14} className="text-evidence-green mt-0.5 shrink-0" />
              {a}
            </li>
          ))}
        </ul>
      </SectionBlock>

      {/* Leadership & Community Impact */}
      <SectionBlock icon={<Users size={18} />} title="Leadership and Community Impact">
        <div className="space-y-4">
          <div className="border-l-2 border-evidence-green pl-4">
            <div className="font-mono text-xs text-evidence-green uppercase tracking-wider mb-1">Interact Club</div>
            <h4 className="text-sm font-medium text-ink">Secretary</h4>
            <p className="text-sm text-ink-secondary mt-1">
              Leadership in outreach, fundraising, volunteer coordination, and social-impact initiatives.
              Received a Letter of Recommendation from the Interact Club.
            </p>
          </div>
          <div className="border-l-2 border-evidence-green pl-4">
            <h4 className="text-sm font-medium text-ink">Fundraising & Social Welfare</h4>
            <p className="text-sm text-ink-secondary mt-1">
              Fundraising activities supporting orphanages, elderly care, and social welfare organizations.
            </p>
          </div>
          <div className="border-l-2 border-evidence-green pl-4">
            <h4 className="text-sm font-medium text-ink">Financial Literacy Workshop</h4>
            <p className="text-sm text-ink-secondary mt-1">
              Designed and conducted a financial literacy workshop for government-school students.
            </p>
          </div>
          <div className="border-l-2 border-evidence-green pl-4">
            <h4 className="text-sm font-medium text-ink">Sustainability Initiatives</h4>
            <p className="text-sm text-ink-secondary mt-1">
              Paper recycling and textile sustainability initiatives.
            </p>
          </div>
          <div className="border-l-2 border-evidence-green pl-4">
            <h4 className="text-sm font-medium text-ink">Earth Saviours Foundation — Volunteering</h4>
            <p className="text-sm text-ink-secondary mt-1">
              Volunteered supporting homeless and elderly residents through caregiving, reading sessions, medicine distribution, and day-to-day assistance.
            </p>
          </div>
        </div>
      </SectionBlock>

      {/* Why Hypothesis Zero */}
      <SectionBlock icon={<Heart size={18} />} title="Why Hypothesis Zero Was Built">
        <div className="space-y-3">
          <p className="text-sm text-ink leading-relaxed font-serif text-base">
            Hypothesis Zero was built around a simple idea: a convincing explanation is not necessarily a correct explanation.
          </p>
          <p className="text-sm text-ink-secondary leading-relaxed">
            In an age of data-driven claims, it is easy to find a statistic that appears to support any position. What is harder — and more important — is to question assumptions, examine the available evidence, test alternative explanations, and understand where conclusions might fail.
          </p>
          <p className="text-sm text-ink-secondary leading-relaxed">
            This project focuses on questioning assumptions, testing claims, examining data, and understanding the limits of conclusions. Every statistic displayed in Hypothesis Zero comes from a real calculation. No result is hardcoded. No conclusion is presented as certain.
          </p>
          <p className="text-sm text-ink-secondary leading-relaxed">
            The goal is not to teach that statistics are unreliable, but to show that statistical thinking — done carefully — is one of the most powerful tools we have for understanding the world. The key is honesty about what the evidence does and does not tell us.
          </p>
          <div className="bg-highlight/10 border border-highlight/30 p-4 mt-4">
            <p className="font-serif text-lg text-ink text-center">
              Don't trust the answer. Test the evidence.
            </p>
          </div>
        </div>
      </SectionBlock>
    </div>
  );
}

function SectionBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Panel className="p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-burgundy">{icon}</span>
        <h3 className="editorial-title text-lg text-ink">{title}</h3>
      </div>
      {children}
    </Panel>
  );
}
