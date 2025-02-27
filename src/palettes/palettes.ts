import { PaletteEntry } from "./palettes.d";

// define all the palettes here as constants

export const PAL_ROUTE = 0x00;
export const PAL_PALLET = 0x01;
export const PAL_VIRIDIAN = 0x02;
export const PAL_PEWTER = 0x03;
export const PAL_CERULEAN = 0x04;
export const PAL_LAVENDER = 0x05;
export const PAL_VERMILION = 0x06;
export const PAL_CELADON = 0x07;
export const PAL_FUCHSIA = 0x08;
export const PAL_CINNABAR = 0x09;
export const PAL_INDIGO = 0x0A;
export const PAL_SAFFRON = 0x0B;
export const PAL_TOWNMAP = 0x0C;
export const PAL_LOGO1 = 0x0D;
export const PAL_LOGO2 = 0x0E;
export const PAL_0F = 0x0F;
export const PAL_MEWMON = 0x10;
export const PAL_BLUEMON = 0x11;
export const PAL_REDMON = 0x12;
export const PAL_CYANMON = 0x13;
export const PAL_PURPLEMON = 0x14;
export const PAL_BROWNMON = 0x15;
export const PAL_GREENMON = 0x16;
export const PAL_PINKMON = 0x17;
export const PAL_YELLOWMON = 0x18;
export const PAL_GRAYMON = 0x19;
export const PAL_SLOTS1 = 0x1A;
export const PAL_SLOTS2 = 0x1B;
export const PAL_SLOTS3 = 0x1C;
export const PAL_SLOTS4 = 0x1D;
export const PAL_BLACK = 0x1E;
export const PAL_WHITE = 0x1F;
export const PAL_CAVE = 0x23;


