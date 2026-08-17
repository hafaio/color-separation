/**
 * Spectrophotometer readings of riso inks, excerpted from the Exploriso ICC
 * profile collection — the only measured optical data in this repository, and
 * the reason `kBandsSource: "measured"` is not a dead variant.
 *
 * Source: https://en.exploriso.info/exploriso-colour-profiles/, downloaded
 * 2026-08-15. Each profile embeds its original characterization target in the
 * ICC `targ` tag: 418 patches of device coverage plus spectral reflectance,
 * 380–730 nm at 10 nm — this project's grid exactly, no resampling.
 * `scratchpad/extract_cgats.py` pulls the tag out; the arrays below are its
 * output verbatim. Printed on a RISO MZ770 except the blue/gray and
 * black/gray sheets, which are Duplo duplicators.
 *
 * The compilation's licence is not stated, so this is a small attributed
 * excerpt — 32 of roughly 6,700 spectra, only the ones the ink table and its
 * tests actually consume.
 *
 * Three things a reader has to know before trusting a number here.
 *
 * The profiles name their channels generically (`Cyan`, `Red`), not by riso
 * ink, so each film below is identified by rendering it and matching against
 * the published hex, then cross-checking against the other profiles printing
 * the same ink. Blue is confirmed by six independent profiles agreeing on its
 * absorption peak to ±2%.
 *
 * A film's reading is only ever used as the ratio solid/paper from the same
 * sheet, which is what the forward model wants — a transmittance, not a
 * reflectance. The paper carries an optical brightener and reads above 1.0
 * from 420 to 450 nm; the ratio cancels the substrate and the brightener's
 * first-order contribution, but not all of it, since the emission excited
 * under an ink film escapes attenuated once rather than twice. That residual
 * biases the recovered absorption low across 400–500 nm — measured at up to
 * 12% by comparing the same ink across papers whose 440 nm radiance factor
 * runs 1.02 to 1.13. Each ink is therefore sourced from the least-brightened
 * paper that carries it, ties broken toward sharing a sheet with the other
 * inks taken, which is why five sheets cover eight films.
 *
 * A reading is of one press's ink lay, not of the ink. What it determines is
 * K·D — absorption times the thickness that press laid down — and the MZ770
 * lays roughly 25% more ink than the density riso's published hexes describe.
 * So the measurement is authoritative about the *shape* of K(λ) and says
 * nothing about which multiple of it a given press deposits; `inks.ts` takes
 * the shape from here and the one thickness scalar from the hex.
 */

// prettier-ignore
const PAPER_BLUE_FPINK_YELLOW: readonly number[] = [
  0.35914, 0.41698, 0.52258, 0.73468, 0.9492, 1.01819, 1.02181, 0.99317,
  0.96447, 0.94363, 0.92482, 0.90943, 0.89612, 0.88486, 0.87509, 0.8647,
  0.85762, 0.85182, 0.84405, 0.84115, 0.83751, 0.83667, 0.83773, 0.84113,
  0.8462, 0.85281, 0.86047, 0.869, 0.8764, 0.8788, 0.87856, 0.8775, 0.87875,
  0.88106, 0.88275, 0.88492,
];

// prettier-ignore
const PAPER_RED_BLACK: readonly number[] = [
  0.35372, 0.41412, 0.52013, 0.7306, 0.94165, 1.00937, 1.01213, 0.98332,
  0.95462, 0.93426, 0.91587, 0.90062, 0.88748, 0.87665, 0.8674, 0.85758,
  0.85084, 0.84545, 0.83876, 0.83689, 0.8338, 0.83371, 0.83518, 0.83852,
  0.84361, 0.85026, 0.85798, 0.86632, 0.87343, 0.87562, 0.87536, 0.8743,
  0.87635, 0.87808, 0.88051, 0.88336,
];

