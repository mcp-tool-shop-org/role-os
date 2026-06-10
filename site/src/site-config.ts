import type { SiteConfig } from '@mcptoolshop/site-theme';
import pkg from '../../package.json';

const minorVersion = `v${pkg.version.split('.').slice(0, 2).join('.')}`;

export const config: SiteConfig = {
  title: 'Role OS',
  description: 'A repo-native operating layer that routes work through role contracts, structured packets, review, and escalation.',
  logoBadge: 'RO',
  brandName: 'role-os',
  repoUrl: 'https://github.com/mcp-tool-shop-org/role-os',
  npmUrl: 'https://www.npmjs.com/package/role-os',
  footerText: 'MIT Licensed — built by <a href="https://mcp-tool-shop.github.io/" style="color:var(--color-muted);text-decoration:underline">MCP Tool Shop</a>',

  hero: {
    badge: minorVersion,
    headline: 'Role OS',
    headlineAccent: 'contracts over vibes.',
    description: 'A repo-native operating layer that prevents drift, false completion, and contamination through role contracts, structured handoffs, and truthful review.',
    primaryCta: { href: '#usage', label: 'Get started' },
    secondaryCta: { href: 'handbook/', label: 'Read the Handbook' },
    previews: [
      { label: 'Install', code: 'npx role-os init' },
      { label: 'Create', code: 'roleos packet new feature' },
      { label: 'Review', code: 'roleos review packet.md accept' },
    ],
  },

  sections: [
    {
      kind: 'features',
      id: 'features',
      title: 'What it prevents',
      subtitle: 'The specific failures that generic AI workflows produce.',
      features: [
        { title: 'No drift', desc: 'Roles stay in lane. Product does not redesign. Frontend does not redefine scope. Backend does not invent product direction.' },
        { title: 'No false completion', desc: 'The done definition is concrete. Work that hides gaps, skips verification, or solves a different problem gets rejected.' },
        { title: 'No contamination', desc: 'Forked or inherited projects carry identity residue. Role OS detects and rejects cross-project drift in terminology, visuals, and mental models.' },
      ],
    },
    {
      kind: 'code-cards',
      id: 'usage',
      title: 'Quick start',
      cards: [
        { title: 'Bootstrap', code: 'npx role-os init\n\n# Fill context/ files for your project\n# Then create your first packet' },
        { title: 'Feature packet', code: 'roleos packet new feature\nroleos route packets/my-feature.md\n# Work through the chain\nroleos review packets/my-feature.md accept' },
        { title: 'Budget-aware dispatch (opt-in)', code: 'export ROLEOS_BUDGET_CONSULT=1\n# attaches an advisory spend forecast to each dispatch step\n# fail-open, never blocks. Off by default.' },
      ],
    },
  ],
};
