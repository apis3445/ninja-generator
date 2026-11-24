export type NinjaAnswers = {
  specialty: 'automation' | 'performance' | 'security' | 'accessibility' | 'visual' | 'manual' | 'api'
  weapon: 'playwright' | 'selenium' | 'cypress' | 'k6' | 'snyk' | 'wcag'
  rank: 'junior' | 'mid' | 'senior' | 'lead' | 'legend'
  style: 'shadow' | 'crimson' | 'jade' | 'royal' | 'ghost'
  clan: 'sprinters' | 'phantoms' | 'guardians' | 'fast-and-risky'
  gender: 'female' | 'male'
}

export type NinjaAnimation = 'idle' | 'jump' | 'kick'

// Specialty flavor must stay ON the body (etched/engraved/painted) — anything
// described as held, floating, or glowing nearby gets baked into the 3D mesh
// as a detached blob (e.g. "holographic test suite" became a floating tablet).
const specialtyMap: Record<NinjaAnswers['specialty'], string> = {
  automation: 'automation testing specialist, circuits and code patterns etched into the armor, glowing circuit-line accents on the plates',
  performance: 'performance testing warrior, speed lines and load graphs etched into the armor',
  security: 'security penetration tester, dark stealth armor with lock-and-key motifs engraved on the plates',
  accessibility: 'accessibility champion, illuminated armor engraved with WCAG rules and universal design symbols',
  visual: 'visual regression tester, pixel grid patterns on armor, color-spectrum trim on the suit',
  manual: 'manual testing expert, checklist and magnifying-glass motifs engraved on the chest armor, methodical stance',
  api: 'API integration specialist, JSON schema armor plates, connector-cable patterns etched into the armor, request-response insignia'
}

const weaponMap: Record<NinjaAnswers['weapon'], string> = {
  playwright: 'with a chrome katana etched with browser icons sheathed across the back, Playwright testing framework symbols on the blade',
  selenium: 'with an ancient katana with web-driver runes strapped to the back, Selenium grid patterns on the blade',
  cypress: 'with a dagger with a cypress tree motif and green test-pass glow sheathed on the back',
  k6: 'with a thunder war hammer crackling with load-test lightning secured on the back, performance metrics on the head',
  snyk: 'with a katana with venom-tipped edge etched with vulnerability scan runes sheathed on the back, security exploit detector glowing red',
  wcag: 'with a luminous compliance staff engraved with WCAG 2.2 rules and universal design symbols strapped to the back, glowing with accessibility aura'
}

const rankMap: Record<NinjaAnswers['rank'], string> = {
  junior: 'young apprentice ninja, simple clean armor, eager determined expression, white belt',
  mid: 'mid-level warrior ninja, battle-tested armor with a few worn marks, confident stance, green belt',
  senior: 'senior ninja, ornate armor with experience sigils, wise expression, black belt with gold trim',
  lead: 'lead sensei ninja, commanding armor, sage expression, red belt, subtle leadership aura',
  legend: 'shinobi legend, legendary ancient armor with glowing runes, transcendent aura, white-and-gold belt'
}

const styleMap: Record<NinjaAnswers['style'], string> = {
  shadow: 'obsidian black and deep charcoal color scheme, shadow accents',
  crimson: 'crimson red and dark maroon color scheme, blood-red highlights',
  jade: 'jade green and forest emerald color scheme, nature-toned details',
  royal: 'royal blue and midnight navy color scheme, sapphire highlights',
  ghost: 'ghost white and pearl silver color scheme, translucent ethereal shimmer'
}

const clanMap: Record<NinjaAnswers['clan'], string> = {
  sprinters: 'agile build, lightweight swift posture, speed-focused frame, sprint clan insignia on shoulder',
  phantoms: 'balanced stealthy build, phantom protocol insignia, shadow-blend cloak details',
  guardians: 'sturdy powerful build, guardian clan shield crest, resilient heavy armor plating',
  'fast-and-risky': 'reckless daring build, scorched chaotic armor with cracks and burn marks, danger insignia, aura of controlled chaos'
}

const genderMap: Record<NinjaAnswers['gender'], string> = {
  female: 'female ninja warrior, feminine athletic build, female face and body',
  male: 'male ninja warrior, masculine athletic build, male face and body'
}


// Neutral A-pose so the model can be auto-rigged and animated.
const APOSE = 'standing in a strict A-pose: both arms angled downward at exactly 45 degrees from the shoulders (NOT horizontal, NOT T-pose), palms facing inward, legs straight and slightly apart, facing directly forward, neutral expression, NO action pose, NO dynamic stance, NO T-pose, arms must NOT be horizontal'

const SPECIALTY_POSE: Record<NinjaAnswers['specialty'], string> = {
  automation: 'in a powerful flying side kick pose: one leg fully extended forward like a precise automated test strike, opposite knee raised, arms spread for balance, body leaning into the kick, relentless focused expression, full body shown mid-strike',
  performance: 'in an explosive leaping jump pose: both legs tucked mid-air at peak height, arms raised overhead, body fully airborne like a performance benchmark hitting maximum load, fierce speed-focused expression, full body shown at the apex of the jump',
  security: 'in a fierce forward punch attack pose: one arm fully extended in a penetrating strike, opposite arm cocked back for power, body turned 3/4 toward viewer, weight forward on front foot like a penetration test probing a vulnerability, intense focused battle expression',
  accessibility: 'in a protective defensive guard pose: both arms raised in a crossed shield block, body crouched and centered, weight balanced and stable like a guardian protecting every user, alert compassionate expression, full body shown in a combat-ready protective stance',
  visual: 'in a dramatic spinning jump pose: body fully airborne and rotated mid-spin, arms extended outward like capturing a wide visual regression snapshot, one leg raised and one extended, dynamic expressive posture, full body shown at the peak of the spin',
  manual: 'in a careful low defensive guard pose: body crouched with knees bent, one arm raised blocking and one hand forward in a precise checking gesture, methodical focused expression like reviewing a test case step by step, full body shown in a grounded defensive crouch',
  api: 'in a sharp forward punch strike pose: arm extended in a precise single-endpoint strike, body turned sideways in a clean technical stance, opposite hand open in a ready position like awaiting an API response, focused analytical expression, full body shown mid-strike',
}