// prettier-ignore
const PAPER_RED_GREEN_BLUE: readonly number[] = [
  0.27184, 0.3229, 0.4218, 0.64148, 0.9079, 1.0106, 1.02195, 0.99231, 0.95588,
  0.93101, 0.91021, 0.89221, 0.87676, 0.86411, 0.85348, 0.84218, 0.83465,
  0.82986, 0.8255, 0.82566, 0.8225, 0.82102, 0.823, 0.82897, 0.83709, 0.84462,
  0.85103, 0.85795, 0.86408, 0.86655, 0.86797, 0.86822, 0.86942, 0.86932,
  0.86916, 0.87063,
];

// prettier-ignore
const PAPER_FORANGE_TEAL: readonly number[] = [
  0.34687, 0.4043, 0.50968, 0.7248, 0.9442, 1.01488, 1.01764, 0.98809, 0.95907,
  0.93842, 0.91941, 0.9037, 0.89027, 0.87899, 0.86937, 0.85965, 0.85299,
  0.84696, 0.8393, 0.83682, 0.83353, 0.83329, 0.8351, 0.83881, 0.84414, 0.85046,
  0.85817, 0.86641, 0.8737, 0.8757, 0.87611, 0.87504, 0.87631, 0.8781, 0.87888,
  0.88134,
];

// prettier-ignore
const PAPER_BLUE_GRAY: readonly number[] = [
  0.255, 0.30332, 0.40962, 0.66224, 0.97417, 1.10004, 1.11328, 1.07247, 1.02755,
  0.99847, 0.97676, 0.96096, 0.95071, 0.94471, 0.94154, 0.938, 0.93664, 0.93635,
  0.93382, 0.93603, 0.93516, 0.93489, 0.93504, 0.93563, 0.93645, 0.93646,
  0.93746, 0.93907, 0.9397, 0.93743, 0.93604, 0.93557, 0.93709, 0.93885,
  0.93817, 0.93817,
];

// prettier-ignore
const SOLID_BLUE: readonly number[] = [
  0.05532, 0.06634, 0.08841, 0.12405, 0.16224, 0.21147, 0.29351, 0.36772,
  0.39825, 0.4077, 0.39124, 0.35575, 0.30796, 0.24706, 0.17931, 0.11969, 0.0788,
  0.05343, 0.03952, 0.03426, 0.03336, 0.03413, 0.036, 0.03891, 0.04193, 0.04455,
  0.047, 0.04858, 0.04893, 0.04813, 0.0478, 0.04839, 0.05069, 0.05584, 0.06193,
  0.06765,
];

// prettier-ignore
const SOLID_YELLOW: readonly number[] = [
  0.06857, 0.06712, 0.06913, 0.07606, 0.08011, 0.07983, 0.0787, 0.07821,
  0.07868, 0.07864, 0.08208, 0.10968, 0.23238, 0.50109, 0.73134, 0.81165,
  0.82821, 0.82819, 0.82212, 0.82109, 0.82129, 0.82537, 0.8286, 0.83135,
  0.83597, 0.84302, 0.85138, 0.86069, 0.86853, 0.87021, 0.86929, 0.86755,
  0.87002, 0.8729, 0.87524, 0.87516,
];

// prettier-ignore
const SOLID_FLUORESCENT_PINK: readonly number[] = [
  0.24655, 0.28788, 0.35737, 0.50221, 0.65056, 0.71178, 0.72829, 0.68244,
  0.58287, 0.47071, 0.35914, 0.26521, 0.20723, 0.1698, 0.13401, 0.11204,
  0.11064, 0.1202, 0.13078, 0.16577, 0.29121, 0.58663, 0.98304, 1.19213,
  1.17527, 1.11109, 1.06881, 1.03762, 1.00591, 0.97138, 0.94255, 0.92133,
  0.91006, 0.90424, 0.90013, 0.89483,
];