export const palettes: PaletteEntry[] = [
  { // PAL_ROUTE
    index: 0,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 23, g: 26, b: 19}, {r: 23, g: 27, b: 31}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 16, g: 31, b: 4}, {r: 11, g: 23, b: 31}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_PALLET
    index: 1, 
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 28, g: 27, b: 31}, {r: 23, g: 27, b: 31}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 23, g: 17, b: 31}, {r: 11, g: 23, b: 31}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_VIRIDIAN
    index: 2,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 26, g: 31, b: 21}, {r: 23, g: 27, b: 31}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 19, g: 31, b: 0}, {r: 11, g: 23, b: 31}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_PEWTER
    index: 3,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 23, g: 23, b: 22}, {r: 23, g: 27, b: 31}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 18, g: 18, b: 15}, {r: 11, g: 23, b: 31}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_CERULEAN
    index: 4,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 22, g: 23, b: 31}, {r: 23, g: 27, b: 31}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 5, g: 8, b: 31}, {r: 11, g: 23, b: 31}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_LAVENDER
    index: 5,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 27, g: 23, b: 29}, {r: 23, g: 27, b: 31}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 25, g: 4, b: 31}, {r: 11, g: 23, b: 31}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_VERMILION
    index: 6,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 31, g: 25, b: 16}, {r: 23, g: 27, b: 31}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 31, g: 19, b: 0}, {r: 11, g: 23, b: 31}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_CELADON
    index: 7,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 22, g: 31, b: 22}, {r: 23, g: 27, b: 31}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 5, g: 31, b: 5}, {r: 11, g: 23, b: 31}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_FUCHSIA
    index: 8,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 31, g: 26, b: 26}, {r: 23, g: 27, b: 31}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 31, g: 15, b: 15}, {r: 11, g: 23, b: 31}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_CINNABAR
    index: 9,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 31, g: 15, b: 14}, {r: 23, g: 27, b: 31}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 31, g: 8, b: 8}, {r: 11, g: 23, b: 31}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_INDIGO
    index: 10, // 0xA
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 17, g: 17, b: 25}, {r: 23, g: 27, b: 31}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 11, g: 8, b: 31}, {r: 11, g: 23, b: 31}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_SAFFRON
    index: 11,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 31, g: 31, b: 19}, {r: 23, g: 27, b: 31}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 31, g: 31, b: 0}, {r: 11, g: 23, b: 31}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_TOWNMAP
    index: 12,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 20, g: 26, b: 31}, {r: 17, g: 23, b: 10}, {r: 3, g: 2, b: 2}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 0, g: 21, b: 31}, {r: 10, g: 28, b: 0}, {r: 1, g: 1, b: 1}
    ]
  },
  { // PAL_LOGO1
    index: 13,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 30, g: 30, b: 17}, {r: 21, g: 0, b: 4}, {r: 21, g: 0, b: 4}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 31, g: 31, b: 0}, {r: 31, g: 0, b: 0}, {r: 31, g: 0, b: 0}
    ]
  },
  { // PAL_LOGO2
    index: 14,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 30, g: 30, b: 17}, {r: 18, g: 18, b: 24}, {r: 7, g: 7, b: 16}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 31, g: 31, b: 0}, {r: 7, g: 7, b: 25}, {r: 0, g: 0, b: 17}
    ]
  },
  { // PAL_0F
    index: 15,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 24, g: 20, b: 30}, {r: 11, g: 20, b: 30}, {r: 3, g: 2, b: 2}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 13, g: 1, b: 31}, {r: 0, g: 9, b: 31}, {r: 1, g: 1, b: 1}
    ]
  },
  { // PAL_MEWMON
    index: 16,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 31, g: 30, b: 22}, {r: 27, g: 16, b: 16}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 31, g: 31, b: 0}, {r: 31, g: 1, b: 1}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_BLUEMON
    index: 17,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 21, g: 22, b: 31}, {r: 9, g: 10, b: 20}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 16, g: 18, b: 31}, {r: 0, g: 1, b: 25}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_REDMON
    index: 18,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 31, g: 24, b: 11}, {r: 26, g: 9, b: 6}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 31, g: 17, b: 0}, {r: 31, g: 0, b: 0}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_CYANMON
    index: 19,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 26, g: 28, b: 31}, {r: 7, g: 24, b: 28}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 16, g: 26, b: 31}, {r: 0, g: 17, b: 31}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_PURPLEMON
    index: 20,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 27, g: 22, b: 30}, {r: 22, g: 15, b: 23}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 25, g: 15, b: 31}, {r: 19, g: 0, b: 22}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_BROWNMON
    index: 21,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 26, g: 23, b: 18}, {r: 18, g: 14, b: 10}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 29, g: 18, b: 10}, {r: 17, g: 9, b: 5}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_GREENMON
    index: 22,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 24, g: 28, b: 18}, {r: 13, g: 21, b: 15}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 17, g: 31, b: 11}, {r: 1, g: 22, b: 6}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_PINKMON
    index: 23,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 31, g: 24, b: 26}, {r: 31, g: 18, b: 21}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 31, g: 15, b: 18}, {r: 31, g: 0, b: 6}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_YELLOWMON
    index: 24,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 31, g: 31, b: 19}, {r: 28, g: 23, b: 9}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 31, g: 31, b: 0}, {r: 28, g: 14, b: 0}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_GRAYMON
    index: 25,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 25, g: 25, b: 18}, {r: 16, g: 16, b: 14}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 20, g: 23, b: 10}, {r: 11, g: 11, b: 5}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_SLOTS1
    index: 26,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 27, g: 22, b: 30}, {r: 26, g: 9, b: 6}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 25, g: 1, b: 31}, {r: 31, g: 0, b: 0}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_SLOTS2
    index: 27,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 31, g: 23, b: 26}, {r: 29, g: 29, b: 8}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 31, g: 4, b: 19}, {r: 31, g: 31, b: 0}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_SLOTS3
    index: 28,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 23, g: 31, b: 20}, {r: 29, g: 29, b: 8}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 8, g: 31, b: 0}, {r: 31, g: 31, b: 0}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_SLOTS4
    index: 29,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 23, g: 29, b: 31}, {r: 29, g: 29, b: 8}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 0, g: 31, b: 31}, {r: 31, g: 31, b: 0}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_BLACK
    index: 30,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 6, g: 6, b: 6}, {r: 6, g: 6, b: 6}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 3, g: 3, b: 3}, {r: 3, g: 3, b: 3}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_GREENBAR
    index: 31,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 31, g: 31, b: 19}, {r: 0, g: 21, b: 0}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 31, g: 31, b: 0}, {r: 0, g: 31, b: 0}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_YELLOWBAR
    index: 32,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 31, g: 31, b: 19}, {r: 28, g: 23, b: 9}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 31, g: 31, b: 0}, {r: 31, g: 18, b: 0}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_REDBAR
    index: 33,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 31, g: 31, b: 19}, {r: 26, g: 9, b: 6}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 31, g: 31, b: 0}, {r: 31, g: 0, b: 0}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_BADGE
    index: 34,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 20, g: 15, b: 11}, {r: 22, g: 21, b: 20}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 23, g: 8, b: 0}, {r: 17, g: 14, b: 11}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_CAVE
    index: 35,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 20, g: 15, b: 11}, {r: 22, g: 21, b: 20}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 23, g: 8, b: 0}, {r: 17, g: 14, b: 11}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_GAMEFREAK
    index: 36,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 28, g: 24, b: 14}, {r: 20, g: 20, b: 11}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 31, g: 19, b: 0}, {r: 19, g: 19, b: 0}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_PIKACHUS_BEACH
    index: 37,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 31, g: 30, b: 22}, {r: 23, g: 27, b: 31}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 31, g: 31, b: 0}, {r: 11, g: 23, b: 31}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_PIKACHU_PORTRAIT
    index: 38,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 28, g: 23, b: 9}, {r: 18, g: 14, b: 10}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 31, g: 18, b: 0}, {r: 19, g: 7, b: 1}, {r: 3, g: 3, b: 3}
    ]
  },
  { // PAL_PIKACHUS_BEACH_TITLE
    index: 39,
    sgb: [
      {r: 31, g: 31, b: 30}, {r: 16, g: 16, b: 16}, {r: 31, g: 25, b: 9}, {r: 6, g: 6, b: 6}
    ],
    cgb: [
      {r: 31, g: 31, b: 31}, {r: 9, g: 9, b: 9}, {r: 31, g: 21, b: 0}, {r: 3, g: 3, b: 3}
    ]
  }
];
