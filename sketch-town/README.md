# スケッチタウン Sketch Town — Future World Singapore

An interactive drawing installation for classrooms, inspired by teamLab's *Sketch Town*
(Future World, ArtScience Museum, Singapore). Children color one of 12 templates (truck, car, bullet train, bus, house, tower, school,
jet, helicopter, rocket, sailboat, fish) on paper or on screen. Then they scan it, and a UFO brings it into a 3D
Singapore city: cars drive the looping highways, houses sway, jets fly figure-8s and
sailboats bob on Merlion Bay. A blue dragon sometimes attacks, and the class taps it
together until its HP runs out.

It runs on one PC with no internet and no cloud. You need Python and Chrome or Edge.

```
 ┌───────────── Display 1: Operator station (http://127.0.0.1:8765/) ─────────────┐
 │ choose template · draw with mouse · print A4 sheets · webcam · scanner status  │
 └───────────────┬────────────────────────────────────────────────────────────────┘
                 │  POST image                    ▲ SSE events (spawn / dragon / …)
   flatbed ──► hot folder ──► Python server ──► OpenCV pipeline ──► RGBA texture
   scanner     (scans/inbox)  (server.py)       4 corner marks → warp → template
                                                code → white-balance → saturation
                                                → silhouette alpha cut
                 │                                ▼
 ┌───────────── Display 2: 3D projection wall (http://127.0.0.1:8765/wall.html) ──┐
 │ Three.js WebGL · PCF soft shadows · bloom · UFO tractor beam · dragon battle   │
 └────────────────────────────────────────────────────────────────────────────────┘
```

## 1. Install & start (Windows)

1. Install **Python 3.10+** from python.org (tick *"Add Python to PATH"*).
2. Double-click **`start_windows.bat`**. The first run installs OpenCV, which takes about a minute.
3. The operator station opens in your browser. Click **🌏 Open 3D Wall**. If the
   browser asks about window placement, allow it and the wall opens on the second screen
   (projector or TV). Press **F** on the wall for fullscreen.
4. Click the wall once to start the music.

macOS/Linux: `./start_mac_linux.sh`. To check OpenCV on a new PC, run `python server/selftest.py`.

Server options (add them after `start_windows.bat` or `server.py`):

| option | meaning |
|---|---|
| `--watch "D:\Scans"` | folder your scanner saves into (default `sketch-town/scans/inbox`) |
| `--host 0.0.0.0` | let other PCs/tablets on the school LAN open the pages |
| `--port 8765` | change the port |
| `--template house` | template used if a scan has no readable code (photo of a hand-drawn picture) |

## 2. Choosing a scanner (if you don't have one yet)

The app doesn't need a particular brand. What matters:

1. **The scanner's own software can save straight to a folder as JPG or PNG**, with no
   "Save as…" dialog each time. Almost all current Epson, Canon, Brother and ScanSnap
   software can do this.
2. Color, A4, 150–300 dpi.

| type | good for | examples (check current models in Japan) |
|---|---|---|
| **Sheet-fed (document feeder)** | a whole class: drop in a pile, everything appears one by one | ScanSnap iX1300 / iX1600, Brother ADS series, Epson ES / DS series |
| **Flatbed** | cheap, one sheet at a time, also works with thick paper | Canon CanoScan LiDE 300 / 400, Epson GT-S series |
| **School multifunction printer** | already in the staff room | works if it can "scan to PC folder" over the network |
| **No scanner: document camera (書画カメラ) or USB webcam** | most Japanese classrooms already have one (e.g. ELMO) | use the 📷 *Overhead camera* panel. It shows up as a normal webcam. |

For a class activity, a sheet-fed scanner is the most fun: children feed their own sheet and
watch the UFO bring it in about 3 seconds later. A document camera costs nothing extra. The software
removes shadows and corrects the angle, so the camera doesn't have to be perfectly straight.

## 3. Connect the scanner (hot folder)

Any scanner works if its app can **save JPG/PNG to a folder automatically**:

* **Epson** ScanSmart / Epson Scan 2 → *Save* → folder = `scans\inbox` → JPEG
* **Canon** IJ Scan Utility → *Settings* → *Save in* = `scans\inbox`
* **Brother** iPrint&Scan → *Scan to File* → destination folder
* **ScanSnap** Home → profile → *Save to* → folder
* **Windows Fax and Scan** / any app that saves images

Set the scanner to 150–300 dpi and color. Scan → the file appears in the folder → about one
second later the operator station plays the light-bar sweep and chime, and a UFO delivers
the drawing to the wall. If the scanner saves somewhere else, start with `--watch "that folder"`.

Other ways in:
* **📠 Scan now (WIA)**: on Windows with `pywin32` (the .bat installs it), this button starts the
  flatbed directly. It has not been tested on real hardware. Use the hot folder if your
  driver doesn't support WIA.
* **📂 Watch another folder (browser)**: Chrome/Edge folder picker. Useful when the server runs
  on a different PC than the scanner.