// prettier-ignore
const SOLID_RED: readonly number[] = [
  0.06665, 0.06376, 0.06456, 0.07204, 0.07743, 0.07673, 0.07411, 0.06901,
  0.06218, 0.05541, 0.05118, 0.04932, 0.0497, 0.0519, 0.05368, 0.05597, 0.06206,
  0.07169, 0.08797, 0.13683, 0.26208, 0.45876, 0.63511, 0.73011, 0.77046,
  0.78928, 0.80168, 0.81245, 0.82089, 0.82368, 0.82419, 0.82343, 0.82567,
  0.82808, 0.8289, 0.82617,
];

// prettier-ignore
const SOLID_BLACK: readonly number[] = [
  0.03579, 0.03652, 0.03733, 0.03872, 0.03958, 0.04004, 0.04049, 0.04057,
  0.04107, 0.04163, 0.04237, 0.04298, 0.04337, 0.04392, 0.04447, 0.04476,
  0.04519, 0.04571, 0.04606, 0.04666, 0.04709, 0.04756, 0.04797, 0.04844,
  0.04892, 0.04945, 0.04981, 0.05034, 0.0509, 0.05107, 0.05149, 0.05199,
  0.05237, 0.05285, 0.05351, 0.05412,
];

// prettier-ignore
const SOLID_GREEN: readonly number[] = [
  0.03536, 0.03851, 0.0424, 0.04877, 0.05517, 0.05902, 0.06305, 0.06822,
  0.07705, 0.08832, 0.1021, 0.13979, 0.24195, 0.36409, 0.39004, 0.35031,
  0.29416, 0.2354, 0.18186, 0.13823, 0.10103, 0.07121, 0.05189, 0.04382,
  0.04203, 0.04241, 0.04317, 0.0447, 0.04794, 0.05269, 0.0584, 0.06419, 0.06924,
  0.07075, 0.06867, 0.06842,
];

// prettier-ignore
const SOLID_TEAL: readonly number[] = [
  0.04792, 0.05349, 0.05958, 0.06841, 0.07742, 0.0862, 0.09685, 0.10971,
  0.12992, 0.15923, 0.1828, 0.19268, 0.18956, 0.17627, 0.15454, 0.12774,
  0.10138, 0.0778, 0.05923, 0.04809, 0.04215, 0.03896, 0.03825, 0.03981,
  0.04237, 0.04474, 0.04698, 0.04914, 0.05109, 0.0522, 0.05278, 0.0531, 0.05388,
  0.05614, 0.05964, 0.06411,
];

// prettier-ignore
const SOLID_FLUORESCENT_ORANGE: readonly number[] = [
  0.21265, 0.22429, 0.24098, 0.27603, 0.27972, 0.24423, 0.21162, 0.1857, 0.169,
  0.16584, 0.18219, 0.20798, 0.21954, 0.20146, 0.15778, 0.12388, 0.12223,
  0.14429, 0.1732, 0.242, 0.44709, 0.82161, 1.15191, 1.21365, 1.13312, 1.0643,
  1.02704, 1.00073, 0.97425, 0.94457, 0.91926, 0.90119, 0.89264, 0.88866,
  0.8866, 0.88253,
];

// prettier-ignore
const SOLID_GRAY: readonly number[] = [
  0.0815, 0.10739, 0.13724, 0.16232, 0.17644, 0.17975, 0.17862, 0.17585,
  0.17442, 0.17458, 0.17527, 0.17576, 0.17616, 0.1765, 0.17645, 0.17616,
  0.17623, 0.17647, 0.17615, 0.17652, 0.17645, 0.17653, 0.17671, 0.17723,
  0.17755, 0.17789, 0.17822, 0.17893, 0.17958, 0.17943, 0.1796, 0.18001,
  0.18047, 0.18112, 0.18204, 0.18329,
];

// prettier-ignore
const SOLID_BLUE_ON_GRAY_SHEET: readonly number[] = [
  0.0333, 0.04166, 0.05364, 0.06984, 0.08659, 0.11477, 0.1736, 0.23167, 0.25688,
  0.26554, 0.25153, 0.2209, 0.1808, 0.1331, 0.08575, 0.05107, 0.03227, 0.02343,
  0.01973, 0.01893, 0.01959, 0.0208, 0.02243, 0.02472, 0.02691, 0.02883,
  0.03041, 0.03137, 0.03137, 0.03075, 0.03049, 0.03088, 0.03298, 0.03718,
  0.04158, 0.04493,
];

