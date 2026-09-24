export const SERVICES = ["Home Services", "IV Drip", "Blood Test", "Vitamin Injection", "Peptide Therapy", "NAD+ Infusion"];

export const PAYMENT_METHODS = ["JL_Paid", "Cash on Delivery", "Card on File", "Online", "Bank Transfer", "Prepaid"];

export const INVENTORY_LOCATIONS = ["Lounge DIFC", "Office"];
export const INVENTORY_UNITS = ["ml", "mg", "units", "vial"];
export const NSS_OPTIONS = ["100 ml", "250 ml", "500 ml"];

export const VIAL_NAMES = ["EFM", "LCD", "IMB", "PST", "MG NAD", "VM", "MIC", "Vit B", "Vit C", "NAD", "ALA", "Revita Vit D", "Coq 10"];
export const MEDICINE_NAMES = ["Emset", "Gluta", "Scopinal", "PCM", "Iron", "Voltaren", "Pantop", "Dexa", "Vomron", "B12", "Vit D IM"];

// Bookings at this location pick vials from whatever's unassigned and sitting at the location
// itself, instead of the assigned nurse's own carried stock. Every other location keeps the
// normal nurse-based picker.
export const LOCATION_BASED_STOCK = "Lounge DIFC";
