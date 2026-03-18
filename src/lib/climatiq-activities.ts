// src/lib/climatiq-activities.ts

export type ParameterType = 'volume' | 'energy' | 'weight' | 'weight_distance'

export interface ClimatiqActivity {
  id: string          // Climatiq activity_id
  label: string       // Display name in dropdown
  parameterType: ParameterType
  defaultUnit: string // Pre-filled unit
  units: string[]     // Available units in dropdown
}

// Activity IDs verified against Climatiq data_version ^32 (latest as of 2024).
// Re-verify if switching to a newer data_version in route.ts.
export const CLIMATIQ_ACTIVITIES: ClimatiqActivity[] = [
  {
    id: 'fuel-type_diesel-fuel_use_na',
    label: 'Diesel combustion',
    parameterType: 'volume',
    defaultUnit: 'l',
    units: ['l', 'm3'],
  },
  {
    id: 'electricity-supply_grid-source_residual_mix',
    label: 'Grid electricity',
    parameterType: 'energy',
    defaultUnit: 'kWh',
    units: ['kWh', 'MWh'],
  },
  {
    id: 'fuel-type_natural_gas-fuel_use_na',
    label: 'Natural gas combustion',
    parameterType: 'volume',
    defaultUnit: 'm3',
    units: ['m3'],
  },
  {
    id: 'fuel-type_motor_gasoline-fuel_use_na',
    label: 'Petrol / gasoline',
    parameterType: 'volume',
    defaultUnit: 'l',
    units: ['l'],
  },
  {
    id: 'fuel-type_biomass_solid_other_bio_100-fuel_use_na',
    label: 'Palm kernel shell (biomass)',
    parameterType: 'weight',
    defaultUnit: 't',
    units: ['t', 'kg'],
  },
  {
    id: 'land_use-type_inorganic_nitrogen_fertilizers',
    label: 'Nitrogen fertilizer (direct field emissions)',
    parameterType: 'weight',
    defaultUnit: 'kg',
    units: ['kg', 't'],
  },
  {
    id: 'freight_vehicle-vehicle_type_hgv-fuel_source_diesel-vehicle_weight_na-percentage_load_avg',
    label: 'Road freight (CPO transport)',
    parameterType: 'weight_distance',
    defaultUnit: 'tonne_km',
    units: ['tonne_km'],
  },
  {
    id: 'fugitive_gas-type_r410a',
    label: 'Refrigerant leakage (R-410A)',
    parameterType: 'weight',
    defaultUnit: 'kg',
    units: ['kg'],
  },
  {
    id: 'fuel-type_coal_bituminous-fuel_use_na',
    label: 'Coal combustion (bituminous)',
    parameterType: 'weight',
    defaultUnit: 't',
    units: ['t', 'kg'],
  },
]