// prettier-ignore
const GRAY_OVER_BLUE_STACK: readonly number[] = [
  0.04581, 0.06056, 0.08179, 0.09841, 0.10618, 0.11193, 0.11881, 0.12301,
  0.1234, 0.12275, 0.12117, 0.11865, 0.11465, 0.10827, 0.09914, 0.08838,
  0.07795, 0.06824, 0.05962, 0.05392, 0.05062, 0.04899, 0.04806, 0.04786,
  0.04833, 0.04897, 0.0499, 0.05079, 0.0515, 0.05162, 0.05111, 0.05058, 0.05063,
  0.0518, 0.05436, 0.05768,
];

// prettier-ignore
const PAPER_BLACK_GRAY: readonly number[] = [
  0.24195, 0.29444, 0.40426, 0.65667, 0.96048, 1.07969, 1.0946, 1.05996,
  1.01958, 0.99299, 0.97158, 0.95463, 0.94056, 0.92993, 0.92012, 0.91133,
  0.90971, 0.90954, 0.9061, 0.90876, 0.91219, 0.9174, 0.9207, 0.92075, 0.91938,
  0.91968, 0.92326, 0.92888, 0.93366, 0.93395, 0.93325, 0.93265, 0.93376,
  0.93379, 0.9338, 0.93477,
];

// prettier-ignore
const SOLID_BLACK_ON_GRAY_SHEET: readonly number[] = [
  0.0309, 0.03213, 0.03459, 0.03739, 0.03925, 0.0398, 0.04067, 0.04101, 0.0416,
  0.0425, 0.04341, 0.04423, 0.04489, 0.04542, 0.04611, 0.04675, 0.04751, 0.0482,
  0.04877, 0.04954, 0.05017, 0.05082, 0.05158, 0.05221, 0.05285, 0.0534,
  0.05412, 0.05486, 0.05541, 0.056, 0.05645, 0.05701, 0.0577, 0.05843, 0.05879,
  0.05912,
];

// prettier-ignore
const SOLID_GRAY_ON_BLACK_SHEET: readonly number[] = [
  0.08289, 0.11931, 0.1614, 0.20063, 0.22805, 0.23578, 0.23672, 0.23353,
  0.23188, 0.23308, 0.23512, 0.23666, 0.23803, 0.23922, 0.23996, 0.24033,
  0.24152, 0.24268, 0.24324, 0.24502, 0.24649, 0.24828, 0.24983, 0.25125,
  0.25257, 0.25391, 0.25552, 0.25773, 0.2597, 0.26087, 0.26203, 0.26305,
  0.26472, 0.26648, 0.26798, 0.2692,
];

// prettier-ignore
const GRAY_OVER_BLACK_STACK: readonly number[] = [
  0.03909, 0.04171, 0.04402, 0.04618, 0.04716, 0.04766, 0.04761, 0.04777,
  0.04794, 0.04824, 0.04824, 0.04853, 0.04875, 0.04888, 0.04921, 0.04941,
  0.04977, 0.05009, 0.05026, 0.05068, 0.05094, 0.05129, 0.05169, 0.05206,
  0.05248, 0.05291, 0.05324, 0.0536, 0.05408, 0.05426, 0.05464, 0.05513,
  0.05542, 0.05569, 0.05632, 0.05658,
];

