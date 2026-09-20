#!/usr/bin/env python3
"""
Static site builder.

Combines the shared header/footer/head markup below with each page's own
content fragment (in content/) to produce the final .html files. This is
the single place to edit the header or footer — run this script afterward
to regenerate every page.

Usage:
    python3 build.py
"""

import os

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

HEAD_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{root}style.css">
</head>
<body>
"""

HEADER_TEMPLATE = """
<header class="site-header">
  <div class="wrap header-inner">
    <a href="{root}index.html" class="mark" aria-label="Henry Aronofsky — home">HA</a>
    <nav class="nav" aria-label="Primary">
      <a href="{root}experience.html"{experience_current}>Experience</a>
      <a href="{root}portfolio.html"{portfolio_current}>Portfolio</a>
    </nav>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav" aria-label="Toggle menu">
      <span class="nav-toggle-bars"><span></span><span></span><span></span></span>
    </button>
    <nav id="mobile-nav" class="mobile-nav" aria-label="Mobile">
      <a href="{root}index.html#about">About</a>
      <a href="{root}index.html#education">Education</a>
      <a href="{root}experience.html"{experience_current}>Experience</a>
      <a href="{root}portfolio.html"{portfolio_current}>Portfolio</a>
      <a href="{root}index.html#contact">Contact</a>
    </nav>
  </div>
</header>

<main>
"""

FOOTER_TEMPLATE = """
</main>

<footer>
  <div class="wrap site-footer">
    <p class="fineprint">Henry Aronofsky — Mechanical Engineering, Harvard College</p>
  </div>
</footer>

<script src="{root}script.js"></script>
</body>
</html>
"""

# Each page: output path (relative to repo root), <title>, meta description,
# which top-level nav item (if any) is "current", and the content fragment
# to insert into <main>.
PAGES = [
    dict(
        out="index.html",
        title="Henry Aronofsky — Mechanical Engineering",
        description="Portfolio of Henry Aronofsky, a mechanical engineering student at Harvard College working across robotics, manufacturing, and software.",
        nav_current=None,
        content="content/index.html",
    ),
    dict(
        out="experience.html",
        title="Experience — Henry Aronofsky",
        description="Work and research experience of Henry Aronofsky, a mechanical engineering student at Harvard College.",
        nav_current="experience",
        content="content/experience.html",
    ),
    dict(
        out="portfolio.html",
        title="Portfolio — Henry Aronofsky",
        description="Portfolio of projects by Henry Aronofsky, a mechanical engineering student at Harvard College.",
        nav_current="portfolio",
        content="content/portfolio.html",
    ),
    dict(
        out="portfolio/es51/index.html",
        title="Bumblebee — Henry Aronofsky",
        description="Bumblebee: a competition robot built for Harvard ES51's Turf Wars competition.",
        nav_current="portfolio",
        content="content/portfolio/es51.html",
    ),
    dict(
        out="portfolio/es50/index.html",
        title="EuroRackingIt — Henry Aronofsky",
        description="EuroRackingIt: a fully analog 12-note piano built for Harvard ES50.",
        nav_current="portfolio",
        content="content/portfolio/es50.html",
    ),
    dict(
        out="portfolio/woodLab/index.html",
        title="Jellyfish Motion Rig — Henry Aronofsky",
        description="A stepper-motor-driven rig built to study jellyfish motion at the Harvard Microrobotics Laboratory.",
        nav_current="portfolio",
        content="content/portfolio/woodLab.html",
    ),
    dict(
        out="portfolio/sideProjects/doubleBass/index.html",
        title="Scratch-Built Double Bass — Henry Aronofsky",
        description="A four-string upright double bass built from scratch out of reclaimed lumber.",
        nav_current="portfolio",
        content="content/portfolio/doubleBass.html",
    ),
    dict(
        out="portfolio/sideProjects/cars/index.html",
        title="Personal Vehicle Work — Henry Aronofsky",
        description="Personal automotive maintenance and repair work on a carbureted V8.",
        nav_current="portfolio",
        content="content/portfolio/cars.html",
    ),
    dict(
        out="portfolio/sideProjects/plumbingAndConstruction/index.html",
        title="Plumbing &amp; Construction — Henry Aronofsky",
        description="Plumbing, pipe fitting, and general construction work.",
        nav_current="portfolio",
        content="content/portfolio/plumbingAndConstruction.html",
    ),
]


def build_page(page):
    depth = page["out"].count("/")
    root = "../" * depth

    def current_attr(name):
        return ' aria-current="page"' if page["nav_current"] == name else ""

    content_path = os.path.join(ROOT_DIR, page["content"])
    with open(content_path, "r", encoding="utf-8") as f:
        content = f.read().rstrip("\n")

    html = HEAD_TEMPLATE.format(title=page["title"], description=page["description"], root=root)
    html += HEADER_TEMPLATE.format(
        root=root,
        experience_current=current_attr("experience"),
        portfolio_current=current_attr("portfolio"),
    )
    html += "\n" + content + "\n"
    html += FOOTER_TEMPLATE.format(root=root)

    out_path = os.path.join(ROOT_DIR, page["out"])
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"built {page['out']}")


def main():
    for page in PAGES:
        build_page(page)


if __name__ == "__main__":
    main()
