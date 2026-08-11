// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH for what business this generator simulates.
// To reskin this generator for a different business entirely, this is the
// only file you should need to edit -- data.js reads everything from here.
// ---------------------------------------------------------------------------

export const BUSINESS_NAME = "RigHouse AV & Lighting";
export const BUSINESS_TAGLINE = "Pro audio, video, and lighting gear for entertainment";

// Product categories, used both on products and as a lead's interest_category.
export const CATEGORIES = [
  "Lighting",
  "Audio",
  "Video",
  "Rigging & Staging",
  "Cabling & Power",
];

// Fictional brands (invented -- not real manufacturers) so nothing here
// implies an endorsement or relationship with an actual AV/lighting brand.
// `tier` biases which customer type typically buys it: "consumer",
// "business", or "both". Prices are per-unit list price in USD.
export const PRODUCTS = [
  // Lighting
  { sku: "LMX-MH250", brand: "Lumatrix", name: "MH-250 Moving Head Wash", category: "Lighting", price: 649, tier: "business" },
  { sku: "LMX-MH400", brand: "Lumatrix", name: "MH-400 Moving Head Beam", category: "Lighting", price: 899, tier: "business" },
  { sku: "VLB-PAR64-4PK", brand: "Voltbeam", name: "LED PAR64 (4-Pack)", category: "Lighting", price: 429, tier: "both" },
  { sku: "VLB-STROBE3K", brand: "Voltbeam", name: "Strobe Blaster 3000", category: "Lighting", price: 349, tier: "consumer" },
  { sku: "VLB-HAZERX2", brand: "Voltbeam", name: "Hazer X2", category: "Lighting", price: 279, tier: "consumer" },
  { sku: "GRD-PXB-1M", brand: "GridLine", name: "Pixel Batten 1M", category: "Lighting", price: 189, tier: "both" },
  { sku: "GRD-UV8", brand: "GridLine", name: "Blacklight Bar UV-8", category: "Lighting", price: 159, tier: "consumer" },
  { sku: "SPR-DMX512", brand: "StagePro", name: "DMX-512 Lighting Controller", category: "Lighting", price: 429, tier: "both" },

  // Audio
  { sku: "SFG-LA12", brand: "SonicForge", name: "LA-12 Line Array Speaker", category: "Audio", price: 1299, tier: "business" },
  { sku: "SFG-SUB18", brand: "SonicForge", name: "SUB-18 Powered Subwoofer", category: "Audio", price: 999, tier: "business" },
  { sku: "WVC-DM32", brand: "Wavecraft", name: "DM-32 Digital Mixer", category: "Audio", price: 2199, tier: "business" },
  { sku: "WVC-WM4", brand: "Wavecraft", name: "WM-4 Wireless Mic System (4-Channel)", category: "Audio", price: 749, tier: "business" },
  { sku: "WVC-IEM2", brand: "Wavecraft", name: "IEM-2 In-Ear Monitor System", category: "Audio", price: 429, tier: "both" },
  { sku: "CIR-DJX2", brand: "Cirrus Audio", name: "DJX-2 DJ Controller", category: "Audio", price: 599, tier: "consumer" },
  { sku: "CIR-MON8", brand: "Cirrus Audio", name: "MON-8 Powered Monitor Speaker", category: "Audio", price: 329, tier: "consumer" },

  // Video
  { sku: "BMW-LVWP3", brand: "BeamWorks", name: "LVW-P3 LED Video Wall Panel", category: "Video", price: 549, tier: "business" },
  { sku: "BMW-PJ6000", brand: "BeamWorks", name: "PJ-6000 Projector", category: "Video", price: 1899, tier: "business" },
  { sku: "BMW-VSW8", brand: "BeamWorks", name: "VSW-8 Video Switcher", category: "Video", price: 1199, tier: "business" },

  // Rigging & Staging
  { sku: "SPR-TRUSS2M", brand: "StagePro", name: "Truss Segment 2M", category: "Rigging & Staging", price: 189, tier: "business" },
  { sku: "SPR-TRUSS3M", brand: "StagePro", name: "Truss Segment 3M", category: "Rigging & Staging", price: 259, tier: "business" },
  { sku: "SPR-SPKSTAND", brand: "StagePro", name: "Speaker Stand (Pair)", category: "Rigging & Staging", price: 99, tier: "both" },
  { sku: "SPR-LTRIPOD", brand: "StagePro", name: "Lighting Tripod", category: "Rigging & Staging", price: 79, tier: "consumer" },
  { sku: "SPR-DECK4X8", brand: "StagePro", name: "Portable Stage Deck 4x8", category: "Rigging & Staging", price: 459, tier: "business" },
  { sku: "SPR-SKIRT-BLK", brand: "StagePro", name: "Stage Skirt (Black)", category: "Rigging & Staging", price: 89, tier: "business" },
  { sku: "SPR-DRAPEKIT", brand: "StagePro", name: "Drape & Backdrop Kit", category: "Rigging & Staging", price: 219, tier: "business" },

  // Cabling & Power
  { sku: "SPR-SNAKE124", brand: "StagePro", name: "Cable Snake 12/4", category: "Cabling & Power", price: 149, tier: "business" },
  { sku: "SPR-XLR25-2PK", brand: "StagePro", name: "XLR Cable 25ft (2-Pack)", category: "Cabling & Power", price: 39, tier: "both" },
  { sku: "SPR-DMX25", brand: "StagePro", name: "DMX Cable 25ft", category: "Cabling & Power", price: 29, tier: "both" },
  { sku: "SPR-DISTRO8", brand: "StagePro", name: "Power Distro 8-Way", category: "Cabling & Power", price: 349, tier: "business" },
];