// prettier-ignore
const PAPER_BLUE_FPINK_YELLOW_BLACK: readonly number[] = [
  0.34703, 0.40622, 0.51567, 0.73548, 0.95729, 1.02806, 1.03137, 1.00125,
  0.97125, 0.94935, 0.92991, 0.91405, 0.8999, 0.88791, 0.87765, 0.86709,
  0.86005, 0.85447, 0.84661, 0.84398, 0.84098, 0.84113, 0.84293, 0.84667,
  0.85249, 0.8595, 0.86739, 0.87602, 0.88358, 0.88577, 0.88607, 0.88515,
  0.88652, 0.8892, 0.8919, 0.89456,
];

// prettier-ignore
const SOLID_BLUE_QUAD: readonly number[] = [
  0.05297, 0.0674, 0.09104, 0.12778, 0.16269, 0.20823, 0.28583, 0.35495,
  0.38233, 0.39097, 0.37361, 0.3377, 0.29021, 0.23232, 0.17052, 0.11717,
  0.07972, 0.05492, 0.03998, 0.0336, 0.03195, 0.03238, 0.03386, 0.03645,
  0.03946, 0.0421, 0.04436, 0.04598, 0.04659, 0.04612, 0.04582, 0.04619,
  0.04817, 0.05301, 0.05893, 0.06487,
];

// prettier-ignore
const SOLID_YELLOW_QUAD: readonly number[] = [
  0.06061, 0.06004, 0.0626, 0.06826, 0.07109, 0.07061, 0.0698, 0.06927, 0.06967,
  0.06981, 0.07312, 0.09756, 0.20884, 0.46786, 0.71234, 0.80788, 0.82983,
  0.83134, 0.82583, 0.82488, 0.82532, 0.82921, 0.83252, 0.8358, 0.84084,
  0.84836, 0.85702, 0.86643, 0.87425, 0.87647, 0.8748, 0.87238, 0.87506,
  0.87883, 0.88141, 0.88109,
];

// prettier-ignore
const SOLID_BLACK_QUAD: readonly number[] = [
  0.03543, 0.03648, 0.03737, 0.03824, 0.03916, 0.03954, 0.03982, 0.04029,
  0.04059, 0.04108, 0.04177, 0.04217, 0.04253, 0.04303, 0.0434, 0.04374,
  0.04429, 0.04463, 0.04494, 0.0454, 0.0458, 0.04616, 0.04647, 0.04703, 0.04744,
  0.04775, 0.04809, 0.04854, 0.04909, 0.04932, 0.04958, 0.05001, 0.05028,
  0.05062, 0.05092, 0.05155,
];

// prettier-ignore
const YELLOW_OVER_BLUE_STACK: readonly number[] = [
  0.04623, 0.05218, 0.05799, 0.06312, 0.06444, 0.066, 0.06898, 0.07046, 0.06991,
  0.06801, 0.06787, 0.07934, 0.12125, 0.17186, 0.1644, 0.12225, 0.08581,
  0.06012, 0.04408, 0.03667, 0.03441, 0.03432, 0.03545, 0.03784, 0.04057,
  0.04292, 0.04513, 0.04671, 0.0474, 0.047, 0.04637, 0.04655, 0.0485, 0.05295,
  0.05856, 0.06381,
];

// prettier-ignore
const BLACK_OVER_BLUE_STACK: readonly number[] = [
  0.03698, 0.03939, 0.04291, 0.04703, 0.04945, 0.05304, 0.05827, 0.06231,
  0.06352, 0.06479, 0.06488, 0.06273, 0.05896, 0.05338, 0.04664, 0.03983,
  0.0349, 0.03162, 0.02971, 0.02927, 0.02969, 0.0305, 0.03157, 0.03313, 0.03456,
  0.03595, 0.03722, 0.03795, 0.03814, 0.0378, 0.03779, 0.03818, 0.03955,
  0.04204, 0.04502, 0.04734,
];

// prettier-ignore
const BLACK_OVER_YELLOW_STACK: readonly number[] = [
  0.03279, 0.0336, 0.03461, 0.03522, 0.03576, 0.03601, 0.03596, 0.03624,
  0.03669, 0.03706, 0.03755, 0.03859, 0.04084, 0.04339, 0.04476, 0.04511,
  0.04528, 0.04539, 0.04553, 0.04583, 0.04593, 0.04609, 0.04643, 0.04673,
  0.04695, 0.04737, 0.04778, 0.04817, 0.04846, 0.04869, 0.04897, 0.0493,
  0.04964, 0.05004, 0.05044, 0.05117,
];

