"""OpenCV scanner pipeline for Sketch Town.

scan image (any size / rotation / perspective)
  -> find the 4 black corner fiducials (top-left one is hollow = orientation)
  -> 4-point perspective warp to the canonical 1600x1200 sheet
  -> read the 3-bit template code printed between the bottom fiducials
  -> paper white-balance + crayon saturation boost
  -> cut out the template silhouette (alpha) and save an RGBA PNG texture
"""
import json
import os

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_PATH = os.path.join(HERE, "..", "shared", "templates.json")
OUT_W, OUT_H = 1024, 768


def load_templates():
    with open(TEMPLATES_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return data["sheet"], {t["id"]: t for t in data["templates"]}


SHEET, TEMPLATES = load_templates()
W, H = SHEET["w"], SHEET["h"]
FID = SHEET["fiducial"]
_c = FID["margin"] + FID["size"] / 2.0
# fiducial centres on the canonical sheet: TL, TR, BR, BL
CANON_CENTERS = np.float32([[_c, _c], [W - _c, _c], [W - _c, H - _c], [_c, H - _c]])


class ScanError(Exception):
    pass


# ---------------------------------------------------------------- reading
def read_image(path):
    """Read PNG/JPG/BMP/TIFF (and PDF first page if PyMuPDF is installed)."""
    if path.lower().endswith(".pdf"):
        try:
            import fitz  # PyMuPDF, optional
        except ImportError as e:
            raise ScanError("PDF scans need 'pip install pymupdf' (or set the scanner to save JPG/PNG)") from e
        doc = fitz.open(path)
        pix = doc[0].get_pixmap(dpi=150)
        img = np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, pix.n)
        return cv2.cvtColor(img, cv2.COLOR_RGB2BGR if pix.n == 3 else cv2.COLOR_RGBA2BGR)
    data = np.fromfile(path, np.uint8)  # works with non-ASCII (Japanese) Windows paths
    return decode_bytes(data)


def decode_bytes(data):
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ScanError("could not decode image")
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    elif img.shape[2] == 4:  # flatten transparency onto white paper
        a = img[:, :, 3:4].astype(np.float32) / 255.0
        img = (img[:, :, :3] * a + 255 * (1 - a)).astype(np.uint8)
    return img


# ------------------------------------------------------------ registration
def _square_candidates(gray, adaptive=False):
    h, w = gray.shape
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    if adaptive:  # camera photos with shadows / uneven classroom light
        block = int(min(w, h) / 6) | 1
        bw = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, block, 18)
    else:
        _, bw = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(bw, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    min_area = (min(w, h) * 0.012) ** 2
    max_area = (min(w, h) * 0.2) ** 2
    out = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if not (min_area < area < max_area):
            continue
        approx = cv2.approxPolyDP(cnt, 0.06 * cv2.arcLength(cnt, True), True)
        if len(approx) != 4 or not cv2.isContourConvex(approx):
            continue
        (cx, cy), (rw, rh), _ = cv2.minAreaRect(cnt)
        if min(rw, rh) / max(rw, rh) < 0.7:
            continue
        if area / (rw * rh + 1e-6) < 0.8:  # must be a filled square
            continue
        out.append({"c": (cx, cy), "size": (rw + rh) / 2, "area": area})
    return out


def _hollowness(gray, cand):
    cx, cy = cand["c"]
    r = max(2, int(cand["size"] * 0.12))
    patch = gray[int(cy) - r:int(cy) + r + 1, int(cx) - r:int(cx) + r + 1]
    return float(patch.mean()) if patch.size else 0.0


def find_fiducials(img):
    """Return the 4 fiducial centres ordered TL, TR, BR, BL in sheet orientation."""
    scale = 1600.0 / max(img.shape[:2])
    small = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA) if scale < 1 else img
    s = scale if scale < 1 else 1.0
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    for adaptive in (False, True):
        pts = _pick_corners(gray, _square_candidates(gray, adaptive))
        if pts is not None:
            return pts / s
    return None


def _pick_corners(gray, cands):
    if len(cands) < 4:
        return None
    h, w = gray.shape
    corners = [(0, 0), (w, 0), (w, h), (0, h)]
    chosen = []
    for corner in corners:
        best = min(cands, key=lambda c: (c["c"][0] - corner[0]) ** 2 + (c["c"][1] - corner[1]) ** 2)
        chosen.append(best)
    if len({id(c) for c in chosen}) != 4:
        return None
    sizes = [c["size"] for c in chosen]
    if max(sizes) > 1.8 * min(sizes):
        return None
    # orientation: the hollow (white-centred) square is the sheet's top-left
    hollow = [_hollowness(gray, c) for c in chosen]
    rot = int(np.argmax(hollow)) if max(hollow) > 128 else 0
    chosen = chosen[rot:] + chosen[:rot]
    return np.float32([c["c"] for c in chosen])


