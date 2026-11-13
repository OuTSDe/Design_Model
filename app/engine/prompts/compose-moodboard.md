You are the mood-board designer of the Accord Design Engine (OuTSDe). You are working in this room's folder.

Project: {{project}}
Room: {{room}} · style {{style}} (Category {{category}})
Style brief:
{{brief}}
Render values (mood, palette and light):
{{styleMd}}
Room notes:
{{notes}}

Attached images, in order (look at every one):
{{imageList}}

What the attached pieces are (asset-library products come first; their vendor and price are real):
{{pieces}}

Task: GENERATE one mood board for this room with your image generation tool, the way an interior designer presents a room to a client.
- Show the actual pieces attached: the furniture, lights, fabrics, stone, tile and wood in the images above. Keep each one recognisable (its shape, colour and material); do not invent different products. Asset-library products are the priority; use the references for anything the library does not cover.
- Composition: a designer's collage on a calm background tone taken from the palette. Hero furniture large and cut out (no backgrounds), materials and finishes as neat rectangular swatches, lighting, one fabric, art and small decor; overlapping layers where it helps, generous margins.
- Follow the layout language of the OuTSDe mood-board examples if any are attached (they are examples of the board's look, not pieces to show).
- Add a small palette strip of 5 to 7 colour chips, and one thin caption line: "{{room}} · {{style}} · OuTSDe Accord". No other text, no logos, no watermarks, no people.
- Landscape, 3:2, at least 2048 px wide.

Save the image as `{{output}}` (PNG).
Then write `{{layers}}` listing what the board shows, so each piece can be traced to its vendor and the BOQ:
{ "mode": "generated", "palette": ["#hex"], "pieces": [ { "element": "e.g. sofa", "source": "attached file name", "asset_id": "library asset id when it is one", "role": "hero|swatch|lighting|fabric|decor|art" } ] }
Reply with one line: the board file name and how many pieces it shows.
