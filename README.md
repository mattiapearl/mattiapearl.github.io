# mattiapearl.github.io

[Tools & research](https://mattiapearl.github.io/) — the index of this site's pages.

## Pages

| Section | Page |
|---|---|
| Research | [End Portal eyes](mcsr-ranked/) |
| Research | [Match-score explainer](contribution-score/) |
| Supporting detail | [Scoring notes & benchmarks](contribution-score/details.html) |
| Tools | [Counter](counthing.html) |
| Tools | [Team Matcher](matcher.html) |
| Prototype | [Innected](innected.html) — placeholder |

Edit `index.html` and `home.css` to update the directory. The homepage reuses the
existing self-hosted Atkinson fonts; subpage code and URLs are independent.

```sh
python _checks/index.py
python -m http.server 8000 --bind 127.0.0.1
```

The index check requires every public HTML page to have a link, excluding
underscore-prefixed developer folders. GitHub Pages publishes the root of `main`.

## Counthing
### This thing literally just counts
Created to count products when clients are a bit messy and using a txt file isn't too clean

Stack: AlpineJS, Water CSS

To delete items check the *Deleting* checkbox
