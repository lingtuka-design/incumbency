import fs from 'node:fs';
import path from 'node:path';
import xlsx from 'xlsx';

export const DEPARTMENTS = [
  { code: 'A&C', name: 'Art & Culture Department', folderId: '1UwAs85oeqCO3IoIdIjBzX8MDwaxK9yRl' },
  { code: 'AGRI', name: 'Agriculture Department', folderId: '1KEVNxgdAuXBvDsiv9gL3Ou8adPk9dyBh' },
  { code: 'VETY', name: 'Animal Husbandry & Veterinary Department', folderId: '1emYwEyo63HZGk5GZRiIXgn_Vj0TQY0ix' },
  { code: 'ATI', name: 'Administrative Training Institute', folderId: '1WAo1CKBp6lQa9CmnX2RCI5NmR2Kwsbkl' },
  { code: 'CM', name: "Chief Minister's Office / Secretariat", folderId: '1X42xZaAMXRNMpiHCTC9aIyuLIS7c9le9' },
  { code: 'DAT', name: 'Directorate of Accounts & Treasuries', folderId: '1bbS90ntBnzqZssO9mY6TBKC2vsah4zD4' },
  { code: 'DMR', name: 'Disaster Management & Rehabilitation Department', folderId: '1903ZG98ljtEmaFwQGcXur4ggm_A26nen' },
  { code: 'ECS', name: 'Economics & Statistics Department', folderId: '1LJx6c7U7x9T6m36RhSWyYXzdj-vljNyQ' },
  { code: 'EDN', name: 'School Education Department', folderId: '1nuFjUuArpeD_q5dl7iTRLijWjGA1R5Kg' },
  { code: 'ELCN', name: 'Election Department', folderId: '1cg8QxMd6HBCF394nZJF2YG6zBjgdKZIM' },
  { code: 'EXCISE', name: 'Excise & Narcotics Department', folderId: '1WRh9QeaLCODxLkMXcYh5-Fl8WNSRiYM_' },
  { code: 'FISH', name: 'Fisheries Department', folderId: '1zHbR1NnWDXje3lb6xvgq2TQWDhkGkp5H' },
  { code: 'FOR', name: 'Environment, Forests & Climate Change', folderId: '1KvXPi44Z7Dobd9qZCbCeJ2SMh5nUtb6t' },
  { code: 'GHC', name: 'Gauhati High Court (Aizawl Bench)', folderId: '1Pmz5fZaK4Fs8Rf54ZPycYobvMdQnDHYc' },
  { code: 'HOR', name: 'Horticulture Department', folderId: '1nZ6GCfRWQAg5dTFfxnQaWbmDOGJ4lgsD' },
  { code: 'HTE', name: 'Higher & Technical Education Department', folderId: '1sjlZ9cqTda0kGCtFSY2Xuv85Q8QgJCR5' },
  { code: 'I&PR', name: 'Information & Public Relations Department', folderId: '1zhZj7sGUzvOsnczBe2VAh-khk50AAqdp' },
  { code: 'ICT', name: 'Information & Communication Technology Department', folderId: '1EEwh8PeaiYqQOAEcmDG0R9ePvs-CW5qC' },
  { code: 'IFSL', name: 'Institutional Finance & State Lottery', folderId: '17780foX-fHZf5tJYKFQrK3Wbhx_rz3iX' },
  { code: 'IRRI', name: 'Irrigation & Water Resources Department', folderId: '1E3agQt_lShvVLcXp-aZ8t9ZvVB5tsn84' },
  { code: 'L&J', name: 'Law & Judicial Department', folderId: '1bi68sxo9OMopmeWMAkjXLipg9h5GwidW' },
  { code: 'LAD', name: 'Local Administration Department', folderId: '1dSqhQRJtvrhUw5bubqPJnF8eQ8F8Vdx-' },
  { code: 'LAE', name: 'Labour, Employment, Skill Dev & Entrepreneurship', folderId: '1jSfEybq4CM_ZlDsmpMvIOV7wHMHI9aeT' },
  { code: 'LGM', name: 'Land Resources, Soil & Water Conservation', folderId: '1kav9iaiIWZ58izlcV-uW68C_AmuAaLwH' },
  { code: 'MIC', name: 'Mizoram Information Commission', folderId: '1JY6Lk7v8LsXRf0TZge4LxQFLZob_OkCe' },
  { code: 'MLA', name: 'Mizoram Legislative Assembly Secretariat', folderId: '1JdupaGxMoa2ZP1DaNaOCVRhvjHwsJph4' },
  { code: 'MPSC', name: 'Mizoram Public Service Commission', folderId: '1rQ4TseebWumKq7f8ggsl0jPmKxaYGXVu' },
  { code: 'MRHG', name: 'Mizoram State Rural Livelihoods / Housing', folderId: '1pJmFRx9MWEJoC6S_Ap2w-IjszcV6hB-8' },
  { code: 'P&E', name: 'Power & Electricity Department', folderId: '1dBUb2c01g1xV5p0AqDWPx_ylWzHhCsde' },
  { code: 'P&S', name: 'Printing & Stationery Department', folderId: '1JUDhSISHuvs5slrR-tBJ4LmBkS1nYxkp' },
  { code: 'PRI', name: 'Prisons Department', folderId: '1MGVpFK3QnGi_T4fV4Y8ce45C9Mau46IB' },
  { code: 'RD', name: 'Rural Development Department', folderId: '1H_RYtCR_sdYaK7B_hHQEemyPYmqFE-a8' },
  { code: 'S&T', name: 'Science & Technology Department', folderId: '1XtEi5fGgq3Z-x-qtNXY0HsC3rbPeQkY3' },
  { code: 'SPB', name: 'State Planning Board / Planning & Programme', folderId: '1El7q-M9sk8OeTZsUMlo66Z1RNMwiW9rH' },
  { code: 'SWD', name: 'Social Welfare Department', folderId: '1frRdFU0bXt8WUaZ76jB98aDTVxuoqaX_' },
  { code: 'SYS', name: 'Sports & Youth Services Department', folderId: '1y8TA_RYTmTD6bM1YShftR-iuwtUcIkSZ' },
  { code: 'TAX', name: 'Taxation Department', folderId: '1VZlkfoyBgkol-64GCHT9LYPBHeWchMAm' },
  { code: 'Tourism', name: 'Tourism Department', folderId: '1CbMb0uy7tUtNRYrjvxnE8EwPt8p0MxoM' },
  { code: 'UD&PA', name: 'Urban Development & Poverty Alleviation', folderId: '1PMe4eKYBf9AttUr6sDGARHs9gPiO3G3f' },
  { code: 'ZSB', name: 'Zila Sainik Board', folderId: '1utWdbh0m8ks0Zr8gWbYvmOLubU8fN1gw' }
];

export const ADVANCE_TYPES = [
  { code: 'HBA', name: 'House Building Advance', sortOrder: 1 },
  { code: 'CAR', name: 'Motor Car Advance', sortOrder: 2 },
  { code: 'COM', name: 'Computer Advance', sortOrder: 3 },
  { code: 'SA', name: 'Scooter Advance', sortOrder: 4 },
  { code: 'SCL', name: 'Special Car Loan', sortOrder: 5 }
];

export function detectAdvanceType(filename) {
  const upper = filename.toUpperCase();
  if (upper.includes('HBA')) return 'HBA';
  if (upper.includes('CAR')) return 'CAR';
  if (upper.includes('COM')) return 'COM';
  if (upper.includes('SA') || upper.includes('SCOOTER')) return 'SA';
  if (upper.includes('SCL') || upper.includes('CYCLE') || upper.includes('MARRIAGE')) return 'SCL';
  return 'HBA';
}
