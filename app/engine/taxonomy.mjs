// The asset library's folder system and the fixed form for each kind of asset (OuTSDe).
// Written once to Design_Model/Library/taxonomy.json; after that the JSON file is the source and can be edited.
// A leaf (Chair, Floor tile …) inherits the image slots and fields of its parents and adds its own.
// Image slot: key, label, required, hint (what the vendor should shoot), std (what Codex makes of it).
// Field: key, label, type text|number|select|bool|textarea|list, unit, options, required.

const S = (key, label, required, hint, std) => ({ key, label, required: !!required, hint, std })
const F = (key, label, type = 'text', extra = {}) => ({ key, label, type, ...extra })

const STUDIO = 'pure white background (#FFFFFF), soft even studio light, true colours, product centred and fully in frame, sharp, 2048 px on the long side'
const FLAT = 'flat, square-on, evenly lit with no hot spots, colour-accurate, edge to edge, 2048 px'

// fields every asset has, whatever the category
export const COMMON_FIELDS = [
  F('name', 'Product name', 'text', { required: true }), F('model', 'Model / SKU'), F('collection', 'Collection / series'),
  F('price_inr', 'Price', 'number', { unit: '₹', required: true }),
  F('price_unit', 'Price per', 'select', { options: ['piece', 'set', 'sq ft', 'sq m', 'box', 'running ft', 'metre', 'litre', 'roll'], required: true }),
  F('price_type', 'Price type', 'select', { options: ['MRP', 'Dealer / trade', 'Quoted for this project', 'Starting from', 'On request'] }),
  F('gst_included', 'GST included', 'bool'), F('moq', 'Minimum order'), F('lead_time_days', 'Lead time', 'number', { unit: 'days' }),
  F('warranty', 'Warranty'), F('colours_available', 'Colours / finishes available', 'list'), F('customisable', 'Customisable (size, finish, fabric)', 'bool'),
  F('url', 'Product page'), F('notes', 'Notes', 'textarea')
]