* **🖼 Upload**: pick image files by hand, such as phone photos of a sheet.
* **📷 Overhead camera**: a USB webcam or document camera looking down at the sheet. Fit the
  sheet in the green guide frame and press *Capture*.

## 4. Coloring sheets

On the operator station, open *🧾 Print coloring sheets* and print **this sheet** or **all 6**
(A4 landscape). The *All 12* button prints one of each. Each sheet has:

* **4 black corner squares**. The top-left one is hollow, so the software can tell which
  way is up. It corrects skew, perspective and upside-down scans.
* **4 small code squares** at the bottom center, which tell the software which template it is. A class
  can color a mixed pile of trucks, houses and jets and scan them in any order.

Keep the corner squares and code squares clean (no crayon on them). Anything drawn outside
the outline is cut away, so the 3D models have no white boxes around them.

## 5. Projector setup

1. Connect the projector and press **Windows + P → Extend** (not *Duplicate*). Then the
   projector is the second screen and the PC monitor keeps the operator station.
2. Set the projector to its native resolution (usually 1920×1080) in *Display settings*.
3. On the operator station click **🌏 Open 3D Wall**. In Chrome/Edge, allow *window placement*
   when asked, and the wall opens on the projector by itself. Otherwise drag the window there.
4. Move the mouse onto the projector, click the wall once (this starts the sound; browsers
   require one click), then press **F** for fullscreen.
5. Projectors wash out dark scenes. Press **B** (or *☀ Brightness* on the operator station) to
   brighten, or **N** for daytime. In a bright classroom, daytime mode is easier to see.
6. If the animation stutters, the wall lowers its quality on its own after a few seconds. You
   can also press **Q** to choose High / Medium / Low yourself (the choice is remembered).
7. Connect speakers to the PC. The wall plays the music, and the operator station plays the scanner chime.

## 6. Using the 3D wall

| input | action |
|---|---|
| click a car / train / bus / jet / helicopter / rocket / boat | hop + 360° spin + marimba note + speed boost (jets honk) |
| click a fish | it leaps out of the water with a splash |
| click a house / tower | bounce + windows flash |
| click the **dragon** | the nearest jets/trucks fire energy beams at it |
| click a jet/truck during the dragon attack | that vehicle fires at the dragon |
| drag / wheel | orbit / zoom the camera |
| **D** dragon · **N** day/night · **T** camera tour · **S** sample drawings · **H** home · **F** fullscreen · **M** mute · **Q** quality · **B** brightness | |

The operator station's *Wall controls* panel has the same buttons, so a teacher can run the
wall from the main screen with the mouse. Drawings are saved in `scans/textures` and come back
after a restart. *🧹 Clear city* removes them.

Limits on screen at once: 36 road vehicles, 30 buildings, 10 jets, 8 helicopters, 6 rockets, 10 boats, 14 fish. When a category is
full, the oldest drawing leaves with a sparkle.

## 7. Files

```
sketch-town/
  start_windows.bat / start_mac_linux.sh   launchers
  server/server.py        local web server, hot-folder watcher, SSE event bus, WIA scan
  server/pipeline.py      OpenCV: fiducials → perspective warp → code → color boost → alpha cut
  server/selftest.py      offline check of the pipeline
  shared/templates.json   the 12 templates (outlines, wheels, windows, 3D depth, scale)
  web/operator.html       Display 1 (drawing bed, scanner, webcam, printing, wall controls)
  web/wall.html           Display 2 (3D city)
  web/js/common.js        sheet rendering, print sheets, demo textures, event bus
  web/js/audio.js         Web Audio: pentatonic marimba ambience, dragon battle theme, SFX
  web/js/wall/world.js    sky, planet, Flyer, Supertrees, MBS, ArtScience, Merlion, bay, highways
  web/js/wall/actors.js   2D→3D paper-craft extrusion + vehicle / building / jet / boat behaviors
  web/js/wall/ufo.js      UFO tractor-beam delivery
  web/js/wall/dragon.js   articulated dragon, fire breath, HP
  web/vendor/three/       Three.js r169 (bundled, so no internet needed)
```

**Adding a template:** add an entry to `shared/templates.json` with a new `code` (13–15 are free), the
outline polygons in 1600×1200 sheet pixels, `kind` (`vehicle`, `building`, `jet`, `heli`, `rocket`, `boat`, `fish`) and
`unitsPer1000px` for its size in the city. The printing, drawing bed, scanner pipeline and 3D
extrusion all read this one file.

## 8. Tips for a school session

* Use a PC with a dedicated or recent integrated GPU. The wall is a full WebGL scene with shadows and bloom.
* Test print one sheet and scan it before the class arrives. The operator's activity log shows
  `via fiducials` when the corner marks were found.
* Thick crayon or marker scans best. Pale pencil is boosted, but it stays light.
* The server only listens to this PC unless you start it with `--host 0.0.0.0`.
