Color Separation
================

[![deploy](https://github.com/hafaio/color-separation/actions/workflows/deploy.yml/badge.svg)](https://github.com/hafaio/color-separation/actions/workflows/deploy.yml)

A spot color separation webapp designed for risograph. Go to the
[site](https://hafaio.github.io/color-separation) and start separating!

Upload an image, pick the inks you can print, and it solves for how much of
each ink every color needs, then hands back one grayscale layer per ink.

Mixing models
-------------

How overlapping inks combine. Each is a different guess at the same physics,
trading accuracy for speed.

- **Subtractive** — ink amounts add linearly in encoded sRGB. Not physical, but
  it fits nearly any target exactly and solves as a linear program, so it is by
  far the fastest.
- **Multiply** — each ink is a filter, so overlapping inks multiply and the
  stack darkens: yellow over blue gives green, blue over red gives a dark plum.
  Built from each ink's published color, so it needs no spectral data.
  Order-independent, and it can only darken.
- **Kubelka-Munk** — treats inks as filters, over 36 spectral bands from
  calibrated ink data, with fluorescence. Light passes down through each film,
  reflects off the paper, and passes back up, so overlapping inks multiply and
  genuinely darken. Slowest and closest to what actually prints.

Controls
--------

- **Ink Minimization** — drop ink layers wherever a color can be rebuilt from
  fewer of them, in ΔE00. With more inks than color dimensions, many different
  ink combinations produce the same color; without this the solver happily
  spends six overlapping layers where one would do.
- **Discretizations** — snap opacities to a fixed number of steps, for a more
  posterized result.
- **Ordering** — which ink is laid down first. Only matters for models where
  overprinting is order-dependent.
- **Press Simulation** — screened dots spread on absorbent paper, so a nominal
  50% prints closer to 75%; a dot landing on ink instead of paper spreads no
  further, so overprints stay where they were. Offered for Multiply and
  Kubelka-Munk, on by default, since without it midtones come out roughly 10
  ΔE00 too light. Calibrated from one reference chart, so treat it as
  approximate for any particular machine and paper.

Known limits
------------

- Metallic inks are not modeled — they are flake, and reflect directionally
  rather than scattering diffusely. White and the grays now cover under
  Kubelka-Munk, but how strongly is a bracketed estimate rather than a
  measurement, since Riso publishes nothing about it.
- Fluorescent inks are approximated rather than modeled. Multiply gets them
  about right on white paper and Kubelka-Munk carries an explicit emission
  term, but their published colors are the least accurate in the palette —
  fluorescent green's is roughly 15 ΔE from what it actually prints.
- 6 inks are calibrated from real spectral measurements; the rest are still
  inferred from their published color. An ink Kubelka-Munk can't reproduce
  closely enough is left out of that model rather than rendered wrong, and
  selecting one drops the mode back to Multiply for you.
- Paper is assumed to be white.

To Do
-----

- [ ] Find a way to allow zooming and panning of image.