export const TAXONOMY = {
  note: 'Asset library folders. Each leaf is a folder in Design_Model/Library. Slots = the images the vendor must send; fields = the data to collect. Edit freely: add leaves, slots or fields; existing assets keep their data.',
  groups: [
    { id: 'furniture', name: 'Furniture', vendorCategory: 'Furniture',
      slots: [S('front', 'Front view', 1, 'Straight from the front, at the height of the middle of the piece', `orthographic-looking front elevation, ${STUDIO}`),
        S('side', 'Side view', 1, 'Straight from the side (left or right)', `orthographic-looking side elevation, ${STUDIO}`),
        S('axo', 'Three-quarter view', 1, 'From a front corner, slightly above, the whole piece visible', `three-quarter view from the front-left at 30° above, ${STUDIO}`),
        S('back', 'Back view', 0, 'Straight from the back', `back elevation, ${STUDIO}`),
        S('top', 'Top view', 0, 'From directly above', `plan view from directly above, ${STUDIO}`),
        S('material', 'Material close-up', 1, 'Close-up of the main material: wood grain, fabric weave, metal finish, stone', 'macro close-up of the material, flat even light, colour-accurate, 2048 px'),
        S('detail', 'Detail', 0, 'Joinery, leg, handle, stitching, edge', `detail close-up, ${STUDIO}`),
        S('context', 'In a room', 0, 'The piece in a real room (vendor showroom or project photo)', 'keep as a photograph; improve sharpness, exposure and colour only')],
      fields: [F('width_mm', 'Width', 'number', { unit: 'mm', required: true }), F('depth_mm', 'Depth', 'number', { unit: 'mm', required: true }), F('height_mm', 'Height', 'number', { unit: 'mm', required: true }),
        F('material', 'Main material', 'text', { required: true }), F('finish', 'Finish'), F('colour', 'Colour'), F('upholstery', 'Upholstery / fabric'), F('weight_kg', 'Weight', 'number', { unit: 'kg' }),
        F('assembly', 'Assembly', 'select', { options: ['Comes assembled', 'Assembled on site', 'Flat-pack'] }), F('care', 'Care')],
      children: [
        { id: 'seating', name: 'Seating', children: [
          { id: 'chair', name: 'Chair', fields: [F('seat_height_mm', 'Seat height', 'number', { unit: 'mm' }), F('arm_height_mm', 'Arm height', 'number', { unit: 'mm' }), F('armrest', 'Has armrests', 'bool'), F('stackable', 'Stackable', 'bool'), F('seat_material', 'Seat material')] },
          { id: 'armchair', name: 'Armchair / lounge chair', fields: [F('seat_height_mm', 'Seat height', 'number', { unit: 'mm' }), F('seat_depth_mm', 'Seat depth', 'number', { unit: 'mm' }), F('cushion_fill', 'Cushion fill')] },
          { id: 'sofa', name: 'Sofa', fields: [F('seats', 'Seats', 'number'), F('configuration', 'Configuration', 'select', { options: ['Straight', 'L-shape', 'U-shape', 'Modular', 'Chaise'] }), F('seat_height_mm', 'Seat height', 'number', { unit: 'mm' }), F('seat_depth_mm', 'Seat depth', 'number', { unit: 'mm' }), F('cushion_fill', 'Cushion fill')] },
          { id: 'bench', name: 'Bench / ottoman / pouf' }, { id: 'stool', name: 'Stool / bar stool', fields: [F('seat_height_mm', 'Seat height', 'number', { unit: 'mm' })] },
          { id: 'swing', name: 'Swing (jhula)' }] },
        { id: 'tables', name: 'Tables', fields: [F('top_material', 'Top material'), F('top_thickness_mm', 'Top thickness', 'number', { unit: 'mm' }), F('base_material', 'Base / legs'), F('shape', 'Shape', 'select', { options: ['Rectangular', 'Square', 'Round', 'Oval', 'Organic', 'Racetrack'] })],
          children: [{ id: 'dining-table', name: 'Dining table', fields: [F('seats', 'Seats', 'number'), F('extendable', 'Extendable', 'bool')] }, { id: 'coffee-table', name: 'Coffee table' }, { id: 'side-table', name: 'Side table' },
            { id: 'console', name: 'Console table' }, { id: 'desk', name: 'Desk / study table' }] },
        { id: 'storage', name: 'Storage', fields: [F('shutters', 'Shutters / drawers'), F('internal', 'Internal layout', 'textarea'), F('hardware', 'Hardware brand')],
          children: [{ id: 'wardrobe', name: 'Wardrobe' }, { id: 'sideboard', name: 'Sideboard / buffet' }, { id: 'tv-unit', name: 'TV / media unit' }, { id: 'bookshelf', name: 'Bookshelf / display' }, { id: 'chest', name: 'Chest of drawers / bedside' }, { id: 'pooja-unit', name: 'Pooja unit' }] },
        { id: 'beds', name: 'Beds', children: [{ id: 'bed', name: 'Bed', fields: [F('mattress_size', 'Mattress size', 'select', { options: ['Single 36x72', 'Queen 60x78', 'King 72x78', 'Super king 72x84', 'Custom'] }), F('headboard_height_mm', 'Headboard height', 'number', { unit: 'mm' }), F('storage', 'Under-bed storage', 'bool')] }, { id: 'headboard', name: 'Headboard' }] }
      ] },
    { id: 'lighting', name: 'Lighting', vendorCategory: 'Lighting',
      slots: [S('front', 'Front view (off)', 1, 'The fitting switched off, straight on', `front view switched off, ${STUDIO}`),
        S('lit', 'Switched on', 1, 'The fitting switched on, in a dim room, to show the light it gives', 'the fitting switched on against a dark neutral background, showing its glow and light pattern, 2048 px'),
        S('axo', 'Three-quarter view', 0, 'From below or a corner', `three-quarter view, ${STUDIO}`), S('detail', 'Detail', 0, 'Shade, diffuser, finish, joint', `detail close-up, ${STUDIO}`),
        S('context', 'In a room', 0, 'Installed in a room', 'keep as a photograph; improve sharpness, exposure and colour only')],
      fields: [F('width_mm', 'Width / diameter', 'number', { unit: 'mm' }), F('height_mm', 'Height / drop', 'number', { unit: 'mm' }), F('material', 'Material'), F('finish', 'Finish'),
        F('lamp', 'Lamp', 'select', { options: ['Integrated LED', 'E27', 'E14', 'GU10', 'Strip', 'Other'] }), F('watt', 'Wattage', 'number', { unit: 'W' }), F('lumens', 'Lumens', 'number', { unit: 'lm' }),
        F('cct_k', 'Colour temperature', 'number', { unit: 'K' }), F('cri', 'CRI', 'number'), F('dimmable', 'Dimmable', 'bool'), F('ip', 'IP rating'), F('beam_angle', 'Beam angle', 'number', { unit: '°' })],
      children: [{ id: 'pendant', name: 'Pendant', fields: [F('cable_mm', 'Cable / drop length', 'number', { unit: 'mm' })] }, { id: 'chandelier', name: 'Chandelier' }, { id: 'floor-lamp', name: 'Floor lamp' }, { id: 'table-lamp', name: 'Table lamp' },
        { id: 'wall-light', name: 'Wall light' }, { id: 'ceiling-light', name: 'Ceiling / spot / downlight' }, { id: 'linear-profile', name: 'Linear / profile light' }, { id: 'outdoor-light', name: 'Outdoor light' }] },
    { id: 'surfaces', name: 'Surfaces and materials', vendorCategory: 'Tiles',
      slots: [S('face', 'Face (one piece, straight on)', 1, 'One tile / slab / sheet, shot straight on in even daylight, filling the frame', `${FLAT}`),
        S('seamless', 'Seamless pattern', 1, 'Several pieces laid together (or the design sheet showing the repeat)', 'a seamless tileable texture of the surface as laid, with joints if it has them, 2048 x 2048, repeats without visible seams'),
        S('reflection', 'Reflection / sheen', 1, 'One piece at an angle under a light, to show how glossy or matt it is', 'one piece at 30° under a soft strip light showing its true gloss or matt sheen, neutral background, 2048 px'),
        S('variation', 'Variation (all faces)', 0, 'All the different faces / designs of the same product side by side', `${FLAT}; all faces side by side`),
        S('edge', 'Edge and thickness', 0, 'The edge, showing thickness and profile', `edge close-up, ${STUDIO}`),
        S('laid', 'Laid in a room', 0, 'Installed, in a real room', 'keep as a photograph; improve sharpness, exposure and colour only')],
      fields: [F('size_mm', 'Size', 'text', { unit: 'mm', required: true }), F('thickness_mm', 'Thickness', 'number', { unit: 'mm' }), F('finish', 'Finish', 'select', { options: ['Matt', 'Satin', 'Gloss', 'Polished', 'Honed', 'Lappato', 'Structured', 'Leathered', 'Flamed', 'Brushed'] }),
        F('colour', 'Colour'), F('application', 'Use', 'select', { options: ['Floor', 'Wall', 'Floor and wall', 'Outdoor', 'Countertop', 'Cladding'] }), F('coverage_box_sqft', 'Coverage per box', 'number', { unit: 'sq ft' })],
      children: [
        { id: 'tiles', name: 'Tiles', fields: [F('body', 'Body', 'select', { options: ['Porcelain', 'Glazed vitrified (GVT)', 'Double charge', 'Full body', 'Ceramic', 'Cement / encaustic', 'Terracotta', 'Mosaic', 'Zellige'] }),
          F('slip_r', 'Slip rating (R)'), F('pei', 'PEI class'), F('water_absorption', 'Water absorption', 'number', { unit: '%' }), F('rectified', 'Rectified edges', 'bool'), F('shade_variation', 'Shade variation', 'select', { options: ['V1', 'V2', 'V3', 'V4'] }), F('faces', 'Faces / designs', 'number'), F('pieces_box', 'Pieces per box', 'number')],
          children: [{ id: 'floor-tile', name: 'Floor tile' }, { id: 'wall-tile', name: 'Wall tile' }, { id: 'bathroom-tile', name: 'Bathroom tile' }, { id: 'outdoor-tile', name: 'Outdoor tile' }, { id: 'mosaic', name: 'Mosaic' }] },
        { id: 'stone', name: 'Stone', fields: [F('stone_type', 'Stone', 'select', { options: ['Marble', 'Granite', 'Quartz', 'Quartzite', 'Travertine', 'Limestone', 'Sandstone', 'Onyx', 'Sintered stone', 'Kota / Kadappa'] }),
          F('origin', 'Origin / quarry'), F('slab_size_mm', 'Slab size', 'text', { unit: 'mm' }), F('translucent', 'Translucent (backlit)', 'bool'), F('bookmatch', 'Book-matched available', 'bool')],
          children: [{ id: 'marble', name: 'Marble' }, { id: 'granite', name: 'Granite' }, { id: 'quartz', name: 'Quartz / engineered' }, { id: 'natural-stone', name: 'Other natural stone' }] },
        { id: 'wood', name: 'Wood, laminates and veneers', fields: [F('species', 'Species / decor'), F('grade', 'Grade'), F('ac_rating', 'AC rating (laminate floors)')],
          children: [{ id: 'wood-flooring', name: 'Wood flooring' }, { id: 'veneer', name: 'Veneer' }, { id: 'laminate', name: 'Laminate' }, { id: 'panel', name: 'Panels / fluted / louvres' }] },
        { id: 'walls', name: 'Wall finishes', children: [
          { id: 'wallpaper', name: 'Wallpaper / wallcovering', fields: [F('repeat_mm', 'Pattern repeat', 'number', { unit: 'mm' }), F('roll_width_mm', 'Roll width', 'number', { unit: 'mm' }), F('washable', 'Washable', 'bool')] },
          { id: 'paint', name: 'Paint', slots: [S('face', 'Swatch', 1, 'The colour swatch / shade card', FLAT), S('seamless', 'On a wall', 1, 'Painted on a wall in daylight', 'a painted wall surface, evenly lit, tileable, 2048 x 2048'), S('reflection', 'Sheen', 0, 'At an angle under light, to show the sheen', 'angled view showing sheen')], fields: [F('shade_code', 'Shade code'), F('sheen', 'Sheen', 'select', { options: ['Flat', 'Matt', 'Eggshell', 'Satin', 'Semi-gloss', 'Gloss'] }), F('coverage_sqft_l', 'Coverage', 'number', { unit: 'sq ft / litre' })] },
          { id: 'texture', name: 'Texture / lime plaster / microcement' }, { id: 'cladding', name: 'Bricks and cladding', fields: [F('material', 'Material')] }] }
      ] },
    { id: 'fabrics', name: 'Fabrics and rugs', vendorCategory: 'Fabrics & wallcoverings',
      slots: [S('face', 'Fabric face', 1, 'Flat, straight on, in daylight, showing the full pattern repeat', FLAT),
        S('drape', 'Drape / texture', 1, 'Folded or draped to show weight and texture', 'draped fabric on a neutral background, soft light, 2048 px'),
        S('detail', 'Weave close-up', 0, 'Macro of the weave / pile', 'macro close-up, colour-accurate'), S('context', 'In use', 0, 'On a sofa, as a curtain, on the floor', 'keep as a photograph; improve sharpness, exposure and colour only')],
      fields: [F('composition', 'Composition'), F('colour', 'Colour'), F('pattern_repeat', 'Pattern repeat'), F('width_cm', 'Width', 'number', { unit: 'cm' }), F('gsm', 'Weight', 'number', { unit: 'gsm' }), F('martindale', 'Martindale rub count', 'number'), F('care', 'Care')],
      children: [{ id: 'upholstery', name: 'Upholstery fabric' }, { id: 'curtain', name: 'Curtain / sheer' }, { id: 'rug', name: 'Rug', fields: [F('sizes', 'Sizes', 'list'), F('pile_mm', 'Pile height', 'number', { unit: 'mm' }), F('construction', 'Construction', 'select', { options: ['Hand-knotted', 'Hand-tufted', 'Flatweave / dhurrie', 'Machine-made', 'Jute / natural'] })] }, { id: 'cushion', name: 'Cushions and throws' }] },
    { id: 'sanitary', name: 'Sanitary and CP', vendorCategory: 'Sanitary & CP',
      slots: [S('front', 'Front view', 1, 'Straight from the front', `front elevation, ${STUDIO}`), S('side', 'Side view', 1, 'Straight from the side', `side elevation, ${STUDIO}`),
        S('axo', 'Three-quarter view', 1, 'From a front corner', `three-quarter view, ${STUDIO}`), S('detail', 'Finish close-up', 0, 'Finish and handle', `detail close-up, ${STUDIO}`), S('context', 'Installed', 0, 'Installed in a bathroom', 'keep as a photograph; improve sharpness, exposure and colour only')],
      fields: [F('width_mm', 'Width', 'number', { unit: 'mm' }), F('depth_mm', 'Depth', 'number', { unit: 'mm' }), F('height_mm', 'Height', 'number', { unit: 'mm' }), F('material', 'Material'), F('finish', 'Finish'), F('mounting', 'Mounting', 'select', { options: ['Wall-hung', 'Floor-standing', 'Counter-top', 'Under-counter', 'Concealed', 'Deck-mounted'] }), F('flow_lpm', 'Flow rate', 'number', { unit: 'L/min' })],
      children: [{ id: 'basin', name: 'Basin' }, { id: 'wc', name: 'WC' }, { id: 'faucet', name: 'Faucet / mixer' }, { id: 'shower', name: 'Shower' }, { id: 'vanity', name: 'Vanity' }, { id: 'bathtub', name: 'Bathtub' }] },
    { id: 'hardware', name: 'Hardware', vendorCategory: 'Hardware',
      slots: [S('front', 'Front view', 1, 'Straight on', `front view, ${STUDIO}`), S('side', 'Side view', 0, 'From the side, showing projection', `side view, ${STUDIO}`), S('detail', 'Finish close-up', 0, 'Finish', 'macro close-up'), S('context', 'Installed', 0, 'On a door or shutter', 'keep as a photograph; improve only')],
      fields: [F('size_mm', 'Size', 'text', { unit: 'mm' }), F('centre_mm', 'Centre to centre', 'number', { unit: 'mm' }), F('material', 'Material'), F('finish', 'Finish')],
      children: [{ id: 'handle', name: 'Handles and knobs' }, { id: 'door-hardware', name: 'Door hardware' }, { id: 'fittings', name: 'Hinges, channels, fittings' }] },
    { id: 'decor', name: 'Decor and art', vendorCategory: 'Decor & art',
      slots: [S('front', 'Front view', 1, 'Straight on', `front view, ${STUDIO}`), S('axo', 'Three-quarter view', 0, 'From a corner', `three-quarter view, ${STUDIO}`), S('detail', 'Craft detail', 0, 'The craft: carving, inlay, weave, brushwork', 'macro close-up'), S('context', 'In a room', 0, 'Styled in a room', 'keep as a photograph; improve only')],
      fields: [F('width_mm', 'Width', 'number', { unit: 'mm' }), F('height_mm', 'Height', 'number', { unit: 'mm' }), F('depth_mm', 'Depth', 'number', { unit: 'mm' }), F('material', 'Material'), F('craft', 'Craft / technique (e.g. Channapatna, Bidriware, Kalamkari)'), F('artist', 'Artist / maker / origin')],
      children: [{ id: 'art', name: 'Art and prints' }, { id: 'sculpture', name: 'Sculpture and objects' }, { id: 'vase', name: 'Vases and vessels' }, { id: 'mirror', name: 'Mirror' }, { id: 'planter', name: 'Planters and plants' }, { id: 'clock', name: 'Clocks and wall decor' }] },
    { id: 'appliances', name: 'Appliances', vendorCategory: 'Appliances',
      slots: [S('front', 'Front view', 1, 'Straight on', `front view, ${STUDIO}`), S('axo', 'Three-quarter view', 0, 'From a corner', `three-quarter view, ${STUDIO}`), S('context', 'Installed', 0, 'Built in', 'keep as a photograph; improve only')],
      fields: [F('width_mm', 'Width', 'number', { unit: 'mm' }), F('height_mm', 'Height', 'number', { unit: 'mm' }), F('depth_mm', 'Depth', 'number', { unit: 'mm' }), F('finish', 'Finish'), F('install', 'Installation', 'select', { options: ['Built-in', 'Free-standing'] })],
      children: [{ id: 'hob-hood', name: 'Hob and hood' }, { id: 'oven', name: 'Oven / microwave' }, { id: 'fridge', name: 'Refrigerator' }, { id: 'dishwasher', name: 'Dishwasher' }] }
  ]
}

// Flatten: every node with its full path and the inherited slots and fields
export function flattenTaxonomy(tax) {
  const out = []
  const walk = (node, trail, slots, fields) => {
    const merge = (base, own = []) => { const m = new Map(base.map((x) => [x.key, x])); own.forEach((x) => m.set(x.key, x)); return [...m.values()] }
    const s = node.slots ? merge(slots, node.slots) : slots, f = merge(fields, node.fields)
    const path = [...trail, node]
    out.push({ id: path.map((x) => x.id).join('/'), key: node.id, name: node.name, names: path.map((x) => x.name), group: path[0].id, vendorCategory: path[0].vendorCategory,
      leaf: !node.children?.length, depth: path.length - 1, slots: s, fields: f })
    ;(node.children || []).forEach((c) => walk(c, path, s, f))
  }
  ;(tax.groups || []).forEach((g) => walk(g, [], [], []))
  return out
}
