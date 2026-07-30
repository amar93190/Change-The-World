// Correspondance crisis ID → codes ISO 3166-1 numérique (world-atlas/countries-50m.json)
export const CRISIS_COUNTRY_IDS = {
  'rdc-est':           [180],
  'soudan':            [729],
  'yemen':             [887],
  'myanmar-rohingyas': [104],
  'sahel':             [466, 854, 562],   // Mali, Burkina Faso, Niger
  'haiti':             [332],
  'ethiopie-tigre':    [231],
  'syrie':             [760],
  'ukraine':           [804],
  'palestine-israel':  [376, 275],        // Israël + Palestine (peut ne pas exister dans topojson)
  'somalie':           [706],
  'nigeria-ne':        [566],
  'rca':               [140],
  'mozambique':        [508],
  'cameroun':          [120],
  'soudan-sud':        [728],
  'libye':             [434],
  'irak':              [368],
  'afghanistan':       [4],
  'manipur':           [356],             // Inde entière (Manipur n'est pas une entité topojson)
  'venezuela':         [862],
  'colombie':          [170],
};
