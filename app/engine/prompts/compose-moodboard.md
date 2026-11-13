You are the mood-board maker of the Accord Design Engine (OuTSDe). You are working in this room's folder.

Project: {{project}}
Room: {{room}} · style {{style}} (Category {{category}})
Style brief:
{{brief}}
Render values (mood and light):
{{styleMd}}

Assets you can use (paths are relative to this folder):
{{assets}}

Pieces from the OuTSDe asset library that fit this room's style (their style score is 0.6 or more; files are in `library/`, already standardised where marked). PREFER these real vendor pieces for furniture, lighting and materials, and use the references only where the library has nothing:
{{library}}

Attached OuTSDe mood-board examples to follow for layout language (may be none): {{imageList}}

Task: make ONE mood board for this room as a collage of the real assets above, the way an interior designer presents it.
1. Choose 10 to 16 assets that together tell the room (library pieces first): the hero pieces large, materials and finishes as swatches, lighting, fabric, art and small decor.
2. Cut the furniture, lights and objects out of their backgrounds (transparent PNG) so they sit on the board like a collage. Use rembg (Python: pip install rembg pillow) if you can; otherwise trim to a tight crop with a soft shadow. Keep stone, tile, fabric and wood as clean rectangular swatches.
3. Compose on a 3000 x 2000 px canvas: a calm background tone taken from the palette, generous margins, overlapping layers where it helps, a small palette strip of 5 to 7 colour chips with hex codes, and a thin caption line "<Room> · <Style> · OuTSDe Accord". No other text, no logos.
   Use Python with Pillow, Node with sharp, or PowerShell System.Drawing, whichever runs here. Do not use image generation for this: the board must show the actual assets.
4. Save the board as `{{output}}`, and save the cutouts in `moodboard/cutouts/`.
5. Write `{{layers}}` describing the layers so the board can be edited later:
   { "canvas": [3000, 2000], "background": "#hex", "layers": [ { "file": "relative path", "x": 0, "y": 0, "w": 0, "h": 0, "rotation": 0, "z": 1, "element": "name", "kind": "cutout|swatch|photo", "asset_id": "library asset id when it is one" } ], "palette": ["#hex"] }
Reply with one line: the board file name and how many assets it uses.
