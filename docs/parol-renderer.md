# BeMyParol — growing San Fernando-inspired festival lantern

The owner starts with a **complete mini festival parol**: an illuminated circular/floral tambor, glass mosaic and diamonds, capiz windows, floral starburst and decorative trim. **No tails, tassels, dangling ribbons or cord.** The parol is already complete at zero accepted friends.

Exactly **one structurally connected ornamental band** appears for each accepted friend. The bands form five different patterns, **1–10 angular siku-siku diamonds, 11–20 capiz mosaic, 21–35 palimbun-inspired flowers and fans, 36–45 ceremonial starbursts, and 46–50 ornate puntetas edging**. Every band includes 20 stained-glass facets and small repeating jewels. Panels can span several adjoining bands to create real festival-style flowers and intricate geometry rather than 50 bare concentric outlines. At 50 friends there are exactly 50 filled layers, and new friend layers continue beyond 50.

The owner can choose six themes unlocked at 0, 3, 10, 23, 40 and 50 friends. Each theme keeps the same layer count but uses a distinctive motif identity. The theme unlocks are checked by the backend, and individual identity lights in the tambor keep their immutable persisted `SlotIndex`. Their names/messages remain subject to the existing guest privacy policy.

The owner dashboard's **+ Add test friend / −1 friend / Reset / milestone jump** controls are in-memory only and never save contributions or unlock new styles.

Full local setup and validation instructions are in [living parol design](living-parol-design.md). The renderer change is frontend-only and does not require a new database migration; any existing pending six-theme data migration must still be checked against **DecoMyLanternDb**, not SQL Server `master`.
