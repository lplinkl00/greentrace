// src/lib/climatiq-activities.ts

export type ParameterType = 'volume' | 'energy' | 'weight' | 'weight_distance'

export interface ClimatiqActivity {
  id: string          // Climatiq activity_id
  label: string       // Display name in dropdown
  parameterType: ParameterType
  defaultUnit: string // Pre-filled unit
  units: string[]     // Available units in dropdown
}

export const CLIMATIQ_ACTIVITIES: ClimatiqActivity[] = [
  {
    id: 'fuel_combustion-type_diesel-fuel_use',
    label: 'Diesel combustion',
    parameterType: 'volume',
    defaultUnit: 'L',
    units: ['L', 'm3'],
  },
  {
    id: 'electricity-supply_grid-source_residual_mix',
    label: 'Grid electricity',
    parameterType: 'energy',
    defaultUnit: 'kWh',
    units: ['kWh', 'MWh'],
  },
  {
    id: 'fuel_combustion-type_natural_gas-fuel_use',
    label: 'Natural gas combustion',
    parameterType: 'volume',
    defaultUnit: 'm3',
    units: ['m3'],
  },
  {
    id: 'fuel_combustion-type_petrol-fuel_use',
    label: 'Petrol / gasoline',
    parameterType: 'volume',
    defaultUnit: 'L',
    units: ['L'],
  },
  {
    id: 'fuel_combustion-type_biomass-fuel_use',
    label: 'Palm kernel shell (biomass)',
    parameterType: 'weight',
    defaultUnit: 't',
    units: ['t', 'kg'],
  },
  {
    id: 'chemical_production-type_nitrogen_fertiliser',
    label: 'Nitrogen fertilizer',
    parameterType: 'weight',
    defaultUnit: 'kg',
    units: ['kg', 't'],
  },
  {
    id: 'freight_vehicle-vehicle_type_hgv-fuel_source_diesel-vehicle_weight_gt_17t-loading_half_load',
    label: 'Road freight (CPO transport)',
    parameterType: 'weight_distance',
    defaultUnit: 'tonne_km',
    units: ['tonne_km'],
  },
  {
    id: 'wastewater_treatment-type_anaerobic_lagoon',
    label: 'Wastewater treatment (POME)',
    parameterType: 'volume',
    defaultUnit: 'm3',
    units: ['m3'],
  },
  {
    id: 'refrigerants-type_r410a',
    label: 'Refrigerant leakage (R-410A)',
    parameterType: 'weight',
    defaultUnit: 'kg',
    units: ['kg'],
  },
  {
    id: 'fuel_combustion-type_coal-fuel_use',
    label: 'Coal combustion',
    parameterType: 'weight',
    defaultUnit: 't',
    units: ['t', 'kg'],
  },
]