// prettier-ignore
const SOLID_RED_RGB: readonly number[] = [
  0.06228, 0.06114, 0.06437, 0.07497, 0.08344, 0.08444, 0.08207, 0.07631,
  0.06822, 0.06023, 0.05473, 0.05146, 0.0505, 0.05173, 0.05311, 0.05489,
  0.06012, 0.06967, 0.08878, 0.14632, 0.28681, 0.49525, 0.67139, 0.76206,
  0.80051, 0.81773, 0.82755, 0.83533, 0.84221, 0.8462, 0.84941, 0.85101,
  0.85347, 0.8542, 0.85191, 0.84646,
];

// prettier-ignore
const SOLID_BLUE_RGB: readonly number[] = [
  0.05196, 0.0692, 0.09793, 0.14502, 0.19729, 0.25527, 0.33923, 0.40801,
  0.43149, 0.43665, 0.41946, 0.38567, 0.3399, 0.28134, 0.21477, 0.15227,
  0.10458, 0.07114, 0.05001, 0.04016, 0.0368, 0.03614, 0.03685, 0.03885,
  0.04145, 0.04386, 0.04611, 0.0481, 0.04916, 0.04885, 0.04845, 0.04845,
  0.04982, 0.05392, 0.05962, 0.06566,
];

// prettier-ignore
const GREEN_OVER_RED_STACK: readonly number[] = [
  0.03258, 0.03274, 0.03445, 0.03678, 0.03892, 0.03965, 0.04013, 0.04025,
  0.04007, 0.03976, 0.03997, 0.04252, 0.04732, 0.04918, 0.04738, 0.04581,
  0.04613, 0.04889, 0.05701, 0.07718, 0.10623, 0.12098, 0.11337, 0.10313,
  0.09795, 0.09616, 0.09529, 0.09567, 0.09926, 0.10639, 0.11555, 0.12478,
  0.13265, 0.13508, 0.13251, 0.1302,
];

// prettier-ignore
const BLUE_OVER_RED_STACK: readonly number[] = [
  0.03438, 0.03995, 0.04606, 0.0526, 0.0569, 0.06044, 0.06409, 0.06384, 0.0589,
  0.05261, 0.04696, 0.04219, 0.03775, 0.03405, 0.03071, 0.02737, 0.02486,
  0.02379, 0.02448, 0.0276, 0.03168, 0.03442, 0.0355, 0.03655, 0.03806, 0.03963,
  0.04123, 0.04281, 0.04405, 0.0441, 0.0436, 0.04305, 0.04338, 0.04572, 0.04958,
  0.05355,
];

// prettier-ignore
const BLUE_OVER_GREEN_STACK: readonly number[] = [
  0.02699, 0.03232, 0.0379, 0.04131, 0.04229, 0.04498, 0.04916, 0.05297,
  0.05682, 0.06239, 0.06906, 0.08808, 0.13334, 0.16599, 0.14163, 0.09799,
  0.06322, 0.04051, 0.02774, 0.02224, 0.02003, 0.01927, 0.01966, 0.02099,
  0.02245, 0.02377, 0.02493, 0.02548, 0.02554, 0.02521, 0.02528, 0.02577,
  0.02732, 0.03025, 0.0334, 0.03591,
];

/** A solid patch and the bare paper from the same sheet. */
export interface MeasuredFilm {
  readonly solid: readonly number[];
  readonly paper: readonly number[];
  /** Profile the two spectra were read out of, so a number can be audited. */
  readonly profile: string;
}

