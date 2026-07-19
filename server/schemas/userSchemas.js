import Joi from 'joi';

export const updateLocationSchema = Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
});

// Acepta forma legacy { enabled } o granular { notify_lost, notify_found,
// notify_radius_km }. Requiere al menos uno de los campos.
export const updateNotifyNearbySchema = Joi.object({
    enabled: Joi.boolean(),
    notify_lost: Joi.boolean(),
    notify_found: Joi.boolean(),
    notify_radius_km: Joi.number().integer().min(1).max(50),
}).or('enabled', 'notify_lost', 'notify_found', 'notify_radius_km');
