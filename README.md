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

Known limits
------------

- White and metallic inks are not modeled. They work by scattering light, and
  every model here only removes light, so white is a near no-op in all three.
- Fluorescent inks emit light as well as absorbing it, so only Kubelka-Munk,
  which carries an explicit emission term, gets them close.
- Real overprints come out slightly lighter than Multiply predicts, because a
  second ink transfers less onto already-inked paper than onto bare stock.
- Paper is assumed to be white.

To Do
-----

- [ ] Find a way to allow zooming and panning of image.