/** Measured films by ink id, for the inks the ink table takes K(λ) from. */
export const MEASURED_FILMS: ReadonlyMap<string, MeasuredFilm> = new Map([
  [
    "blue",
    {
      solid: SOLID_BLUE,
      paper: PAPER_BLUE_FPINK_YELLOW,
      profile: "RISO_MZ770_BlueFPinkYellow",
    },
  ],
  [
    "yellow",
    {
      solid: SOLID_YELLOW,
      paper: PAPER_BLUE_FPINK_YELLOW,
      profile: "RISO_MZ770_BlueFPinkYellow",
    },
  ],
  [
    "red",
    {
      solid: SOLID_RED,
      paper: PAPER_RED_BLACK,
      profile: "RISO_MZ770_RedBlack",
    },
  ],
  [
    "green",
    {
      solid: SOLID_GREEN,
      paper: PAPER_RED_GREEN_BLUE,
      profile: "RISO_MZ770_RedGreenBlue",
    },
  ],
  [
    "teal",
    {
      solid: SOLID_TEAL,
      paper: PAPER_FORANGE_TEAL,
      profile: "RISO_MZ770_FOrangeTeal",
    },
  ],
  [
    "gray",
    {
      solid: SOLID_GRAY,
      paper: PAPER_BLUE_GRAY,
      profile: "DuploPress_MultiColor_BlueGray",
    },
  ],
]);

/**
 * Riso black, measured but deliberately not in `MEASURED_FILMS`.
 *
 * Fitting a measured film needs the published hex to be an observation of how
 * the ink prints, because that is the only thing pinning the film thickness.
 * Riso's black hex is `#000000`, which is a nominal rather than an
 * observation: this reading puts the actual solid at a warm dark grey near
 * L* 40, reflecting 4.5% at 550 nm. There is no thickness that reconciles the
 * two, so the fit just walks to the edge of its box. The ink table keeps its
 * idealized flat absorber, which is what `#000000` actually describes, and
 * this stays here as the reading that says so.
 */
export const MEASURED_BLACK_FILM: MeasuredFilm = {
  solid: SOLID_BLACK,
  paper: PAPER_RED_BLACK,
  profile: "RISO_MZ770_RedBlack",
};

/**
 * Fluorescent films, deliberately not in `MEASURED_FILMS`.
 *
 * A spectrophotometer reports radiance factor, not reflectance: what leaves
 * the patch over what a perfect diffuser would return under the instrument's
 * own illuminant. For a fluorescent ink that includes re-emitted light, so
 * both of these read above 1.0 around 610 nm — no film can do that by
 * absorbing. Feeding such a curve to `absorptionFromFilm` yields a negative
 * K, an amplifying absorber that would brighten whatever it is printed over,
 * and `spectral.ts` already models emission explicitly in its second pass, so
 * doing it anyway would double-count. Separating the two requires a
 * bispectral (Donaldson) measurement, which this data is not. Kept for the
 * test that pins the distinction, and against a future two-monochromator set.
 */
export const MEASURED_FLUORESCENT_FILMS: ReadonlyMap<string, MeasuredFilm> =
  new Map([
    [
      "fluorescent-pink",
      {
        solid: SOLID_FLUORESCENT_PINK,
        paper: PAPER_BLUE_FPINK_YELLOW,
        profile: "RISO_MZ770_BlueFPinkYellow",
      },
    ],
    [
      "fluorescent-orange",
      {
        solid: SOLID_FLUORESCENT_ORANGE,
        paper: PAPER_FORANGE_TEAL,
        profile: "RISO_MZ770_FOrangeTeal",
      },
    ],
  ]);

