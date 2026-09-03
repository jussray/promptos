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

  function sharedVariables(extra){
    return `<variables>
BRAND = [project canon | none]
AUDIENCE = [kids | teens | parents | general consumers | premium consumers | B2B | founders | investors | custom]
PLATFORM = [Instagram | Facebook | LinkedIn | Pinterest | YouTube | TikTok | X | website | email | print | custom]
ASPECT_RATIO = [1:1 | 4:5 | 9:16 | 16:9 | 3:2 | 2:3 | custom]
MOOD = [premium | editorial | playful | calm | bold | luxurious | technical | warm | minimal | cinematic | custom]
STYLE = [minimal | editorial | studio | lifestyle | cinematic | geometric | organic | 3D | photoreal | illustrative | custom]
PALETTE = [project palette | 2-3 specified colors | derive from mood]
REFERENCE_MODE = [none | style reference | content reference | character reference | product reference | edit supplied image]
OUTPUT_USE = [concept | social-ready | presentation-ready | web-ready | print-prep concept | handoff for final typesetting]
${extra || ''}
</variables>`;
  }

  function buildVersions(spec){
    var core = `${sharedVariables(spec.variables)}

<brief>
${spec.brief}
</brief>

<design_system>
- Start with one dominant idea and one primary focal point.
- Use a deliberate hierarchy: ${spec.hierarchy}.
- Keep the palette disciplined at 2-3 colors unless project canon requires otherwise.
- Preserve generous negative space and safe margins for crop/UI overlays.
- Use typography by style category, not by pretending an image model can guarantee an exact commercial font.
- Never invent claims, metrics, product features, prices, dates, or extra visible copy.
${spec.rules}
</design_system>

<quality_gate>
${spec.quality}
If exact long-form typography, editable vectors, production logo files, or dense factual layout is required, create the visual concept/background and reserve clean zones for deterministic typesetting instead of pretending the image model can guarantee it.
</quality_gate>`;

    return {
      'chatgpt-image': `${core}

<provider_optimization>
Create the final visual now. Treat all supplied/reference images as identity constraints. Render only the requested short visible text and keep spelling exact; do not add filler copy. For edits, preserve the original subject, proportions, product geometry, and unaffected regions unless the brief explicitly changes them. Prefer a clean composition with reserved text areas over decorative clutter.
</provider_optimization>`,
      midjourney: `${spec.subject}. ${spec.visual}. ${spec.composition}. ${spec.copy ? 'Visible text, kept short and in double quotation marks: ' + spec.copy + '. ' : ''}Palette: [PALETTE]. Mood: [MOOD]. Style: [STYLE]. Clean premium hierarchy, generous negative space, no invented copy, no unnecessary decorative elements. ${spec.mjRule || ''} --ar [ASPECT_RATIO] [OPTIONAL_MJ_PARAMETERS]`,
      leonardo: `POSITIVE PROMPT: ${spec.subject}. ${spec.visual}. ${spec.composition}. ${spec.copy ? 'Visible text: ' + spec.copy + '. ' : ''}Palette [PALETTE], mood [MOOD], style [STYLE], controlled hierarchy, realistic material/light where relevant, clean negative space. ${spec.leoRule || ''}\n\nNEGATIVE CONSTRAINTS: clutter, unreadable or invented text, duplicate focal points, distorted geometry, floating objects, accidental logos, random watermarks, oversaturation, excessive glow, irrelevant props. Use image/reference guidance when [REFERENCE_MODE] is not none.`,
      ideogram: `${spec.copy ? 'EXACT VISIBLE TEXT: ' + spec.copy + '. ' : ''}Typography direction: strong display hierarchy with clean supporting sans-serif styling; keep text short, legible, and correctly ordered. ${spec.subject}. ${spec.visual}. ${spec.composition}. Palette [PALETTE], mood [MOOD], style [STYLE]. No invented copy, no extra labels, no clutter. Prioritize text placement and hierarchy before decorative detail.`,
      flux: `Create ${spec.subject.toLowerCase()}. ${spec.visual}. ${spec.composition}. Palette [PALETTE], mood [MOOD], style [STYLE]. ${spec.copy ? 'Include only this requested short copy if the interface/model supports reliable text: ' + spec.copy + '; otherwise reserve a clean typesetting zone and do not invent substitute words. ' : ''}Emphasize spatial clarity, material realism where appropriate, disciplined lighting, one focal point, safe margins, and purposeful negative space. Avoid clutter, duplicate subjects, distorted geometry, random symbols, watermarks, and oversaturated grading.`
    };
  }

  var creativeSpecs = [
    {
      id:300, emoji:'📱', title:'Social Media Graphic Director', sub:'Thumb-stopping social visual with platform-aware hierarchy',
      brief:'Design a social media graphic for [TOPIC/OFFER]. Headline: [HEADLINE, max 6 words]. Supporting copy: [OPTIONAL SHORT LINE]. CTA: [CTA]. Optimize composition for [PLATFORM] and [ASPECT_RATIO].',
      hierarchy:'headline → focal visual → supporting copy → CTA',
      rules:'- Keep the headline to 6 words or fewer.\n- Use one focal visual and one action.\n- Avoid tiny legal-style copy or dense text blocks.',
      quality:'The message must be understandable at feed size in roughly 2 seconds. CTA must be prominent without competing with the headline.',
      variables:'HEADLINE = [max 6 words]\nCTA = [action verb + destination/outcome | none]\nTOPIC_OR_OFFER = [text]',
      subject:'Premium social media campaign graphic for [TOPIC_OR_OFFER]',
      visual:'One high-impact focal visual tied directly to the offer, modern editorial spacing, high contrast',
      composition:'Headline first, focal visual second, CTA last; balanced asymmetry or centered hero layout',
      copy:'"[HEADLINE]" and, if needed, "[CTA]"'
    },
    {
      id:301, emoji:'🪧', title:'Campaign Poster Director', sub:'High-impact poster with premium hierarchy and breathing room',
      brief:'Design a marketing poster for [PRODUCT/SERVICE/EVENT]. Headline: [HEADLINE, max 8 words]. Subheading: [SUBHEAD]. Details: [DATE/PLACE/PRICE/KEY INFO only if verified]. CTA: [CTA]. Output for [DIGITAL/PRINT CONCEPT].',
      hierarchy:'headline → key visual → subheading/details → CTA',
      rules:'- Headline max 8 words.\n- Use only verified event/product details.\n- Keep details grouped, aligned, and visually subordinate to the headline.',
      quality:'Poster must remain legible from a distance/small preview, with a clear information path and no filler text.',
      variables:'HEADLINE = [max 8 words]\nSUBHEAD = [one short sentence]\nDETAILS = [verified only]\nCTA = [short action]',
      subject:'Premium campaign poster for [PRODUCT/SERVICE/EVENT]',
      visual:'Sophisticated campaign key art with one memorable visual device',
      composition:'Strong headline zone, dominant key visual, compact information block, decisive CTA',
      copy:'"[HEADLINE]" plus short verified [SUBHEAD/DETAILS/CTA]'
    },
    {
      id:302, emoji:'▶️', title:'Thumbnail Director', sub:'Tiny-preview clarity without fake CTR promises',
      brief:'Design a thumbnail for [VIDEO TOPIC]. Hook text: [HOOK, max 4 words]. Tone: [curiosity/shock/excitement/calm authority/custom]. Focal subject: [SUBJECT]. Make the payoff understandable at tiny preview size.',
      hierarchy:'focal subject → hook text → one supporting cue',
      rules:'- Hook text max 4 words.\n- One face/object/idea should dominate.\n- Do not claim or imply a guaranteed CTR.\n- Remove any element that does not strengthen the video promise.',
      quality:'At thumbnail size, the subject, emotion, and video promise must remain distinct. No microtext.',
      variables:'HOOK = [max 4 words]\nVIDEO_TOPIC = [text]\nTONE = [curiosity | surprise | excitement | calm authority | custom]\nFOCAL_SUBJECT = [text/reference]',
      subject:'High-clickability editorial thumbnail for [VIDEO_TOPIC]',
      visual:'One expressive focal subject with strong subject/background separation and a single curiosity cue',
      composition:'Oversized subject and hook, clean silhouette, minimal clutter, high contrast',
      copy:'"[HOOK]"'
    },
    {
      id:303, emoji:'🧬', title:'Brand Identity Concept System', sub:'Cohesive identity directions, not fake final vectors',
      brief:'Create a brand identity concept board for [BRAND NAME] in [INDUSTRY]. Brand personality: [3-5 ADJECTIVES]. Audience: [AUDIENCE]. Show three genuinely different directions covering mark idea, wordmark styling, palette, type style, shapes/textures, and mini icon language.',
      hierarchy:'brand name → primary concept direction → marks/palette/type → supporting icon language',
      rules:'- Concepts must differ structurally, not just by color.\n- Describe typography style rather than promising an exact font rendering.\n- Treat logo outputs as concepts requiring vector refinement and trademark review.',
      quality:'Each direction must be recognizable, scalable in concept, coherent across touchpoints, and explainable in one sentence.',
      variables:'BRAND_NAME = [text]\nINDUSTRY = [text]\nPERSONALITY = [3-5 adjectives]\nTOUCHPOINTS = [social | web | print | packaging | app | custom]',
      subject:'Three-direction visual identity concept board for [BRAND_NAME] in [INDUSTRY]',
      visual:'Distinct icon-mark ideas, wordmark treatments, combination marks, palette swatches, typography-style samples, geometric or organic supporting system',
      composition:'Three clearly separated concept columns/boards with consistent labeling and generous whitespace',
      copy:'"[BRAND_NAME]" plus very short concept labels'
    },
    {
      id:304, emoji:'🪄', title:'Image Editing Director', sub:'Preserve the source; change only what the brief authorizes',
      brief:'Edit the supplied image for [USE]. Required changes: [EDIT LIST]. Preserve: [SUBJECT/IDENTITY/PROPORTIONS/COLORS/DETAILS]. Optional crop/framing: [YES/NO + TARGET]. This mode is BLOCKED if the actual source image is not supplied.',
      hierarchy:'original subject integrity → requested corrections → subtle polish',
      rules:'- Do not recreate or replace the subject when an edit is requested.\n- Preserve proportions and authentic texture unless explicitly authorized.\n- Remove only named distractions.\n- Keep lighting/color corrections natural unless the brief requests stylization.',
      quality:'The result should still read as the same source image, with no unexplained identity, shape, product, or background substitutions.',
      variables:'SOURCE_IMAGE = [required]\nEDIT_LIST = [lighting | exposure | color grade | cleanup | crop | noise | sharpness | custom]\nPRESERVE = [explicit invariant list]\nUSE = [social | portfolio | commercial | editorial | custom]',
      subject:'Professional edit of the supplied source image',
      visual:'Balanced exposure, controlled highlights/shadows, natural color, targeted detail, clean background only where requested',
      composition:'Preserve original framing unless [EDIT_LIST] includes crop/reframe; protect the main subject',
      copy:'none',
      mjRule:'Use the supplied image through the current Midjourney edit/reference workflow; do not treat this text-only prompt as a substitute for the source image.',
      leoRule:'Use image guidance/reference editing; preserve identity and geometry outside the requested edit scope.'
    },
    {
      id:305, emoji:'📦', title:'Product Advertisement Director', sub:'Hero-product advertising with believable light, surface, and copy',
      brief:'Create an advertisement for [PRODUCT]. Benefit headline: [HEADLINE, max 8 words]. CTA: [CTA]. Environment: [studio/lifestyle/environmental]. Brand mood: [MOOD]. Product must remain the undisputed hero.',
      hierarchy:'product hero → benefit headline → supporting environment → CTA',
      rules:'- Preserve product geometry, packaging, labels, and key details when a product reference exists.\n- Ground the product with believable shadows/reflections.\n- Avoid floating-product syndrome and generic luxury clutter.',
      quality:'The product must look physically present, desirable, and immediately identifiable, with copy secondary to the hero.',
      variables:'PRODUCT = [text/reference]\nHEADLINE = [benefit-led, max 8 words]\nCTA = [short action]\nENVIRONMENT = [studio | lifestyle | environmental]',
      subject:'High-end product advertisement for [PRODUCT]',
      visual:'Cinematic directional light, tactile surface, realistic contact shadow/reflection, restrained premium styling',
      composition:'Centered hero or rule-of-thirds product placement with intentional negative space for copy',
      copy:'"[HEADLINE]" and "[CTA]"'
    },
    {
      id:306, emoji:'📊', title:'Infographic Director', sub:'Scan-first information design with truthful text limits',
      brief:'Transform [VERIFIED INFORMATION/DATA] into a shareable infographic. Title: [TITLE]. Subtitle: [SUBTITLE]. Organize into [steps/categories/flow/timeline/comparison]. Each section should use no more than about 15-20 words of final verified copy.',
      hierarchy:'title → section sequence → key numbers/icons → source/CTA',
      rules:'- Do not invent or alter data.\n- Use consistent icon language and color coding.\n- For dense copy/data, generate the visual system/layout and reserve deterministic text zones rather than trusting an image model with paragraphs.',
      quality:'A viewer should understand the structure and major takeaway in under 10 seconds; sources must remain visually subordinate but available.',
      variables:'TITLE = [short]\nSUBTITLE = [short]\nDATA = [verified]\nSTRUCTURE = [steps | categories | flow | timeline | comparison]\nSOURCE = [optional verified source label]',
      subject:'Modern information-design infographic about [TITLE]',
      visual:'Simple icons, restrained charts or number callouts, consistent modular sections, smart color coding',
      composition:'Clear top-to-bottom or left-to-right reading path with repeated grid rhythm',
      copy:'"[TITLE]" plus short verified section labels only'
    },
    {
      id:307, emoji:'🖥️', title:'Presentation Slide Director', sub:'Boardroom-ready single-slide visual with one takeaway',
      brief:'Create one presentation-ready slide for [TOPIC]. Core takeaway headline: [HEADLINE, max 8 words]. Supporting points: [UP TO 4 BULLETS, max 6 words each]. Visual: [chart/icon/illustration]. Source: [OPTIONAL VERIFIED SOURCE].',
      hierarchy:'takeaway headline → key visual/chart → short support → source',
      rules:'- One idea per slide.\n- No paragraphs.\n- Use a grid and generous whitespace.\n- If chart values or source text must be exact, reserve deterministic chart/text zones for PowerPoint/Slides/Keynote construction.',
      quality:'The takeaway must be obvious at a glance and remain readable on a projected screen.',
      variables:'HEADLINE = [max 8 words]\nBULLETS = [0-4, max 6 words each]\nVISUAL = [icon | simple chart | illustration]\nSOURCE = [optional verified source]',
      subject:'Premium 16:9 presentation slide for [TOPIC]',
      visual:'One meaningful visual that explains the takeaway rather than decorating it',
      composition:'Grid-based slide with strong headline zone, large visual area, minimal support copy',
      copy:'"[HEADLINE]" plus concise [BULLETS]'
    },
    {
      id:308, emoji:'✳️', title:'Logo Concept Director', sub:'Three structurally distinct logo directions with production caveats',
      brief:'Create three distinctive logo concepts for [BRAND NAME] in [INDUSTRY]. Personality: [PERSONALITY]. Required use cases: [ICON/WORDMARK/COMBINATION]. Each concept needs a one-line idea, symbolism, typography style, 2-3 color palette, and visual style.',
      hierarchy:'concept mark → brand name → rationale cue → palette/style',
      rules:'- Three directions must use different underlying shapes/ideas.\n- Favor simple silhouettes and monochrome survivability.\n- Do not present generated raster marks as final vectors or as trademark-cleared.',
      quality:'Each concept should remain recognizable at favicon scale in principle and still feel credible on a large sign.',
      variables:'BRAND_NAME = [text]\nINDUSTRY = [text]\nPERSONALITY = [3-5 adjectives]\nUSES = [icon-only | wordmark | combination | all]',
      subject:'Three distinct logo concept directions for [BRAND_NAME]',
      visual:'Simple memorable symbols, restrained geometry or intentional organic form, wordmark styling, monochrome and palette views',
      composition:'Three separate concept panels with equal visual weight and clean presentation',
      copy:'"[BRAND_NAME]" plus very short concept labels'
    },
    {
      id:309, emoji:'🎨', title:'Creative Director Router', sub:'Master design prompt that routes to the right specialist',
      brief:'Act as the creative director for [REQUEST]. First classify the request into exactly one primary mode: social-graphic, poster, thumbnail, brand-identity, image-edit, product-ad, infographic, presentation-slide, or logo-concepts. Use project canon when available. Choose the layout, hierarchy, palette, typography style, image/reference strategy, and provider-appropriate prompt. Ask for missing context only when the missing fact would materially change the output or make an edit impossible.',
      hierarchy:'user goal → primary message → focal visual → supporting information → action',
      rules:'- Route to the narrowest specialist mode.\n- Explain the chosen direction in 2-3 concise sentences before generation when the interface supports a text step.\n- Never let a provider become brand or publication authority.\n- Never promise exact fonts, CTR, conversion lift, vector fidelity, or trademark clearance.\n- For edits, require the real source image.\n- For dense text/data, split visual generation from deterministic typesetting.',
      quality:'The final brief must be specific enough that a second competent designer could reproduce the intent without guessing the core hierarchy, visual idea, or constraints.',
      variables:'REQUEST = [free text]\nPRIMARY_MODE = [auto | social-graphic | poster | thumbnail | brand-identity | image-edit | product-ad | infographic | presentation-slide | logo-concepts]\nVISIBLE_TEXT = [exact short copy | none]\nCTA = [short action | none]',
      subject:'Agency-quality visual design for [REQUEST]',
      visual:'Use the strongest single visual idea implied by the selected specialist mode and project canon',
      composition:'Select the composition that best serves the chosen mode and target aspect ratio; preserve a clear reading path and negative space',
      copy:'only [VISIBLE_TEXT] and [CTA] when supplied'
    }
  ];

  creativeSpecs.forEach(function(spec){
    if (existing.has(spec.id)) return;
    PROMPTS.push({
      id: spec.id,
      emoji: spec.emoji,
      title: spec.title,
      sub: spec.sub,
      cat: 'design',
      platforms: ['chatgpt-image', 'midjourney', 'leonardo', 'ideogram', 'flux'],
      card_accent: 'var(--accent-purple)',
      notes: 'Creative Studio v1. Provider-neutral authority lives in .control-room/creative-studio.contract.json; project-local brand canon wins. Provider availability and execution must be observed at runtime.',
      versions: buildVersions(spec)
    });
  });
})();