export function buildNinjaPrompt(answers: NinjaAnswers): string {

  return [
    `A ${genderMap[answers.gender]} ${rankMap[answers.rank]} ninja,`,
    `${styleMap[answers.style]},`,
    `${specialtyMap[answers.specialty]},`,
    `${weaponMap[answers.weapon]},`,
    `${clanMap[answers.clan]},`,
    `POSE REQUIREMENT: ${APOSE},`,
    `Japanese ninja warrior aesthetic, anime-inspired character design, detailed armor and gear,`,
    `isolated on a solid flat dark grey background, no background scenery, clean outline, studio lighting, solo character,`,
    `full body visible and fully contained within the image frame, no cropping, no part of the body outside the border,`,
    `no environmental effects, no floating objects, no holograms, no screens or panels, no tags or labels, no handheld items, nothing detached from the body, the only equipment is the single weapon sheathed on the back,`,
    `highly detailed 2D illustration, game-ready character design`
  ].join(' ')
}

export const questions: Array<{
  id: keyof NinjaAnswers
  text: string
  options: Array<{ value: string; label: string; description?: string }>
}> = [
    {
      id: 'gender',
      text: 'What is your ninja\'s gender?',
      options: [
        { value: 'female', label: 'Female', description: 'Female ninja warrior' },
        { value: 'male', label: 'Male', description: 'Male ninja warrior' }
      ]
    },
    {
      id: 'specialty',
      text: 'What is your ninja\'s testing specialty?',
      options: [
        { value: 'automation', label: 'Automation Testing', description: 'Scripts that never sleep' },
        { value: 'performance', label: 'Performance Testing', description: 'Find the breaking point' },
        { value: 'security', label: 'Security Testing', description: 'Expose the vulnerabilities' },
        { value: 'accessibility', label: 'Accessibility Testing', description: 'Testing for everyone' },
        { value: 'visual', label: 'Visual Testing', description: 'Pixel-perfect precision' },
        { value: 'manual', label: 'Manual Testing', description: 'The human eye catches what code misses' },
        { value: 'api', label: 'API Testing', description: 'Integration is everything' }
      ]
    },
    {
      id: 'weapon',
      text: 'What testing weapon does your ninja wield?',
      options: [
        { value: 'playwright', label: 'Playwright — Twin Blades', description: 'Cross-browser precision strikes' },
        { value: 'selenium', label: 'Selenium — Ancient Katana', description: 'The original warrior\'s blade' },
        { value: 'cypress', label: 'Cypress — Twin Daggers', description: 'Fast and lethal in close combat' },
        { value: 'k6', label: 'k6 — Thunder Hammer', description: 'Crush servers under load' },
        { value: 'snyk', label: 'Snyk — Venom Stars', description: 'Find vulnerabilities before they find you' },
        { value: 'wcag', label: 'WCAG — Compliance Staff', description: 'Wield the power of accessibility standards' },
      ]
    },
    {
      id: 'rank',
      text: 'What is your ninja\'s experience rank?',
      options: [
        { value: 'junior', label: 'Junior Apprentice', description: 'Still learning the way' },
        { value: 'mid', label: 'Mid-level Warrior', description: 'Battle-tested and growing' },
        { value: 'senior', label: 'Senior Ninja', description: 'Seasoned and confident' },
        { value: 'lead', label: 'Lead Sensei', description: 'Guides others on the path' },
        { value: 'legend', label: 'Shinobi Legend', description: 'Transcends ordinary skill' }
      ]
    },
    {
      id: 'style',
      text: 'What is your ninja\'s color scheme?',
      options: [
        { value: 'shadow', label: 'Shadow Black', description: 'Obsidian and charcoal' },
        { value: 'crimson', label: 'Crimson Red', description: 'Blood-red and maroon' },
        { value: 'jade', label: 'Jade Green', description: 'Emerald and forest' },
        { value: 'royal', label: 'Royal Blue', description: 'Sapphire and midnight navy' },
        { value: 'ghost', label: 'Ghost White', description: 'Pearl and silver shimmer' }
      ]
    },
    {
      id: 'clan',
      text: 'Which ninja clan does your ninja belong to?',
      options: [
        { value: 'sprinters', label: '⚡ The Sprinters', description: 'Agile, fast, always delivering' },
        { value: 'phantoms', label: '🌑 The Phantom Protocol', description: 'Stealthy, finds bugs in the dark' },
        { value: 'guardians', label: '🛡️ The Guardians', description: 'Resilient — nothing breaks through' },
        { value: 'fast-and-risky', label: '🔥 Fast And Risky', description: 'Move fast, break things, fix faster' }
      ]
    },
  ]

// Animation options shown on the 2D preview screen (not part of the wizard)
export const animationOptions: Array<{ value: NinjaAnimation; label: string; description: string }> = [
  { value: 'idle', label: 'Battle Idle', description: 'Combat-ready standing sway' },
  { value: 'jump', label: 'Jump Strike', description: 'Leaping overhead sword attack' },
  { value: 'kick', label: 'Side Kick', description: 'Pivoting ninja side kick' }
]
