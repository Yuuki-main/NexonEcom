// Static registry of brand documents served from public/brand_documents/
// Built from a directory scan on 2026-07-24. Add new [brand, filename] pairs
// to RAW_FILES when new documents are added to public/brand_documents/.

const UPDATED_AT = '2026-07-24';

// Product class for each brand folder, per the OSW-style sidebar grouping.
const BRAND_CLASS = {
  Jinko: 'Panels',
  Canadian: 'Panels',
  Risen: 'Panels',
  JaSolar: 'Panels',
  Trina: 'Panels',
  Longi: 'Panels',
  Eging: 'Panels',
  Hiconics: 'Panels',

  Hixi_Inverters: 'Inverters',
  Nevolt_Inverters: 'Inverters',
  Pylontech_Inverters: 'Inverters',
  Solintech_Inverters: 'Inverters',
  SOFAR: 'Inverters',
  Hyxi: 'Inverters',
  Neopower: 'Inverters',
  Sigenergy: 'Inverters',
  Aether: 'Inverters',

  Powerbay: 'Storage',
  iStore: 'Storage',
  Aquatech: 'Storage',
  Rinnai: 'Storage',

  Emerald_Heatpump: 'Heat Pump',
};

// Brand folder names with hyphens/spaces can't be bare object keys above —
// assign them via bracket notation instead.
BRAND_CLASS['Anker_EV-Chargers'] = 'EV Chargers';
BRAND_CLASS['Foxess_EV-Charger'] = 'EV Chargers';
BRAND_CLASS['Tesla_EV_Charger'] = 'EV Chargers';
BRAND_CLASS['GOODWE-EV Chargers'] = 'EV Chargers';
BRAND_CLASS['Zappi_EV Charger'] = 'EV Chargers';

