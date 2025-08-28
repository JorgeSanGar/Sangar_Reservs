/**
 * @typedef {'coche'|'4x4'|'camion'|'tractor'|'industrial'} Category
 */

/**
 * @typedef {object} LlenadoAguaOptions
 * @property {boolean} enabled
 * @property {number} [litros]
 */

/**
 * @typedef {object} EstimateOptions
 * @property {boolean} [pinchazo]
 * @property {number} [equilibradoCount] - coche/4x4/industrial
 * @property {'none'|'one'|'two_front'} [equilibradoCamion] - camión
 * @property {boolean} [alineado] - coche/4x4
 * @property {'front'|'rear'} [eje] - tractor/industrial
 * @property {boolean} [conCamara] - tractor
 * @property {LlenadoAguaOptions} [llenadoAgua] - tractor
 */

/**
 * @typedef {object} EstimatePayload
 * @property {string} orgId
 * @property {string} serviceId
 * @property {Category} category
 * @property {number} wheels - 1..4 coche/4x4, 1..12 camión, 1/2/4 industrial, 1/2 tractor
 * @property {EstimateOptions} options
 */

/**
 * @typedef {object} EstimateResult
 * @property {number} minutes
 * @property {string[]} [notes]
 */

// This file is for type definitions and does not export any runtime code.
export {};