// --- Consumer (B2C) customer archetypes ---
// Per the user's framing: home enthusiasts building production studios or
// party rooms, plus a couple of closely adjacent hobbyist roles.
export const CONSUMER_ROLES = [
  "Home Studio Enthusiast",
  "Party Room Enthusiast",
  "Content Creator / Streamer",
  "Home Theater Enthusiast",
];

export const CONSUMER_BUDGET_BANDS = ["Under $500", "$500 - $1,500", "$1,500 - $5,000"];

export const CONSUMER_LEAD_MESSAGES = [
  "Building out a party room in the basement, want to get the lighting right.",
  "Setting up a home studio and need help picking a mixer.",
  "Upgrading my home theater with real stage lighting for movie nights.",
  "Started streaming and want proper lighting and sound for my setup.",
  "Want to add moving heads to my home rig for the full concert feel.",
  "Looking for a starter DJ setup that can grow with me.",
  "Just moved and want to redo my party room from scratch.",
];

// --- Business (B2B) customer archetypes ---
// Per the user's framing: sound companies, AV installers, churches, and
// event planners.
export const ORG_TYPES = ["Sound Company", "AV Installer", "Church", "Event Planning Company"];

export const TITLES = [
  "Owner",
  "Production Manager",
  "Technical Director",
  "AV Coordinator",
  "Operations Manager",
  "Systems Integrator",
  "Facilities Manager",
  "Event Director",
];

export const BUSINESS_BUDGET_BANDS = ["$5,000 - $15,000", "$15,000 - $50,000", "$50,000+"];

export const BUSINESS_LEAD_MESSAGES = [
  "Outfitting a new venue install, need a quote on line arrays and a digital mixer.",
  "Our rental inventory is aging out, looking to refresh moving heads and truss.",
  "New sanctuary build needs a full lighting and sound package.",
  "Planning AV for a wedding season, want reliable rental-grade gear.",
  "Standardizing on one vendor for our install jobs going forward.",
  "Need a proposal for a corporate event series, six dates this quarter.",
  "Replacing failed subs before the weekend -- what's in stock?",
  "Scoping a permanent install for a new multipurpose room.",
];

// Word pools for generating organization names per org type.
const NAME_PREFIXES = [
  "Bright Path", "Northwind", "Vertex", "Summit", "Clearwater", "Ironclad",
  "Bluepeak", "Cascade", "Redstone", "Silverline", "Evergreen", "Lighthouse",
  "Meridian", "Harbor", "Granite", "Beacon", "Pinnacle", "Sequoia",
  "Waypoint", "Ember", "Fieldstone", "Highline", "Northgate", "Anchor",
];

const CHURCH_ADJECTIVES = ["Grace", "New Hope", "Cornerstone", "Faith", "Living Water", "Unity", "Redeemer", "Trinity"];
const CHURCH_NOUNS = ["Community Church", "Fellowship", "Chapel", "Worship Center", "Baptist Church", "Assembly"];

export function randomOrgName(orgType, pick) {
  const prefix = pick(NAME_PREFIXES);
  switch (orgType) {
    case "Sound Company":
      return `${prefix} ${pick(["Sound Co.", "Audio", "Sound & Production", "Pro Audio"])}`;
    case "AV Installer":
      return `${prefix} ${pick(["AV Integrations", "Systems", "AV Solutions", "Integration Group"])}`;
    case "Church":
      return `${pick(CHURCH_ADJECTIVES)} ${pick(CHURCH_NOUNS)}`;
    case "Event Planning Company":
      return `${prefix} ${pick(["Events", "Event Co.", "Occasions", "Event Group"])}`;
    default:
      return `${prefix} ${pick(["Group", "Productions"])}`;
  }
}

export { NAME_PREFIXES };

// Shared across both consumer and business leads -- realistic for either.
export const SOURCES = [
  "Google Ads", "Instagram Ads", "Organic Search", "Referral", "Trade Show",
  "Industry Forum", "Cold Outreach", "Partner Program", "RFP / Bid Site",
];

// A handful of real, well-known US cities for shipping -- just city/state,
// no street-level fabricated addresses (which would be a step too far into
// implying real deliverable locations).
export const SHIP_LOCATIONS = [
  { city: "Austin", state: "TX" },
  { city: "Nashville", state: "TN" },
  { city: "Denver", state: "CO" },
  { city: "Atlanta", state: "GA" },
  { city: "Phoenix", state: "AZ" },
  { city: "Columbus", state: "OH" },
  { city: "Portland", state: "OR" },
  { city: "Charlotte", state: "NC" },
  { city: "Sacramento", state: "CA" },
  { city: "Minneapolis", state: "MN" },
  { city: "Orlando", state: "FL" },
  { city: "Pittsburgh", state: "PA" },
];
