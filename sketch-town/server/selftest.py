"""Check that OpenCV and the scanner pipeline work on this PC.

    python server/selftest.py

Renders every template as a fake colored sheet, distorts it like a skewed,
upside-down scan, and checks that the pipeline finds the corner marks and the
template code.
"""
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pipeline as P  # noqa: E402


def fake_scan(sheet, seed, upside_down):
    h, w = sheet.shape[:2]
    bed = np.full((h + 600, w + 600, 3), 235, np.uint8)
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    dst = np.float32([[340, 270], [280 + w, 325], [330 + w, 290 + h], [275, 320 + h]])
    bed = cv2.warpPerspective(sheet, cv2.getPerspectiveTransform(src, dst), bed.shape[1::-1], dst=bed,
                              borderMode=cv2.BORDER_TRANSPARENT)
    if upside_down:
        bed = cv2.rotate(bed, cv2.ROTATE_180)
    noise = np.random.default_rng(seed).normal(0, 6, bed.shape)
    return np.clip(bed.astype(int) + noise - 8, 0, 255).astype(np.uint8)


def main():
    print(f"OpenCV {cv2.__version__}, numpy {np.__version__}")
    ok = 0
    for i, (tid, tpl) in enumerate(P.TEMPLATES.items()):
        scan = fake_scan(P.render_test_sheet(tpl, scale=1.8, seed=i), i, upside_down=bool(i % 2))
        _, info = P.process(scan)
        good = info["template"] == tid and info["method"] == "fiducials"
        ok += good
        print(f"  {'OK ' if good else 'FAIL'} {tid:9s} -> {info['template']} via {info['method']}")
    print(f"{ok}/{len(P.TEMPLATES)} passed")
    return 0 if ok == len(P.TEMPLATES) else 1


if __name__ == "__main__":
    sys.exit(main())
