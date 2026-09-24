from PIL import Image
import collections
from pathlib import Path


def remove_black_bg(src: Path, dst: Path, thresh: int = 38) -> None:
    im = Image.open(src).convert("RGBA")
    px = im.load()
    w, h = im.size
    visited = [[False] * w for _ in range(h)]
    q = collections.deque()

    def is_bg(x: int, y: int) -> bool:
        r, g, b, a = px[x, y]
        return a > 0 and r <= thresh and g <= thresh and b <= thresh

    for x in range(w):
        for y in (0, h - 1):
            if is_bg(x, y):
                q.append((x, y))
                visited[y][x] = True
    for y in range(h):
        for x in (0, w - 1):
            if is_bg(x, y) and not visited[y][x]:
                q.append((x, y))
                visited[y][x] = True

    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx] and is_bg(nx, ny):
                visited[ny][nx] = True
                q.append((nx, ny))

    im.save(dst, "PNG")
    print(f"wrote {dst} ({w}x{h})")


base = Path(r"G:\LMS Workix\apps\web\public\assets\images\home-one")
remove_black_bg(base / "about-page-intro.png", base / "about-page-intro.png")
remove_black_bg(base / "faq-intro.png", base / "faq-intro.png")
