// Battery models for the calculator. Centralised data — update here, not in UI.
// Ordered list: the API returns brands in this exact order.

export const BATTERY_BRANDS = [
  {
    brand: 'LG Energy Solution',
    models: [
      { label: 'ES-LGC-RESU10H-Prime', cec: 'RESU 10H Prime', nominalCapacity: 9.8, usableCapacity: 9.3 },
      { label: 'ES-LGC-RESU16H-Prime', cec: 'RESU 16H Prime', nominalCapacity: 16.0, usableCapacity: 15.2 },
    ],
  },
  {
    brand: 'Kstar',
    models: [
      { label: 'Kstar BluE-S 5000', cec: 'Kstar BluE-S 5000', nominalCapacity: 5.12, usableCapacity: 4.6 },
    ],
  },
  {
    brand: 'FOXESS',
    models: [
      { label: 'ECS2900-H2', cec: 'FOXESS ECS2900-H2', nominalCapacity: 2.88, usableCapacity: 2.6 },
      { label: 'ECS4300-H2', cec: 'FOXESS ECS4300-H2', nominalCapacity: 4.3, usableCapacity: 3.9 },
    ],
  },
  {
    brand: 'Solis',
    models: [
      { label: 'S6-EH1P6K-L', cec: 'Solis S6-EH1P6K-L', nominalCapacity: 6.0, usableCapacity: 5.4 },
    ],
  },
  {
    brand: 'Dyness',
    models: [
      { label: 'B4850', cec: 'Dyness B4850', nominalCapacity: 4.8, usableCapacity: 4.3 },
      { label: 'BX51100', cec: 'Dyness BX51100', nominalCapacity: 5.12, usableCapacity: 4.6 },
    ],
  },
  {
    brand: 'GoodWe',
    models: [
      { label: 'Lynx Home F Plus', cec: 'Lynx Home F Plus', nominalCapacity: 10.0, usableCapacity: 9.0 },
    ],
  },
  {
    brand: 'Anker Solix',
    models: [
      { label: 'X1', cec: 'Anker Solix X1', nominalCapacity: 5.0, usableCapacity: 4.5 },
    ],
  },
  {
    brand: 'AlphaESS',
    models: [
      { label: 'SMILE5-BAT', cec: 'AlphaESS SMILE5-BAT', nominalCapacity: 5.7, usableCapacity: 5.1 },
    ],
  },
  {
    brand: 'SAJ',
    models: [
      { label: 'B2 Series', cec: 'SAJ B2 Series', nominalCapacity: 5.0, usableCapacity: 4.5 },
    ],
  },
  {
    brand: 'SolarEdge',
    models: [
      { label: 'Home Battery 48V', cec: 'SolarEdge Home Battery 48V', nominalCapacity: 9.7, usableCapacity: 9.0 },
    ],
  },
  {
    brand: 'Sungrow',
    models: [
      { label: 'SBR096', cec: 'SBR096', nominalCapacity: 9.6, usableCapacity: 8.6 },
      { label: 'SBR128', cec: 'SBR128', nominalCapacity: 12.8, usableCapacity: 11.5 },
    ],
  },
]