/**
 * Solid-over-solid pairs, each self-contained: every spectrum in an entry is
 * from the sheet named in `profile`, so a fit never has to borrow paper from
 * somewhere else.
 *
 * Two substrates under one film pin its ρ and τ separately, which a single
 * reading over paper cannot — that is where gray's scattering magnitude comes
 * from. The coloured pairs are here for the opposite reason: to show that the
 * inks that don't scatter don't need to. Across all 21 non-fluorescent pairs
 * the collection contains, a pure-absorber prediction lands *darker* than the
 * reading in 20, by 0.02 to 0.09 in reflectance. Scattering lightens an
 * overprint, so fitting each ink its own S closes that gap and looks like a
 * result — but the gap is one-signed across every ink and every pigment, which
 * is a press behaviour (the second ink not transferring completely onto the
 * first), not an optical property of six unrelated colorants. Fitted per ink
 * it never clears twice the improvement of a single shared floor, so the
 * coloured inks keep S = 0 and the model keeps its order-invariant fast path.
 */
export interface MeasuredOverprint {
  /** Ink id of the film on top, or `null` where the ink table has no entry. */
  readonly over: string | null;
  readonly under: string | null;
  readonly paper: readonly number[];
  /** The under ink alone, i.e. the substrate the top film landed on. */
  readonly underSolid: readonly number[];
  readonly overSolid: readonly number[];
  readonly stack: readonly number[];
  readonly profile: string;
}

export const MEASURED_OVERPRINTS: readonly MeasuredOverprint[] = [
  {
    over: "gray",
    under: "blue",
    paper: PAPER_BLUE_GRAY,
    underSolid: SOLID_BLUE_ON_GRAY_SHEET,
    overSolid: SOLID_GRAY,
    stack: GRAY_OVER_BLUE_STACK,
    profile: "DuploPress_MultiColor_BlueGray",
  },
  {
    over: "gray",
    under: null, // riso black, which the ink table models as an ideal absorber
    paper: PAPER_BLACK_GRAY,
    underSolid: SOLID_BLACK_ON_GRAY_SHEET,
    overSolid: SOLID_GRAY_ON_BLACK_SHEET,
    stack: GRAY_OVER_BLACK_STACK,
    profile: "DuploPress_MultiColor_BlackGray_v3",
  },
  {
    over: "yellow",
    under: "blue",
    paper: PAPER_BLUE_FPINK_YELLOW_BLACK,
    underSolid: SOLID_BLUE_QUAD,
    overSolid: SOLID_YELLOW_QUAD,
    stack: YELLOW_OVER_BLUE_STACK,
    profile: "RISO_MZ770_YellowFPinkBlueBlack",
  },
  {
    over: null,
    under: "blue",
    paper: PAPER_BLUE_FPINK_YELLOW_BLACK,
    underSolid: SOLID_BLUE_QUAD,
    overSolid: SOLID_BLACK_QUAD,
    stack: BLACK_OVER_BLUE_STACK,
    profile: "RISO_MZ770_YellowFPinkBlueBlack",
  },
  {
    over: null,
    under: "yellow",
    paper: PAPER_BLUE_FPINK_YELLOW_BLACK,
    underSolid: SOLID_YELLOW_QUAD,
    overSolid: SOLID_BLACK_QUAD,
    stack: BLACK_OVER_YELLOW_STACK,
    profile: "RISO_MZ770_YellowFPinkBlueBlack",
  },
  {
    over: "green",
    under: "red",
    paper: PAPER_RED_GREEN_BLUE,
    underSolid: SOLID_RED_RGB,
    overSolid: SOLID_GREEN,
    stack: GREEN_OVER_RED_STACK,
    profile: "RISO_MZ770_RedGreenBlue",
  },
  {
    over: "blue",
    under: "red",
    paper: PAPER_RED_GREEN_BLUE,
    underSolid: SOLID_RED_RGB,
    overSolid: SOLID_BLUE_RGB,
    stack: BLUE_OVER_RED_STACK,
    profile: "RISO_MZ770_RedGreenBlue",
  },
  {
    over: "blue",
    under: "green",
    paper: PAPER_RED_GREEN_BLUE,
    underSolid: SOLID_GREEN,
    overSolid: SOLID_BLUE_RGB,
    stack: BLUE_OVER_GREEN_STACK,
    profile: "RISO_MZ770_RedGreenBlue",
  },
];
