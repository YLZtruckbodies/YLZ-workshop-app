// ─────────────────────────────────────────────────────────────────────────────
// YLZ Workshop — MRPeasy BOM & Parts Catalog
// Source: MRPeasy live system, extracted 24 March 2026
// ─────────────────────────────────────────────────────────────────────────────

export interface BomInfo {
  code: string
  name: string
  category: string
}

/**
 * All MRPeasy BOM codes (assembly BOMs) and key part codes used in the resolver.
 * Keyed by the BOM/part number as it appears in MRPeasy.
 */
export const BOM_CATALOG: Record<string, BomInfo> = {
  // ── Bodies ──────────────────────────────────────────────
  'BOM100': { code: 'BOM100', name: 'Hardox Tipper Body', category: 'Body' },
  'BOM101': { code: 'BOM101', name: 'Aluminium Tipper Body', category: 'Body' },
  'BOM155': { code: 'BOM155', name: '3/A Hardox Trailer Body 5.4M', category: 'Body' },
  'BOM156': { code: 'BOM156', name: '4/A Hardox Trailer Body 7.7M', category: 'Body' },
  'BOM157': { code: 'BOM157', name: '5/A Hardox Trailer Body 9.2M', category: 'Body' },
  'BOM158': { code: 'BOM158', name: '3/A Aluminium Trailer Body 5.4M', category: 'Body' },
  'BOM159': { code: 'BOM159', name: '4/A Aluminium Trailer Body 7.7M', category: 'Body' },
  'BOM160': { code: 'BOM160', name: '5/A Aluminium Trailer Body 9.2M', category: 'Body' },

  // ── Bodies — 8.3M (4-axle extended) ─────────────────────
  'BOM145': { code: 'BOM145', name: '4/A Aluminium Trailer Body 8.3M', category: 'Body' },
  'BOM147': { code: 'BOM147', name: '4/A Hardox Trailer Body 8.3M', category: 'Body' },

  // ── Subframes ──────────────────────────────────────────
  'BOM107': { code: 'BOM107', name: 'Hardox Truck Subframe', category: 'Subframe' },
  'BOM108': { code: 'BOM108', name: 'Aluminium Truck Subframe', category: 'Subframe' },

  // ── Running Gear ───────────────────────────────────────
  'BOM104': { code: 'BOM104', name: '3/A Trailer – Drum Axle', category: 'Running Gear' },
  'BOM105': { code: 'BOM105', name: '4/A Trailer – Drum Axle', category: 'Running Gear' },
  'BOM106': { code: 'BOM106', name: '5/A Trailer – Drum Axle', category: 'Running Gear' },
  'BOM149': { code: 'BOM149', name: '3/A Trailer – Disc Axle', category: 'Running Gear' },
  'BOM150': { code: 'BOM150', name: '4/A Trailer – Disc Axle', category: 'Running Gear' },
  'BOM151': { code: 'BOM151', name: '5/A Trailer – Disc Axle', category: 'Running Gear' },
  'BOM152': { code: 'BOM152', name: '3/A Trailer – TMC Disc', category: 'Running Gear' },
  'BOM153': { code: 'BOM153', name: '4/A Trailer – TMC Disc', category: 'Running Gear' },
  'BOM154': { code: 'BOM154', name: '5/A Trailer – TMC Disc', category: 'Running Gear' },
  'BOM161': { code: 'BOM161', name: '3/A Trailer – SAF Drum 5.4M', category: 'Running Gear' },
  'BOM162': { code: 'BOM162', name: '4/A Trailer – SAF Drum 7.7M', category: 'Running Gear' },
  'BOM163': { code: 'BOM163', name: '5/A Trailer – SAF Drum 9.2M', category: 'Running Gear' },
  'BOM164': { code: 'BOM164', name: '3/A Trailer – SAF Disc 5.4M', category: 'Running Gear' },
  'BOM165': { code: 'BOM165', name: '4/A Trailer – SAF Disc 7.7M', category: 'Running Gear' },
  'BOM166': { code: 'BOM166', name: '5/A Trailer – SAF Disc 9.2M', category: 'Running Gear' },
  'BOM167': { code: 'BOM167', name: '3/A Trailer – TMC Disc 5.4M', category: 'Running Gear' },
  'BOM168': { code: 'BOM168', name: '4/A Trailer – TMC Disc 7.7M', category: 'Running Gear' },
  'BOM169': { code: 'BOM169', name: '5/A Trailer – TMC Disc 9.2M', category: 'Running Gear' },

  // ── Towbars ────────────────────────────────────────────
  'BOM109': { code: 'BOM109', name: 'Towbar V.Orlandi', category: 'Towbar' },
  'BOM110': { code: 'BOM110', name: 'Towbar – Blank', category: 'Towbar' },
  'BOM111': { code: 'BOM111', name: 'Towbar Pintle', category: 'Towbar' },
  'BOM112': { code: 'BOM112', name: 'Towbar Bartlett Ball', category: 'Towbar' },
  'BOM210': { code: 'BOM210', name: 'Towbar w/ Pin Coupling – Mack & UD 850mm', category: 'Towbar' },
  'BOM213': { code: 'BOM213', name: 'Towbar w/ Bartlett Ball – Mack & UD 850mm', category: 'Towbar' },

  // ── Drawbars ───────────────────────────────────────────
  'BOM171': { code: 'BOM171', name: '3/A Drawbar – Standard 4.19M', category: 'Drawbar' },
  'BOM172': { code: 'BOM172', name: '4/A Drawbar – Longest 4.7M', category: 'Drawbar' },
  'BOM173': { code: 'BOM173', name: '5/A Drawbar', category: 'Drawbar' },

  // ── Tarps ──────────────────────────────────────────────
  'MRP20-05': { code: 'MRP20-05', name: 'Roll Right Controller (20-05)', category: 'Tarp' },
  'MRP20-14': { code: 'MRP20-14', name: 'Manual Tarp Handle (20-14)', category: 'Tarp' },
  'BOM124': { code: 'BOM124', name: 'Tarp PVC 3.410–4.350', category: 'Tarp' },
  'BOM125': { code: 'BOM125', name: 'Tarp PVC 4.360–5.200', category: 'Tarp' },
  'BOM126': { code: 'BOM126', name: 'Tarp PVC 5.210–6.050', category: 'Tarp' },
  'BOM127': { code: 'BOM127', name: 'Tarp PVC 6.060–6.950', category: 'Tarp' },
  'BOM128': { code: 'BOM128', name: 'Tarp PVC 6.960–7.800', category: 'Tarp' },
  'BOM129': { code: 'BOM129', name: 'Tarp PVC 7.810–8.650', category: 'Tarp' },
  'BOM130': { code: 'BOM130', name: 'Tarp PVC 8.660–9.550', category: 'Tarp' },
  'BOM131': { code: 'BOM131', name: 'Tarp Mesh 3.410–4.350', category: 'Tarp' },
  'BOM132': { code: 'BOM132', name: 'Tarp Mesh 4.360–5.200', category: 'Tarp' },
  'BOM133': { code: 'BOM133', name: 'Tarp Mesh 5.210–6.050', category: 'Tarp' },
  'BOM134': { code: 'BOM134', name: 'Tarp Mesh 6.060–6.950', category: 'Tarp' },
  'BOM135': { code: 'BOM135', name: 'Tarp Mesh 6.960–7.800', category: 'Tarp' },
  'BOM136': { code: 'BOM136', name: 'Tarp Mesh 7.810–8.650', category: 'Tarp' },
  'BOM137': { code: 'BOM137', name: 'Tarp Mesh 8.660–9.550', category: 'Tarp' },

  // ── Camera Kits ────────────────────────────────────────
  'BOM113': { code: 'BOM113', name: 'Camera Kit – Truck 1 Cam', category: 'Camera' },
  'BOM114': { code: 'BOM114', name: 'Camera Kit – Truck 2 Cam', category: 'Camera' },
  'BOM115': { code: 'BOM115', name: 'Camera Kit – Trailer 1 Cam', category: 'Camera' },
  'BOM116': { code: 'BOM116', name: 'Camera Kit – Trailer 2 Cam', category: 'Camera' },
  'BOM170': { code: 'BOM170', name: 'Camera Kit – Truck & Trailer 4 Cam', category: 'Camera' },

  // ── Weight Scales ──────────────────────────────────────
  'BOM117': { code: 'BOM117', name: 'Weight Scales BT Trailer', category: 'Scales' },
  'BOM118': { code: 'BOM118', name: 'Weight Scales BT Truck', category: 'Scales' },
  'BOM119': { code: 'BOM119', name: 'Weight Scales Analogue Truck', category: 'Scales' },
  'BOM120': { code: 'BOM120', name: 'Weight Scales Analogue Trailer', category: 'Scales' },

  // ── Swing Kits ─────────────────────────────────────────
  'BOM141': { code: 'BOM141', name: '220mm Swing Kit (Trailer)', category: 'Swing Kit' },
  'BOM142': { code: 'BOM142', name: '250mm Swing Kit', category: 'Swing Kit' },
  'BOM143': { code: 'BOM143', name: 'Standard Swing Kit (Truck)', category: 'Swing Kit' },
  'BOM174': { code: 'BOM174', name: 'Swing Kit for Hardox', category: 'Swing Kit' },

  // ── Accessories ────────────────────────────────────────
  'BOM121': { code: 'BOM121', name: 'Lift Up Axle – Trailer', category: 'Accessory' },
  'BOM122': { code: 'BOM122', name: 'Tyre Pivot', category: 'Accessory' },
  'BOM123': { code: 'BOM123', name: 'Stainless Guards – Trailers', category: 'Accessory' },
  'BOM138': { code: 'BOM138', name: 'Proportional Control Box', category: 'Accessory' },
  'BOM139': { code: 'BOM139', name: 'Grain Lock', category: 'Accessory' },
  'BOM140': { code: 'BOM140', name: 'Stainless Guards Truck', category: 'Accessory' },
  'BOM212': { code: 'BOM212', name: 'Side Run Protection – 8300 Trailer', category: 'Accessory' },

  // ── Paint ──────────────────────────────────────────────
  'BOM175': { code: 'BOM175', name: 'Ally Body Paint', category: 'Paint' },
  'BOM176': { code: 'BOM176', name: 'Hardox Body Paint', category: 'Paint' },
  'BOM178': { code: 'BOM178', name: 'Truck Subframe Paint', category: 'Paint' },
  'BOM179': { code: 'BOM179', name: 'Trailer 3/A Hardox Body Paint', category: 'Paint' },
  'BOM180': { code: 'BOM180', name: 'Trailer 4/A Hardox Paint', category: 'Paint' },
  'BOM181': { code: 'BOM181', name: 'Cab Respray – Paint', category: 'Paint' },
  'BOM182': { code: 'BOM182', name: 'Hardox 3/A Chassis Paint', category: 'Paint' },
  'BOM183': { code: 'BOM183', name: 'Hardox 4/A Chassis Paint', category: 'Paint' },
  'BOM185': { code: 'BOM185', name: 'Convertor Dolly 2/3 Axle Paint', category: 'Paint' },
  'BOM186': { code: 'BOM186', name: 'Draw Bar Paint', category: 'Paint' },
  'BOM187': { code: 'BOM187', name: 'Number Plate Flaps Paint', category: 'Paint' },
  'BOM188': { code: 'BOM188', name: 'Safety Prop Paint', category: 'Paint' },
  'BOM189': { code: 'BOM189', name: 'Aluminium 3/A Body Paint', category: 'Paint' },
  'BOM190': { code: 'BOM190', name: 'Aluminium 4/A Body Paint', category: 'Paint' },
  'BOM191': { code: 'BOM191', name: 'Trailer 5/A Ally Paint', category: 'Paint' },
  'BOM192': { code: 'BOM192', name: 'Hardox 5/A Chassis Paint', category: 'Paint' },
  'BOM193': { code: 'BOM193', name: 'Hardox 5/A Body Paint', category: 'Paint' },

  // ── Wheels & Tyres ─────────────────────────────────────
  'BOM194': { code: 'BOM194', name: '10×335 4/A Wheels & Tyres', category: 'Wheels' },
  'BOM195': { code: 'BOM195', name: '10×285 4/A Wheels & Tyres', category: 'Wheels' },
  'BOM196': { code: 'BOM196', name: '10×285 3/A Wheels & Tyres', category: 'Wheels' },
  'BOM197': { code: 'BOM197', name: '10×285 5/A Wheels & Tyres', category: 'Wheels' },
  'BOM198': { code: 'BOM198', name: '10×335 3/A Wheels & Tyres', category: 'Wheels' },
  'BOM199': { code: 'BOM199', name: '10×335 5/A Wheels & Tyres', category: 'Wheels' },
  'BOM200': { code: 'BOM200', name: '10×285 2/A Convertor Dolly Wheels', category: 'Wheels' },
  'BOM201': { code: 'BOM201', name: '10×335 2/A Convertor Dolly Wheels', category: 'Wheels' },

  // ── Hoists (MRPeasy parts, not BOMs) ───────────────────
  '500-236': { code: '500-236', name: 'Binotto 3190 Well-Mount Hoist Kit (MFB3126.3.3190)', category: 'Hoist' },
  '500-207': { code: '500-207', name: 'Binotto 2840 Well Hoist Kit (MFB3126.3.2840)', category: 'Hoist' },
  '500-237': { code: '500-237', name: 'Binotto 3450 Well-Mount Hoist Kit (MFB3126.4.3450)', category: 'Hoist' },
  '500-83':  { code: '500-83',  name: 'Hyva FEA169-4 Cylinder Well Mount', category: 'Hoist' },
  '500-87':  { code: '500-87',  name: 'Hyva FEA169-5 Cylinder Well Mount', category: 'Hoist' },
  '500-47':  { code: '500-47',  name: 'Binotto Front Mount Hoist Kit (MFCB3126.4.3805)', category: 'Hoist' },

  // ── PTO Kits (MRPeasy parts) ───────────────────────────
  '500-123': { code: '500-123', name: 'PTO Kit Mercedes G230-12 ISO 4B (TES)', category: 'PTO' },
  '500-220': { code: '500-220', name: 'PTO Kit Mercedes OMFB (MER014ISO)', category: 'PTO' },
  '500-136': { code: '500-136', name: 'PTO ZF/Eaton PZB3B', category: 'PTO' },
  '500-165': { code: '500-165', name: 'PTO Kit Volvo VT-C ISO4B Air', category: 'PTO' },
  '500-251': { code: '500-251', name: 'PTO Kit Volvo OMFB (VOL024ISO)', category: 'PTO' },
  '500-214': { code: '500-214', name: 'PTO TX18 Paccar – Hydreco (Kenworth/DAF)', category: 'PTO' },
  '500-216': { code: '500-216', name: 'PTO Kit Fuller OMFB (FUL004)', category: 'PTO' },
  '500-97':  { code: '500-97',  name: 'PTO Kit Fuller RT906 PZB3B Air', category: 'PTO' },
  '500-24':  { code: '500-24',  name: 'PTO Kit ZF OMFB', category: 'PTO' },
  '500-73':  { code: '500-73',  name: 'PTO Kit ZF 12AS 2330 TD OMFB', category: 'PTO' },
  '500-23':  { code: '500-23',  name: 'Loom Kit PTO Iveco Stralis/Eurotech', category: 'PTO' },

  // ── Hydraulic Pump ─────────────────────────────────────
  '500-223': { code: '500-223', name: 'Tipper Gear Pump Kit ISO 82L (OMFB DTH182)', category: 'Hydraulics' },
  '500-86':  { code: '500-86',  name: 'Single Spool Valve', category: 'Hydraulics' },
  '500-224': { code: '500-224', name: 'Truck and Trailer Spool Valve', category: 'Hydraulics' },
  '500-233': { code: '500-233', name: 'Hydraulic Tank 135L Behind Cab', category: 'Hydraulics' },
  '500-232': { code: '500-232', name: 'TKBRS135S Hydraulic Tank 135L', category: 'Hydraulics' },
  '500-234': { code: '500-234', name: 'TKBRS150S Hydraulic Tank 150L', category: 'Hydraulics' },
  '500-235': { code: '500-235', name: 'TKBRS200S Hydraulic Tank 200L', category: 'Hydraulics' },
  '500-228': { code: '500-228', name: 'TKVER070S Hydraulic Tank 70L Sleeper Box', category: 'Hydraulics' },
  '500-229': { code: '500-229', name: 'TKVER105S Hydraulic Tank 105L Sleeper Box', category: 'Hydraulics' },
  '500-230': { code: '500-230', name: 'TKVER130S Hydraulic Tank 130L Sleeper Box', category: 'Hydraulics' },
  '500-254': { code: '500-254', name: 'TKVER160S Hydraulic Tank 160L Sleeper Box', category: 'Hydraulics' },
  '500-231': { code: '500-231', name: 'TKVER200S Hydraulic Tank 200L Sleeper Box', category: 'Hydraulics' },
  '500-245': { code: '500-245', name: 'Hydraulic Tank 200L Side Mount', category: 'Hydraulics' },

  // ── Controller ─────────────────────────────────────────
  '500-170': { code: '500-170', name: 'XFACTOR T&D CONTROL ONLY TIP DEADMAN (12/24V)', category: 'Controls' },
  '500-246': { code: '500-246', name: 'Small Hand Controller Dash Mount', category: 'Controls' },

  // ── Brake Couplings ────────────────────────────────────
  '40-205': { code: '40-205', name: 'Duomatic Coupling F/M 154mm Lever Female', category: 'Brake Coupling' },
  '40-206': { code: '40-206', name: 'Duomatic Coupling Male – Trailer Side', category: 'Brake Coupling' },
  '40-277': { code: '40-277', name: 'Duomatic Coupling Assembly for Dog Rear', category: 'Brake Coupling' },
}