// [brand, filename] pairs — one per real file found under public/brand_documents/
// (OS metadata files like .DS_Store / desktop.ini are excluded).
const RAW_FILES = [
  ['Aether', 'Aether Customer Brochure.pdf'],
  ['Aether', 'AetherWarranty.pdf'],
  ['Aether', 'Aether_Heatpump_userManual.pdf'],
  ['Aether', 'Arther_Heatpump_Image.jpg'],

  ['Anker_EV-Chargers', 'ANK-SOLIX-V1-22kW.png'],
  ['Anker_EV-Chargers', 'ANK-SOLIX-V1-7.4kW.png'],
  ['Anker_EV-Chargers', 'Anker Solix EV Charger Datasheet.pdf'],

  ['Aquatech', 'AC-all-models-2512-WARRANTY.pdf'],
  ['Aquatech', 'Aquatech-Dynamic-X8-Datasheet.pdf'],
  ['Aquatech', 'Aquatech_Image.webp'],
  ['Aquatech', 'Aquatech_Manual.pdf'],
  ['Aquatech', 'Aquatech_Rapid-X6-Datasheet.pdf'],
  ['Aquatech', 'Aquatech_Rapid-X6.avif'],
  ['Aquatech', 'Aquatech_RapidX6-Manual.pdf'],
  ['Aquatech', 'Rinnai_Ducted.jpg'],

  ['Canadian', 'Canadian Solar CS6.1-54TD-470_Image.jpg'],
  ['Canadian', 'Canadian_CS6.1-54TD-475_Imaage.jpg'],
  ['Canadian', 'Canadian_datasheet-tophiku6-cs6.pdf'],

  ['Eging', 'Eging Installation Manual.pdf'],
  ['Eging', 'Eging Warranty.pdf'],
  ['Eging', 'Eging_440kW_Datasheet.pdf'],
  ['Eging', 'Eging_440kW_Image.png'],

  ['Emerald_Heatpump', 'Emerald HP-EE-HWS-A1-220.png'],
  ['Emerald_Heatpump', 'Emerald Heat Pump Datasheet 2024.pdf'],
  ['Emerald_Heatpump', 'Emerald Heat Pump User and Installation Manual.pdf'],
  ['Emerald_Heatpump', 'Emerald Heat Pump Warranty.pdf'],

  ['Foxess_EV-Charger', 'EV-FOX-L011PC-Black.png'],
  ['Foxess_EV-Charger', 'FoxEss EV Charger Warranty.pdf'],
  ['Foxess_EV-Charger', 'FoxEss L011PC Black - Installation Manual.pdf'],
  ['Foxess_EV-Charger', 'FoxEss L011PC Black.pdf'],

  ['GOODWE-EV Chargers', 'DS-GW-EVC-HCA-G2.pdf'],
  ['GOODWE-EV Chargers', 'EV-Charger-GOODWE HCA SERIES USER MANUAL.pdf'],
  ['GOODWE-EV Chargers', 'GW-GW22K-HCA-20.png'],
  ['GOODWE-EV Chargers', 'GW-GW7K-HCA-20.png'],
  ['GOODWE-EV Chargers', 'GoodWe GW11K-HCA-20.png'],

  ['Hiconics', 'Hiconics_HEC2_Manual.pdf'],
  ['Hiconics', 'Hiconics_image.jpg'],
  ['Hiconics', 'Hiconics_image1.jpg'],
  ['Hiconics', 'Spec-Sheet_Hiconics_compressed.pdf'],

  ['Hixi_Inverters', 'HYX-H(6-8)K-LS_Datasheet_V1.3-20260402_EN.pdf'],
  ['Hixi_Inverters', 'HYX-H_5-12_K-HT_User-Manual_V1.3-20251024_EN_AU_.pdf'],
  ['Hixi_Inverters', 'Hixi_HYX-H5-12K-HT_Datasheet.pdf'],

  ['Hyxi', 'HYX-E160-L_Datasheet_V1.0-20260123_EN.pdf'],
  ['Hyxi', 'HYX-E50-LR_Datasheet_V1.0-20260123_EN.pdf'],

  ['JaSolar', 'JA Solar Image.jpg'],
  ['JaSolar', 'JaSolar_Datasheet.pdf'],
  ['JaSolar', 'JaSolar_Warranty.pdf'],

  ['Jinko', 'JINKO-470Image.avif'],
  ['Jinko', 'Jinko_Solar.avif'],
  ['Jinko', 'Jinko_Solar_JKM470N-60HL4R@Warranty.pdf'],
  ['Jinko', 'Jinko_Solar_JKM470N-60HL4R_Dtasheet.pdf'],
  ['Jinko', 'Jinko_Solar_JKM475N-60HL4R.pdf'],

  ['Longi', 'Longi Hi-MO 6 Scientist Datasheet.pdf'],
  ['Longi', 'Longi X10 475W - All Black.webp'],
  ['Longi', 'Longi_Datasheet.pdf'],
  ['Longi', 'Longi_Datasheet.webp'],
  ['Longi', 'longi_470W_Manual.pdf'],

  ['Neopower', 'Neopower HP2.0.pdf'],
  ['Neopower', 'Neopower-Heatpump_Manual.pdf'],
  ['Neopower', 'Neopower_Image.jpg'],

  ['Nevolt_Inverters', 'Nevolt_BW-INV_4-15kW_3PDatasheet.pdf'],
  ['Nevolt_Inverters', 'Nevolt_BW-INV_6kW1P.pdf'],
  ['Nevolt_Inverters', 'Nevolt_Warranty.pdf'],

  ['Powerbay', 'Powerbay-Gen-II-Heat-Pump-Brochure-Nov-2025.pdf'],
  ['Powerbay', 'Powerbay-Gen-II-Heat-Pump-Installation-Manual-V6.2.4-1.pdf'],
  ['Powerbay', 'Powerbay-Gen-II-Heat-Pump-Warranty-Terms-Card-1.pdf'],
  ['Powerbay', 'Powerbay_Image.jpg'],

  ['Pylontech_Inverters', 'EN-AU-250424-Force H3X Hybrid-ESS Spec-Pylontech_20251024175626A958 (1).pdf'],
  ['Pylontech_Inverters', 'Force_H3X_HY_1P_Quick_Installation_Instructions_20250708111708A553 (1).pdf'],
  ['Pylontech_Inverters', 'Pylontech_Inverter-Image.jpg'],
  ['Pylontech_Inverters', 'warranty_fh3x3_6k_hy_1p_en_10-04-2026.pdf'],

  ['Rinnai', 'AC-Ducted-2604-BRO.pdf.pdf'],
  ['Rinnai', 'AC-Ducted-7-18-R32-IMA.jpg'],
  ['Rinnai', 'AC-Ducted-R32-2603-manual.pdf'],
  ['Rinnai', 'AC-all-models-2512-WARRANTY.pdf'],

  ['Risen', 'Risen_440w panel photo.png'],
  ['Risen', 'Risen_Datasheet_RSM108-9-415-440N.pdf'],
  ['Risen', 'Risen_Manual.pdf'],
  ['Risen', 'Risen_Warranty.pdf'],

  ['SOFAR', '7bb41023-f08a-4e9d-8547-8a3355051b01.pdf'],
  ['SOFAR', 'ESI-3-6K-S1-PowerAll_Datasheet_2023-03-28_V3.0_en-AU.pdf'],
  ['SOFAR', 'HYD 5-20KTL-3PH_Datasheet_2025-05-20_V3.1_en-AU (1).pdf'],

  ['Sigenergy', 'Sigenergy_Brochure.pdf'],
  ['Sigenergy', 'Sigenergy_Datasheet-5.0-8.0.pdf'],
  ['Sigenergy', 'Sigenergy_Datasheet.pdf'],

  ['Solintech_Inverters', '1779246852923_13cd6fee_mhs3k30.pdf'],
  ['Solintech_Inverters', 'M2HS-3-6-NO1.01-2026.pdf'],
  ['Solintech_Inverters', 'MHT-10-20-NO1.02-2026.pdf'],
  ['Solintech_Inverters', 'SolintechM2HS3-6kW Inverter-Image.jpg'],
  ['Solintech_Inverters', 'SolintechMHS3-8kW Inverter.jpg'],
  ['Solintech_Inverters', 'SolintechMHT_Series-Image.jpg'],

  ['Tesla_EV_Charger', 'Tesla Universal Wall Connector.jpg'],
  ['Tesla_EV_Charger', 'Tesla Wall Connector (Gen 3).jpg'],
  ['Tesla_EV_Charger', 'gen-3-wall-connector-installation-manual-en.pdf'],
  ['Tesla_EV_Charger', 'uwc_install.pdf'],

  ['Trina', 'Trina 475N Datasheet.pdf'],
  ['Trina', 'Trina_475kW.png'],

  ['Zappi_EV Charger', 'Zappi EV Charger - 7kW.jpg'],
  ['Zappi_EV Charger', 'myenergi-LTD-Product-Warranty-v2.0-AUS.pdf'],
  ['Zappi_EV Charger', 'zappi-v2.1-Datasheet-Rev-2.1.7-ENGLISH-June-2023.pdf'],
  ['Zappi_EV Charger', 'zappi-v2.1-G-Install-Manual-Rev-1.7-July-2023.pdf'],
  ['Zappi_EV Charger', 'zappi-v2.1-G-User-Manual-Rev-1.6-March-2023.pdf'],

  ['iStore', '2024 Heat Pump 180L Data Sheet.pdf'],
  ['iStore', 'IStore_Heatpump.jpg'],
  ['iStore', 'IStore_Heatpump1.jpg'],
  ['iStore', 'iStore 180L Brochure.pdf'],
  ['iStore', 'iStore warranty - September 2024.pdf'],
  ['iStore', 'iStore-owners-manual-270-R290-15-Dec25.pdf'],
  ['iStore', 'iStore_Image.pdf'],
  ['iStore', 'istore-install-manual-180l-270L-R290-v1.4-Apr25.pdf'],
];

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

