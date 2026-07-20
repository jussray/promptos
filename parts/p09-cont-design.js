(function(){
  if (typeof PROMPTS === 'undefined' || !Array.isArray(PROMPTS)) return;
  var existing = new Set(PROMPTS.map(function(p){ return p.id; }));
  var additions = [
    {
      id: 84,
      emoji: '🖼️',
      title: 'Frame Inventory & Export Prep',
      sub: 'Audit all frames before dev handoff',
      cat: 'design',
      platforms: ['figma'],
      card_accent: 'var(--accent-blue)',
      notes: 'Run once per sprint before handing off to dev. Surfaces missing states, unnamed layers, and exportable assets that still lack export settings.',
      versions: {
        figma: `<role>
Design-to-dev handoff engineer auditing a Figma file before export.
</role>

<connector>Requires the Figma connector active in this Claude conversation.</connector>

<objective>
Inventory all frames in [FILE/PAGE URL] and flag anything that will cause friction in the developer handoff.
</objective>

<instructions>
1. List every frame on the page with its name and approximate purpose.
2. Flag frames with unnamed or numbered layers that a dev would have to reverse-engineer.
3. Flag interactive components missing at least one state beyond the default (no hover, no disabled).
4. Identify exportable assets (icons, illustrations) that have no export setting yet.
5. Give a prioritized fix list — what must be clean before handoff vs nice-to-have.
</instructions>

<output_format>
Frame inventory | Unnamed layer flags | Missing state flags | Export gaps | Priority fix list
</output_format>`
      }
    },
    {
      id: 85,
      emoji: '🌈',
      title: 'Token Migration Planner',
      sub: 'Legacy hex values → design token variables',
      cat: 'design',
      platforms: ['figma'],
      card_accent: 'var(--accent-blue)',
      notes: 'For any file that predates a design token system. Identifies every hardcoded color or text style that should be a variable, and gives a migration order that minimizes breakage.',
      versions: {
        figma: `<role>
Design systems engineer migrating a Figma file from hardcoded styles to a token-based system.
</role>

<connector>Requires the Figma connector active in this Claude conversation.</connector>

<objective>
Plan the migration of [FILE/PAGE URL] from raw hex/px values to design token variables.
</objective>

<instructions>
1. Pull all unique fill and text style values used in the file.
2. Map each to an existing or proposed token name (e.g., #4f98a3 → color/primary).
3. Flag values with no obvious token match — these need a new token decision before migration.
4. Propose a migration order: shared base tokens first, then semantic tokens, then component-specific.
5. Estimate how many instances of each value need updating so effort is scoped accurately.
</instructions>

<output_format>
Value-to-token mapping table | No-match flags needing token decisions | Migration order | Instance count per value
</output_format>`
      }
    },
    {
      id: 86,
      emoji: '📣',
      title: 'Canva Brand Launch Kit',
      sub: 'Full drop kit: posts + story + email header',
      cat: 'design',
      platforms: ['canva'],
      card_accent: 'var(--accent-purple)',
      notes: 'For a product drop, restock, or campaign launch. Generates a full coordinated kit in one pass — feed/story/email — instead of three separate requests with inconsistent styling.',
      versions: {
        canva: `<role>
Brand launch designer building a full coordinated drop kit.
</role>

<connector>Requires the Canva connector active in this Claude conversation.</connector>

<objective>
Create a full launch kit for [CAMPAIGN / PRODUCT DROP] targeting [AUDIENCE], using your connected brand kit.
</objective>

<context>
Launch message: [ONE SENTENCE — what you're announcing]
Key visual: [DESCRIBE the hero image, product, or vibe]
CTA: [WHAT YOU WANT THE VIEWER TO DO]
</context>

<instructions>
1. Confirm brand kit before starting.
2. Generate:
   a. 3 feed post designs (square, varied layouts)
   b. 2 story designs (vertical, bold CTAs)
   c. 1 email header banner
3. Keep the visual language consistent across all 6 assets.
4. Describe each asset before I open Canva so I can redirect before a bad design is finished.
</instructions>

<output_format>
Brand kit confirmation | Asset list with descriptions | Links
</output_format>`
      }
    },
    {
      id: 87,
      emoji: '✏️',
      title: 'Copy-to-Design Briefer',
      sub: 'Write the copy first, then spec the layout',
      cat: 'design',
      platforms: ['canva', 'figma'],
      card_accent: 'var(--accent-purple)',
      notes: 'Prevents designing around placeholder copy that never gets swapped. Forces the real words first, then specs the layout from them.',
      versions: {
        canva: `<role>
Copy-first design briefer. Layout follows words — not the other way around.
</role>

<connector>Requires the Canva connector active in this Claude conversation.</connector>

<objective>
Write the final copy for [ASSET TYPE — post / landing section / email] about [TOPIC], then spec the layout from it.
</objective>

<context>
Audience: [WHO]
Tone: [BRAND VOICE NOTES]
Action: [WHAT THE READER SHOULD DO]
</context>

<instructions>
1. Write the headline, body copy, and CTA first. Show me the words before touching any layout.
2. Once copy is approved, translate it into a layout spec: hierarchy, emphasis, approximate line count per section.
3. Then generate the Canva asset using that spec and the connected brand kit.
</instructions>

<output_format>
Final copy draft | Layout spec | Generated asset link
</output_format>`,
        figma: `<role>
Copy-first product writer feeding a Figma frame.
</role>

<connector>Requires the Figma connector active in this Claude conversation.</connector>

<objective>
Write real copy for [FRAME URL / SCREEN NAME] before the frame is finalised.
</objective>

<instructions>
1. Get the current frame via the connector so I can see what placeholder text exists.
2. Write real headline, body, and CTA copy in the voice of [BRAND].
3. Flag any label or body text in the frame that is too long for its container at current font size.
4. Return the copy in a paste-ready table mapped to layer names.
</instructions>

<output_format>
Layer name | Current placeholder | Real copy | Length flag
</output_format>`
      }
    }
  ];
  additions.forEach(function(p){ if (!existing.has(p.id)) PROMPTS.push(p); });
})();
