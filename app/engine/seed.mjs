// Starting vocabulary and room templates (OuTSDe). Written to Design_Model/Vocabulary on first run only;
// after that the files in Vocabulary are yours and are never overwritten.
// Source: Flowchart/ACCORD Design Logic Map.html (the whiteboard mind map).

export const STYLES = [
  // Category 2: furniture, rugs and light fixtures are shared between these
  { id: 'minimalism', name: 'Minimalism', category: 2 },
  { id: 'contemporary', name: 'Contemporary', category: 2 },
  { id: 'mid-century-modern', name: 'Mid-Century Modern', category: 2 },
  { id: 'modern', name: 'Modern', category: 2 },
  // Category 1
  { id: 'maximalism', name: 'Maximalism', category: 1, subs: [
    { id: 'rich-indian-traditional', name: 'Rich Indian Traditional' },
    { id: 'antique-eclectic', name: 'Antique Eclectic' },
    { id: 'maximal-traditional-minimal', name: 'Maximal Traditional Minimal' }] },
  { id: 'maximal-minimalism', name: 'Maximal Minimalism', category: 1 },
  { id: 'biophilic', name: 'Biophilic Interiors', category: 1 },
  { id: 'farm-house', name: 'Farm House', category: 1 },
  { id: 'industrial', name: 'Industrial', category: 1 },
  { id: 'traditional', name: 'Traditional', category: 1 }
]

const CAT2 = `Category 2 (shared pool with Minimalism, Contemporary, Mid-Century Modern and Modern).
- Shades of beige and white.
- Easy, simple, modern, sleek.
- Pop in terms of: art, bold furniture, bold / designed light fixtures, softscape (textile, pattern, material).`

const NOTES = {
  'rich-indian-traditional': '- Pattern on pattern.\n- Composition of art objects.\n- Artwork 3D × 2D.',
  'antique-eclectic': '- Heritage arts.',
  'maximal-traditional-minimal': '- A sense of global mixture.',
  maximalism: '- Material heavy; texture and colour heavy.\n- See the three sub-styles.',
  biophilic: '- Choreography between inside and outside.\n- Blurring the boundary inside–outside.\n- Colours which resonate with the colour of nature.\n- Juxtaposition of natural material with plants.',
  traditional: '- "Need not be Indian": reflection of a specific culture (Japanese, Islamic, South Indian, North Indian).\n- Craft and artistry; elements specific to a time period.'
}

export const briefFor = (s) => `# ${s.name}

_What ${s.name} means to OuTSDe. Replace this placeholder with your own brief: a few lines, then the references in render-ref/ and moodboard-ref/._

${s.category === 2 ? CAT2 : `Category 1.\n${NOTES[s.id] || '- (to write)'}`}

## Focus (from the design logic)
- Sense of arrival, sequence of spaces, sense of depth.
- Spaces which talk to each other but do not compete.
- "Controlled yet free" proportions; juxtaposition of colour, pattern and form.
`

const MOODY = ['maximalism', 'rich-indian-traditional', 'antique-eclectic', 'maximal-traditional-minimal']
export const styleMdFor = (s) => {
  const moody = MOODY.includes(s.id)
  return `# ${s.name} · render values

These values go to Codex with every render in this style. Edit freely; keep one value per line.

- light: ${moody ? 'evening / night, no daylight; warm pools of lamplight, glints on brass and silk, deep shadow' : 'soft daylight from the windows, even and bright, gentle shadows'}
- colour temperature: ${moody ? '2400–2700 K' : '3500–4500 K'}
- mood: ${moody ? 'moody, rich, glittering, layered' : 'calm, airy, clean'}
- camera: eye level 1.5 m, 24–28 mm lens, verticals straight
- framing: one-point view into the room's depth; show the sequence of spaces
- focus: ${s.category === 2 ? 'the one bold piece (art, furniture or light fixture) against a quiet ground' : 'the composition of objects, pattern and material'}
- avoid: clutter that competes, distorted furniture, text or logos, people
- render reference: follow the light and frame of the images in render-ref/
`
}

// Rooms per typology, following Step 3 of the logic map (primary, secondary, transitional).
const R = (id, name, group) => ({ id, name, group })
const BASE = [R('living', 'Living', 'Primary'), R('dining', 'Dining', 'Secondary'), R('kitchen', 'Kitchen', 'Secondary'), R('master-bedroom', 'Master bedroom', 'Primary'),
  R('master-bath', 'Master bathroom', 'Secondary'), R('bedroom-2', 'Bedroom 2', 'Primary'), R('bath-2', 'Bathroom 2', 'Secondary'),
  R('passage', 'Passage', 'Transitional'), R('balcony', 'Balcony', 'Transitional')]
export function roomsFor(type = '') {
  const n = Number(String(type).match(/\d/)?.[0] || 2)
  const rooms = [...BASE]
  for (let i = 3; i <= n; i++) rooms.splice(rooms.length - 2, 0, R('bedroom-' + i, 'Bedroom ' + i, 'Primary'), R('bath-' + i, 'Bathroom ' + i, 'Secondary'))
  if (n >= 3) rooms.splice(rooms.length - 2, 0, R('powder', 'Powder room', 'Secondary'))
  return rooms
}