function stripExtension(filename) {
  return filename.replace(/\.[^.]+$/, '');
}

function inferCategory(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('datasheet')) return 'Datasheet';
  if (lower.includes('certificate') || lower.includes('cert')) return 'Certificates';
  if (lower.includes('warranty')) return 'Warranty Document';
  if (lower.includes('manual') || lower.includes('user') || lower.includes('install')) {
    return 'Installation Manual/User Manual';
  }
  // Word-boundary guard: several brand names (Aquatech, Pylontech, Solintech)
  // end in "tech", which would otherwise false-positive as Tech Document.
  if (/(?<![a-z])tech(?![a-z])|technical/.test(lower)) return 'Tech Document';
  if (lower.includes('troubleshoot') || lower.includes('video')) {
    return 'Installation And Troubleshooting Videos';
  }
  return 'Other';
}

export const CLASS_OPTIONS = [
  'All',
  'Panels',
  'Inverters',
  'Storage',
  'Mountings',
  'EV Chargers',
  'Heat Pump',
  'Electricals',
];

export const TAB_OPTIONS = [
  'Datasheet',
  'Certificates',
  'Warranty Document',
  'Tech Document',
  'Installation Manual/User Manual',
  'Installation And Troubleshooting Videos',
  'Other',
];

export const documents = RAW_FILES.map(([brand, filename]) => {
  const baseName = stripExtension(filename);
  const fileType = getExtension(filename);
  return {
    id: `${slugify(brand)}-${slugify(baseName)}-${fileType}`,
    name: baseName.replace(/_/g, ' ').trim(),
    brand,
    category: inferCategory(filename),
    productClass: BRAND_CLASS[brand] || 'Other',
    fileUrl: `/brand_documents/${encodeURIComponent(brand)}/${encodeURIComponent(filename)}`,
    fileType,
    updatedAt: UPDATED_AT,
  };
});

export default documents;