def find_paper_quad(img):
    """Fallback: the largest 4-sided bright region (sheet edges on a dark scanner lid)."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, bw = cv2.threshold(cv2.GaussianBlur(gray, (7, 7), 0), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(bw, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    cnt = max(contours, key=cv2.contourArea)
    if cv2.contourArea(cnt) < 0.3 * gray.size:
        return None
    approx = cv2.approxPolyDP(cnt, 0.02 * cv2.arcLength(cnt, True), True)
    if len(approx) != 4:
        return None
    pts = approx.reshape(4, 2).astype(np.float32)
    ssum, diff = pts.sum(1), np.diff(pts, axis=1).ravel()
    return np.float32([pts[np.argmin(ssum)], pts[np.argmin(diff)], pts[np.argmax(ssum)], pts[np.argmax(diff)]])


def register(img, corners=None):
    """corners: optional 4 points (fractions 0..1 of the image size, order TL, TR, BR, BL)
    clicked by the operator on the corner squares when automatic detection fails."""
    if corners is not None:
        h, w = img.shape[:2]
        pts = np.float32([[x * w, y * h] for x, y in corners])
        M = cv2.getPerspectiveTransform(pts, CANON_CENTERS)
        return cv2.warpPerspective(img, M, (W, H), flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255)), "manual-corners"
    pts = find_fiducials(img)
    if pts is not None:
        M = cv2.getPerspectiveTransform(pts, CANON_CENTERS)
        return cv2.warpPerspective(img, M, (W, H), flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255)), "fiducials"
    quad = find_paper_quad(img)
    if quad is not None:
        dst = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
        M = cv2.getPerspectiveTransform(quad, dst)
        return cv2.warpPerspective(img, M, (W, H), flags=cv2.INTER_CUBIC), "paper-edge"
    return cv2.resize(img, (W, H), interpolation=cv2.INTER_AREA), "full-image"


def read_code(sheet_bgr):
    gray = cv2.cvtColor(sheet_bgr, cv2.COLOR_BGR2GRAY)
    cfg = SHEET["code"]
    r = int(cfg["size"] * 0.3)
    code = 0
    for i, x in enumerate(cfg["xs"]):
        patch = gray[cfg["y"] - r:cfg["y"] + r, x - r:x + r]
        if patch.mean() < 110:
            code |= 1 << i
    return code


def template_for_code(code):
    for t in TEMPLATES.values():
        if t["code"] == code:
            return t
    return None


# ----------------------------------------------------------- colour + mask
def silhouette_mask(tpl, w=W, h=H):
    k = w / W
    mask = np.zeros((h, w), np.uint8)
    for part in tpl["parts"]:
        cv2.fillPoly(mask, [np.int32(np.array(part["poly"]) * k)], 255, cv2.LINE_AA)
    for wh in tpl.get("wheels", []):
        cv2.circle(mask, (int(wh["c"][0] * k), int(wh["c"][1] * k)), int(wh["r"] * k), 255, -1, cv2.LINE_AA)
    stroke = max(1, int(SHEET["stroke"] * k))
    mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (stroke * 2 + 1, stroke * 2 + 1)))
    return cv2.GaussianBlur(mask, (5, 5), 0)


def flatten_light(sheet_bgr, tpl):
    """Remove shadows / light gradients (camera photos) using the blank paper around
    the drawing as a reference: estimate the paper colour everywhere by inpainting
    over the drawing and the printed marks, then divide it out."""
    sw, sh = 160, 120
    small = cv2.resize(sheet_bgr, (sw, sh), interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    not_paper = cv2.resize(silhouette_mask(tpl), (sw, sh)) > 0
    not_paper = cv2.dilate(not_paper.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    not_paper |= gray < np.percentile(gray[~not_paper], 90) * 0.75  # printed marks and text
    if not_paper.mean() > 0.9:
        return sheet_bgr
    bg = cv2.inpaint(small, not_paper.astype(np.uint8) * 255, 6, cv2.INPAINT_TELEA)
    bg = cv2.GaussianBlur(bg, (0, 0), 6)
    bg = cv2.resize(bg, sheet_bgr.shape[1::-1], interpolation=cv2.INTER_CUBIC).astype(np.float32)
    return np.clip(sheet_bgr.astype(np.float32) / np.maximum(bg, 30) * 245, 0, 255).astype(np.uint8)


def enhance(sheet_bgr, boost=True):
    img = sheet_bgr.astype(np.float32)
    # white-balance on the paper: brightest pixels become pure white
    white = np.percentile(img.reshape(-1, 3), 96, axis=0)
    img = np.clip(img * (255.0 / np.maximum(white, 60)), 0, 255).astype(np.uint8)
    if not boost:
        return img
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    s, v = hsv[:, :, 1], hsv[:, :, 2]
    colored = s > 28
    s[colored] = np.clip(s[colored] * 1.7 + 25, 0, 255)
    v[colored] = np.clip(v[colored] * 1.06 + 6, 0, 255)
    paper = (~colored) & (v > 185)  # faint scanner noise on blank paper -> clean white
    s[paper] = 0
    v[paper] = 255
    out = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
    # crayon strokes leave white speckles: a light median closes the texture
    return cv2.medianBlur(out, 3)


def cutout(sheet_bgr, tpl, boost=True):
    color = enhance(flatten_light(sheet_bgr, tpl) if boost else sheet_bgr, boost)
    color = cv2.resize(color, (OUT_W, OUT_H), interpolation=cv2.INTER_AREA)
    alpha = silhouette_mask(tpl, OUT_W, OUT_H)
    return np.dstack([color, alpha])


def dominant_color(rgba):
    a = rgba[:, :, 3] > 200
    px = rgba[:, :, :3][a].reshape(-1, 3).astype(np.float32)
    if len(px) == 0:
        return "#ffffff"
    hsv = cv2.cvtColor(px.reshape(-1, 1, 3).astype(np.uint8), cv2.COLOR_BGR2HSV).reshape(-1, 3)
    sat = px[hsv[:, 1] > 60]
    b, g, r = (np.median(sat, 0) if len(sat) > 50 else np.median(px, 0)).astype(int)
    return "#%02x%02x%02x" % (r, g, b)


def process(img, template_id=None, registered=False, boost=True, force_template=False, corners=None):
    """Return (rgba, info). `registered=True` means img is already the canonical sheet.
    `force_template=True` uses `template_id` even if the sheet's code says otherwise
    (manual override); `corners` are operator-clicked corner-square positions."""
    if registered:
        sheet = cv2.resize(img, (W, H), interpolation=cv2.INTER_AREA)
        method = "digital"
    else:
        sheet, method = register(img, corners)
    tpl = None
    if not (force_template and template_id in TEMPLATES):
        code = read_code(sheet) if method in ("fiducials", "manual-corners") else 0
        tpl = template_for_code(code)
    detected = tpl is not None
    if tpl is None:
        tpl = TEMPLATES.get(template_id) or TEMPLATES["truck"]
    rgba = cutout(sheet, tpl, boost)
    return rgba, {
        "template": tpl["id"],
        "kind": tpl["kind"],
        "method": method,
        "codeDetected": detected,
        "color": dominant_color(rgba),
    }


def save_png(path, rgba):
    ok, buf = cv2.imencode(".png", rgba, [cv2.IMWRITE_PNG_COMPRESSION, 6])
    if not ok:
        raise ScanError("PNG encode failed")
    buf.tofile(path)


# ------------------------------------------------------ test sheet render
def render_test_sheet(tpl, scale=1.0, fill=True, seed=0):
    """Minimal sheet render (fiducials, code, outline, random crayon fill) for tests."""
    rng = np.random.default_rng(seed)
    w, h = int(W * scale), int(H * scale)
    img = np.full((h, w, 3), 255, np.uint8)
    k = scale
    if fill:
        for part in tpl["parts"]:
            col = tuple(int(x) for x in rng.integers(30, 230, 3))
            cv2.fillPoly(img, [np.int32(np.array(part["poly"]) * k)], col)
        for wh in tpl.get("wheels", []):
            cv2.circle(img, (int(wh["c"][0] * k), int(wh["c"][1] * k)), int(wh["r"] * k), (60, 60, 60), -1)
    st = max(1, int(SHEET["stroke"] * k))
    for part in tpl["parts"]:
        cv2.polylines(img, [np.int32(np.array(part["poly"]) * k)], True, (0, 0, 0), st)
    fs, m = FID["size"] * k, FID["margin"] * k
    for i, (x, y) in enumerate([(m, m), (w - m - fs, m), (w - m - fs, h - m - fs), (m, h - m - fs)]):
        cv2.rectangle(img, (int(x), int(y)), (int(x + fs), int(y + fs)), (0, 0, 0), -1)
        if i == 0:
            hs = fs * FID["hole"]
            o = (fs - hs) / 2
            cv2.rectangle(img, (int(x + o), int(y + o)), (int(x + o + hs), int(y + o + hs)), (255, 255, 255), -1)
    cs = SHEET["code"]["size"] * k
    for i, x in enumerate(SHEET["code"]["xs"]):
        p1 = (int(x * k - cs / 2), int(SHEET["code"]["y"] * k - cs / 2))
        p2 = (int(x * k + cs / 2), int(SHEET["code"]["y"] * k + cs / 2))
        cv2.rectangle(img, p1, p2, (0, 0, 0), -1 if tpl["code"] >> i & 1 else max(1, int(3 * k)))
    return img
